import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Terminal, Maximize, Minimize, Eye, Save, Play, RefreshCw, LayoutGrid, LayoutList } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EditorHeaderProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  toggleTerminal: () => void;
  togglePreview: () => void;
  toggleLayout: () => void;
  isRightLayout: boolean;
}

const EditorHeader = ({ 
  isFullscreen, 
  toggleFullscreen, 
  toggleTerminal, 
  togglePreview,
  toggleLayout,
  isRightLayout 
}: EditorHeaderProps) => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 shadow-md">
      <div className="flex items-center">
        <div className="text-lg font-semibold mr-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">Codevo</div>
        <div className="hidden sm:flex space-x-1">
          <Button variant="ghost" size="sm" className="text-sm font-normal hover:bg-gray-700">
            File
          </Button>
          <Button variant="ghost" size="sm" className="text-sm font-normal hover:bg-gray-700">
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-sm font-normal hover:bg-gray-700">
            View
          </Button>
          <Button variant="ghost" size="sm" className="text-sm font-normal hover:bg-gray-700">
            Help
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" className="hidden sm:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs">
          <Play size={14} className="text-green-400" />
          <span>Run</span>
        </Button>

        <Button variant="ghost" size="sm" className="hidden sm:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs">
          <Save size={14} className="text-blue-400" />
          <span>Save</span>
        </Button>

        <Button variant="ghost" size="sm" className="hidden md:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs">
          <RefreshCw size={14} className="text-purple-400" />
          <span>Format</span>
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleLayout}
          className="hover:bg-gray-700"
          title={isRightLayout ? "Switch to bottom layout" : "Switch to right layout"}
        >
          {isRightLayout ? <LayoutList size={18} /> : <LayoutGrid size={18} />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-gray-700">
              <Search size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white" align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem onClick={toggleTerminal} className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700">
              <Terminal className="mr-2" size={16} />
              <span>Terminal</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={togglePreview} className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700">
              <Eye className="mr-2" size={16} />
              <span>Preview</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-gray-700">
              <UserPlus size={18} />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Invite Collaborators</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-300">Share this link with your collaborators:</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text" 
                  value="https://codevo.dev/share/abc123" 
                  readOnly 
                  className="flex-1 p-2 bg-gray-900 border border-gray-700 rounded"
                />
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Copy</Button>
              </div>
              <div className="pt-2">
                <p className="text-sm text-gray-400">Collaborators will join in real-time and see your changes as you type.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleFullscreen}
          className="hover:bg-gray-700"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </Button>
      </div>
    </header>
  );
};

export default EditorHeader;
