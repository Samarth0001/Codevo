import fs from 'fs';
import path from 'path';

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

  constructor() {
    this.workspacePath = process.env.WORKSPACE_PATH || '/workspace';
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
        
        if (entry.isDirectory()) {
          const children = await this.scanDirectory(fullPath);
          items.push({
            id: relativePath,
            name: entry.name,
            type: 'folder',
            path: relativePath,
            children
          });
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
    console.log(`[FileSystemManager] Read file ${filePath}:`, {
      contentType: typeof content,
      contentLength: content.length,
      contentPreview: content.substring(0, 50)
    });
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
} 