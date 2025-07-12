import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { StepsList } from "../components/StepsList";
import { FileExplorer } from "../components/FileExplorer";
import { TabView } from "../components/TabView";
import { CodeEditor } from "../components/CodeEditor";
import { PreviewFrame } from "../components/PreviewFrame";
import { type Step, type FileItem, StepType } from "../types";
import axios from "axios";
import { parseXml } from "../steps";
import { useWebContainer } from "../hooks/useWebContainer";
import { Loader } from "../components/Loader";
import { Wand2 } from "lucide-react";
import { Download } from "lucide-react";
const BACKEND_URL = import.meta.env.VITE_REACT_APP_BACKEND_BASEURL;

const downloadAsZip = async (files: FileItem[], projectName: string = "quicksite-project") => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  const addFilesToZip = (fileItems: FileItem[], currentPath: string = "") => {
    fileItems.forEach(file => {
      const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      
      if (file.type === "file") {
        // Add file content to ZIP
        zip.file(fullPath, file.content || "");
      } else if (file.type === "folder" && file.children) {
        // Create folder and recursively add its contents
        zip.folder(fullPath);
        addFilesToZip(file.children, fullPath);
      }
    });
  };
  
  addFilesToZip(files);
  
  // Generate ZIP file
  const content = await zip.generateAsync({ type: "blob" });
  
  // Create download link
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export function Builder() {
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  // Add a ref to track initialization
  const hasInitialized = useRef(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);

  const scrollbarStyles = {
    "&::-webkit-scrollbar": {
      width: "10px",
      height: "10px",
    },
    "&::-webkit-scrollbar-track": {
      background: "#1a1a1a",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#333",
      borderRadius: "5px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "#555",
    },
    scrollbarWidth: "thin" as const,
    scrollbarColor: "#333 #1a1a1a",
  };

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps
      .filter(({ status }) => status === "pending")
      .map((step) => {
        updateHappened = true;
        if (step?.type === StepType.CreateFile) {
          let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
          let currentFileStructure = [...originalFiles]; // {}
          let finalAnswerRef = currentFileStructure;

          let currentFolder = "";
          while (parsedPath.length) {
            currentFolder = `${currentFolder}/${parsedPath[0]}`;
            let currentFolderName = parsedPath[0];
            parsedPath = parsedPath.slice(1);

            if (!parsedPath.length) {
              // final file
              let file = currentFileStructure.find(
                (x) => x.path === currentFolder
              );
              if (!file) {
                currentFileStructure.push({
                  name: currentFolderName,
                  type: "file",
                  path: currentFolder,
                  content: step.code,
                  children: [],
                });
              } else {
                file.content = step.code;
              }
            } else {
              /// in a folder
              let folder = currentFileStructure.find(
                (x) => x.path === currentFolder
              );
              if (!folder) {
                // create the folder
                currentFileStructure.push({
                  name: currentFolderName,
                  type: "folder",
                  path: currentFolder,
                  children: [],
                });
              }

              currentFileStructure = currentFileStructure.find(
                (x) => x.path === currentFolder
              )!.children!;
            }
          }
          originalFiles = finalAnswerRef;
        }
      });

    if (updateHappened) {
      setFiles(originalFiles);
      setSteps((steps) =>
        steps.map((s: Step) => {
          return {
            ...s,
            status: "completed",
          };
        })
      );
    }
    console.log(files);
  }, [steps, files]);

  useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};

      const processFile = (file: FileItem, isRootFolder: boolean) => {
        if (file.type === "folder") {
          // For folders, create a directory entry
          mountStructure[file.name] = {
            directory: file.children
              ? Object.fromEntries(
                  file.children.map((child) => [
                    child.name,
                    processFile(child, false),
                  ])
                )
              : {},
          };
        } else if (file.type === "file") {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || "",
              },
            };
          } else {
            // For files, create a file entry with contents
            return {
              file: {
                contents: file.content || "",
              },
            };
          }
        }

        return mountStructure[file.name];
      };

      // Process each top-level file/folder
      files.forEach((file) => processFile(file, true));

      return mountStructure;
    };

    const mountStructure = createMountStructure(files);

    // Mount the structure if WebContainer is available
    console.log(mountStructure);
    webcontainer?.mount(mountStructure);
  }, [files, webcontainer]);

  async function init() {
    // Prevent multiple initializations
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim(),
    });
    setTemplateSet(true);

    const { prompts, uiPrompts } = response.data;

    setSteps(
      parseXml(uiPrompts[0]).map((x: Step) => ({
        ...x,
        status: "pending",
      }))
    );

    setLoading(true);
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, prompt].map((content) => ({
        role: "user",
        content,
      })),
    });

    setLoading(false);

    setSteps((s) => [
      ...s,
      ...parseXml(stepsResponse.data.response).map((x) => ({
        ...x,
        status: "pending" as "pending",
      })),
    ]);

    setLlmMessages(
      [...prompts, prompt].map((content) => ({
        role: "user",
        content,
      }))
    );

    setLlmMessages((x) => [
      ...x,
      { role: "assistant", content: stepsResponse.data.response },
    ]);
  }

  useEffect(() => {
    init();
  }, []); // Keep empty dependency array

  return (
    <div className="min-h-screen bg-gradient-to-r from-black via-zinc-900 to-zinc-800 flex flex-col">
      <header className="bg-black shadow px-6 py-4 flex justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Wand2 className="text-blue-400" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-300 to-purple-900">
              QuickSite
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">Prompt: {prompt}</p>
        </div>
        <button
        onClick={() => downloadAsZip(files, "quicksite-project")}
        disabled={files.length === 0}
        className="flex items-center gap-2 bg-green-500 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded-lg transition-colors"
      >
        <Download size={16} />
        Download Project
      </button>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-6 p-6">
          <div className="col-span-1 space-y-6 overflow-auto">
            <div>
              <div
                className="max-h-[75vh] overflow-scroll"
                style={scrollbarStyles}
              >
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
              <div>
                <div className="flex">
                  <br />
                  {(loading || !templateSet) && <Loader />}
                  {!(loading || !templateSet) && (
                    <div className="flex">
                      <textarea
                        value={userPrompt}
                        onChange={(e) => {
                          setPrompt(e.target.value);
                        }}
                        className="p-2 m-1 border border-zinc-600 rounded-xl w-full focus:outline-none text-white"
                      ></textarea>
                      <button
                        onClick={async () => {
                          const newMessage = {
                            role: "user" as "user",
                            content: userPrompt,
                          };

                          setLoading(true);
                          const stepsResponse = await axios.post(
                            `${BACKEND_URL}/chat`,
                            {
                              messages: [...llmMessages, newMessage],
                            }
                          );
                          setLoading(false);

                          setLlmMessages((x) => [...x, newMessage]);
                          setLlmMessages((x) => [
                            ...x,
                            {
                              role: "assistant",
                              content: stepsResponse.data.response,
                            },
                          ]);

                          setSteps((s) => [
                            ...s,
                            ...parseXml(stepsResponse.data.response).map(
                              (x) => ({
                                ...x,
                                status: "pending" as "pending",
                              })
                            ),
                          ]);
                        }}
                        className="bg-blue-300 rounded-xl w-26  items-center px-2 m-1"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-1">
            <FileExplorer files={files} onFileSelect={setSelectedFile} />
          </div>
          <div className="col-span-2 bg-zinc-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-4rem)]">
              {activeTab === "code" ? (
                <CodeEditor file={selectedFile} />
              ) : (
                <PreviewFrame webContainer={webcontainer} files={files} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
