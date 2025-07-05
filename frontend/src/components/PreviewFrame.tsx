import { WebContainer } from '@webcontainer/api';
import { useEffect, useState } from 'react';

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function startServer() {
      try {
        setLoading(true);
        setError(null);

        console.log('Starting installation...');
        
        // Install dependencies
        const installProcess = await webContainer.spawn('npm', ['install']);
        
        // Handle install output
        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('Install output:', data);
          }
        }));

        // Wait for installation to complete
        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          throw new Error(`Installation failed with exit code ${installExitCode}`);
        }

        console.log('Installation complete, starting dev server...');

        // Start the development server
        const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
        
        // Handle dev server output
        devProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('Dev server output:', data);
          }
        }));

        // Listen for server-ready event
        const serverReadyPromise = new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Server startup timeout'));
          }, 30000); // 30 second timeout

          webContainer.on('server-ready', (port, url) => {
            clearTimeout(timeout);
            console.log(`Server ready on port ${port}, URL: ${url}`);
            resolve(url);
          });
        });

        // Wait for server to be ready
        const serverUrl = await serverReadyPromise;
        
        if (mounted) {
          setUrl(serverUrl);
          setLoading(false);
        }

      } catch (err) {
        console.error('Error starting server:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to start server');
          setLoading(false);
        }
      }
    }

    startServer();

    return () => {
      mounted = false;
    };
  }, [webContainer, files]); // Include files in dependency array

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="mb-2">Loading...</p>
          <p className="text-sm">Installing dependencies and starting server...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-400">
        <div className="text-center">
          <p className="mb-2">Error starting preview:</p>
          <p className="text-sm">{error}</p>
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
      />
    </div>
  );
}