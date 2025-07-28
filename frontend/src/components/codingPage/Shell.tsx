import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Socket } from 'socket.io-client';

interface ShellProps {
  socket?: Socket | null;
}

export const Shell = ({ socket }: ShellProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    // Initialize terminal
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1E1E1E',
        foreground: '#A9B7C6',
        cursor: '#FFFFFF',
        black: '#000000',
        brightBlack: '#555555',
        red: '#FF5555',
        brightRed: '#FF5555',
        green: '#50FA7B',
        brightGreen: '#50FA7B',
        yellow: '#F1FA8C',
        brightYellow: '#F1FA8C',
        blue: '#BD93F9',
        brightBlue: '#BD93F9',
        magenta: '#FF79C6',
        brightMagenta: '#FF79C6',
        cyan: '#8BE9FD',
        brightCyan: '#8BE9FD',
        white: '#F8F8F2',
        brightWhite: '#FFFFFF'
      }
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();
    
    term.write('Welcome to Codevo Terminal\r\n\r\n$ ');
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle terminal input
    term.onData((data) => {
      if (socket) {
        socket.emit('terminal:input', { input: data });
      }
      term.write(data);
    });

    // Start terminal session
    if (socket) {
      socket.emit('terminal:start', { replId: 'default' });
    }

    return () => {
      term.dispose();
    };
  }, [socket]);

  // Handle terminal data from runner
  useEffect(() => {
    if (!socket || !xtermRef.current) return;

    const handleTerminalData = ({ data }: { data: string }) => {
      xtermRef.current?.write(data);
    };

    socket.on('terminal:data', handleTerminalData);

    return () => {
      socket.off('terminal:data', handleTerminalData);
    };
  }, [socket]);

  return (
    <div 
      ref={terminalRef} 
      className="h-full w-full"
      style={{ padding: '8px' }}
    />
  );
};
