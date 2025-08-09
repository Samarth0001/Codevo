import fs from 'fs';
import path from 'path';
import * as chokidar from 'chokidar';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
  children?: FileItem[];
  path?: string;
}

export class FileSystemManager {
  private workspacePath: string;
  private fileWatcher: chokidar.FSWatcher | null = null;
  private changeCallbacks: ((event: string, path: string) => void)[] = [];  //array of functions that will be called when a file changes

  constructor() {
    this.workspacePath = '/workspace';
    this.initializeFileWatcher();
  }

  private initializeFileWatcher() {
    try {
      console.log(`[FileSystemManager] Initializing chokidar file watcher for: ${this.workspacePath}`);
      
      // Initialize chokidar with optimized settings for reliable file watching
      this.fileWatcher = chokidar.watch(this.workspacePath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100
        },
        usePolling: false, // Use native events when possible
        interval: 1000, // Polling interval if needed
        binaryInterval: 3000,
        alwaysStat: false,
        depth: 99, // Watch subdirectories
        ignorePermissionErrors: true,
        atomic: true, // Handle atomic writes
        followSymlinks: false
      });

      // Handle file changes
      this.fileWatcher.on('change', (filePath) => {
        const relativePath = path.relative(this.workspacePath, filePath);
        this.handleFileChange('change', relativePath);
      });

      // Handle file additions
      this.fileWatcher.on('add', (filePath) => {
        const relativePath = path.relative(this.workspacePath, filePath);
        this.handleFileChange('add', relativePath);
      });

      // Handle file deletions
      this.fileWatcher.on('unlink', (filePath) => {
        const relativePath = path.relative(this.workspacePath, filePath);
        this.handleFileChange('unlink', relativePath);
      });

      // Handle directory additions
      this.fileWatcher.on('addDir', (dirPath) => {
        const relativePath = path.relative(this.workspacePath, dirPath);
        this.handleFileChange('add', relativePath);
      });

      // Handle directory deletions
      this.fileWatcher.on('unlinkDir', (dirPath) => {
        const relativePath = path.relative(this.workspacePath, dirPath);
        this.handleFileChange('unlink', relativePath);
      });

      // Handle errors
      this.fileWatcher.on('error', (error) => {
        console.error(`[FileSystemManager] File watcher error:`, error);
      });

      // Handle ready event
      this.fileWatcher.on('ready', () => {
        console.log(`[FileSystemManager] Chokidar file watcher ready and watching: ${this.workspacePath}`);
      });

    } catch (error) {
      console.error(`[FileSystemManager] Failed to initialize chokidar file watcher:`, error);
    }
  }

  private handleFileChange(event: string, filePath: string) {
    // Special handling for important files that should trigger immediate sync
    const importantFiles = ['package.json', 'package-lock.json', 'yarn.lock', 'tsconfig.json', 'webpack.config.js', 'vite.config.js'];
    const isImportantFile = importantFiles.some(importantFile => filePath.includes(importantFile));
    
    if (isImportantFile) {
             // console.log(`[FileSystemManager] Important file change detected: ${event} - ${filePath}`);
      
      // For package.json, also log the content change
      // if (filePath.includes('package.json')) {
      //   setTimeout(async () => {
      //     try {
      //       const fullPath = path.join(this.workspacePath, filePath);
      //       if (fs.existsSync(fullPath)) {
      //         const content = fs.readFileSync(fullPath, 'utf8');
      //         const packageData = JSON.parse(content);
      //                        // console.log(`[FileSystemManager] 📦 package.json updated with dependencies:`, Object.keys(packageData.dependencies || {}));
      //       }
      //     } catch (error) {
      //       console.error(`[FileSystemManager] Error reading package.json:`, error);
      //     }
      //   }, 200);
      // }
      
      // Immediate notification for important files
      setTimeout(() => {
        this.notifyChangeCallbacks(event, filePath);
      }, 100); // Very short delay to ensure file is fully written
    }
    // Special handling for node_modules
    else if (filePath === 'node_modules' || filePath.includes('node_modules/')) {
             // console.log(`[FileSystemManager] node_modules change detected: ${event} - ${filePath}`);
      // Force a full structure refresh for node_modules changes
      setTimeout(() => {
        this.notifyChangeCallbacks('add', 'node_modules');
      }, 1000); // Small delay to ensure npm install is complete
    } else {
      this.notifyChangeCallbacks(event, filePath);
    }
  }

  private notifyChangeCallbacks(event: string, filePath: string) {
    const relativePath = path.relative(this.workspacePath, filePath);
    
    this.changeCallbacks.forEach(callback => {
      try {
        callback(event, relativePath);
      } catch (error) {
        console.error(`[FileSystemManager] Error in change callback:`, error);
      }
    });
  }

  // Method to register callbacks for file system changes
  onFileChange(callback: (event: string, path: string) => void) {
    this.changeCallbacks.push(callback);
    return () => {
      const index = this.changeCallbacks.indexOf(callback);
      if (index > -1) {
        this.changeCallbacks.splice(index, 1);
      }
    };
  }

  // Method to manually trigger file structure refresh
  async refreshFileStructure() {
    console.log(`[FileSystemManager] Manually refreshing file structure`);
    const structure = await this.getFileStructure();
    return structure;
  }

  // Method to force notify about file structure changes
  forceNotifyFileStructureChange() {
    console.log(`[FileSystemManager] Force notifying file structure change`);
    this.notifyChangeCallbacks('change', 'file-structure-refresh');
  }

  // Method to manually trigger file change notification (useful for testing)
  triggerFileChange(filePath: string) {
    console.log(`[FileSystemManager] Manually triggering file change for: ${filePath}`);
    this.handleFileChange('change', filePath);
  }

  async getFileStructure(): Promise<FileItem[]> {
    try {
      return await this.scanDirectory(this.workspacePath);
    } catch (error) {
      console.error('Error scanning directory:', error);
      return [];
    }
  }

  private async scanDirectory(dirPath: string): Promise<FileItem[]> {
    const items: FileItem[] = [];
    
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.workspacePath, fullPath);
        
                 // Skip certain files and directories that shouldn't be shown in the file explorer
         if (entry.name === '.git' || 
             entry.name === '.DS_Store' || 
             entry.name === '.vscode' || 
             entry.name === '.idea' || 
             entry.name === '.cache' || 
             entry.name === '.tmp' ||
             entry.name.endsWith('.log') ||
             entry.name === 'package-lock.json' ||
             entry.name === 'yarn.lock' ||
             entry.name.endsWith('.swp') ||
             entry.name.endsWith('.swo') ||
             entry.name.endsWith('~')) {
           continue;
         }
        
        if (entry.isDirectory()) {
          // For node_modules, we'll show it but not scan its contents to avoid performance issues
          if (entry.name === 'node_modules') {
            items.push({
              id: relativePath,
              name: entry.name,
              type: 'folder',
              path: relativePath,
              children: [] // Empty children to avoid scanning the entire node_modules
            });
          } else {
            const children = await this.scanDirectory(fullPath);
            items.push({
              id: relativePath,
              name: entry.name,
              type: 'folder',
              path: relativePath,
              children
            });
          }
        } else {
          const extension = path.extname(entry.name).substring(1);
          items.push({
            id: relativePath,
            name: entry.name,
            type: 'file',
            extension,
            path: relativePath
          });
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
    
    return items.sort((a, b) => {
      // Folders first, then files
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async createFile(filePath: string, isFolder: boolean = false): Promise<FileItem> {
    const fullPath = path.join(this.workspacePath, filePath);
    const dir = path.dirname(fullPath);
    
    // Ensure parent directory exists
    await fs.promises.mkdir(dir, { recursive: true });
    
    if (isFolder) {
      await fs.promises.mkdir(fullPath, { recursive: true });
      return {
        id: filePath,
        name: path.basename(filePath),
        type: 'folder',
        path: filePath,
        children: []
      };
    } else {
      await fs.promises.writeFile(fullPath, '');
      const extension = path.extname(filePath).substring(1);
      return {
        id: filePath,
        name: path.basename(filePath),
        type: 'file',
        extension,
        path: filePath
      };
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.workspacePath, filePath);
    const stats = await fs.promises.stat(fullPath);
    
    if (stats.isDirectory()) {
      await fs.promises.rmdir(fullPath, { recursive: true });
    } else {
      await fs.promises.unlink(fullPath);
    }
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const oldFullPath = path.join(this.workspacePath, oldPath);
    const newFullPath = path.join(this.workspacePath, newPath);
    const newDir = path.dirname(newFullPath);
    
    // Ensure new directory exists
    await fs.promises.mkdir(newDir, { recursive: true });
    
    await fs.promises.rename(oldFullPath, newFullPath);
  }

  async getFileContent(filePath: string): Promise<string> {
    const fullPath = path.join(this.workspacePath, filePath);
    const content = await fs.promises.readFile(fullPath, 'utf-8');
    // console.log(`[FileSystemManager] Read file ${filePath}:`, {
    //   contentType: typeof content,
    //   contentLength: content.length,
    //   contentPreview: content.substring(0, 50)
    // });
    return content;
  }

  async saveFileContent(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.workspacePath, filePath);
    const dir = path.dirname(fullPath);
    
    // Ensure directory exists
    await fs.promises.mkdir(dir, { recursive: true });
    
    await fs.promises.writeFile(fullPath, content, 'utf-8');
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.workspacePath, filePath);
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<fs.Stats> {
    const fullPath = path.join(this.workspacePath, filePath);
    return await fs.promises.stat(fullPath);
  }

  // Cleanup method to close the file watcher
  async close() {
    if (this.fileWatcher) {
      console.log(`[FileSystemManager] Closing chokidar file watcher`);
      await this.fileWatcher.close();
      this.fileWatcher = null;
    }
  }
} 