import Editor from "@monaco-editor/react";
import { useEffect, useRef, useContext, useState, useCallback } from "react";
import * as monaco from "monaco-editor";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/context/AuthContext";
import { useParams } from "react-router-dom";
import { useEditor } from "@/context/EditorContext";
import { Socket } from "socket.io-client";
import "../../monaco/monaco-setup"; // Import Monaco setup for worker configuration

interface CodeEditorPanelProps {
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
  socket?: Socket | null;
}

// File content storage without Yjs
interface FileContent {
  [key: string]: string;
}

export const CodeEditorPanel = ({ currentTheme, setCurrentTheme, socket }: CodeEditorPanelProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [fileContents, setFileContents] = useState<FileContent>({});
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [currentModel, setCurrentModel] = useState<monaco.editor.ITextModel | null>(null);

  const { activeFile, setActiveFile, openFiles, setOpenFiles } = useEditor();
  const { user } = useContext(AuthContext);
  const { projectId: roomId } = useParams();

  function getLanguageForFile(filename: string): string {
    const extension = filename.split('.').pop();
    switch (extension) {
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'json': return 'json';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'scss': return 'scss';
      case 'md': return 'markdown';
      case 'py': return 'python';
      default: return 'plaintext';
    }
  }

  // Handle file content updates from socket
  useEffect(() => {
    if (!socket) return;

    const handleFileContent = ({ path, content }: { path: string; content: string }) => {
      console.log(`[CodeEditorPanel] Received content for: ${path}`);
      setFileContents(prev => ({
        ...prev,
        [path]: content
      }));
    };

    socket.on('files:content', handleFileContent);

    return () => {
      socket.off('files:content', handleFileContent);
    };
  }, [socket]);

  // Handle project initialization
  useEffect(() => {
    if (!socket) return;

    const handleProjectInitialized = ({ filesWithContent }: { filesWithContent: any[] }) => {
      console.log(`[CodeEditorPanel] Project initialized with ${filesWithContent.length} files`);
      
      const newFileContents: FileContent = {};
      filesWithContent.forEach(file => {
        if (file.type === 'file' && file.path && file.content !== undefined) {
          newFileContents[file.path] = typeof file.content === 'string' ? file.content : String(file.content || '');
        }
      });
      
      setFileContents(newFileContents);
    };

    const handleContentUpdated = ({ path, content, updatedBy }: { path: string; content: string; updatedBy: string }) => {
      console.log(`[CodeEditorPanel] Content updated by ${updatedBy} for: ${path}`);
      
      // Update local file contents
      setFileContents(prev => ({
        ...prev,
        [path]: content
      }));

      // If this is the active file, update the editor model safely
      if (activeFile === path && editorRef.current && currentModel) {
        try {
          const currentValue = currentModel.getValue();
          if (currentValue !== content) {
            currentModel.setValue(content);
            console.log(`[CodeEditorPanel] Updated editor content for ${path} from user ${updatedBy}`);
          }
        } catch (error) {
          console.error(`[CodeEditorPanel] Error updating model content:`, error);
        }
      }
    };

    socket.on('project:initialized', handleProjectInitialized);
    socket.on('files:contentUpdated', handleContentUpdated);

    return () => {
      socket.off('project:initialized', handleProjectInitialized);
      socket.off('files:contentUpdated', handleContentUpdated);
    };
  }, [socket, activeFile, currentModel]);

  // Safe model update function
  const updateModelSafely = useCallback((filePath: string, content: string) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const language = getLanguageForFile(filePath);
    
    try {
      // Create or get model for the file
      const uri = monaco.Uri.parse(`inmemory://model/${filePath}`);
      let model = monaco.editor.getModel(uri);

      if (!model) {
        model = monaco.editor.createModel(content, language, uri);
        console.log(`[CodeEditorPanel] Created new model for: ${filePath} (${language})`);
      } else {
        // Only update if content is different
        const currentValue = model.getValue();
        if (currentValue !== content) {
          model.setValue(content);
          console.log(`[CodeEditorPanel] Updated model content for: ${filePath}`);
        }
      }

      // Set the model on the editor
      if (editor.getModel() !== model) {
        editor.setModel(model);
        setCurrentModel(model);
        console.log(`[CodeEditorPanel] Set model for: ${filePath}`);
      }
    } catch (error) {
      console.error(`[CodeEditorPanel] Error updating model for ${filePath}:`, error);
    }
  }, []);

  // Update editor when active file changes
  useEffect(() => {
    if (!editorRef.current || !activeFile || !isEditorReady) return;

    const content = fileContents[activeFile] || '';
    updateModelSafely(activeFile, content);
  }, [activeFile, fileContents, isEditorReady, updateModelSafely]);

  // Handle editor content changes
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeFile || !socket || !value) return;

    // Update local state
    setFileContents(prev => ({
      ...prev,
      [activeFile]: value
    }));

    // Send to backend
    socket.emit('files:saveContent', {
      path: activeFile,
      content: value
    });
  }, [activeFile, socket]);

  // Cleanup models on unmount
  useEffect(() => {
    return () => {
      // Dispose of all models when component unmounts
      monaco.editor.getModels().forEach(model => {
        if (model.uri.toString().startsWith('inmemory://model/')) {
          model.dispose();
        }
      });
    };
  }, []);

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    console.log('[CodeEditorPanel] Editor mounted');
    editorRef.current = editor;
    setIsEditorReady(true);
  };

  const handleNewFile = () => {
    const filename = prompt("Enter new file name (e.g., utils.js):");
    if (!filename || openFiles.includes(filename)) return;

    // Create empty file content
    setFileContents(prev => ({
      ...prev,
      [filename]: ''
    }));

    // Add to open files
    setOpenFiles([...openFiles, filename]);
    setActiveFile(filename);

    // Notify backend
    if (socket) {
      socket.emit('files:create', { path: filename, isFolder: false });
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex items-center px-4 py-1 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700">
        <div className="flex space-x-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div className="ml-4 text-sm font-medium text-gray-300">
          {activeFile}
        </div>
        <div className="ml-auto flex space-x-2">
          <Button variant="ghost" size="sm" className="text-xs text-gray-400 h-6 px-2">
            {getLanguageForFile(activeFile)}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 h-6 px-2"
            onClick={() =>
              setCurrentTheme(currentTheme === "vs-dark" ? "vs-light" : "vs-dark")
            }
          >
            {currentTheme === "vs-dark" ? "Light Mode" : "Dark Mode"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 h-6 px-2"
            onClick={handleNewFile}
          >
            + File
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="javascript"
          theme={currentTheme}
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: true },
            fontLigatures: true,
            fontSize: 14,
            lineHeight: 21,
            scrollBeyondLastLine: false,
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            cursorBlinking: "phase",
            roundedSelection: true,
            renderLineHighlight: "all",
            // Disable features that cause issues
            wordWrap: "on",
            automaticLayout: true,
            folding: false,
            foldingStrategy: "auto",
            showFoldingControls: "never",
            // Disable sticky scroll to prevent isVisible errors
            stickyScroll: { enabled: false },
            // Disable some advanced features
            renderWhitespace: "none",
            renderControlCharacters: false,
            // Optimize for stability
            largeFileOptimizations: true,
            maxTokenizationLineLength: 20000,
          }}
        />
      </div>
    </div>
  );
};
