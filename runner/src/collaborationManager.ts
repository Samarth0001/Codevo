import { Socket } from 'socket.io';
import { FileSystemManager } from './fileSystemManager';
import axios from 'axios';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
  children?: FileItem[];
  path?: string;
}

interface UserAwareness {
  userId: string;
  username: string;
  cursorPosition: { line: number; column: number } | null;
  selection: { start: { line: number; column: number }; end: { line: number; column: number } } | null;
  activeFile: string | null;
  color: string;
  lastSeen: number;
}

interface FileChange {
  path: string;
  content: string;
  timestamp: number;
  userId: string;
  version: number;
  changes: Array<{
    type: 'insert' | 'delete' | 'replace';
    position: number;
    length: number;
    text?: string;
  }>;
}

interface ProjectRoom {
  projectId: string;
  users: Map<string, UserAwareness>;
  fileContents: Map<string, string>;
  fileVersions: Map<string, number>;
  pendingChanges: Map<string, FileChange[]>;
  debounceTimers: Map<string, NodeJS.Timeout>;
  lastSync: Map<string, number>;
  lastUpdatedAt?: Date;
  lastUpdatedBy?: string;
}

export class CollaborationManager {
  private rooms: Map<string, ProjectRoom> = new Map();
  private fileSystemManager: FileSystemManager;
  private workerUrl: string;

  constructor(fileSystemManager: FileSystemManager) {
    this.fileSystemManager = fileSystemManager;
    this.workerUrl = process.env.WORKER_URL || 'http://localhost:3002';
  }

  // Get or create project room
  getOrCreateRoom(projectId: string): ProjectRoom {
    if (!this.rooms.has(projectId)) {
      this.rooms.set(projectId, {
        projectId,
        users: new Map(),
        fileContents: new Map(),
        fileVersions: new Map(),
        pendingChanges: new Map(),
        debounceTimers: new Map(),
        lastSync: new Map()
      });
    }
    return this.rooms.get(projectId)!;
  }

  // Join user to project room
  joinRoom(socket: Socket, projectId: string, userInfo: { userId: string; username: string }) {
    const room = this.getOrCreateRoom(projectId);
    
    const userAwareness: UserAwareness = {
      userId: userInfo.userId,
      username: userInfo.username,
      cursorPosition: null,
      selection: null,
      activeFile: null,
      color: this.generateUserColor(),
      lastSeen: Date.now()
    };

    room.users.set(socket.id, userAwareness);

    // Notify other users about new user
    socket.to(projectId).emit('user:joined', {
      userId: socket.id,
      username: userInfo.username,
      color: userAwareness.color
    });

    // Send current users to new user
    const currentUsers = Array.from(room.users.values()).map(user => ({
      userId: user.userId,
      username: user.username,
      color: user.color,
      cursorPosition: user.cursorPosition,
      selection: user.selection,
      activeFile: user.activeFile
    }));

    socket.emit('users:list', currentUsers);

    console.log(`[CollaborationManager] User ${userInfo.username} joined project ${projectId}. Total users: ${room.users.size}`);
  }

  // Leave room
  leaveRoom(socket: Socket, projectId: string) {
    const room = this.rooms.get(projectId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (user) {
      room.users.delete(socket.id);
      
      // Notify other users
      socket.to(projectId).emit('user:left', {
        userId: socket.id,
        username: user.username
      });

      // Clean up empty room
      if (room.users.size === 0) {
        this.cleanupRoom(projectId);
      }
    }
  }

  // Update user awareness (cursor, selection, active file)
  updateAwareness(socket: Socket, projectId: string, awareness: Partial<UserAwareness>) {
    const room = this.rooms.get(projectId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (user) {
      Object.assign(user, awareness, { lastSeen: Date.now() });
      
      // Broadcast to other users
      socket.to(projectId).emit('user:awareness', {
        userId: socket.id,
        ...awareness
      });
    }
  }

  // Handle file content changes with proper diffing
  async handleFileChange(
    socket: Socket, 
    projectId: string, 
    path: string, 
    content: string,
    userId: string
  ) {
    const room = this.getOrCreateRoom(projectId);
    const oldContent = room.fileContents.get(path) || '';
    
    // Generate diff
    const diff = this.generateDiff(oldContent, content);
    
    // Update room state
    room.fileContents.set(path, content);
    const currentVersion = (room.fileVersions.get(path) || 0) + 1;
    room.fileVersions.set(path, currentVersion);

    // Create change record
    const change: FileChange = {
      path,
      content,
      timestamp: Date.now(),
      userId,
      version: currentVersion,
      changes: diff
    };

    // Add to pending changes
    if (!room.pendingChanges.has(path)) {
      room.pendingChanges.set(path, []);
    }
    room.pendingChanges.get(path)!.push(change);

    // Broadcast to other users
    const broadcastData = {
      path,
      content: String(content), // Ensure content is always a string
      diffType: 'full',
      version: currentVersion,
      userId,
      timestamp: change.timestamp
    };
    
    console.log(`[CollaborationManager] Broadcasting file change for ${path}:`, {
      contentLength: String(content).length,
      contentType: typeof String(content),
      contentPreview: String(content).substring(0, 50)
    });
    
    socket.to(projectId).emit('file:changed', broadcastData);

          // Save to file system immediately for runner access
      try {
        await this.fileSystemManager.saveFileContent(path, content);
        console.log(`[CollaborationManager] Saved ${path} to file system`);
        
        // Update project's last modified timestamp in memory
        if (userId) {
          room.lastUpdatedAt = new Date();
          room.lastUpdatedBy = userId;
        }
      } catch (error) {
        console.error(`[CollaborationManager] Error saving ${path} to file system:`, error);
      }

    // Debounce persistence to worker
    this.debouncePersistence(room, path, content);

    return { success: true, version: currentVersion };
  }

  // Handle file creation
  async handleFileCreate(
    socket: Socket,
    projectId: string,
    path: string,
    isFolder: boolean,
    userId: string
  ) {
    const room = this.getOrCreateRoom(projectId);
    
    try {
            // Create file in file system
      const fileItem = await this.fileSystemManager.createFile(path, isFolder);

      // Add to room state if it's a file
      if (!isFolder) {
        room.fileContents.set(path, '');
        room.fileVersions.set(path, 1);
      }
      
      // Update project's last modified timestamp in memory
      if (userId) {
        room.lastUpdatedAt = new Date();
        room.lastUpdatedBy = userId;
      }

      // Broadcast to all users including creator
      socket.to(projectId).emit('file:created', {
        ...fileItem,
        createdBy: userId,
        timestamp: Date.now()
      });
      
      // Also emit to creator
      socket.emit('file:created', {
        ...fileItem,
        createdBy: userId,
        timestamp: Date.now()
      });

      // Persist to worker for files (not folders) with debouncing
      if (!isFolder) {
        this.debouncePersistence(room, path, room.fileContents.get(path) || '');
      } else {
        // For folders, notify worker immediately
        try {
          await this.notifyWorkerCreation(projectId, path, '');
        } catch (error) {
          console.error(`[CollaborationManager] Error notifying worker about folder creation:`, error);
        }
      }

      return { success: true, file: fileItem as FileItem };
    } catch (error) {
      console.error(`[CollaborationManager] Error creating file ${path}:`, error);
      throw error;
    }
  }

  // Handle file deletion
  async handleFileDelete(
    socket: Socket,
    projectId: string,
    path: string,
    userId: string
  ) {
    const room = this.getOrCreateRoom(projectId);
    
    try {
            // Delete from file system
      await this.fileSystemManager.deleteFile(path);

      // Remove from room state
      room.fileContents.delete(path);
      room.fileVersions.delete(path);
      room.pendingChanges.delete(path);
      
      // Update project's last modified timestamp in memory
      if (userId) {
        room.lastUpdatedAt = new Date();
        room.lastUpdatedBy = userId;
      }
      
      // Clear any pending debounce timers
      const existingTimer = room.debounceTimers.get(path);
      if (existingTimer) {
        clearTimeout(existingTimer);
        room.debounceTimers.delete(path);
      }

      // Broadcast to all users including creator
      socket.to(projectId).emit('file:deleted', {
        path,
        deletedBy: userId,
        timestamp: Date.now()
      });
      
      // Also emit to creator
      socket.emit('file:deleted', {
        path,
        deletedBy: userId,
        timestamp: Date.now()
      });

      // Notify worker about deletion
      await this.notifyWorkerDeletion(projectId, path);

      return { success: true };
    } catch (error) {
      console.error(`[CollaborationManager] Error deleting file ${path}:`, error);
      throw error;
    }
  }

  // Handle file rename
  async handleFileRename(
    socket: Socket,
    projectId: string,
    oldPath: string,
    newPath: string,
    userId: string
  ) {
    const room = this.getOrCreateRoom(projectId);
    
    try {
            // Rename in file system
      await this.fileSystemManager.renameFile(oldPath, newPath);

      // Update room state
      const content = room.fileContents.get(oldPath);
      if (content !== undefined) {
        room.fileContents.delete(oldPath);
        room.fileContents.set(newPath, content);

        const version = room.fileVersions.get(oldPath);
        if (version !== undefined) {
          room.fileVersions.delete(oldPath);
          room.fileVersions.set(newPath, version);
        }
      }
      
      // Update project's last modified timestamp in memory
      if (userId) {
        room.lastUpdatedAt = new Date();
        room.lastUpdatedBy = userId;
      }

      // Broadcast to all users including creator
      socket.to(projectId).emit('file:renamed', {
        oldPath,
        newPath,
        renamedBy: userId,
        timestamp: Date.now()
      });
      
      // Also emit to creator
      socket.emit('file:renamed', {
        oldPath,
        newPath,
        renamedBy: userId,
        timestamp: Date.now()
      });

      // Persist renamed file to worker
      if (content !== undefined) {
        this.debouncePersistence(room, newPath, content);
      }

      return { success: true };
    } catch (error) {
      console.error(`[CollaborationManager] Error renaming file ${oldPath} to ${newPath}:`, error);
      throw error;
    }
  }

  // Generate efficient diff between old and new content
  private generateDiff(oldContent: string, newContent: string): Array<{
    type: 'insert' | 'delete' | 'replace';
    position: number;
    length: number;
    text?: string;
  }> {
    const changes: Array<{
      type: 'insert' | 'delete' | 'replace';
      position: number;
      length: number;
      text?: string;
    }> = [];

    // Simple line-based diffing for now
    // In production, use a more sophisticated diffing algorithm
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    let i = 0, j = 0;
    let position = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        // Lines match, move forward
        position += oldLines[i].length + 1; // +1 for newline
        i++;
        j++;
      } else {
        // Lines differ, find the best match
        let bestMatch = -1;
        let bestDistance = Infinity;

        // Look ahead in new content for best match
        for (let k = j + 1; k < Math.min(j + 10, newLines.length); k++) {
          if (i < oldLines.length && newLines[k] === oldLines[i]) {
            const distance = k - j;
            if (distance < bestDistance) {
              bestDistance = distance;
              bestMatch = k;
            }
          }
        }

        if (bestMatch !== -1) {
          // Insert new lines
          const insertText = newLines.slice(j, bestMatch).join('\n') + '\n';
          changes.push({
            type: 'insert',
            position,
            length: insertText.length,
            text: insertText
          });
          position += insertText.length;
          j = bestMatch;
        } else if (i < oldLines.length && j < newLines.length) {
          // Replace current line
          const oldLine = oldLines[i] + '\n';
          const newLine = newLines[j] + '\n';
          changes.push({
            type: 'replace',
            position,
            length: oldLine.length,
            text: newLine
          });
          position += newLine.length;
          i++;
          j++;
        } else if (i < oldLines.length) {
          // Delete old line
          const oldLine = oldLines[i] + '\n';
          changes.push({
            type: 'delete',
            position,
            length: oldLine.length
          });
          i++;
        } else if (j < newLines.length) {
          // Insert new line
          const newLine = newLines[j] + '\n';
          changes.push({
            type: 'insert',
            position,
            length: newLine.length,
            text: newLine
          });
          position += newLine.length;
          j++;
        }
      }
    }

    return changes;
  }

  // Apply diff to content
  applyDiff(content: string, changes: Array<{
    type: 'insert' | 'delete' | 'replace';
    position: number;
    length: number;
    text?: string;
  }>): string {
    let result = content;
    let offset = 0;

    for (const change of changes) {
      const actualPosition = change.position + offset;
      
      switch (change.type) {
        case 'insert':
          if (change.text) {
            result = result.slice(0, actualPosition) + change.text + result.slice(actualPosition);
            offset += change.text.length;
          }
          break;
        case 'delete':
          result = result.slice(0, actualPosition) + result.slice(actualPosition + change.length);
          offset -= change.length;
          break;
        case 'replace':
          if (change.text) {
            result = result.slice(0, actualPosition) + change.text + result.slice(actualPosition + change.length);
            offset += change.text.length - change.length;
          }
          break;
      }
    }

    return result;
  }

  // Debounce persistence to worker
  private debouncePersistence(room: ProjectRoom, path: string, content: string) {
    const existingTimer = room.debounceTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
      console.log(`[CollaborationManager] Reset debounce timer for ${path}`);
    }

    const timer = setTimeout(async () => {
      try {
        console.log(`[CollaborationManager] Debounce timer expired, persisting ${path} to worker`);
        await this.persistToWorker(room.projectId, path, content);
        room.lastSync.set(path, Date.now());
        console.log(`[CollaborationManager] Successfully persisted ${path} to worker after debounce`);
      } catch (error) {
        console.error(`[CollaborationManager] Error persisting ${path}:`, error);
      }
    }, 5000); // 5 second debounce

    room.debounceTimers.set(path, timer);
    console.log(`[CollaborationManager] Set debounce timer for ${path} (5 seconds)`);
  }

  // Persist file to worker
  private async persistToWorker(projectId: string, path: string, content: string) {
    try {
      console.log(`[CollaborationManager] Persisting ${path} to worker at ${this.workerUrl}/persist`);
      const response = await axios.post(`${this.workerUrl}/persist`, {
        projectId,
        path,
        content,
        event: 'file:modified'
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status !== 200) {
        throw new Error(`Worker responded with ${response.status}`);
      }
      console.log(`[CollaborationManager] Successfully persisted ${path} to worker`);
    } catch (error) {
      console.error(`[CollaborationManager] Error persisting to worker:`, error);
      throw error;
    }
  }

  // Notify worker about file creation
  private async notifyWorkerCreation(projectId: string, path: string, content: string) {
    try {
      const response = await axios.post(`${this.workerUrl}/persist`, {
        projectId,
        path,
        content,
        event: 'file:created'
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status !== 200) {
        throw new Error(`Worker responded with ${response.status}`);
      }
    } catch (error) {
      console.error(`[CollaborationManager] Error notifying worker about creation:`, error);
      throw error;
    }
  }

  // Notify worker about file deletion
  private async notifyWorkerDeletion(projectId: string, path: string) {
    try {
      const response = await axios.post(`${this.workerUrl}/persist`, {
        projectId,
        path,
        content: '', // Empty content for deletion
        event: 'file:deleted'
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status !== 200) {
        throw new Error(`Worker responded with ${response.status}`);
      }
    } catch (error) {
      console.error(`[CollaborationManager] Error notifying worker about deletion:`, error);
      throw error;
    }
  }

  // Generate unique color for user
  private generateUserColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Clean up empty room
  private cleanupRoom(projectId: string) {
    const room = this.rooms.get(projectId);
    if (room) {
      // Clear all timers
      for (const timer of room.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.rooms.delete(projectId);
      console.log(`[CollaborationManager] Cleaned up empty room: ${projectId}`);
    }
  }

  // Get room statistics
  getRoomStats(projectId: string) {
    const room = this.rooms.get(projectId);
    if (!room) return null;

    return {
      projectId,
      userCount: room.users.size,
      fileCount: room.fileContents.size,
      pendingChanges: Array.from(room.pendingChanges.entries()).map(([path, changes]) => ({
        path,
        changeCount: changes.length
      }))
    };
  }

  // Function to send last update info to server when project becomes inactive
  public async sendLastUpdateInfo(projectId: string) {
    const room = this.rooms.get(projectId);
    if (!room || !room.lastUpdatedAt || !room.lastUpdatedBy) {
      console.log(`[CollaborationManager] No last update info for project ${projectId}`);
      return;
    }

    try {
      const backendUrl = process.env.BACKEND_URL || 'http://host.docker.internal:4000/api/v1';
      await axios.post(`${backendUrl}/updateProjectLastModified`, {
        projectId,
        userId: room.lastUpdatedBy,
        lastUpdatedAt: room.lastUpdatedAt
      });
      console.log(`[CollaborationManager] Sent last update info for project ${projectId}: ${room.lastUpdatedBy} at ${room.lastUpdatedAt}`);
    } catch (error) {
      console.error(`[CollaborationManager] Failed to send last update info for project ${projectId}:`, error);
    }
  }


} 