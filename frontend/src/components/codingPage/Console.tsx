
import { useState, useEffect, useRef } from 'react';

interface ExecutionResult {
  success: boolean;
  output: string;
  error: string;
  executionTime: number;
}

interface ConsoleProps {
  executionResult?: ExecutionResult | null;
  isExecuting?: boolean;
}

export const Console = ({ executionResult, isExecuting }: ConsoleProps) => {
  const [logs, setLogs] = useState<{type: 'log' | 'error' | 'warn'; message: string}[]>([
    { type: 'log', message: '> Console ready' },
    { type: 'log', message: '> Click the Run button to execute your code' }
  ]);
  
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle execution results
  useEffect(() => {
    if (isExecuting) {
      setLogs(prev => [
        ...prev,
        { type: 'log', message: '> 🚀 Executing code...' }
      ]);
    }
  }, [isExecuting]);

  // Handle execution results
  useEffect(() => {
    if (executionResult) {
      const newLogs: {type: 'log' | 'error' | 'warn'; message: string}[] = [];
      
      // Add execution result header
      if (executionResult.success) {
        newLogs.push({ type: 'log', message: `> ✅ Code executed successfully in ${executionResult.executionTime}ms` });
      } else {
        newLogs.push({ type: 'error', message: `> ❌ Code execution failed in ${executionResult.executionTime}ms` });
      }

      // Add output if any
      if (executionResult.output) {
        newLogs.push({ type: 'log', message: `> Output:\n${executionResult.output}` });
      }

      // Add error if any
      if (executionResult.error) {
        newLogs.push({ type: 'error', message: `> Error:\n${executionResult.error}` });
      }

      // Add separator
      newLogs.push({ type: 'log', message: '> ' + '─'.repeat(50) });

      setLogs(prev => [...prev, ...newLogs]);
    }
  }, [executionResult]);

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
