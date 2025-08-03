import React, { useEffect, useRef } from 'react';
import { useCollaboration } from '@/context/CollaborationContext';
import { useEditor } from '@/context/EditorContext';

interface UserAwarenessProps {
  editorRef: any;
}

export const UserAwareness: React.FC<UserAwarenessProps> = ({ editorRef }) => {
  const { activeUsers, updateAwareness } = useCollaboration();
  const { activeFile } = useEditor();
  const decorationsRef = useRef<Map<string, string[]>>(new Map());

  // Update awareness when active file changes
  useEffect(() => {
    updateAwareness({ activeFile });
  }, [activeFile, updateAwareness]);

  // Handle editor cursor position changes
  useEffect(() => {
    if (!editorRef?.current) return;

    const editor = editorRef.current;
    
    const handleCursorPositionChanged = () => {
      const position = editor.getPosition();
      if (position) {
        updateAwareness({
          cursorPosition: {
            line: position.lineNumber,
            column: position.column
          }
        });
      }
    };

    const handleSelectionChanged = () => {
      const selection = editor.getSelection();
      if (selection) {
        updateAwareness({
          selection: {
            start: {
              line: selection.getStartPosition().lineNumber,
              column: selection.getStartPosition().column
            },
            end: {
              line: selection.getEndPosition().lineNumber,
              column: selection.getEndPosition().column
            }
          }
        });
      }
    };

    // Add event listeners
    const cursorDisposable = editor.onDidChangeCursorPosition(handleCursorPositionChanged);
    const selectionDisposable = editor.onDidChangeCursorSelection(handleSelectionChanged);

    return () => {
      // Dispose of event listeners properly
      if (cursorDisposable && typeof cursorDisposable.dispose === 'function') {
        cursorDisposable.dispose();
      }
      if (selectionDisposable && typeof selectionDisposable.dispose === 'function') {
        selectionDisposable.dispose();
      }
    };
  }, [editorRef, updateAwareness]);

  // Render user cursors and selections
  useEffect(() => {
    if (!editorRef?.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Clear existing decorations
    const existingDecorations = decorationsRef.current.get(activeFile || '') || [];
    if (existingDecorations.length > 0) {
      editor.deltaDecorations(existingDecorations, []);
    }

    // Create new decorations for other users
    const newDecorations: any[] = [];
    const otherUsers = activeUsers.filter(user => user.activeFile === activeFile);

    otherUsers.forEach(user => {
      if (user.cursorPosition && user.activeFile === activeFile) {
        // Add cursor decoration
        newDecorations.push({
          range: {
            startLineNumber: user.cursorPosition.line,
            startColumn: user.cursorPosition.column,
            endLineNumber: user.cursorPosition.line,
            endColumn: user.cursorPosition.column
          },
          options: {
            className: 'user-cursor',
            hoverMessage: {
              value: `${user.username}`
            },
            beforeContentClassName: 'user-cursor-before',
            afterContentClassName: 'user-cursor-after',
            beforeContentInlineClassName: `user-cursor-color-${user.color.replace('#', '')}`
          }
        });
      }

      if (user.selection && user.activeFile === activeFile) {
        // Add selection decoration
        newDecorations.push({
          range: {
            startLineNumber: user.selection.start.line,
            startColumn: user.selection.start.column,
            endLineNumber: user.selection.end.line,
            endColumn: user.selection.end.column
          },
          options: {
            className: 'user-selection',
            hoverMessage: {
              value: `${user.username}'s selection`
            },
            beforeContentInlineClassName: `user-selection-color-${user.color.replace('#', '')}`
          }
        });
      }
    });

    // Apply decorations
    if (newDecorations.length > 0) {
      const decorationIds = editor.deltaDecorations([], newDecorations);
      decorationsRef.current.set(activeFile || '', decorationIds);
    }
  }, [activeUsers, activeFile, editorRef]);

  return null; // This component doesn't render anything visible
}; 