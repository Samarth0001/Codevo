import { useEffect, useRef, useState } from "react";
import { FileExplorer } from "@/components/codingPage/FileExplorer";
import { Preview } from "@/components/codingPage/Preview";
import EditorHeader from "@/components/codingPage/EditorHead";
import { ActionSidebar } from "@/components/codingPage/ActionSidebar";
import { CodeEditorPanel } from "@/components/codingPage/CodeEditorPanel";
import { Shell } from "@/components/codingPage/Shell";
import { Console } from "@/components/codingPage/Console";
import UnifiedVersionControl from "@/components/codingPage/UnifiedVersionControl";
import AIPanel from "@/components/codingPage/AIPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, X } from "lucide-react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { useEditor } from "@/context/EditorContext";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { createProject, getProjectDetails, joinProject, checkProjectStatus } from "@/services/operations/ProjectAPI";
import { GitHubAPI } from "@/services/operations/GitHubAPI";
import Spinner from "@/components/auth/Spinner";
import { io, Socket } from "socket.io-client";
import { CollaborationProvider } from "@/context/CollaborationContext";
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { getUserRoleInProject, getPermissionsForRole } from "@/utils/permissions";

type TabType = 'preview' | 'shell' | 'console' | 'vcs' | 'ai';

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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useContext(AuthContext);
  const {
    projectName,
    description,
    templateId,
    userId,
    visibility,
    tags
  } = location.state || {};

  // console.log('CodingPage - location.state:', location.state);
  // console.log('CodingPage - extracted values:', {
  //   projectName,
  //   description,
  //   templateId,
  //   userId,
  //   visibility,
  //   tags
  // });

  async function createProjectFn(){
    try{
      setLoading(true);
      const projectData = {
        uniqueId: projectId,
        projectName,
        description,
        templateId,
        userId,
        visibility,
        tags
      };
      // console.log('CodingPage - calling createProject with:', projectData);
      
      const projectDetails = await createProject(projectData, setLoading);
      // console.log("Project created successfully", projectDetails);
      
      // Refresh user data to get updated projects list
      await refreshUser();
      
      setLoading(false);
    }
    catch(e){
      // console.log("Error creating project:", e);
      setLoading(false);
    }
  }

  async function joinExistingProject() {
    try {
      setLoading(true);
      // console.log('CodingPage - fetching project details for:', projectId);
      
      // Fetch project details from backend
      const projectDetails = await getProjectDetails(projectId);
      // console.log('CodingPage - project details fetched:', projectDetails);
      
      if (!projectDetails.success) {
        // Project doesn't exist in database, redirect to dashboard
        alert('Project does not exist. It may have been deleted.');
        navigate('/dashboard');
        return;
      }
      
      // Check if project is active using Redis (much faster than WebSocket test)
      const projectStatus = await checkProjectStatus(projectId);
      // console.log('CodingPage - project status:', projectStatus);
      
      if (projectStatus.isActive) {
        // Project is active, just join
        // console.log('CodingPage - Project is active, joining...');
        const joinResult = await joinProject(projectId, user?._id);
        // console.log('CodingPage - joined project:', joinResult);
      } else {
        // Project exists but is not active, create Kubernetes resources
        // console.log('CodingPage - Project exists but not active, creating resources...');
        
        try {
          // Create Kubernetes resources for existing project
          const createResult = await createProject({
            uniqueId: projectId,
            projectName: projectDetails.project.projectName,
            description: projectDetails.project.description || '',
            templateId: projectDetails.project.templateId,
            userId: user?._id,
            visibility: projectDetails.project.visibility || 'private',
            tags: projectDetails.project.tags || []
          }, setLoading);
          
          // console.log('CodingPage - created resources for existing project:', createResult);
          
          // Refresh user data to get updated projects
          await refreshUser();
        } catch (createError) {
          // console.error('Error creating resources for existing project:', createError);
          alert('Failed to activate project. Please try again.');
          navigate('/dashboard');
          return;
        }
      }
      
      setLoading(false);
    } catch (error) {
      // console.error('Error joining project:', error);
      alert('Failed to join project. Please try again.');
      navigate('/dashboard');
      setLoading(false);
    }
  }

  const hasInitializedRef = useRef<string | null>(null);
  const userIdDep = user?._id;

  useEffect(() => {
    // console.log('CodingPage - useEffect triggered with:', { projectId, user: user?._id, projectName, templateId, userId });
    
    if (!projectId) {
      alert('No project ID provided.');
      navigate('/dashboard');
      return;
    }

    if (!userIdDep) {
      // Wait for user id
      return;
    }

    // Prevent duplicate runs for the same projectId
    if (hasInitializedRef.current === projectId) return;
    hasInitializedRef.current = projectId;

    // If we have location.state, it's a new project creation
    if (projectName && templateId && userId) {
      setLoading(true);
      createProjectFn();
    } else {
      // No location.state means joining existing project
      joinExistingProject();
    }
    // Remove this setLoading(false) as it's handled in the individual functions
  },[projectId, userIdDep]);

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [fileStructure, setFileStructure] = useState<FileItem[]>([]);
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [showGitHubSetup, setShowGitHubSetup] = useState(false);
  const { projectId } = useParams();
  const location = useLocation();
  const { activeFile, setActiveFile, openFiles, setOpenFiles } = useEditor();
  const { user } = useContext(AuthContext);

  // Get user's role and permissions for this project
  const userRole = getUserRoleInProject(user, projectId || '');
  const permissions = userRole ? getPermissionsForRole(userRole) : null;

  // Check GitHub connection status
  const checkGitHubStatus = async () => {
    try {
      const response = await GitHubAPI.getStatus();
      setIsGitHubConnected(response.success && response.isConnected);
    } catch (error) {
      // console.error('Error checking GitHub status:', error);
      setIsGitHubConnected(false);
    }
  };

  // Check GitHub status on component mount
  useEffect(() => {
    if (user) {
      checkGitHubStatus();
    }
  }, [user]);

  // WebSocket connection to runner container
  useEffect(() => {
    if (!projectId) return;

    // console.log(`[CodingPage] Connecting to runner for project: ${projectId}`);

    // Connect to runner container WebSocket 
    // The URL should be the runner service URL in your cluster
    // swiftrocket6632-aa3a8b10-5660-42fd-8ee5-3a8dd9866067.codevo.dev
    // https://${projectId}.codevo.dev
    // const runnerSocket = io(`http://${projectId}.127.0.0.1.sslip.io`);
    const runnerSocket = io(`https://${projectId}.codevo.live`, {     //https://${projectId}.codevo.live
      path: "/user/socket.io/",
      transports: ['polling', 'websocket'],
      timeout: 40000, // 40 second timeout
      reconnection: true,
      reconnectionAttempts: 40,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true,
    });
    

    runnerSocket.on('connect', () => {
      // console.log('Connected to runner container');
      setIsConnected(true);
      
      // Join project room first
      // console.log(`[CodingPage] Joining project room: ${projectId}`);
      const userInfo = {
        userId: user?._id || runnerSocket.id,
        username: user?.name || 'Anonymous'
      };
      // console.log(`[CodingPage] User info:`, userInfo);
      
      runnerSocket.emit('join:project', { 
        projectId,
        userInfo
      });
      
      // Initialize project - this will create default files and send structure + content
      // console.log(`[CodingPage] Emitting project:initialize for project: ${projectId}`);
      runnerSocket.emit('project:initialize', { projectId });
    });

    runnerSocket.on('connect_error', (err) => {
      // console.error('Socket connection error:', err.message);
    });

    runnerSocket.on('disconnect', () => {
      // console.log('Disconnected from runner container');
      setIsConnected(false);
    });

    // Handle project initialization response
    runnerSocket.on('project:initialized', ({ structure, filesWithContent, projectId: initializedProjectId }) => {
      // console.log('Project initialized:', { structure, filesWithContent, initializedProjectId });
      setFileStructure(structure);
      
      // Populate file contents
      if (filesWithContent && filesWithContent.length > 0) {
        const newFileContents = new Map<string, string>();
        filesWithContent.forEach((file: any) => {
          if (file.path && file.content) {
            newFileContents.set(file.path, file.content);
          }
        });
        setFileContents(newFileContents);
        // console.log(`[CodingPage] Loaded ${newFileContents.size} files with content`);
      }
      
      // Set open files from structure
      const filePaths = structure
        .filter(item => item.type === 'file')
        .map(item => item.path || item.name);
      
      if (filePaths.length > 0) {
        setOpenFiles(filePaths);
        // Prefer src/App.jsx, then src/main.jsx, then main.js, then index.js, then index.html, then any .jsx file, then any .js file, then first file
        let preferredFile = filePaths.find(path => path === "src/App.jsx") || 
                           filePaths.find(path => path === "App.jsx") || 
                           filePaths.find(path => path === "src/main.jsx") || 
                           filePaths.find(path => path === "main.jsx") || 
                           filePaths.find(path => path === "main.js") || 
                           filePaths.find(path => path === "index.js") ||  
                           filePaths.find(path => path === "index.html") || 
                           filePaths.find(path => path.endsWith(".jsx")) || 
                           filePaths.find(path => path.endsWith(".js")) || 
                           filePaths[0];
        setActiveFile(preferredFile);
        // console.log(`[CodingPage] Set active file to: ${preferredFile}`);
      }
    });

    // Handle project initialization error
    runnerSocket.on('project:error', ({ message }) => {
      // console.error('Project initialization error:', message);
    });

    // Continuous polling for project initialization (5s to 1min)
    let initPollCount = 0;
    const maxInitPolls = 12; // 12 polls * 5s = 60s total
    const initPollInterval = 5000; // 5 seconds
    
    const initPollTimer = setInterval(() => {
      initPollCount++;
      // console.log(`[CodingPage] Project initialization poll ${initPollCount}/${maxInitPolls}, requesting file structure`);
      runnerSocket.emit('files:getStructure');
      
      // Stop polling after 1 minute (12 polls)
      if (initPollCount >= maxInitPolls) {
        // console.log(`[CodingPage] Project initialization polling completed after ${maxInitPolls} attempts`);
        clearInterval(initPollTimer);
      }
    }, initPollInterval);

    // Clear polling when project is initialized
    runnerSocket.on('project:initialized', () => {
      // console.log(`[CodingPage] Project initialized, stopping polling after ${initPollCount} attempts`);
      clearInterval(initPollTimer);
    });

    // Refresh structure on direct files events from runner (create/delete/rename)
    runnerSocket.on('files:created', () => {
      // console.log('[CodingPage] files:created received → refreshing structure');
      runnerSocket.emit('files:refreshStructure');
    });
    runnerSocket.on('files:deleted', () => {
      // console.log('[CodingPage] files:deleted received → refreshing structure');
      runnerSocket.emit('files:refreshStructure');
    });
    runnerSocket.on('files:renamed', () => {
      // console.log('[CodingPage] files:renamed received → refreshing structure');
      runnerSocket.emit('files:refreshStructure');
    });

    // Handle file structure updates
    runnerSocket.on('files:structure', (files: FileItem[]) => {
      // console.log('Received file structure:', files);
      
      // Track the last update time
      (window as any).lastFileStructureUpdate = Date.now();
      
      // Validate the file structure before updating
      if (Array.isArray(files)) {
        // Always set the file structure, even if empty (valid for new projects)
        setFileStructure(files);
        
        // Update open files if not already set and files exist
        if (openFiles.length === 0 && files.length > 0) {
          const filePaths = files
            .filter(item => item.type === 'file')
            .map(item => item.path || item.name);
          
          if (filePaths.length > 0) {
            setOpenFiles(filePaths);
            setActiveFile(filePaths[0]);
          }
        }
        
        // console.log(`[CodingPage] File structure updated with ${files.length} items`);
      } else {
        // console.warn('[CodingPage] Received invalid file structure:', files);
        // Request a fresh file structure if we received invalid data
        setTimeout(() => {
          if (socket && isConnected) {
            socket.emit('files:refreshStructure');
          }
        }, 1000);
      }
    });

    // Handle file content updates
    runnerSocket.on('files:content', ({ path, content }) => {
      // console.log('Received file content for:', path);
      setFileContents(prev => new Map(prev).set(path, content));
    });

    // Handle content updates from other users
    runnerSocket.on('files:contentUpdated', ({ path, content, diffType, updatedBy }) => {
      // console.log(`[CodingPage] Content updated by ${updatedBy} for: ${path}`);
      setFileContents(prev => new Map(prev).set(path, content));
    });

    // Handle file creation
    runnerSocket.on('file:created', (file: FileItem & { createdBy: string; timestamp: number }) => {
      // console.log('File created:', file);
      setFileStructure(prev => addFileToStructure(prev, file));
      
      if (file.type === 'file') {
        const newOpenFiles = [...openFiles, file.path || file.name];
        setOpenFiles(newOpenFiles);
        
        // Initialize empty content for new file
        if (file.path) {
          setFileContents(prev => new Map(prev).set(file.path, ''));
        }
      }
    });

    // Handle file deletion
    runnerSocket.on('file:deleted', (data: { path: string; deletedBy: string; timestamp: number }) => {
      // console.log('File deleted:', data.path);
      
      setFileStructure(prev => {
        // console.log('Removing file from structure:', data.path);
        const newStructure = removeFileFromStructure(prev, data.path);
        // console.log('New structure after deletion:', newStructure);
        return newStructure;
      });
      
      // Remove from file contents
      setFileContents(prev => {
        const newContents = new Map(prev);
        newContents.delete(data.path);
        return newContents;
      });
      
      // Update open files
      const newOpenFiles = openFiles.filter(name => name !== data.path);
      setOpenFiles(newOpenFiles);
      
      // If the deleted file was active, switch to another file
      if (activeFile === data.path) {
        // console.log(`[CodingPage] Active file "${data.path}" was deleted, switching to another file`);
        
        // Find another file to switch to
        const remainingFiles = newOpenFiles.filter(name => name !== data.path);
        // console.log(`[CodingPage] Remaining files after deletion:`, remainingFiles);
        
        if (remainingFiles.length > 0) {
          // Prefer main.js, then index.js, then index.html, then any .js file, then first file
          const preferredFile = remainingFiles.find(name => name === "main.js") || 
                               remainingFiles.find(name => name === "index.js") ||  
                               remainingFiles.find(name => name === "index.html") || 
                               remainingFiles.find(name => name.endsWith(".js")) || 
                               remainingFiles[0];
          // console.log(`[CodingPage] Switching to preferred file after deletion: ${preferredFile}`);
          setActiveFile(preferredFile);
        } else {
          // No files left, clear active file
          // console.log('[CodingPage] No files remaining after deletion, clearing active file');
          setActiveFile('');
        }
      } else {
        // console.log(`[CodingPage] Deleted file "${data.path}" was not active, no need to switch`);
      }
    });

    // Handle file rename
    runnerSocket.on('file:renamed', (data: { oldPath: string; newPath: string; renamedBy: string; timestamp: number }) => {
      // console.log('File renamed:', data.oldPath, '->', data.newPath);
      setFileStructure(prev => renameFileInStructure(prev, data.oldPath, data.newPath));
      const newOpenFiles = openFiles.map(name => name === data.oldPath ? data.newPath : name);
      setOpenFiles(newOpenFiles);
      
      // Update file contents with new path
      setFileContents(prev => {
        const newContents = new Map(prev);
        const content = newContents.get(data.oldPath);
        if (content !== undefined) {
          newContents.delete(data.oldPath);
          newContents.set(data.newPath, content);
        }
        return newContents;
      });
      
      // Update active file if it was renamed
      if (activeFile === data.oldPath) {
        setActiveFile(data.newPath);
      }
    });

    // Handle Yjs files
    runnerSocket.on('yjs:files', (files: string[]) => {
      // console.log('Received Yjs files:', files);
      // This will be used to sync with the editor
    });

    // Handle file structure changes from terminal operations
    runnerSocket.on('files:structureChanged', (data: { event: string; path: string; timestamp: number }) => {
      // Only log important events, not node_modules changes
      // if (data.event === 'force-refresh' || !data.path.includes('node_modules')) {
      //   console.log('[CodingPage] File structure changed:', data);
      // }
      
      // Refresh the file structure when changes are detected
      if (socket && isConnected) {
        socket.emit('files:refreshStructure');
      }
      
      // Special handling for force refresh events
      if (data.event === 'force-refresh') {
        // console.log('[CodingPage] Force refresh detected, requesting fresh file structure');
        // Multiple refresh attempts with increasing delays to ensure we catch all changes
        setTimeout(() => {
          if (socket && isConnected) {
            socket.emit('files:refreshStructure');
          }
        }, 500); // First attempt after 500ms
        
        setTimeout(() => {
          if (socket && isConnected) {
            socket.emit('files:refreshStructure');
          }
        }, 1500); // Second attempt after 1.5s
        
        setTimeout(() => {
          if (socket && isConnected) {
            socket.emit('files:refreshStructure');
          }
        }, 2500); // Third attempt after 2.5s
      }
    });

    // Handle node_modules creation specifically
    runnerSocket.on('files:nodeModulesCreated', (data: { path: string; timestamp: number }) => {
      // Refresh the file structure to show node_modules (silently)
      if (socket && isConnected) {
        socket.emit('files:refreshStructure');
      }
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

  // Periodic file structure refresh to catch any missed updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const interval = setInterval(() => {
      // Only refresh if we haven't received a structure update recently
      const lastUpdate = Date.now() - (window as any).lastFileStructureUpdate || 0;
      if (lastUpdate > 30000) { // 30 seconds
        // console.log('[CodingPage] Periodic file structure refresh');
        socket.emit('files:refreshStructure');
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [socket, isConnected]);

  // Helper function to remove file from structure
  const removeFileFromStructure = (structure: FileItem[], path: string): FileItem[] => {
    // console.log('Removing file from structure:', path);
    // console.log('Current structure:', structure);
    
    return structure.filter(item => {
      // console.log('Checking item:', item.path, 'against path:', path);
      if (item.path === path) {
        // console.log('Found item to remove:', item.path);
        return false;
      }
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

  // Helper function to add file to structure
  const addFileToStructure = (structure: FileItem[], newFile: FileItem): FileItem[] => {
    const pathParts = newFile.path?.split('/') || [];
    
    if (pathParts.length === 1) {
      // File is in root
      return [...structure, newFile];
    }
    
    // File is in a subdirectory
    const parentPath = pathParts.slice(0, -1).join('/');
    const fileName = pathParts[pathParts.length - 1];
    
    return structure.map(item => {
      if (item.path === parentPath && item.type === 'folder') {
        return {
          ...item,
          children: [...(item.children || []), { ...newFile, name: fileName }]
        };
      }
      if (item.children) {
        return {
          ...item,
          children: addFileToStructure(item.children, newFile)
        };
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
    // console.log('Attempting to delete file:', path);
    if (socket && isConnected) {
      socket.emit('files:delete', { path });
    } else {
      // console.error('Cannot delete file: socket not connected');
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
    if (tab === 'shell' && !permissions?.canAccessTerminal) {
      return; // Don't add terminal tab for readers
    }
    if (tab === 'vcs' && !permissions?.canAccessVCS) {
      return; // Don't add VCS tab for non-owners
    }
    if (!activeTabs.includes(tab)) {
      setActiveTabs(prev => [...prev, tab]);
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

  // Code execution functionality
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    output: string;
    error: string;
    executionTime: number;
  } | null>(null);

  const runCode = () => {
    if (!socket || !projectId) {
      // console.error('Cannot run code: socket or projectId not available');
      return;
    }

    // console.log(`[CodingPage] Executing code for project: ${projectId}`);
    setIsExecuting(true);
    setExecutionResult(null);

    // Emit code execution request
    socket.emit('code:execute', { projectId });
  };

  // Handle code execution result
  useEffect(() => {
    if (!socket) return;

    const handleExecutionResult = (result: {
      success: boolean;
      output: string;
      error: string;
      executionTime: number;
    }) => {
      // console.log('[CodingPage] Code execution result:', result);
      setIsExecuting(false);
      setExecutionResult(result);

      // Show result in console tab
      if (!activeTabs.includes('console')) {
        addTab('console');
      }
      setSelectedTab('console');
    };

    socket.on('code:executionResult', handleExecutionResult);

    return () => {
      socket.off('code:executionResult', handleExecutionResult);
    };
  }, [socket, activeTabs]);

  // Function to update file content (for preview updates)
  const updateFileContent = (path: string, content: string) => {
    setFileContents(prev => new Map(prev).set(path, content));
  };



  return (
    <CollaborationProvider 
      socket={socket} 
      userId={user?._id || socket?.id || 'anonymous'} 
      username={user?.name || 'Anonymous'}
      role={userRole}
      permissions={permissions}
    >
      <div className="flex flex-col h-screen w-full bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <EditorHeader 
        isFullscreen={isFullscreen} 
        toggleFullscreen={toggleFullscreen}
        toggleTerminal={() => addTab('shell')}
        togglePreview={() => addTab('preview')}
        runCode={runCode}
        isExecuting={isExecuting}
        projectId={projectId}
        projectName={location.state?.projectName}
      />

      {/* Full-screen loading overlay */}
      {(!isConnected || (fileStructure.length === 0 && !(window as any).lastFileStructureUpdate)) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-lg font-medium">
              {!isConnected ? 'Connecting to project...' : 'Loading project files...'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Please wait while we set up your development environment
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Vertical action sidebar */}
        <ActionSidebar
          showFileExplorer={showFileExplorer}
          showTerminal={activeTabs.includes('shell')}
          showPreview={activeTabs.includes('preview')}
          showVCS={activeTabs.includes('vcs')}
          showAI={activeTabs.includes('ai')}
          toggleFileExplorer={() => setShowFileExplorer(!showFileExplorer)}
          toggleTerminal={() => addTab('shell')}
          togglePreview={() => addTab('preview')}
          canAccessTerminal={permissions?.canAccessTerminal || false}
          canAccessVCS={permissions?.canAccessVCS || false}
          canEditCode={permissions?.canEditCode || false}
          toggleVCS={() => addTab('vcs')}
          toggleAI={() => addTab('ai')}
        />

        {/* Main layout */}
        <div className="flex-1 h-full relative min-w-0">
          <PanelGroup direction="horizontal">
            {showFileExplorer && (
              <>
                <Panel defaultSize={15} minSize={10} maxSize={25}>
                  <div className="h-full relative">
                    <FileExplorer 
                      files={fileStructure}
                      onCreateFile={createFile}
                      onDeleteFile={deleteFile}
                      onRenameFile={renameFile}
                      onGetFileContent={getFileContent}
                      onRefreshStructure={() => {
                        if (socket && isConnected) {
                          socket.emit('files:refreshStructure');
                        }
                      }}
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
            <Panel defaultSize={showFileExplorer ? 85 : 100} minSize={50}>
              <PanelGroup direction="horizontal">
                <Panel defaultSize={60} minSize={30} maxSize={80}>
                  <div className="h-full w-full min-w-0">
                    <CodeEditorPanel 
                      currentTheme={currentTheme}
                      setCurrentTheme={setCurrentTheme}
                      socket={socket}
                      onFileContentChange={updateFileContent}
                    />
                  </div>
                </Panel>
                {activeTabs.length > 0 && (
                  <>
                    <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
                    <Panel defaultSize={40} minSize={20} maxSize={70}>
                      <div className="h-full flex flex-col border-l border-gray-700 min-w-0">
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
                                {tab === 'preview' && (
                                  <Preview 
                                    fileContents={fileContents}
                                    activeFile={activeFile}
                                  />
                                )}
                                {tab === 'shell' && (
                                  <div className="h-full w-full overflow-auto">
                                    <Shell socket={socket} onClose={() => removeTab('shell')} />
                                  </div>
                                )}
                                {tab === 'console' && (
                                  <div className="h-full w-full overflow-hidden">
                                    <Console 
                                      executionResult={executionResult}
                                      isExecuting={isExecuting}
                                    />
                                  </div>
                                )}
                                {tab === 'vcs' && (
                                  <div className="h-full w-full overflow-y-auto">
                                    <UnifiedVersionControl projectId={projectId} />
                                  </div>
                                )}
                                {tab === 'ai' && (
                                  <div className="h-full w-full overflow-hidden">
                                    <AIPanel projectId={projectId} />
                                  </div>
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
        </div>
      </div>
    </div>
    </CollaborationProvider>
  );
};

export default CodingPage;
