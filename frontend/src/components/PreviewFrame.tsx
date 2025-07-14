import type { FileItem } from '@/types';
import { WebContainer } from '@webcontainer/api';
import { useEffect, useState, useRef } from 'react';

interface PreviewFrameProps {
  files: FileItem[]; // Use your existing FileItem type
  webContainer: WebContainer;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    async function startServer() {
      try {
        setLoading(true);
        setError(null);

        if (!webContainer) {
          throw new Error('WebContainer not initialized');
        }

        console.log('Mounting files...');
        
        // Helper function to flatten file tree and get only files (not folders)
        const flattenFiles = (items: FileItem[]): FileItem[] => {
          const result: FileItem[] = [];
          
          items.forEach((item) => {
            if (item.type === 'file' && item.content) {
              result.push(item);
            } else if (item.type === 'folder' && item.children) {
              result.push(...flattenFiles(item.children));
            }
          });
          
          return result;
        };

        const flatFiles = flattenFiles(files);
        
        // Create properly typed file tree for WebContainer
        const fileTree: { [key: string]: any } = {};
        flatFiles.forEach((file: FileItem) => {
          // Use the full path for the file key
          const filePath = file.path || file.name;
          fileTree[filePath] = {
            file: {
              contents: file.content || ''
            }
          };
        });

        await webContainer.mount(fileTree);

        // Create package.json if it doesn't exist
        const hasPackageJson = flatFiles.some((f: FileItem) => f.name === 'package.json');
        if (!hasPackageJson) {
          await webContainer.fs.writeFile('/package.json', JSON.stringify({
            "name": "preview-app",
            "version": "1.0.0",
            "scripts": {
              "dev": "npx serve . -p 3000",
              "start": "npx serve . -p 3000"
            }
          }, null, 2));
        }

        console.log('Installing dependencies...');
        
        const installProcess = await webContainer.spawn('npm', ['install']);
        
        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          throw new Error(`Installation failed with exit code ${installExitCode}`);
        }

        console.log('Starting server...');

        
        webContainer.on('server-ready', (port, url) => {
          console.log(`Server ready on port ${port}, URL: ${url}`);
          if (mountedRef.current) {
            setUrl(url);
            setLoading(false);
          }
        });

        setTimeout(() => {
          if (mountedRef.current && loading) {
            setError('Server startup timeout - please try again');
            setLoading(false);
          }
        }, 30000);

      } catch (err) {
        console.error('Error starting server:', err);
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to start server');
          setLoading(false);
        }
      }
    }

    startServer();

    return () => {
      mountedRef.current = false;
    };
  }, [webContainer, files]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="mb-2">Loading...</p>
          <p className="text-sm">Starting development server...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-400">
        <div className="text-center">
          <p className="mb-2">Error:</p>
          <p className="text-sm mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <iframe 
        width="100%" 
        height="100%" 
        src={url}
        title="Preview"
        className="border-0"
        allow="cross-origin-isolated"
      />
    </div>
  );
}