
import { useState, useEffect, useRef } from 'react';

export const Console = () => {
  const [logs, setLogs] = useState<{type: 'log' | 'error' | 'warn'; message: string}[]>([
    { type: 'log', message: '> Console ready' },
    { type: 'log', message: '> Try running your code to see outputs here' }
  ]);
  
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Simulate some console logs
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogs(prev => [
        ...prev,
        { type: 'log', message: '> Hello, world!' },
        { type: 'log', message: '> Loading environment variables...' },
        { type: 'log', message: '> Environment loaded successfully' },
        { type: 'warn', message: '> Warning: This is a simulated warning' },
        { type: 'error', message: '> Error: This is a simulated error' },
        { type: 'log', message: '> Initialization complete' }
      ]);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const getLogStyle = (type: 'log' | 'error' | 'warn') => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      default:
        return 'text-blue-300';
    }
  };

  return (
    <div 
      className="h-full w-full bg-gray-900/95 p-3 font-mono text-sm overflow-auto flex-1"
      ref={consoleRef}
    >
      {logs.map((log, i) => (
        <div 
          key={i} 
          className={`whitespace-pre-wrap mb-1.5 ${getLogStyle(log.type)} opacity-0 transition-opacity duration-200`}
          style={{
            animation: `fadeIn 0.3s ease forwards`,
            animationDelay: `${i * 0.1}s`
          }}
        >
          {log.message}
        </div>
      ))}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
