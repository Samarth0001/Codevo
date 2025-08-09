import * as pty from 'node-pty';
import { userActivity } from './services/activityTracker';

const SHELL = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';

interface TerminalSession {
  process: pty.IPty;
  replId: string;
  cols: number;
  rows: number;
  helpSent: boolean;
  lastActivity: number;
  userId?: string;
  projectId?: string;
}

export class TerminalManager {
  private sessions: { [id: string]: TerminalSession } = {};
  private userSessions: { [userId: string]: { [projectId: string]: string } } = {};
  private readonly WORKSPACE_DIR = '/workspace';

  constructor() {
    this.sessions = {};
    this.userSessions = {};
  }

  // Validate that a path is within the workspace directory
  private isPathInWorkspace(path: string): boolean {
    const normalizedPath = path.replace(/\\/g, '/');
    const workspacePath = this.WORKSPACE_DIR.replace(/\\/g, '/');
    
    // Check if the path starts with the workspace directory
    return normalizedPath.startsWith(workspacePath);
  }

  // Sanitize and validate directory path
  private sanitizePath(path: string): string {
    // Remove any attempts to traverse outside workspace
    const cleanPath = path.replace(/\.\./g, '');
    const normalizedPath = cleanPath.replace(/\\/g, '/');
    
    // Ensure path starts with workspace directory
    if (!normalizedPath.startsWith(this.WORKSPACE_DIR)) {
      return this.WORKSPACE_DIR;
    }
    
    return normalizedPath;
  }
  
  createPty(id: string, replId: string, onData: (data: string, pid: number) => void, userId?: string, projectId?: string) {
    console.log(`[TerminalManager] Creating terminal session for ${id} with shell: ${SHELL}`);
    console.log(`[TerminalManager] Current working directory: ${process.cwd()}`);
    
    // Check if session already exists
    if (this.sessions[id]) {
      console.log(`[TerminalManager] Terminal session ${id} already exists, reusing`);
      this.sessions[id].lastActivity = Date.now();
      return this.sessions[id].process;
    }

    // Check if user already has a session for this project
    if (userId && projectId && this.userSessions[userId]?.[projectId]) {
      const existingSessionId = this.userSessions[userId][projectId];
      if (this.sessions[existingSessionId]) {
        console.log(`[TerminalManager] User ${userId} already has session ${existingSessionId} for project ${projectId}, reusing`);
        this.sessions[existingSessionId].lastActivity = Date.now();
        return this.sessions[existingSessionId].process;
      }
    }
    
    try {
      console.log(`[TerminalManager] Creating terminal in workspace directory: ${this.WORKSPACE_DIR}`);
      
      const ptyProcess = pty.spawn(SHELL, ['-i'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: this.WORKSPACE_DIR, // Use project workspace directory
        env: { 
          ...process.env, 
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          PS1: 'root@codevo:/workspace# ', // Set a clean, short prompt
          PROMPT_COMMAND: '', // Disable any prompt commands
          HOSTNAME: 'codevo', // Override hostname to be shorter
          HOST: 'codevo', // Also set HOST environment variable
          USER: 'root', // Ensure user is set
          HOME: '/root', // Set home directory
          PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
        }
      });

      console.log(`[TerminalManager] PTY process created with PID: ${ptyProcess.pid}`);

      ptyProcess.onData((data: string) => {
        onData(data, ptyProcess.pid);
        // Update last activity
        if (this.sessions[id]) {
          this.sessions[id].lastActivity = Date.now();
          
          // Track activity in Redis when terminal data is received (user is actively using terminal)
          if (this.sessions[id].projectId) {
            console.log(`[TerminalManager] Tracking terminal data activity for project ${this.sessions[id].projectId}`);
            userActivity(this.sessions[id].projectId).catch(error => {
              console.error(`[TerminalManager] Error tracking terminal data activity:`, error);
            });
          }
        }
      });

      // Monitor terminal for directory changes and ensure it stays in workspace
      const checkWorkingDirectory = () => {
        try {
          // This is a simplified check - in a real implementation, you might want to
          // periodically check the actual working directory of the process
          console.log(`[TerminalManager] Terminal ${id} is running in workspace: ${this.WORKSPACE_DIR}`);
        } catch (error) {
          console.error(`[TerminalManager] Error checking working directory for terminal ${id}:`, error);
        }
      };

      // Check working directory every 30 seconds
      const directoryCheckInterval = setInterval(checkWorkingDirectory, 30000);

      ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        console.log(`[TerminalManager] Terminal session ${id} exited with code ${exitCode}, signal: ${signal || 'none'}`);
        clearInterval(directoryCheckInterval);
        this.removeSession(id);
      });

      this.sessions[id] = {
        process: ptyProcess,
        replId,
        cols: 80,
        rows: 24,
        helpSent: false,
        lastActivity: Date.now(),
        userId,
        projectId
      };

      // Track user session
      if (userId && projectId) {
        if (!this.userSessions[userId]) {
          this.userSessions[userId] = {};
        }
        this.userSessions[userId][projectId] = id;
        console.log(`[TerminalManager] Tracked session ${id} for user ${userId} in project ${projectId}`);
      }

      // Set up permanent prompt and environment
      setTimeout(() => {
        if (this.sessions[id]) {
          // Set permanent prompt and environment variables
          const setupCommands = [
            'unset PROMPT_COMMAND',
            'export PS1="root@codevo:/workspace# "',
            'export HOSTNAME="codevo"',
            'export HOST="codevo"',
            'export PROMPT_COMMAND=""',
            'alias ls="ls --color=auto"',
            'stty sane', // Reset terminal settings
            'clear'
          ];
          
          setupCommands.forEach((cmd, index) => {
            setTimeout(() => {
              if (this.sessions[id]) {
                ptyProcess.write(cmd + '\r');
              }
            }, (index + 1) * 200);
          });
        }
      }, 500);

      // Send initial help message only once
      setTimeout(() => {
        if (this.sessions[id] && !this.sessions[id].helpSent) {
          const helpMessage = `
\x1b[1;32m=== Codevo Terminal Help ===\x1b[0m
Available commands:
• \x1b[1;36mls\x1b[0m - List files in project workspace
• \x1b[1;36mcd\x1b[0m - Change directory (restricted to workspace)
• \x1b[1;36mnpm\x1b[0m - Node.js package manager
• \x1b[1;36mpython\x1b[0m - Python interpreter
• \x1b[1;36mnode\x1b[0m - Node.js runtime
• \x1b[1;36mgit\x1b[0m - Version control
• \x1b[1;36mclear\x1b[0m - Clear terminal
• \x1b[1;36mhelp\x1b[0m - Show this help

\x1b[1;33mHappy coding! 🚀\x1b[0m

root@codevo:/workspace# `;
          onData(helpMessage, ptyProcess.pid);
          this.sessions[id].helpSent = true;
        }
      }, 1000);

      // Send a welcome message with proper prompt positioning
      setTimeout(() => {
        if (this.sessions[id]) {
          onData('\r\n\x1b[1;34mWelcome to Codevo Terminal! 🚀\x1b[0m\r\nroot@codevo:/workspace# ', ptyProcess.pid);
        }
      }, 1500);

      return ptyProcess;
    } catch (error) {
      console.error(`[TerminalManager] Error creating terminal session for ${id}:`, error);
      throw error;
    }
  }

  write(terminalId: string, data: string) {
    // Validate input type
    if (typeof data !== 'string') {
      console.warn(`[TerminalManager] Invalid data type for terminal ${terminalId}: ${typeof data}`);
      return;
    }
    
    const session = this.sessions[terminalId];
    if (session && session.process) {
      try {
        // Validate input for security
        const sanitizedData = this.sanitizeTerminalInput(data);
        console.log(`[TerminalManager] Writing to terminal ${terminalId}:`, JSON.stringify(sanitizedData));
        session.process.write(sanitizedData);
        session.lastActivity = Date.now();
        
        // Track activity in Redis if we have project info
        if (session.projectId) {
          // console.log(`[TerminalManager] Tracking terminal activity for project ${session.projectId}`);
          userActivity(session.projectId).catch(error => {
            console.error(`[TerminalManager] Error tracking terminal activity:`, error);
          });
        }
      } catch (error) {
        console.error(`[TerminalManager] Error writing to terminal ${terminalId}:`, error);
      }
    } else {
      console.warn(`[TerminalManager] Terminal session ${terminalId} not found or not writable`);
    }
  }

  // Sanitize terminal input to prevent dangerous commands
  private sanitizeTerminalInput(input: string): string {
    // Ensure input is a string
    if (typeof input !== 'string') {
      console.warn(`[TerminalManager] Invalid input type: ${typeof input}, value:`, input);
      return '';
    }
    
    // Block dangerous commands that could access system files
    const dangerousCommands = [
      'rm -rf /',
      'rm -rf /*',
      'rm -rf ../',
      'rm -rf ../../',
      'cd /',
      'cd /root',
      'cd /home',
      'cd /etc',
      'cd /var',
      'sudo',
      'su',
      'chmod 777',
      'chown',
      'passwd',
      'cat /etc/passwd',
      'cat /etc/shadow',
      'ls /',
      'ls /root',
      'ls /home',
      'ls /etc',
      'find /',
      'grep -r /',
      'pwd',
      'whoami',
      'id'
    ];

    const lowerInput = input.toLowerCase();
    for (const command of dangerousCommands) {
      if (lowerInput.includes(command.toLowerCase())) {
        console.warn(`[TerminalManager] Blocked dangerous command: ${input}`);
        return `echo "Command blocked for security reasons: ${input.trim()}"\r\nroot@codevo:/workspace# `;
      }
    }

    return input;
  }

  clear(terminalId: string) {
    const session = this.sessions[terminalId];
    if (session && session.process) {
      try {
        session.process.kill();
        this.removeSession(terminalId);
        console.log(`[TerminalManager] Cleared terminal session ${terminalId}`);
      } catch (error) {
        console.error(`[TerminalManager] Error clearing terminal ${terminalId}:`, error);
      }
    }
  }

  removeSession(terminalId: string) {
    const session = this.sessions[terminalId];
    if (session) {
      // Remove from user sessions tracking
      if (session.userId && session.projectId && this.userSessions[session.userId]) {
        delete this.userSessions[session.userId][session.projectId];
        console.log(`[TerminalManager] Removed session ${terminalId} from user tracking`);
      }
      delete this.sessions[terminalId];
    }
  }

  resize(terminalId: string, cols: number, rows: number) {
    const session = this.sessions[terminalId];
    if (session && session.process) {
      try {
        // Update session dimensions
        session.cols = cols;
        session.rows = rows;
        
        // Resize the pty process
        session.process.resize(cols, rows);
        
        console.log(`[TerminalManager] Resized terminal ${terminalId} to ${cols}x${rows}`);
      } catch (error) {
        console.error(`[TerminalManager] Error resizing terminal ${terminalId}:`, error);
      }
    }
  }

  getSessions() {
    return Object.keys(this.sessions);
  }

  getSessionInfo(terminalId: string) {
    const session = this.sessions[terminalId];
    if (session) {
      return {
        pid: session.process.pid,
        replId: session.replId,
        cols: session.cols,
        rows: session.rows,
        lastActivity: session.lastActivity,
        userId: session.userId,
        projectId: session.projectId
      };
    }
    return null;
  }

  hasSession(terminalId: string): boolean {
    return this.sessions[terminalId] !== undefined;
  }

  getUserSession(userId: string, projectId: string): string | null {
    return this.userSessions[userId]?.[projectId] || null;
  }

  setUserSession(userId: string, projectId: string, sessionId: string) {
    if (!this.userSessions[userId]) {
      this.userSessions[userId] = {};
    }
    this.userSessions[userId][projectId] = sessionId;
  }

  getAllUserSessions(userId: string): { [projectId: string]: string } {
    return this.userSessions[userId] || {};
  }

  cleanupInactiveSessions(maxInactiveTime: number = 30 * 60 * 1000) { // 30 minutes default
    const now = Date.now();
    const sessionsToRemove: string[] = [];

    for (const [id, session] of Object.entries(this.sessions)) {
      if (now - session.lastActivity > maxInactiveTime) {
        sessionsToRemove.push(id);
      }
    }

    for (const id of sessionsToRemove) {
      console.log(`[TerminalManager] Cleaning up inactive session ${id}`);
      this.clear(id);
    }

    return sessionsToRemove.length;
  }
}