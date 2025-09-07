
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Folder, Terminal, Eye, GitBranch, Bot, Settings, Save, Play, Coffee } from "lucide-react";

interface ActionSidebarProps {
  showFileExplorer: boolean;
  showTerminal: boolean;
  showPreview: boolean;
  showVCS?: boolean;
  showAI?: boolean;
  toggleFileExplorer: () => void;
  toggleTerminal: () => void;
  togglePreview: () => void;
  canAccessTerminal?: boolean;
  canAccessVCS?: boolean;
  canEditCode?: boolean;
  toggleVCS?: () => void;
  toggleAI?: () => void;
}

export const ActionSidebar = ({
  showFileExplorer,
  showTerminal,
  showPreview,
  showVCS = false,
  showAI = false,
  toggleFileExplorer,
  toggleTerminal,
  togglePreview,
  canAccessTerminal = true,
  canAccessVCS = false,
  canEditCode = false,
  toggleVCS,
  toggleAI
}: ActionSidebarProps) => {
  return (
    <div className="flex flex-col bg-gray-800 border-r border-gray-700 z-10">
      <TooltipProvider>
        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleFileExplorer}
                className={`transition-colors duration-200 hover:bg-gray-700 ${showFileExplorer ? "bg-gray-700" : ""}`}
              >
                <Folder size={18} className="text-blue-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
              <p>Files</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleTerminal}
                disabled={!canAccessTerminal}
                className={`transition-colors duration-200 hover:bg-gray-700 ${showTerminal ? "bg-gray-700" : ""} ${!canAccessTerminal ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Terminal size={18} className="text-green-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
              <p>{canAccessTerminal ? "Terminal" : "Terminal (Access Restricted)"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={togglePreview}
                className={`transition-colors duration-200 hover:bg-gray-700 ${showPreview ? "bg-gray-700" : ""}`}
              >
                <Eye size={18} className="text-purple-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
              <p>Preview</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {canAccessVCS && (
          <div className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleVCS}
                  className={`transition-colors duration-200 hover:bg-gray-700 ${showVCS ? "bg-gray-700" : ""}`}
                >
                  <GitBranch size={18} className="text-purple-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                <p>Source Control</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleAI}
                disabled={!canEditCode}
                className={`transition-colors duration-200 hover:bg-gray-700 ${showAI ? "bg-gray-700" : ""}`}
              >
                <Bot size={18} className="text-pink-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
              <p>AI</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-gray-700 transition-colors duration-200">
                <Settings size={18} className="text-amber-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-gray-700 transition-colors duration-200">
                <Save size={18} className="text-cyan-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
              <p>Save</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-gray-700 transition-colors duration-200">
                <Play size={18} className="text-emerald-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
              <p>Run</p>
            </TooltipContent>
          </Tooltip>
        </div> */}

        {/* <div className="mt-auto p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-gray-700 transition-colors duration-200">
                <Coffee size={18} className="text-orange-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
              <p>Take a break</p>
            </TooltipContent>
          </Tooltip>
        </div> */}
      </TooltipProvider>
    </div>
  );
};
