// @ts-ignore
global.WebSocket = require('ws');

import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import { TerminalManager } from './terminalManager';
import { FileSystemManager } from './fileSystemManager';
import { CollaborationManager } from './collaborationManager';
import { PreviewManager } from './previewManager';
import { DependencyManager } from './dependencyManager';
import { userJoinedProject, userActivity, userLeftProject } from './services/activityTracker';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Main Socket.IO server for user interactions
const io = new SocketIOServer(server, {
  path: "/user/socket.io",
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Preview Socket.IO server for hot reloading
const previewIo = new SocketIOServer(server, {
  path: "/preview/socket.io",
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});



// Initialize managers
const terminalManager = new TerminalManager();
const fileSystemManager = new FileSystemManager();
const collaborationManager = new CollaborationManager(fileSystemManager);
const previewManager = new PreviewManager(fileSystemManager);

// Set up file system change notifications
fileSystemManager.onFileChange(async (event: string, filePath: string) => {
  // Track file system activity in Redis for all connected projects
  const allSessions = terminalManager.getSessions();
  const activeProjects = new Set<string>();
  
  allSessions.forEach(sessionId => {
    const sessionInfo = terminalManager.getSessionInfo(sessionId);
    if (sessionInfo && sessionInfo.projectId) {
      activeProjects.add(sessionInfo.projectId);
    }
  });
  
  activeProjects.forEach(projectId => {
    userActivity(projectId).catch(error => {
      // console.error(`[Runner] Error tracking file system activity:`, error);
    });
  });
  
  // Auto-sync file changes from workspace to collaboration manager
  // This handles changes made by terminal commands (like npm install)
  if (event === 'change' && activeProjects.size > 0) {
    try {
      // Read the updated file content from file system
      const updatedContent = await fileSystemManager.getFileContent(filePath);
      
      // Update all active projects' collaboration managers
      for (const projectId of activeProjects) {
        await collaborationManager.handleWorkspaceFileChange(projectId, filePath, updatedContent);
      }
      
      console.log(`[Runner] ✅ Synced workspace change to collaboration manager: ${filePath}`);
    } catch (error) {
      console.error(`[Runner] ❌ Error auto-syncing file change for ${filePath}:`, error);
    }
  }
  
  // Notify all connected clients about the file structure change
  io.emit('files:structureChanged', {
    event,
    path: filePath,
    timestamp: Date.now()
  });
  
  // If it's a directory addition (like node_modules), refresh the structure
  if (event === 'add' && filePath === 'node_modules') {
    io.emit('files:nodeModulesCreated', {
      path: filePath,
      timestamp: Date.now()
    });
  }
  
  // If it's a force refresh event, notify all clients
  if (event === 'change' && filePath === 'file-structure-refresh') {
    io.emit('files:structureChanged', {
      event: 'force-refresh',
      path: 'file-structure-refresh',
      timestamp: Date.now()
    });
  }
  
  // Hot reload notification for preview
  // Only trigger for relevant file changes (not node_modules, etc.)
  const isRelevantFile = !filePath.includes('node_modules') && 
                        !filePath.includes('.git') && 
                        !filePath.includes('package-lock.json') &&
                        !filePath.includes('.DS_Store');
  
  if (isRelevantFile && (event === 'change' || event === 'add' || event === 'unlink')) {
    console.log(`[Preview] Hot reload triggered for: ${filePath}`);
    
    // Get all active projects and notify their preview rooms
    const allSessions = terminalManager.getSessions();
    const activeProjects = new Set<string>();
    
    allSessions.forEach(sessionId => {
      const sessionInfo = terminalManager.getSessionInfo(sessionId);
      if (sessionInfo && sessionInfo.projectId) {
        activeProjects.add(sessionInfo.projectId);
      }
    });
    
    // Check if this file change should trigger a server restart
    const shouldRestart = previewManager.shouldRestartForFile(filePath);
    
    if (shouldRestart) {
      console.log(`[Preview] Important file changed (${filePath}), restarting preview server`);
      
      // Special handling for package.json changes
      if (filePath.includes('package.json')) {
        try {
          await previewManager.handlePackageJsonChange();
          console.log(`[Preview] ✅ Dependencies updated for package.json change`);
        } catch (error) {
          console.error(`[Preview] ❌ Failed to update dependencies:`, error);
        }
      }
      
      // Restart preview server for all active projects
      for (const projectId of activeProjects) {
        try {
          await previewManager.restartPreviewServer(projectId);
          console.log(`[Preview] ✅ Preview server restarted for project ${projectId}`);
        } catch (error) {
          console.error(`[Preview] ❌ Failed to restart preview server for project ${projectId}:`, error);
        }
      }
    }
    
    // For workspace-initiated changes (like npm install), we don't need to sync collaboration to workspace
    // because the workspace already has the correct content
    // We only need to sync collaboration to workspace for editor-initiated changes
    // But since we can't easily distinguish the source, we'll add a small delay and let the preview reload
    
    // Add a small delay to ensure any file operations complete before hot reload
    setTimeout(() => {
      // Emit to all active preview rooms
      activeProjects.forEach(projectId => {
        previewIo.to(`preview:${projectId}`).emit('preview:reload', {
          filePath,
          event,
          timestamp: Date.now(),
          // Inform client only if server actually restarted; with nodemon we typically do not mark true here
          serverRestarted: shouldRestart
        });
      });
    }, shouldRestart ? 2500 : 500); // Give nodemon and proxy a touch more time
  }
});

// Periodic file structure refresh as fallback (every 15 seconds)
setInterval(async () => {
  try {
    console.log(`[Runner] Periodic file structure refresh`);
    const structure = await fileSystemManager.getFileStructure();
    
    // Check if node_modules exists but wasn't detected by file watcher
    const hasNodeModules = structure.some(item => item.name === 'node_modules' && item.type === 'folder');
    
    if (hasNodeModules) {
      console.log(`[Runner] node_modules detected in periodic refresh`);
      io.emit('files:nodeModulesCreated', {
        path: 'node_modules',
        timestamp: Date.now()
      });
    }
    
    // Periodic sync of important files (like package.json) to ensure they're up to date
    const importantFiles = ['package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.js'];
    const activeSessions = terminalManager.getSessions();
    const activeProjects = new Set<string>();
    
    activeSessions.forEach(sessionId => {
      const sessionInfo = terminalManager.getSessionInfo(sessionId);
      if (sessionInfo && sessionInfo.projectId) {
        activeProjects.add(sessionInfo.projectId);
      }
    });
    
    // Sync important files for all active projects
    for (const projectId of activeProjects) {
      for (const fileName of importantFiles) {
        try {
          const fileExists = await fileSystemManager.fileExists(fileName);
          if (fileExists) {
            const content = await fileSystemManager.getFileContent(fileName);
            await collaborationManager.handleWorkspaceFileChange(projectId, fileName, content);
            console.log(`[Runner] ✅ Periodic sync: ${fileName} for project ${projectId}`);
          }
        } catch (error) {
          console.error(`[Runner] ❌ Error in periodic sync of ${fileName}:`, error);
        }
      }
    }

  } catch (error) {
    console.error(`[Runner] Error in periodic file structure refresh:`, error);
  }
}, 15000); // 15 seconds (more frequent)

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
    let skippedCount = 0;
    
    for (const item of structure) {
      if (item.type === 'file' && item.path) {
        // Skip node_modules and other generated files
        if (item.path.includes('node_modules/') || 
            item.path.includes('.git/') || 
            item.path.includes('package-lock.json') ||
            item.path.includes('yarn.lock')) {
          skippedCount++;
          console.log(`[syncWorkspaceToCollaboration] ⏭️ Skipping generated file: ${item.path}`);
          continue;
        }
        
        try {
          const content = await fileSystemManager.getFileContent(item.path);
          await collaborationManager.handleWorkspaceFileChange(projectId, item.path, content);
          syncedCount++;
          console.log(`[syncWorkspaceToCollaboration] 📄 Synced ${item.path} (${content.length} chars) to collaboration manager`);
        } catch (error) {
          console.error(`[syncWorkspaceToCollaboration] ❌ Error syncing ${item.path}:`, error);
        }
      }
    }
    
    console.log(`[syncWorkspaceToCollaboration] ✅ Sync completed: ${syncedCount} files synced, ${skippedCount} files skipped for project ${projectId}`);
    
    // Also check if node_modules exists and log it
    try {
      const { stdout } = await require('child_process').execSync('ls -la node_modules 2>/dev/null || echo "node_modules not found"', { 
        cwd: '/workspace',
        encoding: 'utf8'
      });
      console.log(`[syncWorkspaceToCollaboration] 📦 node_modules status: ${stdout.includes('node_modules not found') ? 'Not found' : 'Exists'}`);
    } catch (error) {
      console.log(`[syncWorkspaceToCollaboration] 📦 node_modules status: Not found`);
    }
    
  } catch (error) {
    console.error(`[syncWorkspaceToCollaboration] ❌ Error syncing workspace:`, error);
  }
}

// Function to sync files from collaboration manager to workspace
async function syncCollaborationToWorkspace(projectId: string) {
  try {
    console.log(`[syncCollaborationToWorkspace] 🔄 Starting sync for project: ${projectId}`);
    
    // Get collaboration room
    const room = collaborationManager.getOrCreateRoom(projectId);
    console.log(`[syncCollaborationToWorkspace] 🔄 Syncing ${room.fileContents.size} files from collaboration manager to /workspace`);
    
    let syncedCount = 0;
    
    // Sync each file from collaboration manager to workspace
    for (const [filePath, content] of room.fileContents.entries()) {
      try {
        // Skip generated files
        if (filePath.includes('node_modules') || 
            filePath.includes('.git') || 
            filePath.includes('package-lock.json') ||
            filePath.includes('.DS_Store')) {
          continue;
        }
        
        // Write file content to workspace
        await fileSystemManager.saveFileContent(filePath, content);
        
        console.log(`[syncCollaborationToWorkspace] 📄 Synced ${filePath} (${content.length} chars) to workspace`);
        syncedCount++;
      } catch (error) {
        console.error(`[syncCollaborationToWorkspace] ❌ Error syncing ${filePath}:`, error);
      }
    }
    
    console.log(`[syncCollaborationToWorkspace] ✅ Sync completed: ${syncedCount} files synced for project ${projectId}`);
    
  } catch (error) {
    console.error(`[syncCollaborationToWorkspace] ❌ Error syncing collaboration to workspace:`, error);
  }
}

io.on('connection', (socket: Socket) => {
  // console.log(`[socket.io] Connected: ${socket.id}`);
  let currentProjectId: string | null = null;
  let currentUserId: string | null = null;

  // Join project room
  socket.on('join:project', ({ projectId, userInfo }: { projectId: string; userInfo?: { userId: string; username: string } }) => {
    // console.log(`[socket.io] User ${socket.id} joining project: ${projectId}`);
    
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

    // console.log(`[socket.io] User ${socket.id} joined project ${projectId}`);
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
    
    // Track terminal start activity in Redis
    if (currentProjectId) {
      console.log(`[socket.io] Tracking terminal start activity for project ${currentProjectId}`);
      userActivity(currentProjectId);
    }
    
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

  socket.on('terminal:input', async ({ input }: { input: string }) => {
    console.log(`[socket.io] Terminal input received from ${socket.id}:`, JSON.stringify(input));
    
    // Track terminal activity in Redis
    if (currentProjectId) {
      console.log(`[socket.io] Tracking terminal input activity for project ${currentProjectId}`);
      userActivity(currentProjectId);
    }
    
        // Regular input - send to terminal
    terminalManager.write(socket.id, input);
    
    // Check if this is an npm install command and force refresh file structure
    if (input.includes('npm install') && (input.includes('\r') || input.includes('\n'))) {
      console.log(`[socket.io] 📦 npm install command detected, scheduling file structure refresh and workspace sync`);
      setTimeout(async () => {
        console.log(`[socket.io] 🔄 Force refreshing file structure after npm install command`);
        fileSystemManager.forceNotifyFileStructureChange();
        
        // Also sync workspace to collaboration manager to update package.json
        if (currentProjectId) {
          console.log(`[socket.io] 🔄 Syncing workspace to collaboration manager after npm install`);
          await syncWorkspaceToCollaboration(currentProjectId);
        }
        
        // Specifically sync package.json if it exists
        if (currentProjectId) {
          try {
            const packageJsonExists = await fileSystemManager.fileExists('package.json');
            if (packageJsonExists) {
              console.log(`[socket.io] 📄 Syncing package.json specifically after npm install`);
              const packageJsonContent = await fileSystemManager.getFileContent('package.json');
              await collaborationManager.handleWorkspaceFileChange(currentProjectId, 'package.json', packageJsonContent);
              console.log(`[socket.io] ✅ package.json synced successfully`);
            }
          } catch (error) {
            console.error(`[socket.io] ❌ Error syncing package.json:`, error);
          }
        }
        // Ensure dependencies installed and consistent after terminal-driven install
        try {
          await DependencyManager.ensureInstalled(fileSystemManager);
        } catch (e) {
          console.warn('[socket.io] Dependency ensure after terminal install failed:', e);
        }
      }, 8000); // Wait ~10s for npm install to complete
    }
  });

  socket.on('terminal:clear', () => {
    console.log(`[socket.io] Clearing terminal session for ${socket.id}`);
    terminalManager.clear(socket.id);
  });

  socket.on('terminal:resize', ({ cols, rows }: { cols: number; rows: number }) => {
    console.log(`[socket.io] Resizing terminal for ${socket.id} to ${cols}x${rows}`);
    terminalManager.resize(socket.id, cols, rows);
    
    // Track terminal resize activity in Redis
    if (currentProjectId) {
      console.log(`[socket.io] Tracking terminal resize activity for project ${currentProjectId}`);
      userActivity(currentProjectId);
    }
  });

  socket.on('terminal:info', () => {
    const info = terminalManager.getSessionInfo(socket.id);
    socket.emit('terminal:info', info);
  });

  socket.on('terminal:reconnect', () => {
    console.log(`[socket.io] Terminal reconnection request from ${socket.id}`);
    
    // Track terminal reconnect activity in Redis
    if (currentProjectId) {
      console.log(`[socket.io] Tracking terminal reconnect activity for project ${currentProjectId}`);
      userActivity(currentProjectId);
    }
    
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

  // Code Execution Events
  socket.on('code:execute', async ({ projectId }: { projectId: string }) => {
    console.log(`[socket.io] Code execution request for project: ${projectId}`);
    
    try {
      // Sync files from collaboration manager to workspace first
      if (currentProjectId) {
        const room = collaborationManager.getOrCreateRoom(currentProjectId);
        console.log(`[socket.io] 🔄 Syncing ${room.fileContents.size} files from collaboration manager to /workspace for execution`);
        
        // Write all files from collaboration manager to workspace
        for (const [path, content] of room.fileContents.entries()) {
          await fileSystemManager.saveFileContent(path, content);
          console.log(`[socket.io] 📄 Synced ${path} (${content.length} chars) to /workspace`);
        }
        console.log(`[socket.io] ✅ File sync completed for execution - /workspace is now up to date`);
      }

      // Ensure dependencies are installed consistently before execution
      await DependencyManager.ensureInstalled(fileSystemManager);
      // Longer settle delay to allow post-install file writes and file watcher stabilization
      await new Promise(r => setTimeout(r, 1500));

             // Check if index.js exists
       const structure = await fileSystemManager.getFileStructure();
       const indexJsExists = structure.some(item => item.name === 'index.js' && item.type === 'file');
       
       if (!indexJsExists) {
         socket.emit('code:executionResult', {
           success: false,
           error: 'No index.js file found. Please create an index.js file to run your Node.js project.',
           output: '',
           executionTime: 0
         });
         return;
       }

              // Execute the code using Node.js
       const { exec } = require('child_process');
       const util = require('util');
       const execAsync = util.promisify(exec);

       const startTime = Date.now();
       
       let rerunAttempted = false;
       try {
         console.log(`[socket.io] 🚀 Executing Node.js project: node index.js`);
          const { stdout, stderr } = await execAsync('node index.js', {
          cwd: '/workspace',
           timeout: 60000,
           maxBuffer: 10 * 1024 * 1024
        });

        const executionTime = Date.now() - startTime;
        
        console.log(`[socket.io] ✅ Code execution completed in ${executionTime}ms`);
        console.log(`[socket.io] Output:`, stdout);
        if (stderr) {
          console.log(`[socket.io] Stderr:`, stderr);
        }

        socket.emit('code:executionResult', {
          success: true,
          output: stdout,
          error: stderr || '',
          executionTime
        });

      } catch (execError: any) {
        const executionTime = Date.now() - startTime;
        console.error(`[socket.io] ❌ Code execution failed:`, execError);

        // If a module-not-found occurred, attempt a clean repair install and retry once
        const errMsg: string = execError?.message || '';
        if (/Cannot find module/.test(errMsg)) {
          try {
            console.log('[socket.io] 🩹 Detected module resolution error. Performing repair install...');
            await DependencyManager.repairInstall(fileSystemManager);
            // Settle delay post repair
            await new Promise(r => setTimeout(r, 1500));
            // Retry once
            console.log('[socket.io] 🔁 Retrying execution after reinstall');
            const retry = await execAsync('node index.js', {
              cwd: '/workspace',
              timeout: 60000,
              maxBuffer: 10 * 1024 * 1024
            });
            socket.emit('code:executionResult', {
              success: true,
              output: retry.stdout,
              error: retry.stderr || '',
              executionTime: Date.now() - startTime
            });
            return;
          } catch (repairErr: any) {
            console.error('[socket.io] ❌ Repair attempt failed:', repairErr?.message || repairErr);
          }
        }

        socket.emit('code:executionResult', {
          success: false,
          error: execError.message || 'Code execution failed',
          output: execError.stdout || '',
          executionTime
        });
      }

    } catch (error: any) {
      console.error(`[socket.io] ❌ Error during code execution:`, error);
      socket.emit('code:executionResult', {
        success: false,
        error: error.message || 'Failed to execute code',
        output: '',
        executionTime: 0
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

  // New event to refresh file structure when changes are detected
  socket.on('files:refreshStructure', async () => {
    try {
      console.log(`[socket.io] Refreshing file structure for user ${socket.id}`);
      const structure = await fileSystemManager.getFileStructure();
      socket.emit('files:structure', structure);
    } catch (error) {
      console.error('Error refreshing file structure:', error);
      socket.emit('files:error', { message: 'Failed to refresh file structure' });
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
      
      // Trigger hot reload for file creation
      const isRelevantFile = !path.includes('node_modules') && 
                            !path.includes('.git') && 
                            !path.includes('package-lock.json') &&
                            !path.includes('.DS_Store');
      
      if (isRelevantFile) {
        console.log(`[Preview] File created: ${path}, triggering hot reload`);
        setTimeout(() => {
          previewIo.to(`preview:${currentProjectId}`).emit('preview:reload', {
            filePath: path,
            event: 'add',
            timestamp: Date.now()
          });
        }, 300);
      }
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
      
      // Trigger hot reload for file deletion
      const isRelevantFile = !path.includes('node_modules') && 
                            !path.includes('.git') && 
                            !path.includes('package-lock.json') &&
                            !path.includes('.DS_Store');
      
      if (isRelevantFile) {
        console.log(`[Preview] File deleted: ${path}, triggering hot reload`);
        setTimeout(() => {
          previewIo.to(`preview:${currentProjectId}`).emit('preview:reload', {
            filePath: path,
            event: 'unlink',
            timestamp: Date.now()
          });
        }, 300);
      }
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
      
      // Trigger hot reload for file rename
      const isRelevantFile = !oldPath.includes('node_modules') && 
                            !oldPath.includes('.git') && 
                            !oldPath.includes('package-lock.json') &&
                            !oldPath.includes('.DS_Store');
      
      if (isRelevantFile) {
        console.log(`[Preview] File renamed: ${oldPath} → ${newPath}, triggering hot reload`);
        setTimeout(() => {
          previewIo.to(`preview:${currentProjectId}`).emit('preview:reload', {
            filePath: newPath,
            event: 'change',
            timestamp: Date.now()
          });
        }, 300);
      }
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
      
      // Trigger hot reload for editor-initiated changes
      // Only trigger for relevant files (not node_modules, etc.)
      const isRelevantFile = !path.includes('node_modules') && 
                            !path.includes('.git') && 
                            !path.includes('package-lock.json') &&
                            !path.includes('.DS_Store');
      
      if (isRelevantFile) {
        console.log(`[Preview] Editor change detected for: ${path}, triggering hot reload`);
        
        // Special handling for package.json changes - restart preview server
        if (path === 'package.json' && currentProjectId) {
          console.log(`[Preview] Package.json changed, restarting preview server`);
          const projectId = currentProjectId; // Capture the value to avoid null issues
          try {
            await previewManager.stopPreviewServer();
            setTimeout(async () => {
              await previewManager.startPreviewServer(projectId);
              // Trigger hot reload after server restart
              setTimeout(() => {
                previewIo.to(`preview:${projectId}`).emit('preview:reload', {
                  filePath: path,
                  event: 'change',
                  timestamp: Date.now()
                });
              }, 2000);
            }, 1000);
          } catch (error) {
            console.error(`[Preview] ❌ Error restarting preview server:`, error);
          }
        } else if (currentProjectId) {
          // Verify the file was written correctly before triggering hot reload
          setTimeout(async () => {
            try {
              // Double-check that the file content was actually written
              const writtenContent = await fileSystemManager.getFileContent(path);
              if (writtenContent === content) {
                console.log(`[Preview] ✅ File content verified for ${path}, triggering hot reload`);
                previewIo.to(`preview:${currentProjectId}`).emit('preview:reload', {
                  filePath: path,
                  event: 'change',
                  timestamp: Date.now()
                });
              } else {
                console.log(`[Preview] ⚠️ File content mismatch for ${path}, retrying...`);
                // Retry after a longer delay
                setTimeout(() => {
                  previewIo.to(`preview:${currentProjectId}`).emit('preview:reload', {
                    filePath: path,
                    event: 'change',
                    timestamp: Date.now()
                  });
                }, 1000);
              }
            } catch (error) {
              console.error(`[Preview] ❌ Error verifying file content for ${path}:`, error);
              // Still trigger hot reload even if verification fails
              previewIo.to(`preview:${currentProjectId}`).emit('preview:reload', {
                filePath: path,
                event: 'change',
                timestamp: Date.now()
              });
            }
          }, 500); // Increased delay to 500ms
        }
      }
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
    // console.log(`[socket.io] Disconnected: ${socket.id}`);
    
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
      // console.log(`[socket.io] Clearing terminal session for ${socket.id} after disconnect timeout`);
      terminalManager.clear(socket.id);
    }, 10000); // Keep terminal alive for 10 seconds to allow reconnection
  });
});

// Preview Socket.IO connection handler for hot reloading
previewIo.on('connection', (socket: Socket) => {
  console.log(`[Preview] Socket connected: ${socket.id}`);
  
  // Join preview room
  socket.on('join:preview', ({ projectId }: { projectId: string }) => {
    console.log(`[Preview] Socket ${socket.id} joining preview for project: ${projectId}`);
    socket.join(`preview:${projectId}`);
  });
  
  // Handle preview disconnect
  socket.on('disconnect', () => {
    console.log(`[Preview] Socket disconnected: ${socket.id}`);
  });
});

app.get('/', (_, res) => {
  res.send('Runner backend is running');
});









// Preview route that uses PreviewManager
app.use('/preview', async (req, res) => {
  console.log(`[Preview] ${req.method} ${req.path}`);
  
  try {
    // Extract projectId from hostname
    const hostname = req.get('host');
    const projectId = hostname?.split('.')[0];
    
    if (!projectId) {
      console.log(`[Preview] Could not extract projectId from hostname: ${hostname}`);
      res.status(400).json({ 
        error: 'Invalid hostname',
        hint: 'Check the URL format',
        details: 'Could not determine project ID'
      });
      return;
    }

    // Check if preview server is already running
    if (!previewManager.isPreviewRunning()) {
      console.log(`[Preview] Starting preview server for project: ${projectId}`);
      
      // Start the preview server
      const isStarted = await previewManager.startPreviewServer(projectId);
      
      if (!isStarted) {
        res.status(503).json({ 
          error: 'Failed to start preview server',
          hint: 'Check if your index.js file is valid and can start a server',
          details: 'Server startup failed'
        });
        return;
      }
    }

    // Test if server is responding
    const isResponding = await previewManager.testServerResponse();
    if (!isResponding) {
      res.status(503).json({ 
        error: 'Preview server is not responding',
        hint: 'The server may have crashed or failed to start properly',
        details: 'Server not responding'
      });
      return;
    }

    // Use the PreviewManager's proxy
    const proxy = previewManager.createPreviewProxy();
    proxy(req, res);

  } catch (error) {
    console.error(`[Preview] Error:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      hint: 'Try again later',
      details: 'Failed to handle preview request'
    });
  }
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

