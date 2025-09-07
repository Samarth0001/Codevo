import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Play, Square, RotateCcw, X } from 'lucide-react';
import { useCollaboration } from '@/context/CollaborationContext';
import '@xterm/xterm/css/xterm.css';

interface ShellProps {
  socket?: Socket | null;
  onClose?: () => void;
}

export const Shell: React.FC<ShellProps> = ({ socket, onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [terminalId, setTerminalId] = useState<string>('');
  const { permissions } = useCollaboration();
  const canAccessTerminal = permissions?.canAccessTerminal || false;

  // Initialize terminal
  useEffect(() => {
    // console.log('[Shell] useEffect triggered - terminalRef.current:', !!terminalRef.current, 'terminalInstanceRef.current:', !!terminalInstanceRef.current);
    
    if (!terminalRef.current || terminalInstanceRef.current) return;

    // console.log('[Shell] Initializing xterm.js terminal');

    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      },
      allowTransparency: true,
      scrollback: 1000,
      rows: 20,
      cols: 60,
      convertEol: true,
      disableStdin: false
    });

    // Create addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    // Load addons
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    
    // Try to load WebGL addon for better performance
    try {
      const webglAddon = new WebglAddon();
      terminal.loadAddon(webglAddon);
      // console.log('[Shell] WebGL addon loaded successfully');
    } catch (error) {
      // console.log('[Shell] WebGL addon not available, using canvas renderer');
    }

    // Mount terminal to DOM
    terminal.open(terminalRef.current);
    
    // Store references
    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;
    
    // Fit the terminal to the container with a delay to ensure proper rendering
    setTimeout(() => {
      try {
        fitAddon.fit();
        // console.log('[Shell] Terminal fitted to container');
      } catch (error) {
        // console.log('[Shell] Error fitting terminal:', error);
      }
    }, 150);

    // Focus the terminal immediately
    setTimeout(() => {
      terminal.focus();
      // console.log('[Shell] Terminal focused');
    }, 100);

    // Handle terminal input
    terminal.onData((data: string) => {
      // console.log('[Shell] Terminal input received:', JSON.stringify(data), 'socket:', !!socket, 'isConnected:', isConnected, 'socket.connected:', socket?.connected);
      
      // Check if we can send input - either state is connected OR socket is actually connected
      const canSendInput = socket && (isConnected || socket.connected);
      
      if (canSendInput) {
        // console.log('[Shell] Sending terminal input:', JSON.stringify(data));
        socket.emit('terminal:input', { input: data });
        
        // If socket is connected but our state doesn't reflect it, update the state
        if (socket.connected && !isConnected) {
          // console.log('[Shell] Updating connection state to match socket state');
          setIsConnected(true);
        }
      } else {
        // console.log('[Shell] Cannot send input - socket or connection issue');
        // Try to reconnect if socket exists but not connected
        if (socket && !socket.connected) {
          // console.log('[Shell] Attempting to reconnect socket');
          socket.connect();
        }
      }
    });

    // Handle terminal resize
    terminal.onResize(({ cols, rows }) => {
      if (socket && isConnected) {
        // console.log(`[Shell] Terminal resized to ${cols}x${rows}`);
        socket.emit('terminal:resize', { cols, rows });
      }
    });

    setIsTerminalReady(true);
    // console.log('[Shell] Terminal initialized successfully');

    // Cleanup function
    return () => {
      // console.log('[Shell] Cleaning up terminal');
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
      }
      setIsTerminalReady(false);
    };
  }, []);

  // Handle socket connection and terminal events
  useEffect(() => {
    console.log('[Shell] Socket effect triggered - socket:', !!socket, 'isTerminalReady:', isTerminalReady, 'socket.connected:', socket?.connected);
    
    if (!socket || !isTerminalReady) return;

    // console.log('[Shell] Setting up socket event handlers');

    const handleConnect = () => {
      // console.log('[Shell] Socket connected');
      setIsConnected(true);
      
      // Start terminal session
      const replId = `repl_${Date.now()}`;
      setTerminalId(replId);
      // console.log('[Shell] Starting terminal session with replId:', replId);
      socket.emit('terminal:start', { replId });
    };

    const handleDisconnect = () => {
      // console.log('[Shell] Socket disconnected');
      setIsConnected(false);
    };

    const handleTerminalData = ({ data, pid }: { data: string; pid: number }) => {
      // console.log('[Shell] Received terminal data:', JSON.stringify(data), 'terminal instance:', !!terminalInstanceRef.current);
      if (terminalInstanceRef.current) {
        // console.log('[Shell] Writing data to terminal');
        terminalInstanceRef.current.write(data);
      } else {
        // console.log('[Shell] No terminal instance available');
      }
    };

    const handleTerminalInfo = (info: any) => {
      // console.log('[Shell] Received terminal info:', info);
      if (info && terminalInstanceRef.current) {
        // Terminal session info received, terminal is ready
        // console.log('[Shell] Terminal session established with PID:', info.pid);
        // Try to write a test message to see if terminal is working
        terminalInstanceRef.current.write('\r\n\x1b[1;32m[Terminal Ready]\x1b[0m\r\n$ ');
      }
    };

    // Set up event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('terminal:data', handleTerminalData);
    socket.on('terminal:info', handleTerminalInfo);

    // Check if socket is already connected and start terminal immediately
    if (socket.connected) {
      // console.log('[Shell] Socket already connected, starting terminal immediately');
      handleConnect();
    } else {
      // console.log('[Shell] Socket not connected yet, waiting for connect event');
    }

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('terminal:data', handleTerminalData);
      socket.off('terminal:info', handleTerminalInfo);
    };
  }, [socket, isTerminalReady]);

  // Handle initial socket connection state and page refresh scenarios
  useEffect(() => {
    // console.log('[Shell] Initial connection check - socket:', !!socket, 'socket.connected:', socket?.connected, 'isConnected:', isConnected, 'isTerminalReady:', isTerminalReady);
    
    // If socket is connected but our state doesn't reflect it (e.g., after page refresh)
    if (socket && socket.connected && !isConnected && isTerminalReady) {
      // console.log('[Shell] Socket already connected on mount (likely page refresh), setting connection state');
      setIsConnected(true);
      
      // Start terminal session
      const replId = `repl_${Date.now()}`;
      setTerminalId(replId);
      // console.log('[Shell] Starting terminal session with replId:', replId);
      socket.emit('terminal:start', { replId });
    }
  }, [socket, isTerminalReady, isConnected]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        // Trigger terminal resize event
        if (terminalInstanceRef.current) {
          const dims = fitAddonRef.current.proposeDimensions();
          if (dims) {
            terminalInstanceRef.current.resize(dims.cols, dims.rows);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Focus terminal when component mounts or when terminal becomes ready
  useEffect(() => {
    if (isTerminalReady && terminalInstanceRef.current) {
      // Small delay to ensure terminal is fully rendered
      setTimeout(() => {
        terminalInstanceRef.current?.focus();
      }, 100);
    }
  }, [isTerminalReady]);

  // Terminal control functions
  const handleClearTerminal = () => {
    if (socket && isConnected) {
      // console.log('[Shell] Clearing terminal');
      socket.emit('terminal:clear');
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.clear();
      }
    }
  };

  const handleRestartTerminal = () => {
    if (socket && isConnected) {
      // console.log('[Shell] Restarting terminal');
      socket.emit('terminal:clear');
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.clear();
      }
      // Start new terminal session
      const replId = `repl_${Date.now()}`;
      setTerminalId(replId);
      socket.emit('terminal:start', { replId });
    }
  };

  const handleReconnectTerminal = () => {
    if (socket && isConnected) {
      // console.log('[Shell] Attempting terminal reconnection');
      socket.emit('terminal:reconnect');
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 overflow-hidden">
      {!canAccessTerminal ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={24} />
            </div>
            <h3 className="text-lg font-medium mb-2">Terminal Access Restricted</h3>
            <p className="text-sm">Readers cannot access the terminal. Contact the project owner for editor access.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Terminal Controls */}
          <div className="flex items-center justify-around p-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-300">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {terminalId && (
                <span className="text-xs text-gray-400">ID: {terminalId}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReconnectTerminal}
                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-400"
                title="Reconnect terminal"
                disabled={!isConnected}
              >
                <RotateCcw size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestartTerminal}
                className="h-6 w-6 p-0 text-gray-400 hover:text-yellow-400"
                title="Restart terminal"
                disabled={!isConnected}
              >
                <Play size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearTerminal}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                title="Clear terminal"
                disabled={!isConnected}
              >
                <Square size={14} />
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                  title="Close terminal"
                >
                  <X size={14} />
                </Button>
              )}
            </div>
          </div>

          {/* Terminal Container */}
          <div 
            ref={terminalRef} 
            className="flex-1 p-2 cursor-text w-[100%] overflow-hidden pb-2"
            style={{ 
              height: 'calc(100% - 40px)',
              width: '100%',
              maxWidth: '100%',
              minWidth: '0',
              paddingBottom: '40px',
              position: 'relative',
              boxSizing: 'border-box'
            }}
            onClick={() => {
              if (terminalInstanceRef.current) {
                terminalInstanceRef.current.focus();
                // console.log('[Shell] Terminal focused via click');
              }
            }}
          >
            {!isTerminalReady && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p>Initializing terminal...</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
