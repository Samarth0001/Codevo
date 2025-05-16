
import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, Search, Plus, FolderPlus } from 'lucide-react';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
  children?: FileItem[];
}

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

export const FileExplorer = () => {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFile, setActiveFile] = useState('main.jsx');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const getIconForFile = (extension?: string) => {
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <div className="w-4 h-4 text-yellow-400 font-mono text-xs font-bold">JS</div>;
      case 'css':
        return <div className="w-4 h-4 text-blue-400 font-mono text-xs font-bold">CSS</div>;
      case 'html':
        return <div className="w-4 h-4 text-orange-400 font-mono text-xs font-bold">HTML</div>;
      case 'json':
        return <div className="w-4 h-4 text-green-400 font-mono text-xs font-bold">{ }</div>;
      case 'md':
        return <div className="w-4 h-4 text-gray-400 font-mono text-xs font-bold">MD</div>;
      default:
        return <div className="w-4 h-4 text-gray-400">•</div>;
    }
  };

  const handleFileClick = (fileId: string) => {
    setActiveFile(fileId);
  };

  const renderFileItem = (item: FileItem, depth = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const isActive = item.id === activeFile;

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
        <ContextMenuTrigger>
          <div 
            className={`flex items-center py-1 px-2 hover:bg-gray-700 transition-colors duration-150 cursor-pointer rounded ${isActive && item.type === 'file' ? 'bg-gray-700' : ''}`}
            onClick={() => item.type === 'folder' ? toggleFolder(item.id) : handleFileClick(item.id)}
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
                {getIconForFile(item.extension)}
              </span>
            )}
            <span className="text-sm">{item.name}</span>
          </div>
          <ContextMenuContent className="bg-gray-800 border-gray-700 text-white">
            <ContextMenuItem className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700">
              New File
            </ContextMenuItem>
            <ContextMenuItem className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700">
              New Folder
            </ContextMenuItem>
            {item.type === 'file' && (
              <ContextMenuItem className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700">
                Rename
              </ContextMenuItem>
            )}
            <ContextMenuItem className="text-red-400 hover:bg-gray-700 cursor-pointer focus:bg-gray-700">
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuTrigger>

        {item.type === 'folder' && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-800/95">
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <div className="text-sm font-medium text-gray-300">Files</div>
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-gray-700">
            <Plus size={14} className="text-gray-300" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-gray-700">
            <FolderPlus size={14} className="text-gray-300" />
          </Button>
        </div>
      </div>
      
      <div className="p-2 border-b border-gray-700">
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
      
      <div className="flex-1 overflow-y-auto p-1">
        <ContextMenu>
          {files.map(file => renderFileItem(file))}
        </ContextMenu>
      </div>
    </div>
  );
};
