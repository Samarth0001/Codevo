import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Socket } from 'socket.io';
import { FileSystemManager } from './fileSystemManager';
import axios from 'axios';

interface RoomData {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  filesMap: Y.Map<Y.Text>;
  sockets: Set<string>;
  syncInitialized: boolean;
}

export class YjsSyncManager {
  private ydoc: Y.Doc;
  private provider: WebsocketProvider;
  private filesMap: Y.Map<Y.Text>;
  private sockets: Set<string>;
  private syncInitialized: boolean = false;
  private fileSystemManager: FileSystemManager;
  private workerUrl: string;

  constructor(fileSystemManager: FileSystemManager) {
    this.fileSystemManager = fileSystemManager;
    this.workerUrl = process.env.WORKER_URL || 'http://localhost:3002';
    this.ydoc = new Y.Doc();
    this.provider = new WebsocketProvider("wss://yjs.codevo.dev", "default-room", this.ydoc);
    this.filesMap = this.ydoc.getMap<Y.Text>("files");
    this.sockets = new Set();
  }

  async joinRoom(socket: Socket) {
    console.log(`[yjs] Joining room: ${socket.id}`);

    let roomData = {
      ydoc: this.ydoc,
      provider: this.provider,
      filesMap: this.filesMap,
      sockets: this.sockets,
      syncInitialized: this.syncInitialized
    };

    if (!roomData) {
      // Create new room
      const ydoc = new Y.Doc();
      const provider = new WebsocketProvider("wss://yjs.codevo.dev", "default-room", ydoc);
      const filesMap = ydoc.getMap<Y.Text>("files");

      roomData = {
        ydoc,
        provider,
        filesMap,
        sockets: new Set(),
        syncInitialized: false
      };

      this.ydoc = ydoc;
      this.provider = provider;
      this.filesMap = filesMap;
      this.sockets = new Set();
      this.syncInitialized = false;

      // Set up file change listeners
      this.setupFileChangeListeners();

      // Wait for initial sync
      provider.on('sync', async () => {
        if (!roomData!.syncInitialized) {
          await this.handleInitialSync(roomData!);
        }
      });
    }

    // Add socket to room
    roomData.sockets.add(socket.id);

    // Send current file structure to the new client
    const structure = await this.fileSystemManager.getFileStructure();
    socket.emit('files:structure', structure);

    // Send current Yjs files to the client
    const yjsFiles = Array.from(roomData.filesMap.keys());
    socket.emit('yjs:files', yjsFiles);

    // If this is the first client and sync hasn't been initialized, trigger initial sync
    if (roomData.sockets.size === 1 && !roomData.syncInitialized) {
      console.log(`[yjs] First client joined, triggering initial sync`);
      await this.handleInitialSync(roomData);
    }

    console.log(`[yjs] Room now has ${roomData.sockets.size} clients`);
  }

  leaveRoom() {
    const roomData = {
      ydoc: this.ydoc,
      provider: this.provider,
      filesMap: this.filesMap,
      sockets: this.sockets,
      syncInitialized: this.syncInitialized
    };

    if (roomData) {
      roomData.sockets.clear();
      this.cleanupRoom();
    }
  }

  handleSocketDisconnect(socketId: string) {
    // Remove socket from all rooms
    const roomData = {
      ydoc: this.ydoc,
      provider: this.provider,
      filesMap: this.filesMap,
      sockets: this.sockets,
      syncInitialized: this.syncInitialized
    };

    if (roomData) {
      if (roomData.sockets.has(socketId)) {
        roomData.sockets.delete(socketId);
        console.log(`[yjs] Socket ${socketId} left room`);
        
        // If no more sockets in room, cleanup
        if (roomData.sockets.size === 0) {
          this.cleanupRoom();
        }
      }
    }
  }

  async handleProjectInitialization(socket: Socket, projectId: string) {
    console.log(`[yjs] Handling project initialization for: ${projectId}`);
    
    // Ensure we have the latest file structure
    const structure = await this.fileSystemManager.getFileStructure();
    
    // If workspace is empty, create default files
    if (structure.length === 0) {
      console.log(`[yjs] Workspace is empty, creating default files`);
      await this.syncWorkspaceToYjs({
        ydoc: this.ydoc,
        provider: this.provider,
        filesMap: this.filesMap,
        sockets: this.sockets,
        syncInitialized: this.syncInitialized
      });
    }
    
    // Get updated structure and content
    const updatedStructure = await this.fileSystemManager.getFileStructure();
    const filesWithContent = [];
    
    for (const item of updatedStructure) {
      if (item.type === 'file' && item.path) {
        const content = await this.fileSystemManager.getFileContent(item.path);
        filesWithContent.push({
          ...item,
          content
        });
      } else {
        filesWithContent.push(item);
      }
    }
    
    // Send initialization response
    socket.emit('project:initialized', {
      structure: updatedStructure,
      filesWithContent,
      projectId
    });
    
    console.log(`[yjs] Project initialization completed for ${projectId} with ${filesWithContent.length} files`);
  }

  private async handleInitialSync(roomData: RoomData) {
    console.log(`[yjs] Initial sync for room: ${roomData.ydoc.guid}`);
    
    const filesMap = roomData.filesMap;
    const keys = Array.from(filesMap.keys());

    if (keys.length === 0) {
      // No files in Yjs, initialize with workspace files
      await this.syncWorkspaceToYjs(roomData);
    } else {
      // Files exist in Yjs, sync them to workspace
      await this.syncYjsToWorkspace(roomData);
    }

    roomData.syncInitialized = true;
    
    // Notify all connected sockets about the sync completion
    for (const socketId of roomData.sockets) {
      // This will be handled by the socket.io connection
      console.log(`[yjs] Notified socket ${socketId} about sync completion`);
    }
  }

  private async syncWorkspaceToYjs(roomData: RoomData) {
    console.log(`[yjs] Syncing workspace files to Yjs for room: ${roomData.ydoc.guid}`);
    
    try {
      const structure = await this.fileSystemManager.getFileStructure();
      const filesMap = roomData.filesMap;

      // Create Y.Text for each file in workspace
      for (const file of structure) {
        if (file.type === 'file' && file.path) {
          const content = await this.fileSystemManager.getFileContent(file.path);
          const ytext = new Y.Text();
          ytext.insert(0, content);
          filesMap.set(file.path, ytext);
          console.log(`[yjs] Synced file to Yjs: ${file.path}`);
        }
      }

      // If no files in workspace, create default files
      if (structure.length === 0) {
        console.log(`[yjs] Workspace is empty, creating default files`);
        
        const defaultFiles = [
          { path: 'index.html', content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codevo Project</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app">
        <h1>Welcome to Codevo!</h1>
        <p>Start coding in the editor to see your changes here.</p>
    </div>
    <script src="main.js"></script>
</body>
</html>` },
          { path: 'main.js', content: `// Welcome to Codevo!
console.log("Hello, World!");

// Your JavaScript code goes here
function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet("Developer"));` },
          { path: 'styles.css', content: `/* Welcome to Codevo! */
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
    color: #333;
}

#app {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1 {
    color: #2c3e50;
    margin-bottom: 20px;
}

p {
    line-height: 1.6;
    color: #666;
}` },
          { path: 'README.md', content: `# Codevo Project

Welcome to your new Codevo project! This is a collaborative coding environment where you can:

- Write and edit code in real-time
- See live previews of your changes
- Collaborate with others
- Run your code in the terminal

## Getting Started

1. Edit the files in the editor
2. See live previews in the preview panel
3. Use the terminal to run commands
4. Share your project with others

## Files

- \`index.html\` - Main HTML file
- \`main.js\` - JavaScript code
- \`styles.css\` - CSS styles
- \`README.md\` - This file

Happy coding! 🚀` }
        ];

        // Create each default file in workspace and Yjs
        for (const file of defaultFiles) {
          // Create in workspace
          await this.fileSystemManager.saveFileContent(file.path, file.content);
          
          // Create in Yjs
          const ytext = new Y.Text();
          ytext.insert(0, file.content);
          filesMap.set(file.path, ytext);
          
          console.log(`[yjs] Created default file: ${file.path}`);
        }
        
        console.log(`[yjs] Created ${defaultFiles.length} default files`);
      }

      console.log(`[yjs] Synced ${filesMap.size} files from workspace to Yjs`);
    } catch (error) {
      console.error(`[yjs] Error syncing workspace to Yjs:`, error);
    }
  }

  private async syncYjsToWorkspace(roomData: RoomData) {
    console.log(`[yjs] Syncing Yjs files to workspace for room: ${roomData.ydoc.guid}`);
    
    try {
      const filesMap = roomData.filesMap;
      
      for (const [filePath, ytext] of filesMap.entries()) {
        const content = ytext.toString();
        await this.fileSystemManager.saveFileContent(filePath, content);
      }

      console.log(`[yjs] Synced ${filesMap.size} files from Yjs to workspace`);
    } catch (error) {
      console.error(`[yjs] Error syncing Yjs to workspace:`, error);
    }
  }

  private setupFileChangeListeners() {
    const filesMap = this.filesMap;

    // Listen for file additions and deletions
    filesMap.observe((event) => {
      event.changes.added.forEach((_change, key) => {
        // key is the file path (string)
        const filePath = String(key);
        const ytext = this.filesMap.get(filePath);
        if (ytext) {
          this.handleFileChange(filePath, 'added', ytext);
        }
      });

      event.changes.deleted.forEach((_change, key) => {
        // key is the file path (string)
        const filePath = String(key);
        this.handleFileChange(filePath, 'deleted');
      });
    });

    // Listen for text changes in each file
    filesMap.observeDeep((events) => {
      events.forEach((event) => {
        if (
          event.path.length > 0 &&
          typeof event.path[0] === 'object' &&
          event.path[0] !== null &&
          (event.path[0] as Y.Text).toString !== undefined
        ) {
          const ytext = event.path[0] as Y.Text;
          const filePath = this.getFilePathFromYText(ytext);
          if (filePath) {
            this.handleFileChange(filePath, 'modified', ytext);
          }
        }
      });
    });
  }

  private getFilePathFromYText(ytext: Y.Text): string | null {
    for (const [filePath, text] of this.filesMap.entries()) {
      if (text === ytext) {
        return filePath;
      }
    }
    return null;
  }

  private async handleFileChange(filePath: string, changeType: 'added' | 'deleted' | 'modified', ytext?: Y.Text) {
    try {
      switch (changeType) {
        case 'added':
          if (ytext) {
            const content = ytext.toString();
            await this.fileSystemManager.saveFileContent(filePath, content);
            await this.notifyWorker('file:created', { filePath, content });
          }
          break;

        case 'deleted':
          await this.fileSystemManager.deleteFile(filePath);
          await this.notifyWorker('file:deleted', { filePath });
          break;

        case 'modified':
          if (ytext) {
            const content = ytext.toString();
            await this.fileSystemManager.saveFileContent(filePath, content);
            await this.notifyWorker('file:modified', { filePath, content });
          }
          break;
      }
    } catch (error) {
      console.error(`[yjs] Error handling file change:`, error);
    }
  }

  private async notifyWorker(event: string, data: any) {
    try {
      await axios.post(`${this.workerUrl}/yjs-events`, {
        roomId: this.ydoc.guid, // Assuming roomId is the doc guid for simplicity
        event,
        data,
        timestamp: Date.now()
      });
      console.log(`[yjs] Notified worker: ${event} for room ${this.ydoc.guid}`);
    } catch (error) {
      console.error(`[yjs] Error notifying worker:`, error);
    }
  }

  private cleanupRoom() {
    // Instead of setting to null, just destroy and re-initialize if needed
    if (this.provider) this.provider.destroy();
    if (this.ydoc) this.ydoc.destroy();
    this.sockets.clear();
    this.syncInitialized = false;
    // Optionally, re-initialize the doc/provider/filesMap if you expect new sessions
  }
} 