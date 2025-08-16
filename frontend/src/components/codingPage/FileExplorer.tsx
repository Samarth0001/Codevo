import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Folder, Search, Plus, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileIcon } from './FileIcons';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
  children?: FileItem[];
  path?: string;
}

interface FileExplorerProps {
  files?: FileItem[];
  onCreateFile?: (path: string, isFolder?: boolean) => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
  onGetFileContent?: (path: string) => void;
  isConnected?: boolean;
}

import { useEditor } from '@/context/EditorContext';

const initialFiles: FileItem[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    children: [
      {
        id: 'components',
        name: 'components',
        type: 'folder',
        children: [
          { id: 'app.jsx', name: 'app.jsx', type: 'file', extension: 'jsx' },
          { id: 'header.jsx', name: 'header.jsx', type: 'file', extension: 'jsx' }
        ]
      },
      { id: 'main.jsx', name: 'main.jsx', type: 'file', extension: 'jsx' },
      { id: 'styles.css', name: 'styles.css', type: 'file', extension: 'css' }
    ]
  },
  {
    id: 'public',
    name: 'public',
    type: 'folder',
    children: [
      { id: 'index.html', name: 'index.html', type: 'file', extension: 'html' },
      { id: 'favicon.ico', name: 'favicon.ico', type: 'file', extension: 'ico' }
    ]
  },
  { id: 'package.json', name: 'package.json', type: 'file', extension: 'json' },
  { id: 'README.md', name: 'README.md', type: 'file', extension: 'md' }
];

export const FileExplorer = ({ 
  files = initialFiles, 
  onCreateFile, 
  onDeleteFile, 
  onRenameFile, 
  onGetFileContent,
  isConnected = true 
}: FileExplorerProps) => {
  // Use the files prop from parent component instead of local state
  const [localFiles, setLocalFiles] = useState<FileItem[]>(files);
  
  // Update local files when prop changes
  useEffect(() => {
    setLocalFiles(files);
  }, [files]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    item: FileItem | null;
  }>({ show: false, x: 0, y: 0, item: null });
  
  // Modal state
  const [modal, setModal] = useState<{
    show: boolean;
    type: 'create' | 'delete' | null;
    title: string;
    message: string;
    inputValue: string;
    inputPlaceholder: string;
    isFolder: boolean;
    filePath?: string;
  }>({
    show: false,
    type: null,
    title: '',
    message: '',
    inputValue: '',
    inputPlaceholder: '',
    isFolder: false
  });
  
  const {activeFile, setActiveFile} = useEditor();

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ show: false, x: 0, y: 0, item: null });
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.show]);

  const toggleFolder = (folderId: string, folderPath?: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
    
    // Always update current folder context when clicking on a folder
    setCurrentFolder(folderPath || '');
  };

  const getIconForFile = (fileName: string, extension?: string) => { 
    return <FileIcon fileName={fileName} extension={extension} className="w-4 h-4" />;
  };

  const handleFileClick = (fileId: string, filePath?: string) => {
    setActiveFile(fileId);
    if (filePath && onGetFileContent) {
      onGetFileContent(filePath);
    }
  };

  const handleCreateFile = (isFolder: boolean = false) => {
    setModal({
      show: true,
      type: 'create',
      title: `Create New ${isFolder ? 'Folder' : 'File'}`,
      message: `Enter the name for the new ${isFolder ? 'folder' : 'file'}:`,
      inputValue: '',
      inputPlaceholder: isFolder ? 'folder-name' : 'filename.ext',
      isFolder
    });
  };

  const handleDeleteFile = (filePath: string) => {
    setModal({
      show: true,
      type: 'delete',
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${filePath}"?`,
      inputValue: '',
      inputPlaceholder: '',
      isFolder: false,
      filePath
    });
  };

  const handleModalConfirm = () => {
    if (modal.type === 'create' && modal.inputValue.trim()) {
      const fullPath = currentFolder ? `${currentFolder}/${modal.inputValue.trim()}` : modal.inputValue.trim();
      if (onCreateFile) {
        onCreateFile(fullPath, modal.isFolder);
      }
      // Optimistically update local state for better UX
      const newFile: FileItem = {
        id: modal.inputValue.trim(),
        name: modal.inputValue.trim(),
        type: modal.isFolder ? 'folder' : 'file',
        path: fullPath,
        extension: modal.isFolder ? undefined : modal.inputValue.trim().split('.').pop()
      };
      
      setLocalFiles(prev => {
        const newFiles = [...prev];
        if (currentFolder) {
          // Add to specific folder
          const addToFolder = (files: FileItem[], folderPath: string): FileItem[] => {
            return files.map(file => {
              if (file.path === folderPath && file.type === 'folder') {
                return {
                  ...file,
                  children: [...(file.children || []), newFile]
                };
              } else if (file.children) {
                return {
                  ...file,
                  children: addToFolder(file.children, folderPath)
                };
              }
              return file;
            });
          };
          return addToFolder(newFiles, currentFolder);
        } else {
          // Add to root
          return [...newFiles, newFile];
        }
      });
    } else if (modal.type === 'delete' && modal.filePath) {
      console.log('Deleting file:', modal.filePath);
      if (onDeleteFile) {
        onDeleteFile(modal.filePath);
      }
      // Optimistically remove from local state
      setLocalFiles(prev => {
        const removeFile = (files: FileItem[], path: string): FileItem[] => {
          return files.filter(file => {
            if (file.path === path) {
              console.log('Removing file from local state:', path);
              return false;
            } else if (file.children) {
              file.children = removeFile(file.children, path);
            }
            return true;
          });
        };
        return removeFile(prev, modal.filePath!);
      });
    }
    setModal({ show: false, type: null, title: '', message: '', inputValue: '', inputPlaceholder: '', isFolder: false });
  };

  const handleModalCancel = () => {
    setModal({ show: false, type: null, title: '', message: '', inputValue: '', inputPlaceholder: '', isFolder: false });
  };

  const handleRenameFile = (oldPath: string, newName: string) => {
    // Construct the new path properly
    const oldPathParts = oldPath.split('/');
    const newPathParts = [...oldPathParts.slice(0, -1), newName];
    const newPath = newPathParts.join('/');
    
    console.log('Renaming file:', { oldPath, newName, newPath });
    
    if (onRenameFile) {
      onRenameFile(oldPath, newPath);
    }
    
    // Optimistically update local state
    setLocalFiles(prev => {
      const renameFile = (files: FileItem[], oldPath: string, newPath: string): FileItem[] => {
        return files.map(file => {
          if (file.path === oldPath) {
            return {
              ...file,
              id: newName,
              name: newName,
              path: newPath,
              extension: file.type === 'file' ? newName.split('.').pop() : file.extension
            };
          } else if (file.children) {
            return {
              ...file,
              children: renameFile(file.children, oldPath, newPath)
            };
          }
          return file;
        });
      };
      return renameFile(prev, oldPath, newPath);
    });
    
    setRenamingFile(null);
    setNewFileName('');
  };

  const startRename = (filePath: string, currentName: string) => {
    setRenamingFile(filePath);
    setNewFileName(currentName);
  };

  // Sort files and folders in a logical order
  const sortFileItems = (items: FileItem[]): FileItem[] => {
    return items.sort((a, b) => {
      // First, sort by type: folders first, then files
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      
      // If both are folders or both are files, sort alphabetically
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const renderFileItem = (item: FileItem, depth = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const isActive = item.id === activeFile;
    const isRenaming = renamingFile === item.path;

    // Filter for search
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      if (item.type === 'folder') {
        const matchingChildren = item.children?.filter(child => 
          child.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (!matchingChildren || matchingChildren.length === 0) {
          return null;
        }
      } else {
        return null;
      }
    }

    return (
      <div key={item.id}>
        <div 
          className={`flex items-center py-1 px-2 hover:bg-gray-700 transition-colors duration-150 cursor-pointer rounded ${isActive && item.type === 'file' ? 'bg-gray-700' : ''}`}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.id, item.path);
            } else {
              handleFileClick(item.id, item.path);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({
              show: true,
              x: e.clientX,
              y: e.clientY,
              item: item
            });
          }}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {item.type === 'folder' ? (
            <>
              <span className="mr-1 text-gray-400">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <Folder size={16} className="mr-2 text-blue-400" />
            </>
          ) : (
            <span className="ml-4 mr-2">
              {getIconForFile(item.name, item.extension)}
            </span>
          )}
          {isRenaming ? (
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && item.path) {
                  handleRenameFile(item.path, newFileName);
                } else if (e.key === 'Escape') {
                  setRenamingFile(null);
                  setNewFileName('');
                }
              }}
              onBlur={() => {
                if (item.path) {
                  handleRenameFile(item.path, newFileName);
                }
              }}
              className="flex-1 bg-gray-700 text-white text-sm px-1 rounded"
              autoFocus
            />
          ) : (
            <span className="text-sm">{item.name}</span>
          )}
        </div>

        {item.type === 'folder' && isExpanded && item.children && (
          <div>
            {sortFileItems(item.children).map(child => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-800/95 relative">
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex flex-col">
          <div className="text-sm font-medium text-gray-300">Files</div>
          <div className="text-xs text-gray-500">
            {currentFolder ? `Creating in: ${currentFolder}` : 'Creating in: root'}
          </div>
        </div>
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 hover:bg-gray-700"
            onClick={() => handleCreateFile(false)}
            disabled={!isConnected}
            title={currentFolder ? `Create file in ${currentFolder}` : "Create file in root directory"}
          >
            <Plus size={14} className="text-gray-300" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 hover:bg-gray-700"
            onClick={() => handleCreateFile(true)}
            disabled={!isConnected}
            title={currentFolder ? `Create folder in ${currentFolder}` : "Create folder in root directory"}
          >
            <FolderPlus size={14} className="text-gray-300" />
          </Button>
        </div>
      </div>
      
      <div 
        className="p-2 border-b border-gray-700"
        onClick={(e) => {
          // If clicking on the search area (not on the input), reset to root
          if (e.target === e.currentTarget) {
            setCurrentFolder('');
          }
        }}
      >
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 bg-gray-900/70 border-gray-700 text-sm pl-8 focus-visible:ring-blue-500"
          />
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-y-auto p-1"
        onClick={(e) => {
          // If clicking on the container itself (not on a file/folder), reset to root
          if (e.target === e.currentTarget) {
            setCurrentFolder('');
          }
        }}
      >
        {Array.isArray(localFiles) ? sortFileItems(localFiles).map(file => renderFileItem(file)) : <div className="p-2 text-gray-500 text-sm">No files available</div>}
      </div>
      
      {/* Custom Context Menu */}
      {contextMenu.show && (
        <div 
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-lg text-white text-sm"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y,
            minWidth: '200px'
          }}
        >
          <div 
            className="px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
            onClick={() => {
              handleCreateFile(false);
              setContextMenu({ show: false, x: 0, y: 0, item: null });
            }}
          >
            New File {currentFolder ? `in ${currentFolder}` : 'in root'}
          </div>
          <div 
            className="px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
            onClick={() => {
              handleCreateFile(true);
              setContextMenu({ show: false, x: 0, y: 0, item: null });
            }}
          >
            New Folder {currentFolder ? `in ${currentFolder}` : 'in root'}
          </div>
          {contextMenu.item?.type === 'file' && (
            <div 
              className="px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
              onClick={() => {
                if (contextMenu.item?.path) {
                  startRename(contextMenu.item.path, contextMenu.item.name);
                }
                setContextMenu({ show: false, x: 0, y: 0, item: null });
              }}
            >
              Rename
            </div>
          )}
          <div 
            className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-red-400"
            onClick={() => {
              if (contextMenu.item?.path) {
                handleDeleteFile(contextMenu.item.path);
              }
              setContextMenu({ show: false, x: 0, y: 0, item: null });
            }}
          >
            Delete
          </div>
        </div>
      )}

      {/* Custom Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">{modal.title}</h3>
            <p className="text-gray-300 mb-4">{modal.message}</p>
            
            {modal.type === 'create' && (
              <input
                type="text"
                value={modal.inputValue}
                onChange={(e) => setModal(prev => ({ ...prev, inputValue: e.target.value }))}
                placeholder={modal.inputPlaceholder}
                className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded mb-4 focus:outline-none focus:border-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleModalConfirm();
                  } else if (e.key === 'Escape') {
                    handleModalCancel();
                  }
                }}
              />
            )}
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleModalCancel}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleModalConfirm}
                className={`${modal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              >
                {modal.type === 'delete' ? 'Delete' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {!isConnected && (
        <div className="p-2 bg-yellow-600/20 border-t border-yellow-600/40">
          <div className="text-xs text-yellow-400 text-center">
            Disconnected
          </div>
        </div>
      )}
    </div>
  );
};
