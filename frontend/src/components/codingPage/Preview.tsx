
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, RefreshCw, ExternalLink } from 'lucide-react';
import { useParams } from 'react-router-dom';

interface PreviewProps {
  fileContents?: Map<string, string>;
  activeFile?: string;
}

export const Preview = ({ fileContents, activeFile }: PreviewProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { projectId } = useParams();

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const handleRefresh = async () => {
    if (!projectId) return;
    
    setIsRefreshing(true);
    setIsLoading(true);
    setError('');
    
         try {
       // Make request to /preview endpoint to start/restart the server
       const response = await fetch(`http://${projectId}.codevo.live/preview`, {
         method: 'GET',
         mode: 'no-cors' // Handle CORS
       });
       
       // Set the direct URL for the iframe (using the root path which routes to port 3001)
       const directUrl = `http://${projectId}.codevo.live/`;
       setPreviewUrl(directUrl);
      
      // Reload iframe
      if (iframeRef.current) {
        iframeRef.current.src = `${directUrl}?_t=${Date.now()}`;
      }
      
    } catch (err) {
      console.error('[Preview] Error starting preview server:', err);
      setError('Failed to start preview server');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initialize preview when component mounts
  useEffect(() => {
    if (projectId) {
      handleRefresh();
    }
  }, [projectId]);

  return (
    <div className="h-full w-full flex flex-col relative">
        <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
         <div className="flex items-center space-x-2 w-[80%]">
           <div className="text-sm font-medium text-gray-300">Preview</div>
           {isLoading && (
             <div className="flex items-center space-x-1 text-xs text-blue-400">
               <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
               <span>Loading</span>
             </div>
           )}
           {error && (
             <div className="flex items-center space-x-1 text-xs text-red-400">
               <span>{error}</span>
             </div>
           )}
            {previewUrl && (
              <div className="flex items-center space-x-2 ml-4 w-full">
                {/* <span className="text-xs text-gray-400">URL:</span> */}
                <div className="flex items-center space-x-1 bg-black px-2 py-2 rounded text-xs text-white font-mono min-w-0 w-full">
                  <input
                    type="text"
                    value={previewUrl}
                    onChange={(e) => {
                      setPreviewUrl(e.target.value);
                      // Update iframe src when URL changes
                      if (iframeRef.current) {
                        iframeRef.current.src = e.target.value;
                      }
                    }}
                    className="bg-black border-none outline-none text-white font-mono text-xs min-w-0 flex-1 focus:bg-gray-700"
                    style={{ minWidth: '200px' }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(previewUrl);
                      // You could add a toast notification here
                    }}
                    className="text-blue-400 hover:text-blue-300 ml-1 flex-shrink-0"
                    title="Copy URL"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
         </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7 w-7 hover:bg-gray-700"
            title="Refresh Preview"
          >
            <RefreshCw size={14} className={`${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={openInNewTab}
            disabled={!previewUrl}
            className="h-7 w-7 hover:bg-gray-700"
            title="Open in New Tab"
          >
            <ExternalLink size={14} />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 bg-white overflow-hidden relative">
        {previewUrl ? (
          <>
            <iframe
              ref={iframeRef}
              title="Preview"
              src={previewUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={() => {
                console.log('[Preview] Iframe loaded successfully');
                setIsLoading(false);
                setError('');
              }}
              onError={() => {
                console.error('[Preview] Failed to load preview');
                setIsLoading(false);
                setError('Failed to load preview');
              }}
            />
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60">
                <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mb-2"></div>
                <div className="text-gray-800 text-sm">Loading preview...</div>
                <div className="text-gray-600 text-xs mt-1">Starting Vite development server...</div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-gray-800 text-sm">No preview available</div>
            <div className="text-gray-600 text-xs mt-2">Click refresh to start the preview server</div>
          </div>
        )}
      </div>
    </div>
  );
};