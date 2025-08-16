import React from 'react';

interface FileIconProps {
  fileName: string;
  extension?: string;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ fileName, extension, className = "w-4 h-4" }) => {
  const getFileIcon = () => {
    // Handle special files first
    if (fileName === '.env' || fileName === '.env.local' || fileName === '.env.development' || fileName === '.env.production') {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <rect width="24" height="24" rx="4" fill="#4caf50"/>
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white"/>
        </svg>
      );
    }

    if (fileName === '.gitignore') {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <rect width="24" height="24" rx="4" fill="#f05032"/>
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white"/>
        </svg>
      );
    }

    if (fileName === 'package.json') {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <rect width="24" height="24" rx="2" fill="#f7df1e"/>
          <path d="M8 7h8v2H8V7zm0 3h8v2H8v-2zm0 3h8v2H8v-2zm0 3h6v2H8v-2z" fill="black"/>
        </svg>
      );
    }

    if (fileName === 'README.md') {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <rect width="24" height="24" rx="4" fill="#ff6b6b"/>
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white"/>
        </svg>
      );
    }

    // Handle file extensions with simple colored rectangles
    switch (extension?.toLowerCase()) {
      case 'js':
      case 'jsx':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#f7df1e"/>
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="black" fontWeight="bold">JS</text>
          </svg>
        );
      
      case 'ts':
      case 'tsx':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#3178c6"/>
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">TS</text>
          </svg>
        );
      
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#1572b6"/>
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">CSS</text>
          </svg>
        );
      
      case 'html':
      case 'htm':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#e34f26"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">HTML</text>
          </svg>
        );
      
      case 'json':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#f7df1e"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="black" fontWeight="bold">JSON</text>
          </svg>
        );
      
      case 'md':
      case 'markdown':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#000000"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">MD</text>
          </svg>
        );
      
      case 'yml':
      case 'yaml':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#cb171e"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">YML</text>
          </svg>
        );
      
      case 'xml':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#f39c12"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">XML</text>
          </svg>
        );
      
      case 'svg':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#ffb13b"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">SVG</text>
          </svg>
        );
      
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'ico':
      case 'webp':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#4caf50"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">IMG</text>
          </svg>
        );
      
      case 'txt':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#607d8b"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">TXT</text>
          </svg>
        );
      
      case 'log':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#f44336"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">LOG</text>
          </svg>
        );
      
      case 'lock':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#ff9800"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">🔒</text>
          </svg>
        );
      
      case 'config':
      case 'conf':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#2196f3"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">CFG</text>
          </svg>
        );
      
      case 'py':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#3776ab"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">PY</text>
          </svg>
        );
      
      case 'java':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#ed8b00"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">JAVA</text>
          </svg>
        );
      
      case 'php':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#777bb4"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">PHP</text>
          </svg>
        );
      
      case 'rb':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#cc342d"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">RB</text>
          </svg>
        );
      
      case 'go':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#00add8"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">GO</text>
          </svg>
        );
      
      case 'rs':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#ce422b"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">RS</text>
          </svg>
        );
      
      case 'sql':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#336791"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">SQL</text>
          </svg>
        );
      
      case 'sh':
      case 'bash':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#4eaa25"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">SH</text>
          </svg>
        );
      
      case 'dockerfile':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#2496ed"/>
            <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">DOCKER</text>
          </svg>
        );
      
      default:
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#9e9e9e"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">FILE</text>
          </svg>
        );
    }
  };

  return getFileIcon();
};
