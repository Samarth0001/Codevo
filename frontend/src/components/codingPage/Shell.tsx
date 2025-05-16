
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export const Shell = () => {
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
    
    term.onKey(e => {
      const ev = e.domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;
      
      if (ev.keyCode === 13) { // Enter key
        const line = term.buffer.active.getLine(term.buffer.active.cursorY)?.translateToString() || '';
        const command = line.substring(line.lastIndexOf('$ ') + 2).trim();
        
        term.write('\r\n');
        
        if (command) {
          handleCommand(command, term);
        }
        
        term.write('$ ');
      } else if (ev.keyCode === 8) { // Backspace
        // Check if cursor is after the prompt
        const line = term.buffer.active.getLine(term.buffer.active.cursorY)?.translateToString() || '';
        const cursorX = term.buffer.active.cursorX;
        const promptIndex = line.lastIndexOf('$ ') + 2;
        
        if (cursorX > promptIndex) {
          term.write('\b \b');
        }
      } else if (printable) {
        term.write(e.key);
      }
    });
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    
    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });
    
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }
    
    return () => {
      term.dispose();
      resizeObserver.disconnect();
    };
  }, []);
  
  const handleCommand = (command: string, term: Terminal) => {
    switch (command.toLowerCase()) {
      case 'help':
        term.write('Available commands: help, clear, ls, echo [text], date\r\n');
        break;
      case 'clear':
        term.clear();
        break;
      case 'ls':
        term.write('src/ public/ package.json README.md\r\n');
        break;
      case 'date':
        term.write(`${new Date().toString()}\r\n`);
        break;
      default:
        if (command.startsWith('echo ')) {
          term.write(`${command.substring(5)}\r\n`);
        } else {
          term.write(`Command not found: ${command}. Type 'help' for available commands.\r\n`);
        }
        break;
    }
  };

  // Resize terminal on window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      className="h-full w-full bg-gray-900"
      ref={terminalRef}
    />
  );
};
