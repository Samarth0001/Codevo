import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// import monacoEditorPlugin from 'vite-plugin-monaco-editor';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // Monaco Editor plugin
    // monacoEditorPlugin({
    //   languageWorkers: ['editorWorkerService', 'typescript', 'json', 'html', 'css'],
    //   publicPath: 'monaco-editor-workers',
    // }),
  ].filter(Boolean),
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Configure proper handling of Monaco Editor workers
  assetsInclude: ['**/*.worker.js'],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
}));
