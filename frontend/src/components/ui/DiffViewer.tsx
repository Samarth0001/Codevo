import React from 'react';
import { diffLines } from 'diff';
import { Button } from './button';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  fileName?: string;
  onApply?: () => void;
  onReject?: () => void;
  onSeeChanges?: () => void;
  className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldCode,
  newCode,
  fileName,
  onApply,
  onReject,
  onSeeChanges,
  className = ''
}) => {
  const diff = diffLines(oldCode || '', newCode || '');
  
  const renderDiffLine = (part: any, index: number) => {
    const { added, removed, value } = part;
    const lines = value.split('\n');
    
    return lines.map((line: string, lineIndex: number) => {
      if (lineIndex === lines.length - 1 && line === '') return null; // Skip empty last line
      
      let bgColor = '';
      let borderColor = '';
      let textColor = '';
      
      if (added) {
        bgColor = 'bg-green-900/20';
        borderColor = 'border-l-green-500';
        textColor = 'text-green-300';
      } else if (removed) {
        bgColor = 'bg-red-900/20';
        borderColor = 'border-l-red-500';
        textColor = 'text-red-300';
      } else {
        bgColor = 'bg-gray-800/50';
        textColor = 'text-gray-300';
      }
      
      return (
        <div
          key={`${index}-${lineIndex}`}
          className={`px-3 py-1 border-l-2 ${bgColor} ${borderColor} ${textColor} font-mono text-sm`}
        >
          <span className="text-gray-500 mr-2">
            {added ? '+' : removed ? '-' : ' '}
          </span>
          {line}
        </div>
      );
    });
  };

  return (
    <div className={`border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {fileName && (
        <div className="bg-gray-800 px-3 py-2 border-b border-gray-700">
          <div className="text-sm font-medium text-gray-300">{fileName}</div>
        </div>
      )}
      
      <div className="max-h-96 overflow-auto">
        {diff.map((part, index) => renderDiffLine(part, index))}
      </div>
      
      {(onApply || onReject || onSeeChanges) && (
        <div className="bg-gray-800 px-3 py-2 border-t border-gray-700 flex justify-end gap-2">
          {onReject && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="text-red-400 border-red-600 hover:bg-red-900/20"
            >
              Reject
            </Button>
          )}
          {onSeeChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSeeChanges}
              className="text-blue-400 border-blue-600 hover:bg-blue-900/20"
            >
              See Changes
            </Button>
          )}
          {onApply && (
            <Button
              size="sm"
              onClick={onApply}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Apply Changes
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default DiffViewer;
