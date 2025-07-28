// monaco-setup.js
import * as monaco from 'monaco-editor';


self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new Worker('./monaco-workers/json.worker.js', { type: 'module' });
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new Worker('./monaco-workers/css.worker.js', { type: 'module' });
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new Worker('./monaco-workers/html.worker.js', { type: 'module' });
    }
    if (label === 'typescript' || label === 'javascript') {
      return new Worker('./monaco-workers/ts.worker.js', { type: 'module' });
    }
    return new Worker('./monaco-workers/editor.worker.js', { type: 'module' });
  },
};
