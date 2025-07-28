import { createContext, useContext, useState, ReactNode } from 'react';

interface EditorContextType {
  activeFile: string;
  setActiveFile: (file: string) => void;
  openFiles: string[];
  setOpenFiles: (files: string[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [activeFile, setActiveFile] = useState<string>("main.js");
  const [openFiles, setOpenFiles] = useState<string[]>(["main.js"]);
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <EditorContext.Provider
      value={{
        activeFile,
        setActiveFile,
        openFiles,
        setOpenFiles,
        loading,
        setLoading,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
