import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.tsx';


createRoot(document.getElementById("root")!).render(
<AuthProvider>
    <BrowserRouter>
        <Toaster />
        <App />
    </BrowserRouter>
</AuthProvider>
);
