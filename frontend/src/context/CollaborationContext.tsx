import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Socket } from 'socket.io-client';

interface UserAwareness {
  userId: string;
  username: string;
  color: string;
  cursorPosition: { line: number; column: number } | null;
  selection: { start: { line: number; column: number }; end: { line: number; column: number } } | null;
  activeFile: string | null;
}

interface FileChange {
  path: string;
  content: any;
  diffType: 'full' | 'patch';
  version: number;
  userId: string;
  timestamp: number;
}

interface CollaborationContextType {
  users: UserAwareness[];
  activeUsers: UserAwareness[];
  fileChanges: Map<string, FileChange[]>;
  isCollaborating: boolean;
  updateAwareness: (awareness: Partial<UserAwareness>) => void;
  applyFileChange: (path: string, change: FileChange) => void;
  getFileChanges: (path: string) => FileChange[];
  clearFileChanges: (path: string) => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

interface CollaborationProviderProps {
  children: ReactNode;
  socket: Socket | null;
  userId: string | null;
  username: string;
}

export function CollaborationProvider({ children, socket, userId, username }: CollaborationProviderProps) {
  const effectiveUserId = userId || socket?.id || 'anonymous';
  const [users, setUsers] = useState<UserAwareness[]>([]);
  const [fileChanges, setFileChanges] = useState<Map<string, FileChange[]>>(new Map());
  const [isCollaborating, setIsCollaborating] = useState(false);

  // Active users (users who have been seen in the last 30 seconds)
  const activeUsers = users.filter(user => {
    // For now, consider all users active
    // In a real implementation, you'd track lastSeen timestamps
    return true;
  });

  // Handle user joined
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (user: { userId: string; username: string; color: string }) => {
      setUsers(prev => {
        const existing = prev.find(u => u.userId === user.userId);
        if (existing) return prev;
        return [...prev, { ...user, cursorPosition: null, selection: null, activeFile: null }];
      });
      setIsCollaborating(true);
    };

    const handleUserLeft = (user: { userId: string; username: string }) => {
      setUsers(prev => prev.filter(u => u.userId !== user.userId));
    };

    const handleUsersList = (usersList: UserAwareness[]) => {
      setUsers(usersList);
      setIsCollaborating(usersList.length > 1);
    };

    const handleUserAwareness = (awareness: { userId: string } & Partial<UserAwareness>) => {
      setUsers(prev => prev.map(user => 
        user.userId === awareness.userId 
          ? { ...user, ...awareness }
          : user
      ));
    };

    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);
    socket.on('users:list', handleUsersList);
    socket.on('user:awareness', handleUserAwareness);

    return () => {
      socket.off('user:joined', handleUserJoined);
      socket.off('user:left', handleUserLeft);
      socket.off('users:list', handleUsersList);
      socket.off('user:awareness', handleUserAwareness);
    };
  }, [socket]);

  // Handle file changes
  useEffect(() => {
    if (!socket) return;

    const handleFileChanged = (change: FileChange) => {
      setFileChanges(prev => {
        const newMap = new Map(prev);
        const existingChanges = newMap.get(change.path) || [];
        newMap.set(change.path, [...existingChanges, change]);
        return newMap;
      });
    };

    socket.on('file:changed', handleFileChanged);

    return () => {
      socket.off('file:changed', handleFileChanged);
    };
  }, [socket]);

  // Update user awareness
  const updateAwareness = (awareness: Partial<UserAwareness>) => {
    if (socket) {
      socket.emit('user:awareness', awareness);
    }
  };

  // Apply file change
  const applyFileChange = (path: string, change: FileChange) => {
    setFileChanges(prev => {
      const newMap = new Map(prev);
      const existingChanges = newMap.get(path) || [];
      newMap.set(path, [...existingChanges, change]);
      return newMap;
    });
  };

  // Get file changes for a specific path
  const getFileChanges = (path: string): FileChange[] => {
    return fileChanges.get(path) || [];
  };

  // Clear file changes for a specific path
  const clearFileChanges = (path: string) => {
    setFileChanges(prev => {
      const newMap = new Map(prev);
      newMap.delete(path);
      return newMap;
    });
  };

  return (
    <CollaborationContext.Provider
      value={{
        users,
        activeUsers,
        fileChanges,
        isCollaborating,
        updateAwareness,
        applyFileChange,
        getFileChanges,
        clearFileChanges,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (context === undefined) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
} 