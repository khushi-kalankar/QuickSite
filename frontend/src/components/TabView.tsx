import { Code2, Eye } from "lucide-react";

interface TabViewProps {
  activeTab: "code" | "preview";
  onTabChange: (tab: "code" | "preview") => void;
}

export function TabView({ activeTab, onTabChange }: TabViewProps) {
  return (
    <div className="flex space-x-2 mb-4">
      <button
        onClick={() => onTabChange("code")}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
          activeTab === "code"
            ? "bg-zinc-700 text-gray-100"
            : "text-gray-400 hover:text-gray-200 hover: bg-zinc-800"
        }`}
      >
        <Code2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => onTabChange("preview")}
        className={`flex items-center gap-2 px-4 py-4 rounded-3xl transition-colors ${
          activeTab === "preview"
            ? "bg-zinc-700 text-gray-100"
            : "text-gray-400 hover:text-gray-200 hover: bg-zinc-800"
        }`}
      >
        <Eye className="w-4 h-4" />
        Preview
      </button>
    </div>
  );
}
