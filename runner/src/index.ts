// Polyfill WebSocket for y-websocket in Node.js
// @ts-ignore
global.WebSocket = require('ws');

import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import { TerminalManager } from './terminalManager';
import { FileSystemManager } from './fileSystemManager';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  path: "/user/socket.io",
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Project rooms for multi-user collaboration
interface ProjectRoom {
  projectId: string;
  users: Set<string>;
  fileContents: Map<string, string>;
  debounceTimers: Map<string, NodeJS.Timeout>;
}

const projectRooms = new Map<string, ProjectRoom>();

// Debounce function for file content updates
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Simple diff function for efficient updates
function getDiff(oldContent: string, newContent: string): { type: 'full' | 'patch', data: any } {
  // For now, send full content if difference is significant (>50% change)
  // In production, use proper diff libraries like diff-match-patch
  const maxLength = Math.max(oldContent.length, newContent.length);
  const diffLength = Math.abs(oldContent.length - newContent.length);
  
  if (diffLength > maxLength * 0.5) {
    return { type: 'full', data: newContent };
  }
  
  return { type: 'full', data: newContent }; // Simplified for now
}

const terminalManager = new TerminalManager();
const fileSystemManager = new FileSystemManager();

io.on('connection', (socket: Socket) => {
  console.log(`[socket.io] Connected: ${socket.id}`);
  let currentProjectId: string | null = null;

  // Join project room
  socket.on('join:project', ({ projectId }: { projectId: string }) => {
    console.log(`[socket.io] User ${socket.id} joining project: ${projectId}`);
    
    // Leave previous room if any
    if (currentProjectId) {
      socket.leave(currentProjectId);
      const prevRoom = projectRooms.get(currentProjectId);
      if (prevRoom) {
        prevRoom.users.delete(socket.id);
        if (prevRoom.users.size === 0) {
          projectRooms.delete(currentProjectId);
        }
      }
    }

    // Join new room
    socket.join(projectId);
    currentProjectId = projectId;

    // Get or create project room
    let room = projectRooms.get(projectId);
    if (!room) {
      room = {
        projectId,
        users: new Set(),
        fileContents: new Map(),
        debounceTimers: new Map()
      };
      projectRooms.set(projectId, room);
    }

    room.users.add(socket.id);
    console.log(`[socket.io] User ${socket.id} joined project ${projectId}. Total users: ${room.users.size}`);
  });

  // Project initialization
  socket.on('project:initialize', async ({ projectId }: { projectId: string }) => {
    console.log(`[socket.io] Initializing project: ${projectId}`);
    
    try {
      // Check if workspace is empty and create default files
      const structure = await fileSystemManager.getFileStructure();
      let filesWithContent: any[] = [];

      if (structure.length === 0) {
        // Create default files
        const defaultFiles = [
          { path: 'index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Project</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <script src="main.js"></script>\n</body>\n</html>' },
          { path: 'main.js', content: 'console.log("Hello from Codevo!");\n\n// Start coding here...' },
          { path: 'styles.css', content: 'body {\n  font-family: Arial, sans-serif;\n  margin: 20px;\n}\n\nh1 {\n  color: #333;\n}' },
          { path: 'README.md', content: '# My Project\n\nWelcome to your new project!\n\n## Getting Started\n\n1. Edit the files in the editor\n2. See live preview\n3. Use the terminal for commands\n\nHappy coding!' }
        ];

        for (const file of defaultFiles) {
          await fileSystemManager.createFile(file.path, false);
          await fileSystemManager.saveFileContent(file.path, file.content);
        }

        // Get updated structure and content
        const updatedStructure = await fileSystemManager.getFileStructure();
        filesWithContent = await Promise.all(
          updatedStructure
            .filter(item => item.type === 'file' && item.path)
            .map(async (file) => ({
              ...file,
              content: await fileSystemManager.getFileContent(file.path!)
            }))
        );
      } else {
        // Get content for existing files
        filesWithContent = await Promise.all(
          structure
            .filter(item => item.type === 'file' && item.path)
            .map(async (file) => ({
              ...file,
              content: await fileSystemManager.getFileContent(file.path!)
            }))
        );
      }

      // Update room's file contents
      const room = projectRooms.get(projectId);
      if (room) {
        filesWithContent.forEach(file => {
          room.fileContents.set(file.path, file.content);
        });
      }

      socket.emit('project:initialized', {
        structure: structure.length === 0 ? filesWithContent.map(f => ({ id: f.id, name: f.name, type: f.type, path: f.path })) : structure,
        filesWithContent,
        projectId
      });

      console.log(`[socket.io] Project ${projectId} initialized with ${filesWithContent.length} files`);
    } catch (error) {
      console.error(`[socket.io] Error initializing project ${projectId}:`, error);
      socket.emit('project:error', { message: 'Failed to initialize project' });
    }
  });

  // Terminal Events
  socket.on('terminal:start', ({ replId }: { replId: string }) => {
    terminalManager.createPty(socket.id, replId, (data: string, pid: number) => {
      socket.emit('terminal:data', { data, pid });
    });
  });

  socket.on('terminal:input', ({ input }: { input: string }) => {
    terminalManager.write(socket.id, input);
  });

  socket.on('terminal:clear', () => {
    terminalManager.clear(socket.id);
  });

  // File System Events
  socket.on('files:getStructure', async () => {
    try {
      const structure = await fileSystemManager.getFileStructure();
      socket.emit('files:structure', structure);
    } catch (error) {
      console.error('Error getting file structure:', error);
      socket.emit('files:error', { message: 'Failed to get file structure' });
    }
  });

  socket.on('files:create', async ({ path, isFolder }: { path: string; isFolder?: boolean }) => {
    try {
      const file = await fileSystemManager.createFile(path, isFolder || false);
      
      // Broadcast to all users in the project
      if (currentProjectId) {
        socket.to(currentProjectId).emit('files:created', file);
      }
      
      socket.emit('files:created', file);
    } catch (error) {
      console.error('Error creating file:', error);
      socket.emit('files:error', { message: 'Failed to create file' });
    }
  });

  socket.on('files:delete', async ({ path }: { path: string }) => {
    try {
      await fileSystemManager.deleteFile(path);
      
      // Remove from room's file contents
      const room = projectRooms.get(currentProjectId!);
      if (room) {
        room.fileContents.delete(path);
      }
      
      // Broadcast to all users in the project
      if (currentProjectId) {
        socket.to(currentProjectId).emit('files:deleted', path);
      }
      
      socket.emit('files:deleted', path);
    } catch (error) {
      console.error('Error deleting file:', error);
      socket.emit('files:error', { message: 'Failed to delete file' });
    }
  });

  socket.on('files:rename', async ({ oldPath, newPath }: { oldPath: string; newPath: string }) => {
    try {
      await fileSystemManager.renameFile(oldPath, newPath);
      
      // Update room's file contents
      const room = projectRooms.get(currentProjectId!);
      if (room) {
        const content = room.fileContents.get(oldPath);
        if (content !== undefined) {
          room.fileContents.delete(oldPath);
          room.fileContents.set(newPath, content);
        }
      }
      
      // Broadcast to all users in the project
      if (currentProjectId) {
        socket.to(currentProjectId).emit('files:renamed', { oldPath, newPath });
      }
      
      socket.emit('files:renamed', { oldPath, newPath });
    } catch (error) {
      console.error('Error renaming file:', error);
      socket.emit('files:error', { message: 'Failed to rename file' });
    }
  });

  socket.on('files:getContent', async ({ path }: { path: string }) => {
    try {
      const content = await fileSystemManager.getFileContent(path);
      socket.emit('files:content', { path, content });
    } catch (error) {
      console.error('Error getting file content:', error);
      socket.emit('files:error', { message: 'Failed to get file content' });
    }
  });

  // Debounced file content saving with broadcasting
  socket.on('files:saveContent', async ({ path, content }: { path: string; content: string }) => {
    try {
      const room = projectRooms.get(currentProjectId!);
      if (!room) {
        console.error(`[socket.io] No room found for project ${currentProjectId}`);
        return;
      }

      // Update room's file contents
      const oldContent = room.fileContents.get(path) || '';
      room.fileContents.set(path, content);

      // Broadcast to other users in the project
      if (currentProjectId) {
        const diff = getDiff(oldContent, content);
        socket.to(currentProjectId).emit('files:contentUpdated', { 
          path, 
          content: diff.data,
          diffType: diff.type,
          updatedBy: socket.id 
        });
      }

      // Debounce persistence to worker
      const existingTimer = room.debounceTimers.get(path);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const debouncedSave = debounce(async (filePath: string, fileContent: string) => {
        try {
          await fileSystemManager.saveFileContent(filePath, fileContent);
          console.log(`[socket.io] Debounced save completed for ${filePath}`);
          
          // TODO: Send to worker for persistence
          // workerSocket.emit('persist:file', { path: filePath, content: fileContent });
        } catch (error) {
          console.error(`[socket.io] Error in debounced save for ${filePath}:`, error);
        }
      }, 500);

      const timer = setTimeout(() => debouncedSave(path, content), 500);
      room.debounceTimers.set(path, timer);

      socket.emit('files:contentSaved', { path });
    } catch (error) {
      console.error('Error saving file content:', error);
      socket.emit('files:error', { message: 'Failed to save file content' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[socket.io] Disconnected: ${socket.id}`);
    
    // Clean up user from room
    if (currentProjectId) {
      const room = projectRooms.get(currentProjectId);
      if (room) {
        room.users.delete(socket.id);
        if (room.users.size === 0) {
          // Clean up empty room
          projectRooms.delete(currentProjectId);
          console.log(`[socket.io] Removed empty room for project ${currentProjectId}`);
        }
      }
    }
    
    terminalManager.clear(socket.id);
  });
});

app.get('/', (_, res) => {
  res.send('Runner backend is running');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Runner server running on port ${PORT}`);
});

