
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, RefreshCw, ExternalLink } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

interface PreviewProps {
  fileContents?: Map<string, string>;
  activeFile?: string;
}

export const Preview = ({ fileContents, activeFile }: PreviewProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHotReloading, setIsHotReloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [serverReady, setServerReady] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewSocketRef = useRef<Socket | null>(null);
  const serverCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastReloadTimeRef = useRef<number>(0);
  // Live refs to avoid stale state in async timeouts
  const isLoadingRef = useRef<boolean>(false);
  const serverReadyRef = useRef<boolean>(false);
  // Timers
  const initialLoadRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hotReloadAutoRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hotReloadRetryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const postReloadSecondShotTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { projectId } = useParams();

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };



  // Check if preview server is ready
  const checkServerReady = async (url: string) => {
    try {
      // Try to load the iframe content directly to check if server is ready
      const response = await fetch(url, { 
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Start polling for server readiness
  const startServerPolling = (url: string) => {
    if (serverCheckIntervalRef.current) {
      clearInterval(serverCheckIntervalRef.current);
    }
    
    // Instead of polling, we'll rely on the iframe load event
    // The iframe will automatically try to load and we'll detect when it succeeds
    console.log('[Preview] Starting iframe-based server detection');
  };

  // Keep refs in sync
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  useEffect(() => { serverReadyRef.current = serverReady; }, [serverReady]);

  // Handle hot reload when files change
  const handleHotReload = (data?: { serverRestarted?: boolean; filePath?: string }) => {
    const serverRestarted = data?.serverRestarted || false;
    const filePath = data?.filePath || 'unknown';
    
    console.log(`[Preview] Performing hot reload (server restarted: ${serverRestarted}, file: ${filePath})`);
    setIsHotReloading(true);
    
    // If server was restarted, reset server ready state
    if (serverRestarted) {
      setServerReady(false);
      setLoadingTimeout(false);
    }
    
    // Add a delay to ensure backend file sync completes
    // Longer delay if server was restarted
    const delay = serverRestarted ? 3000 : 800;
    
    setTimeout(() => {
       // Prevent too frequent reloads
       const now = Date.now();
       const timeSinceLastReload = now - lastReloadTimeRef.current;
       const minReloadInterval = 2000; // Minimum 2 seconds between reloads
       
       if (timeSinceLastReload < minReloadInterval) {
         console.log('[Preview] Skipping reload - too soon since last reload');
         setIsHotReloading(false);
         return;
       }
       
       // Don't reload if already loading
       if (isLoadingRef.current) {
         console.log('[Preview] Skipping reload - already loading');
         setIsHotReloading(false);
         return;
       }
       
       if (iframeRef.current) {
         const iframe = iframeRef.current;
         
         // Reload by setting cache-busted URL directly (no blanking)
         const baseUrl = iframe.src.split('?')[0];
         const newSrc = `${baseUrl}?_t=${Date.now()}&_nocache=1`;
         
         console.log('[Preview] Reloading iframe with new URL:', newSrc);
         
         // Set loading state before reloading
         setIsLoading(true);
         isLoadingRef.current = true;
         lastReloadTimeRef.current = now;
         
         // Set new URL directly
         iframe.src = newSrc;

         // Start periodic retry every 2s until server becomes ready
         if (hotReloadRetryIntervalRef.current) {
           clearInterval(hotReloadRetryIntervalRef.current);
         }
         hotReloadRetryIntervalRef.current = setInterval(() => {
           if (serverReadyRef.current) {
             if (hotReloadRetryIntervalRef.current) {
               clearInterval(hotReloadRetryIntervalRef.current);
               hotReloadRetryIntervalRef.current = null;
             }
             return;
           }
           if (iframeRef.current) {
             const base = iframeRef.current.src.split('?')[0];
             iframeRef.current.src = `${base}?_t=${Date.now()}&_nocache=1`;
             console.log('[Preview] Retry reload tick (2s)');
           }
         }, 2000);

         // Schedule a single forced second-shot reload after 2.5s to catch nodemon restarts
         if (postReloadSecondShotTimeoutRef.current) {
           clearTimeout(postReloadSecondShotTimeoutRef.current);
         }
         const isLikelyCodeChange = /\.(js|jsx|ts|tsx|mjs|cjs|json|html|css)$/i.test(filePath);
         postReloadSecondShotTimeoutRef.current = setTimeout(() => {
           if (iframeRef.current) {
             const base = iframeRef.current.src.split('?')[0];
             iframeRef.current.src = `${base}?_t=${Date.now()}&_nocache=1&secondShot=1`;
             console.log('[Preview] Forced second-shot reload (2.5s)');
           }
         }, isLikelyCodeChange ? 2500 : 0);
       } else {
         // If iframe doesn't exist yet, just set loading state
         setIsLoading(true);
         isLoadingRef.current = true;
         lastReloadTimeRef.current = now;
       }
     }, delay);
    
         // Note: Hot reloading state is cleared in onLoad event for smoother transitions
  };



  // Set preview URL and setup hot reloading
  useEffect(() => {
    if (projectId) {
             // Reset states for new project
       setServerReady(false);
       setIsLoading(false);
       setIsHotReloading(false);
       setIsRefreshing(false);
       setLoadingTimeout(false);
       lastReloadTimeRef.current = 0;
      const url = `http://${projectId}.127.0.0.1.sslip.io/preview`;
      
      // Connect to preview Socket.IO server for hot reloading
      const previewSocket = io(`http://${projectId}.127.0.0.1.sslip.io`, {
        path: '/preview/socket.io',
        transports: ['websocket', 'polling']
      });
      
      previewSocketRef.current = previewSocket;
      
      // Join preview room
      previewSocket.emit('join:preview', { projectId });
      
      // Handle hot reload events
      previewSocket.on('preview:reload', (data) => {
        console.log('[Preview] Hot reload triggered:', data);
        handleHotReload(data);
      });
      
      // Handle connection events
      previewSocket.on('connect', () => {
        console.log('[Preview] Socket connected for hot reloading');
        
                 // Trigger preview server start and set URL immediately
         const triggerPreviewStart = async () => {
           try {
             console.log('[Preview] Triggering preview server start...');
             // Make a request to trigger server start
             await fetch(url, { 
               method: 'GET',
               mode: 'no-cors'
             });
             console.log('[Preview] Preview server start triggered');
           } catch (error) {
             console.log('[Preview] Preview server start triggered (expected CORS error):', error);
           }
           
           // Set preview URL immediately - the iframe will handle loading
           setPreviewUrl(url);
           setIsLoading(true);
           
            // Add a simple retry mechanism for initial load
            if (initialLoadRetryTimeoutRef.current) {
              clearTimeout(initialLoadRetryTimeoutRef.current);
            }
            initialLoadRetryTimeoutRef.current = setTimeout(() => {
              if (isLoadingRef.current && !serverReadyRef.current) {
               console.log('[Preview] Initial load timeout - triggering retry');
               // Force a retry by clearing and resetting the iframe
               if (iframeRef.current) {
                  const iframe = iframeRef.current;
                  const base = iframe.src.split('?')[0];
                  iframe.src = `${base}?_t=${Date.now()}&_nocache=1`;
               }
             }
            }, 8000); // 8 second timeout for initial load
         };
        
        triggerPreviewStart();
      });
      
      previewSocket.on('disconnect', () => {
        console.log('[Preview] Socket disconnected');
      });
      
             // Fallback: trigger preview start even if socket doesn't connect
       const fallbackTimeout = setTimeout(() => {
         if (!previewUrl) {
           console.log('[Preview] Fallback: triggering preview start without socket connection');
           setPreviewUrl(url);
           setIsLoading(true);
         }
       }, 2000); // 2 second fallback
      
             // Set a timeout to stop loading if it takes too long
        const loadingTimeout = setTimeout(() => {
          if (isLoadingRef.current) {
           setIsLoading(false);
           setLoadingTimeout(true);
           console.log('[Preview] Loading timeout reached - server may not be ready yet');
         }
       }, 60000); // 60 second timeout - give more time for server startup
      
             // Cleanup on unmount
       return () => {
         clearTimeout(loadingTimeout);
         clearTimeout(fallbackTimeout);
          if (initialLoadRetryTimeoutRef.current) {
            clearTimeout(initialLoadRetryTimeoutRef.current);
            initialLoadRetryTimeoutRef.current = null;
          }
          if (hotReloadAutoRefreshTimeoutRef.current) {
            clearTimeout(hotReloadAutoRefreshTimeoutRef.current);
            hotReloadAutoRefreshTimeoutRef.current = null;
          }
         if (serverCheckIntervalRef.current) {
           clearInterval(serverCheckIntervalRef.current);
         }
         if (previewSocket) {
           previewSocket.disconnect();
         }
       };
    }
  }, [projectId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIsLoading(true);
    
      // Reload iframe by setting a cache-busted URL directly
    if (iframeRef.current) {
      const iframe = iframeRef.current;
        const base = iframe.src.split('?')[0];
        iframe.src = `${base}?_t=${Date.now()}&_nocache=1`;
    } else {
      // If iframe doesn't exist yet, just set loading to false after delay
      setTimeout(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      }, 2000);
    }
    
    // Set a timeout to show error if loading takes too long
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }, 15000); // 15 second timeout for auto-start
  };

  return (
    <div className="h-full w-full flex flex-col relative">
      <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="text-sm font-medium text-gray-300">Preview</div>
          {isHotReloading && (
            <div className="flex items-center space-x-1 text-xs text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Hot Reloading</span>
            </div>
          )}
          {isLoading && !isHotReloading && (
            <div className="flex items-center space-x-1 text-xs text-blue-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>Loading</span>
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
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={toggleFullscreen}
             className="h-7 w-7 hover:bg-gray-700"
             title="Toggle Fullscreen"
           >
             {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
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
                 if (initialLoadRetryTimeoutRef.current) {
                   clearTimeout(initialLoadRetryTimeoutRef.current);
                   initialLoadRetryTimeoutRef.current = null;
                 }
                 if (hotReloadAutoRefreshTimeoutRef.current) {
                   clearTimeout(hotReloadAutoRefreshTimeoutRef.current);
                   hotReloadAutoRefreshTimeoutRef.current = null;
                 }
                 if (hotReloadRetryIntervalRef.current) {
                   clearInterval(hotReloadRetryIntervalRef.current);
                   hotReloadRetryIntervalRef.current = null;
                 }
                 setIsLoading(false);
                 isLoadingRef.current = false;
                 setIsRefreshing(false);
                 setServerReady(true);
                 serverReadyRef.current = true;
                 setLoadingTimeout(false);
                 if (isHotReloading) {
                   setTimeout(() => setIsHotReloading(false), 300);
                 }
               }}
               onError={() => {
                 if (!serverReadyRef.current && !isHotReloading) {
                   console.error('[Preview] Failed to load preview, retrying...');
                   setTimeout(() => {
                     if (iframeRef.current && !serverReadyRef.current) {
                       const iframe = iframeRef.current;
                       const base = iframe.src.split('?')[0];
                       iframe.src = `${base}?_t=${Date.now()}&_nocache=1`;
                     }
                   }, 2000);
                 }
               }}
             />
             {(isLoading || isHotReloading) && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60">
                 <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mb-2"></div>
                 <div className="text-gray-800 text-sm">Loading preview...</div>
                 <div className="text-gray-600 text-xs mt-1">
                   {isHotReloading ? 'Server restarting with nodemon...' : 'Starting preview server...'}
                 </div>
                 {!isHotReloading && (
                   <div className="text-gray-500 text-xs mt-1">This may take a few moments for the first load</div>
                 )}
                 {loadingTimeout && (
                   <div className="text-orange-500 text-xs mt-2">
                     Server is taking longer than expected. Try clicking the refresh button.
                   </div>
                 )}
               </div>
             )}
           </>
         ) : (
           <div className="flex flex-col items-center justify-center h-full">
             <div className="text-gray-800 text-sm">No preview available</div>
             <div className="text-gray-600 text-xs mt-2">Start your Node.js application to see the preview</div>
             <div className="text-gray-500 text-xs mt-1">Make sure you have an index.js, server.js, app.js, or main.js file</div>
           </div>
         )}
       </div>
    </div>
  );
};
