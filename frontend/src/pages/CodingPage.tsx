import { useEffect, useState } from "react";
import { FileExplorer } from "@/components/codingPage/FileExplorer";
import { Preview } from "@/components/codingPage/Preview";
import EditorHeader from "@/components/codingPage/EditorHead";
import { ActionSidebar } from "@/components/codingPage/ActionSidebar";
import { CodeEditorPanel } from "@/components/codingPage/CodeEditorPanel";
import { TerminalPanel } from "@/components/codingPage/TerminalPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, X } from "lucide-react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { useEditor } from "@/context/EditorContext";
import { useParams} from "react-router-dom";
import { createProject } from "@/services/operations/ProjectAPI";
import Spinner from "@/components/auth/Spinner";
import { io, Socket } from "socket.io-client";

type TabType = 'preview' | 'shell' | 'console';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
  children?: FileItem[];
  path?: string;
}

const CodingPage = () => {

  const {loading,setLoading} = useEditor();
  const {projectId} = useParams();

  async function createProjectFn(){
    try{
      setLoading(true);
      const projectDetails = await createProject({uniqueId:projectId},setLoading);
      console.log("Project created successfully");
      setLoading(false);
    }
    catch(e){
      console.log(e);
    }
  }

  useEffect(() => {
    setLoading(true);
    if(projectId){
      createProjectFn();
    }
    setLoading(false);
  },[]);

  if(loading){
    return (
      <div className="w-screen h-screen">
        <Spinner/>
      </div>
    )
  }

  return <CodingPagePostPodCreation/>
};


const CodingPagePostPodCreation = () => {
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [activeTabs, setActiveTabs] = useState<TabType[]>([]);
  const [selectedTab, setSelectedTab] = useState<TabType | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("vs-dark");
  const [isRightLayout, setIsRightLayout] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [fileStructure, setFileStructure] = useState<FileItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { projectId } = useParams();
  const { activeFile, setActiveFile, openFiles, setOpenFiles } = useEditor();

  // WebSocket connection to runner container
  useEffect(() => {
    if (!projectId) return;

    console.log(`[CodingPage] Connecting to runner for project: ${projectId}`);

    // Connect to runner container WebSocket 
    // The URL should be the runner service URL in your cluster
    // swiftrocket6632-aa3a8b10-5660-42fd-8ee5-3a8dd9866067.codevo.dev
    // https://${projectId}.codevo.dev
    // const runnerSocket = io(`http://${projectId}.127.0.0.1.sslip.io`);
    const runnerSocket = io(`http://${projectId}.127.0.0.1.sslip.io`, {
      path: "/user/socket.io",
    });

    runnerSocket.on('connect', () => {
      console.log('Connected to runner container');
      setIsConnected(true);
      
      // Join project room first
      console.log(`[CodingPage] Joining project room: ${projectId}`);
      runnerSocket.emit('join:project', { projectId });
      
      // Initialize project - this will create default files and send structure + content
      console.log(`[CodingPage] Emitting project:initialize for project: ${projectId}`);
      runnerSocket.emit('project:initialize', { projectId });
    });

    runnerSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    runnerSocket.on('disconnect', () => {
      console.log('Disconnected from runner container');
      setIsConnected(false);
    });

    // Handle project initialization response
    runnerSocket.on('project:initialized', ({ structure, filesWithContent, projectId: initializedProjectId }) => {
      console.log('Project initialized:', { structure, filesWithContent, initializedProjectId });
      setFileStructure(structure);
      
      // Set open files from structure
      const fileNames = structure
        .filter(item => item.type === 'file')
        .map(item => item.name);
      
      if (fileNames.length > 0) {
        setOpenFiles(fileNames);
        // Prefer main.js, then index.js, then index.html, then any .js file, then first file
        let preferredFile = fileNames.find(name => name === "main.js") || 
                           fileNames.find(name => name === "index.js") ||  
                           fileNames.find(name => name === "index.html") || 
                           fileNames.find(name => name.endsWith(".js")) || 
                           fileNames[0];
        setActiveFile(preferredFile);
        console.log(`[CodingPage] Set active file to: ${preferredFile}`);
      }
    });

    // Handle project initialization error
    runnerSocket.on('project:error', ({ message }) => {
      console.error('Project initialization error:', message);
    });

    // Add timeout for project initialization
    const initTimeout = setTimeout(() => {
      console.log(`[CodingPage] Project initialization timeout, requesting file structure manually`);
      runnerSocket.emit('files:getStructure');
    }, 10000); // 10 second timeout

    // Clear timeout when project is initialized
    runnerSocket.on('project:initialized', () => {
      clearTimeout(initTimeout);
    });

    // Handle file structure updates
    runnerSocket.on('files:structure', (files: FileItem[]) => {
      console.log('Received file structure:', files);
      setFileStructure(files);
      
      // Update open files if not already set
      if (openFiles.length === 0) {
        const fileNames = files
          .filter(item => item.type === 'file')
          .map(item => item.name);
        
        if (fileNames.length > 0) {
          setOpenFiles(fileNames);
          setActiveFile(fileNames[0]);
        }
      }
    });

    // Handle file content updates
    runnerSocket.on('files:content', ({ path, content }) => {
      console.log('Received file content for:', path);
      // File content is now handled directly in CodeEditorPanel
    });

    // Handle content updates from other users
    runnerSocket.on('files:contentUpdated', ({ path, content, diffType, updatedBy }) => {
      console.log(`[CodingPage] Content updated by ${updatedBy} for: ${path}`);
      // This will be handled by CodeEditorPanel to update the editor
    });

    // Handle file creation
    runnerSocket.on('files:created', (file: FileItem) => {
      console.log('File created:', file);
      setFileStructure(prev => [...prev, file]);
      
      if (file.type === 'file') {
        const newOpenFiles = [...openFiles, file.name];
        setOpenFiles(newOpenFiles);
      }
    });

    // Handle file deletion
    runnerSocket.on('files:deleted', (filePath: string) => {
      console.log('File deleted:', filePath);
      setFileStructure(prev => removeFileFromStructure(prev, filePath));
      const newOpenFiles = openFiles.filter(name => name !== filePath);
      setOpenFiles(newOpenFiles);
      
      // If the deleted file was active, switch to another file
      if (activeFile === filePath) {
        if (newOpenFiles.length > 0) {
          setActiveFile(newOpenFiles[0]);
        }
      }
    });

    // Handle file rename
    runnerSocket.on('files:renamed', ({ oldPath, newPath }: { oldPath: string; newPath: string }) => {
      console.log('File renamed:', oldPath, '->', newPath);
      setFileStructure(prev => renameFileInStructure(prev, oldPath, newPath));
      const newOpenFiles = openFiles.map(name => name === oldPath ? newPath : name);
      setOpenFiles(newOpenFiles);
      
      // Update active file if it was renamed
      if (activeFile === oldPath) {
        setActiveFile(newPath);
      }
    });

    // Handle Yjs files
    runnerSocket.on('yjs:files', (files: string[]) => {
      console.log('Received Yjs files:', files);
      // This will be used to sync with the editor
    });

    setSocket(runnerSocket);

    return () => {
      // Leave Yjs room before disconnecting
      if (projectId) {
        runnerSocket.emit('yjs:leaveRoom', { roomId: projectId });
      }
      runnerSocket.disconnect();
    };
  }, [projectId]);

  // Helper function to remove file from structure
  const removeFileFromStructure = (structure: FileItem[], path: string): FileItem[] => {
    return structure.filter(item => {
      if (item.path === path) return false;
      if (item.children) {
        item.children = removeFileFromStructure(item.children, path);
      }
      return true;
    });
  };

  // Helper function to rename file in structure
  const renameFileInStructure = (structure: FileItem[], oldPath: string, newPath: string): FileItem[] => {
    return structure.map(item => {
      if (item.path === oldPath) {
        return { ...item, path: newPath, name: newPath.split('/').pop() || item.name };
      }
      if (item.children) {
        item.children = renameFileInStructure(item.children, oldPath, newPath);
      }
      return item;
    });
  };

  // File operations
  const createFile = (path: string, isFolder: boolean = false) => {
    if (socket && isConnected) {
      socket.emit('files:create', { path, isFolder });
    }
  };

  const deleteFile = (path: string) => {
    if (socket && isConnected) {
      socket.emit('files:delete', { path });
    }
  };

  const renameFile = (oldPath: string, newPath: string) => {
    if (socket && isConnected) {
      socket.emit('files:rename', { oldPath, newPath });
    }
  };

  const getFileContent = (path: string) => {
    if (socket && isConnected) {
      socket.emit('files:getContent', { path });
    }
  };

  const addTab = (tab: TabType) => {
    if (!activeTabs.includes(tab)) {
      setActiveTabs([...activeTabs, tab]);
      setSelectedTab(tab);
    } else {
      setSelectedTab(tab);
    }
  };

  const removeTab = (tab: TabType) => {
    const newTabs = activeTabs.filter(t => t !== tab);
    setActiveTabs(newTabs);
    if (selectedTab === tab) {
      setSelectedTab(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleLayout = () => {
    setIsRightLayout(!isRightLayout);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <EditorHeader 
        isFullscreen={isFullscreen} 
        toggleFullscreen={toggleFullscreen}
        toggleTerminal={() => addTab('shell')}
        togglePreview={() => addTab('preview')}
        toggleLayout={toggleLayout}
        isRightLayout={isRightLayout}
      />

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-600 text-white px-4 py-2 text-center">
          Connecting to runner container...
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Vertical action sidebar */}
        <ActionSidebar 
          showFileExplorer={showFileExplorer}
          showTerminal={activeTabs.includes('shell')}
          showPreview={activeTabs.includes('preview')}
          toggleFileExplorer={() => setShowFileExplorer(!showFileExplorer)}
          toggleTerminal={() => addTab('shell')}
          togglePreview={() => addTab('preview')}
        />

        {/* Main layout */}
        <div className="flex-1 h-full relative">
          {isRightLayout ? (
            <PanelGroup direction="horizontal">
              {showFileExplorer && (
                <>
                  <Panel defaultSize={10} minSize={10} maxSize={30}>
                    <div className="h-full relative">
                      <FileExplorer 
                        files={fileStructure}
                        onCreateFile={createFile}
                        onDeleteFile={deleteFile}
                        onRenameFile={renameFile}
                        onGetFileContent={getFileContent}
                        isConnected={isConnected}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-700 border border-gray-700 rounded-full h-12 w-8"
                        onClick={() => setShowFileExplorer(false)}
                      >
                        <ChevronLeft size={14} color="black"/>
                      </Button>
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
                </>
              )}
              <Panel defaultSize={showFileExplorer ? 90 : 100}>
                <PanelGroup direction="horizontal">
                  <Panel defaultSize={70} minSize={30}>
                    <CodeEditorPanel 
                      currentTheme={currentTheme}
                      setCurrentTheme={setCurrentTheme}
                      socket={socket}
                    />
                  </Panel>
                  {activeTabs.length > 0 && (
                    <>
                      <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
                      <Panel defaultSize={30} minSize={20}>
                        <div className="h-full flex flex-col border-l border-gray-700">
                          <Tabs value={selectedTab || undefined} onValueChange={(val) => setSelectedTab(val as TabType)} className="flex flex-col h-full">
                            <TabsList className="bg-gray-800 border-b border-gray-700 flex ">
                              {activeTabs.map((tab) => (
                                <div key={tab} className="flex items-center ">
                                  <TabsTrigger 
                                    value={tab} 
                                    className="data-[state=active]:bg-gray-700 "
                                  >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                  </TabsTrigger>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0 hover:bg-gray-700"
                                    onClick={() => removeTab(tab)}
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              ))}
                            </TabsList>
                            <div className="flex-1 min-h-0">
                              {activeTabs.map((tab) => (
                                <TabsContent key={tab} value={tab} className="h-full m-0">
                                  {tab === 'preview' && <Preview />}
                                  {tab === 'shell' && (
                                    <TerminalPanel 
                                      terminalTab="shell"
                                      setTerminalTab={() => {}}
                                      toggleTerminal={() => removeTab('shell')}
                                      socket={socket}
                                    />
                                  )}
                                  {tab === 'console' && (
                                    <TerminalPanel 
                                      terminalTab="console"
                                      setTerminalTab={() => {}}
                                      toggleTerminal={() => removeTab('console')}
                                      socket={socket}
                                    />
                                  )}
                                </TabsContent>
                              ))}
                            </div>
                          </Tabs>
                        </div>
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>
            </PanelGroup>
          ) : (
            <PanelGroup direction="horizontal">
              {showFileExplorer && (
                <>
                  <Panel defaultSize={10} minSize={10} maxSize={30}>
                    <div className="h-full relative">
                      <FileExplorer 
                        files={fileStructure}
                        onCreateFile={createFile}
                        onDeleteFile={deleteFile}
                        onRenameFile={renameFile}
                        onGetFileContent={getFileContent}
                        isConnected={isConnected}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-700 border border-gray-700 rounded-full h-12 w-8"
                        onClick={() => setShowFileExplorer(false)}
                      >
                        <ChevronLeft size={14} color="black"/>
                      </Button>
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
                </>
              )}
              <Panel defaultSize={showFileExplorer ? 90 : 100}>
                <PanelGroup direction="vertical">
                  <Panel defaultSize={70} minSize={30}>
                    <CodeEditorPanel 
                      currentTheme={currentTheme}
                      setCurrentTheme={setCurrentTheme}
                      socket={socket}
                    />
                  </Panel>
                  {activeTabs.length > 0 && (
                    <>
                      <PanelResizeHandle className="h-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
                      <Panel defaultSize={30} minSize={20}>
                        <div className="h-full flex flex-col border-t border-gray-700">
                          <Tabs value={selectedTab || undefined} onValueChange={(val) => setSelectedTab(val as TabType)} className="flex flex-col h-full">
                            <TabsList className="bg-gray-800 border-b border-gray-700 shrink-0">
                              {activeTabs.map((tab) => (
                                <div key={tab} className="flex items-center">
                                  <TabsTrigger 
                                    value={tab} 
                                    className="data-[state=active]:bg-gray-700"
                                  >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                  </TabsTrigger>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0 hover:bg-gray-700"
                                    onClick={() => removeTab(tab)}
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              ))}
                            </TabsList>
                            <div className="flex-1 min-h-0">
                              {activeTabs.map((tab) => (
                                <TabsContent key={tab} value={tab} className="h-full m-0">
                                  {tab === 'preview' && <Preview />}
                                  {tab === 'shell' && (
                                    <TerminalPanel 
                                      terminalTab="shell"
                                      setTerminalTab={() => {}}
                                      toggleTerminal={() => removeTab('shell')}
                                      socket={socket}
                                    />
                                  )}
                                  {tab === 'console' && (
                                    <TerminalPanel 
                                      terminalTab="console"
                                      setTerminalTab={() => {}}
                                      toggleTerminal={() => removeTab('console')}
                                      socket={socket}
                                    />
                                  )}
                                </TabsContent>
                              ))}
                            </div>
                          </Tabs>
                        </div>
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>
            </PanelGroup>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodingPage;
