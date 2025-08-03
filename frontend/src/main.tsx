import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.tsx';
import { EditorProvider } from './context/EditorContext.tsx';
import { TemplateProvider } from './context/TemplateContext.tsx';

// Import Monaco setup early to configure workers properly
import './monaco-setup';

createRoot(document.getElementById("root")!).render(
<AuthProvider>
    <EditorProvider>
      <TemplateProvider>
        <BrowserRouter>
            <Toaster />
            <App />
        </BrowserRouter>
      </TemplateProvider>
    </EditorProvider>
</AuthProvider>
);
