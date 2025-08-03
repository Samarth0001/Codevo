// Polyfill WebSocket for y-websocket in Node.js
// @ts-ignore
global.WebSocket = require('ws');

import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import { TerminalManager } from './terminalManager';
import { FileSystemManager } from './fileSystemManager';
import { CollaborationManager } from './collaborationManager';
import { userJoinedProject, userActivity, userLeftProject } from './services/activityTracker';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  path: "/user/socket.io",
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Initialize managers
const terminalManager = new TerminalManager();
const fileSystemManager = new FileSystemManager();
const collaborationManager = new CollaborationManager(fileSystemManager);

// Periodic cleanup of inactive terminal sessions (every 10 minutes)
setInterval(() => {
  const cleanedCount = terminalManager.cleanupInactiveSessions(30 * 60 * 1000); // 30 minutes
  if (cleanedCount > 0) {
    console.log(`[Runner] Cleaned up ${cleanedCount} inactive terminal sessions`);
  }
}, 10 * 60 * 1000); // Check every 10 minutes


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

// Function to sync files from workspace to collaboration manager
async function syncWorkspaceToCollaboration(projectId: string) {
  try {
    const room = collaborationManager.getOrCreateRoom(projectId);
    const structure = await fileSystemManager.getFileStructure();
    
    console.log(`[syncWorkspaceToCollaboration] 🔄 Syncing ${structure.length} files from /workspace to collaboration manager`);
    
    let syncedCount = 0;
    for (const item of structure) {
      if (item.type === 'file' && item.path) {
        try {
          const content = await fileSystemManager.getFileContent(item.path);
          room.fileContents.set(item.path, content);
          syncedCount++;
          console.log(`[syncWorkspaceToCollaboration] 📄 Synced ${item.path} (${content.length} chars) to collaboration manager`);
        } catch (error) {
          console.error(`[syncWorkspaceToCollaboration] ❌ Error syncing ${item.path}:`, error);
        }
      }
    }
    
    console.log(`[syncWorkspaceToCollaboration] ✅ Sync completed: ${syncedCount} files synced to collaboration manager for project ${projectId}`);
  } catch (error) {
    console.error(`[syncWorkspaceToCollaboration] ❌ Error syncing workspace:`, error);
  }
}

io.on('connection', (socket: Socket) => {
  console.log(`[socket.io] Connected: ${socket.id}`);
  let currentProjectId: string | null = null;
  let currentUserId: string | null = null;

  // Join project room
  socket.on('join:project', ({ projectId, userInfo }: { projectId: string; userInfo?: { userId: string; username: string } }) => {
    console.log(`[socket.io] User ${socket.id} joining project: ${projectId}`);
    
    // Leave previous room if any
    if (currentProjectId) {
      socket.leave(currentProjectId);
      collaborationManager.leaveRoom(socket, currentProjectId);
      // Track user leaving previous project
      if (currentUserId) {
        userLeftProject(currentProjectId, currentUserId);
      }
    }

    // Join new room
    socket.join(projectId);
    currentProjectId = projectId;
    currentUserId = userInfo?.userId || null;

    // Join collaboration room
    if (userInfo) {
      collaborationManager.joinRoom(socket, projectId, userInfo);
      // Track user joining project
      userJoinedProject(projectId, userInfo.userId);
    }

    console.log(`[socket.io] User ${socket.id} joined project ${projectId}`);
  });

  // Project initialization - Load base code from workspace
  socket.on('project:initialize', async ({ projectId }: { projectId: string }) => {
    console.log(`[socket.io] Initializing project: ${projectId}`);
    
    try {
      // Get current file structure from workspace
      const structure = await fileSystemManager.getFileStructure();
      console.log(`[socket.io] Found ${structure.length} files in workspace`);
      
      let filesWithContent: any[] = [];

      if (structure.length === 0) {
        console.log(`[socket.io] Workspace is empty, creating default files`);
        // Create default files if workspace is empty
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
        console.log(`[socket.io] Loading existing files from workspace`);
        // Load content for existing files from workspace
        filesWithContent = await Promise.all(
          structure
            .filter(item => item.type === 'file' && item.path)
            .map(async (file) => {
              try {
                const content = await fileSystemManager.getFileContent(file.path!);
                console.log(`[socket.io] Loaded ${file.path} (${content.length} chars)`);
                return {
                  ...file,
                  content
                };
              } catch (error) {
                console.error(`[socket.io] Error loading ${file.path}:`, error);
                return {
                  ...file,
                  content: ''
                };
              }
            })
        );
      }

      // Update collaboration manager with file contents
      const room = collaborationManager.getOrCreateRoom(projectId);
      filesWithContent.forEach(file => {
        room.fileContents.set(file.path, file.content);
        room.fileVersions.set(file.path, 1); // Initialize version
      });

      // Send structure and content to client
      console.log(`[socket.io] Sending project initialization with ${filesWithContent.length} files`);
      filesWithContent.forEach(file => {
        console.log(`[socket.io] File ${file.path}:`, {
          contentType: typeof file.content,
          contentLength: file.content?.length,
          contentPreview: typeof file.content === 'string' ? file.content.substring(0, 50) : file.content
        });
      });
      
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
  socket.on('terminal:start', async ({ replId }: { replId: string }) => {
    console.log(`[socket.io] Starting terminal session for ${socket.id} with replId: ${replId}`);
    
    // Sync file structure from collaboration manager to workspace if project is active
    if (currentProjectId) {
      try {
        const room = collaborationManager.getOrCreateRoom(currentProjectId);
        console.log(`[socket.io] 🔄 Syncing ${room.fileContents.size} files from collaboration manager to /workspace for terminal`);
        
        // Write all files from collaboration manager to workspace
        for (const [path, content] of room.fileContents.entries()) {
          await fileSystemManager.saveFileContent(path, content);
          console.log(`[socket.io] 📄 Synced ${path} (${content.length} chars) to /workspace`);
        }
        console.log(`[socket.io] ✅ File sync completed for terminal - /workspace is now up to date`);
      } catch (error) {
        console.error(`[socket.io] ❌ Error syncing files for terminal:`, error);
      }
    }
    
    // Check if user already has a session for this project
    const existingSessionId = terminalManager.getUserSession(currentUserId || socket.id, currentProjectId || 'default');
    if (existingSessionId && terminalManager.hasSession(existingSessionId)) {
      console.log(`[socket.io] User already has active session ${existingSessionId}, reusing`);
      // Send session info to client
      const sessionInfo = terminalManager.getSessionInfo(existingSessionId);
      if (sessionInfo) {
        socket.emit('terminal:info', sessionInfo);
      }
      return;
    }
    
    const ptyProcess = terminalManager.createPty(socket.id, replId, (data: string, pid: number) => {
      console.log(`[socket.io] Terminal data from ${socket.id}:`, JSON.stringify(data));
      socket.emit('terminal:data', { data, pid });
    }, currentUserId || socket.id, currentProjectId || 'default');
    
    // Send session info to client after creating new session
    const sessionInfo = terminalManager.getSessionInfo(socket.id);
    if (sessionInfo) {
      console.log(`[socket.io] Sending session info for new terminal:`, sessionInfo);
      socket.emit('terminal:info', sessionInfo);
    }
  });

  socket.on('terminal:input', ({ input }: { input: string }) => {
    console.log(`[socket.io] Terminal input received from ${socket.id}:`, JSON.stringify(input));
    
    // Check for special commands (check for sync or files commands)
    if (input.includes('sync') && (input.includes('\r') || input.includes('\n'))) {
      // Special command to sync files from workspace to collaboration manager
      if (currentProjectId) {
        console.log(`[socket.io] 🔄 User requested sync: /workspace → collaboration manager for ${currentProjectId}`);
        syncWorkspaceToCollaboration(currentProjectId);
        // Send confirmation message with proper line breaks and prompt
        terminalManager.write(socket.id, '\r\n\x1b[1;32m✓ Files synced from /workspace to editor\x1b[0m\r\nroot@codevo:/workspace# ');
      }
    } else if (input.includes('files') && (input.includes('\r') || input.includes('\n'))) {
      // Special command to show current file structure
      if (currentProjectId) {
        const room = collaborationManager.getOrCreateRoom(currentProjectId);
        const fileList = Array.from(room.fileContents.keys());
        const fileOutput = fileList.length > 0 
          ? `\r\n\x1b[1;36mCurrent files in editor:\x1b[0m\r\n${fileList.map(f => `  • ${f}`).join('\r\n')}\r\nroot@codevo:/workspace# `
          : '\r\n\x1b[1;33mNo files in editor\x1b[0m\r\nroot@codevo:/workspace# ';
        terminalManager.write(socket.id, fileOutput);
      }
    } else {
      // Regular input - send to terminal
      terminalManager.write(socket.id, input);
    }
  });

  socket.on('terminal:clear', () => {
    console.log(`[socket.io] Clearing terminal session for ${socket.id}`);
    terminalManager.clear(socket.id);
  });

  socket.on('terminal:resize', ({ cols, rows }: { cols: number; rows: number }) => {
    console.log(`[socket.io] Resizing terminal for ${socket.id} to ${cols}x${rows}`);
    terminalManager.resize(socket.id, cols, rows);
  });

  socket.on('terminal:info', () => {
    const info = terminalManager.getSessionInfo(socket.id);
    socket.emit('terminal:info', info);
  });

  socket.on('terminal:reconnect', () => {
    console.log(`[socket.io] Terminal reconnection request from ${socket.id}`);
    
    // Check if user has an existing session for this project
    const existingSessionId = terminalManager.getUserSession(currentUserId || socket.id, currentProjectId || 'default');
    if (existingSessionId && terminalManager.hasSession(existingSessionId)) {
      console.log(`[socket.io] Reconnecting user to existing session ${existingSessionId}`);
      const sessionInfo = terminalManager.getSessionInfo(existingSessionId);
      if (sessionInfo) {
        socket.emit('terminal:info', sessionInfo);
        socket.emit('terminal:data', { 
          data: '\r\n\x1b[1;32m[Reconnected] Terminal session restored\x1b[0m\r\nroot@codevo:/workspace# ', 
          pid: sessionInfo.pid 
        });
      }
    } else {
      console.log(`[socket.io] No existing session found for user, starting new session`);
      socket.emit('terminal:data', { 
        data: '\r\n\x1b[1;33m[No existing session] Starting new terminal session\x1b[0m\r\nroot@codevo:/workspace# ', 
        pid: 0 
      });
    }
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
      if (!currentProjectId) {
        socket.emit('files:error', { message: 'No active project' });
        return;
      }

      const result = await collaborationManager.handleFileCreate(
        socket,
        currentProjectId,
        path,
        isFolder || false,
        socket.id
      );
      
      // Track user activity
      userActivity(currentProjectId);
      
      socket.emit('files:created', result.file);
    } catch (error) {
      console.error('Error creating file:', error);
      socket.emit('files:error', { message: 'Failed to create file' });
    }
  });

  socket.on('files:delete', async ({ path }: { path: string }) => {
    try {
      if (!currentProjectId) {
        socket.emit('files:error', { message: 'No active project' });
        return;
      }

      await collaborationManager.handleFileDelete(
        socket,
        currentProjectId,
        path,
        socket.id
      );
      
      // Track user activity
      userActivity(currentProjectId);
      
      socket.emit('files:deleted', path);
    } catch (error) {
      console.error('Error deleting file:', error);
      socket.emit('files:error', { message: 'Failed to delete file' });
    }
  });

  socket.on('files:rename', async ({ oldPath, newPath }: { oldPath: string; newPath: string }) => {
    try {
      if (!currentProjectId) {
        socket.emit('files:error', { message: 'No active project' });
        return;
      }

      await collaborationManager.handleFileRename(
        socket,
        currentProjectId,
        oldPath,
        newPath,
        socket.id
      );
      
      // Track user activity
      userActivity(currentProjectId);
      
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

  // Handle file content changes with collaboration
  socket.on('files:saveContent', async ({ path, content }: { path: string; content: string }) => {
    try {
      if (!currentProjectId) {
        console.error(`[socket.io] No current project for user ${socket.id}`);
        return;
      }

      // Use collaboration manager to handle the change
      const result = await collaborationManager.handleFileChange(
        socket, 
        currentProjectId, 
        path, 
        content,
        socket.id
      );

      // Save to file system
      await fileSystemManager.saveFileContent(path, content);

      // Track user activity
      userActivity(currentProjectId);

      socket.emit('files:contentSaved', { path, version: result.version });
    } catch (error) {
      console.error('Error saving file content:', error);
      socket.emit('files:error', { message: 'Failed to save file content' });
    }
  });

  // Handle user awareness updates
  socket.on('user:awareness', (awareness: { cursor?: any; selection?: any; activeFile?: string }) => {
    if (currentProjectId) {
      collaborationManager.updateAwareness(socket, currentProjectId, awareness);
      // Track user activity
      if (currentProjectId) {
        userActivity(currentProjectId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[socket.io] Disconnected: ${socket.id}`);
    
    // Clean up user from room
    if (currentProjectId) {
      collaborationManager.leaveRoom(socket, currentProjectId);
      // Track user leaving project
      if (currentUserId) {
        userLeftProject(currentProjectId, currentUserId);
      }
    }
    
    // Don't immediately clear terminal session to allow for reconnection
    // Instead, set a timeout to clear it after a delay
    setTimeout(() => {
      console.log(`[socket.io] Clearing terminal session for ${socket.id} after disconnect timeout`);
      terminalManager.clear(socket.id);
    }, 10000); // Keep terminal alive for 10 seconds to allow reconnection
  });
});

app.get('/', (_, res) => {
  res.send('Runner backend is running');
});

// Endpoint to send last update info to server
app.post('/sendLastUpdateInfo', (req, res) => {
  const { projectId } = req.body;
  if (!projectId) {
    res.status(400).json({ error: 'projectId is required' });
    return;
  }
  
  collaborationManager.sendLastUpdateInfo(projectId)
    .then(() => {
      res.json({ success: true, message: 'Last update info sent successfully' });
    })
    .catch((error) => {
      console.error('[Runner] Error sending last update info:', error);
      res.status(500).json({ error: 'Failed to send last update info' });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Runner server running on port ${PORT}`);
});

