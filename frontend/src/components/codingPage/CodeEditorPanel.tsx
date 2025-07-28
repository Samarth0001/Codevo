import Editor from "@monaco-editor/react";
import { useEffect, useRef, useContext, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/context/AuthContext";
import { useParams } from "react-router-dom";
import { useEditor } from "@/context/EditorContext";
import { Socket } from "socket.io-client";

interface CodeEditorPanelProps {
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
  socket?: Socket | null;
}

// File content storage
interface FileContent {
  [key: string]: string;
}

export const CodeEditorPanel = ({ currentTheme, setCurrentTheme, socket }: CodeEditorPanelProps) => {
  const editorRef = useRef<any>(null);
  const [fileContents, setFileContents] = useState<FileContent>({});
  const [isEditorReady, setIsEditorReady] = useState(false);

  const { activeFile, setActiveFile, openFiles, setOpenFiles } = useEditor();
  const { user } = useContext(AuthContext);
  const { projectId: roomId } = useParams();

  function getLanguageForFile(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'jsx': return 'javascript';
      case 'tsx': return 'typescript';
      case 'json': return 'json';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'scss': return 'scss';
      case 'less': return 'less';
      case 'md': return 'markdown';
      case 'py': return 'python';
      case 'php': return 'php';
      case 'java': return 'java';
      case 'c': return 'c';
      case 'cpp': return 'cpp';
      case 'cs': return 'csharp';
      case 'go': return 'go';
      case 'rs': return 'rust';
      case 'rb': return 'ruby';
      case 'pl': return 'perl';
      case 'sh': return 'shell';
      case 'sql': return 'sql';
      case 'xml': return 'xml';
      case 'yaml': return 'yaml';
      case 'yml': return 'yaml';
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
    };

    socket.on('project:initialized', handleProjectInitialized);
    socket.on('files:contentUpdated', handleContentUpdated);

    return () => {
      socket.off('project:initialized', handleProjectInitialized);
      socket.off('files:contentUpdated', handleContentUpdated);
    };
  }, [socket]);

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
      // Cleanup will be handled by Monaco internally
    };
  }, []);

  const handleEditorMount = (editor: any) => {
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

  // Get current file content
  const getCurrentFileContent = () => {
    return activeFile ? (fileContents[activeFile] || '') : '';
  };

  // Get current file language
  const getCurrentFileLanguage = () => {
    return activeFile ? getLanguageForFile(activeFile) : 'javascript';
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
          {activeFile || 'No file selected'}
        </div>
        <div className="ml-auto flex space-x-2">
          <Button variant="ghost" size="sm" className="text-xs text-gray-400 h-6 px-2">
            {getCurrentFileLanguage()}
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
          language={getCurrentFileLanguage()}
          value={getCurrentFileContent()}
          theme={currentTheme}
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          options={{
            // Basic editor settings
            fontSize: 14,
            lineHeight: 21,
            wordWrap: "on",
            automaticLayout: true,
            
            // Enable essential features
            minimap: { enabled: true },
            folding: true,
            foldingStrategy: "auto",
            showFoldingControls: "mouseover",
            renderLineHighlight: "all",
            
            // Cursor and selection
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            roundedSelection: true,
            
            // Full IntelliSense and autocomplete
            hover: { enabled: true },
            quickSuggestions: { 
              other: true, 
              comments: true, 
              strings: true 
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            wordBasedSuggestions: "allDocuments",
            
            // Rendering
            renderWhitespace: "selection",
            renderControlCharacters: false,
            
            // Performance
            largeFileOptimizations: true,
            maxTokenizationLineLength: 20000,
            scrollBeyondLastLine: false,
            
            // Disable problematic features
            stickyScroll: { enabled: false },
            
            // Comprehensive IntelliSense features
            parameterHints: { 
              enabled: true,
              cycle: true
            },
            
            // Advanced suggest settings
            suggest: { 
              showKeywords: true,
              showSnippets: true,
              showClasses: true,
              showFunctions: true,
              showVariables: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showColors: true,
              showFiles: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showWords: true,
              showDeprecated: true,
              showIcons: true
            },
            

            
            // Formatting
            formatOnPaste: true,
            formatOnType: true,
            
            // Bracket matching and auto closing
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoClosingOvertype: "always",
            autoClosingDelete: "always",
            autoSurround: "quotes",
            
            // Indentation
            autoIndent: "full",
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: true,
            
            // Line numbers and guides
            lineNumbers: "on",
            guides: {
              indentation: true,
              bracketPairs: true,
              bracketPairsHorizontal: true,
              highlightActiveIndentation: true,
              highlightActiveBracketPair: true
            },
            
            // Multi cursor and selection
            multiCursorModifier: "alt",
            multiCursorPaste: "full",
            multiCursorMergeOverlapping: true,
            
            // Find and replace
            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: "never",
              seedSearchStringFromSelection: "always"
            },
            
            // Accessibility
            accessibilitySupport: "auto",
            
            // Advanced features
            links: true,
            colorDecorators: true,
            codeLens: true,
            foldingImportsByDefault: true,
            showUnused: true,
            showDeprecated: true,
            inlayHints: {
              enabled: "on"
            }
          }}
        />
      </div>
    </div>
  );
};
