// Minimal Monaco Editor setup without custom workers
// This avoids the worker loading issues that were causing errors

import * as monaco from 'monaco-editor';

// Configure Monaco to use default workers and prevent loading issues
self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId: string, label: string) {
    // Use a simple approach that doesn't require external workers
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = {
        baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/'
      };
      importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/worker/workerMain.js');
    `)}`;
  }
};

// Disable some problematic features
monaco.editor.defineTheme('vs-dark-stable', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {}
});

monaco.editor.defineTheme('vs-light-stable', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {}
});

// Export for potential use
export { monaco }; 