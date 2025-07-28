import { spawn, ChildProcess } from 'child_process';

const SHELL = process.platform === 'win32' ? 'cmd.exe' : 'bash';

export class TerminalManager {
  private sessions: { [id: string]: { process: ChildProcess; replId: string; } } = {};

  constructor() {
      this.sessions = {};
  }
  
  createPty(id: string, replId: string, onData: (data: string, pid: number) => void) {
      const childProcess = spawn(SHELL, [], {
          cwd: `/workspace`,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, TERM: 'xterm-256color' }
      });

      childProcess.stdout.on('data', (data: Buffer) => {
          onData(data.toString(), childProcess.pid || 0);
      });

      childProcess.stderr.on('data', (data: Buffer) => {
          onData(data.toString(), childProcess.pid || 0);
      });

      childProcess.on('error', (error: Error) => {
          console.error(`Terminal error for session ${id}:`, error);
          onData(`Error: ${error.message}\r\n`, childProcess.pid || 0);
      });

      this.sessions[id] = {
          process: childProcess,
          replId
      };

      childProcess.on('exit', (code: number | null) => {
          console.log(`Terminal session ${id} exited with code ${code}`);
          delete this.sessions[id];
      });

      return childProcess;
  }

  write(terminalId: string, data: string) {
      const session = this.sessions[terminalId];
      if (session && session.process && session.process.stdin) {
          try {
              session.process.stdin.write(data);
          } catch (error) {
              console.error(`Error writing to terminal ${terminalId}:`, error);
          }
      }
  }

  clear(terminalId: string) {
      const session = this.sessions[terminalId];
      if (session && session.process) {
          try {
              session.process.kill();
              delete this.sessions[terminalId];
          } catch (error) {
              console.error(`Error clearing terminal ${terminalId}:`, error);
          }
      }
  }

  resize(terminalId: string, cols: number, rows: number) {
      const session = this.sessions[terminalId];
      if (session && session.process) {
          // Note: This won't work with child_process, but we keep it for compatibility
          // In production, you'd want to use node-pty for proper terminal resizing
          console.log(`Terminal resize requested for ${terminalId}: ${cols}x${rows}`);
      }
  }

  getSessions() {
      return Object.keys(this.sessions);
  }
}