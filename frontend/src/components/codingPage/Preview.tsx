
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, RefreshCw } from 'lucide-react';

export const Preview = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIsLoading(true);
    
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      setIsRefreshing(false);
    }, 1000);
  };

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full w-full flex flex-col relative">
      <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
        <div className="text-sm font-medium text-gray-300">Preview</div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7 w-7 hover:bg-gray-700"
          >
            <RefreshCw size={14} className={`${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullscreen}
            className="h-7 w-7 hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </Button>
        </div>
      </div>
      
      <div className={`flex-1 bg-white overflow-hidden ${isLoading ? 'flex items-center justify-center' : ''}`}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mb-2"></div>
            <div className="text-gray-800 text-sm">Loading preview...</div>
          </div>
        ) : (
          <iframe
            title="Preview"
            src="about:blank"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
};
