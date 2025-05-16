import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";

interface CodeEditorPanelProps {
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
}

export const CodeEditorPanel = ({ currentTheme, setCurrentTheme }: CodeEditorPanelProps) => {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex items-center px-4 py-1 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700">
        <div className="flex space-x-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div className="ml-4 text-sm font-medium text-gray-300">main.js</div>
        <div className="ml-auto flex space-x-2">
          <Button variant="ghost" size="sm" className="text-xs text-gray-400 h-6 px-2">
            JavaScript
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-gray-400 h-6 px-2" 
            onClick={() => setCurrentTheme(currentTheme === "vs-dark" ? "vs-light" : "vs-dark")}>
            {currentTheme === "vs-dark" ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="javascript"
          defaultValue="// Welcome to the Codevo Editor
    
function helloWorld() {
  console.log('Hello, world!');
}

helloWorld();"
          theme={currentTheme}
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
          }}
        />
      </div>
    </div>
  );
};
