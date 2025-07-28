import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// import monacoEditorPlugin from 'vite-plugin-monaco-editor';
// import monacoEditorPluginModule from 'vite-plugin-monaco-editor'

// const isObjectWithDefaultFunction = (module: unknown): module is { default: typeof monacoEditorPluginModule } => (
//   module != null &&
//   typeof module === 'object' &&
//   'default' in module &&
//   typeof module.default === 'function'
// )

// const monacoEditorPlugin = isObjectWithDefaultFunction(monacoEditorPluginModule)
//   ? monacoEditorPluginModule.default
//   : monacoEditorPluginModule

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
    // Enable Monaco plugin
    // monacoEditorPlugin({
    //   languageWorkers: ['editorWorkerService', 'typescript', 'json', 'html', 'css'],
    //   publicPath: 'monaco-editor-workers', // This matches the getWorkerUrl above
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
}));
