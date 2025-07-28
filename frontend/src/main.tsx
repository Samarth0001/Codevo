import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.tsx';
import { EditorProvider } from './context/EditorContext.tsx';

// self.MonacoEnvironment = {
//   getWorkerUrl: function (moduleId, label) {
//     return `/monaco-editor-workers/${label}.worker.js`;
//   }
// };

self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') return '/json.worker.js';
    if (label === 'css') return '/css.worker.js';
    if (label === 'html') return '/html.worker.js';
    if (label === 'typescript' || label === 'javascript') return '/ts.worker.js';
    return '/editor.worker.js';
  }
}

createRoot(document.getElementById("root")!).render(
<AuthProvider>
    <EditorProvider>
      <BrowserRouter>
          <Toaster />
          <App />
      </BrowserRouter>
    </EditorProvider>
</AuthProvider>
);
