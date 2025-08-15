
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
  const [logs, setLogs] = useState<{type: 'log' | 'error' | 'warn' | 'command' | 'output-label'; message: string}[]>([
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
        { type: 'log', message: '> Executing code...' }
      ]);
    }
  }, [isExecuting]);

  // Process output to identify commands and color them
  const processOutput = (output: string) => {
    const lines = output.split('\n');
    const processedLines: {type: 'log' | 'command'; message: string}[] = [];
    
    for (const line of lines) {
      // Skip dotenv injection messages
      if (line.includes('[dotenv@') && line.includes('injecting env')) {
        continue;
      }
      
      // Check if line looks like a command (starts with common command patterns)
      const trimmedLine = line.trim();
      const isCommand = /^(npm|node|python|git|cd|ls|cat|echo|curl|wget|npm install|npm run|npm start|npm test|python3|pip|pip3)/.test(trimmedLine) ||
                       /^root@codevo:.*#/.test(line) || // Terminal prompt
                       /^[a-zA-Z0-9_]+@[a-zA-Z0-9_]+:.*[$#]/.test(line); // General terminal prompt
      
      if (isCommand && trimmedLine) {
        processedLines.push({ type: 'command', message: line });
      } else {
        processedLines.push({ type: 'log', message: line });
      }
    }
    
    return processedLines;
  };

  // Handle execution results
  useEffect(() => {
    if (executionResult) {
      const newLogs: {type: 'log' | 'error' | 'warn' | 'command' | 'output-label'; message: string}[] = [];
      
      // Add execution result header
      if (executionResult.success) {
        newLogs.push({ type: 'command', message: `> Code executed successfully in ${executionResult.executionTime}ms` });
      } else {
        newLogs.push({ type: 'error', message: `> Code execution failed in ${executionResult.executionTime}ms` });
      }

      // Add output if any
      if (executionResult.output) {
        newLogs.push({ type: 'output-label', message: `> Output:` });
        const processedOutput = processOutput(executionResult.output);
        newLogs.push(...processedOutput);
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

  const getLogStyle = (type: 'log' | 'error' | 'warn' | 'command' | 'output-label') => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'command':
        return 'text-yellow-400';
      case 'output-label':
        return 'text-blue-300';
      default:
        return 'text-white';
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
