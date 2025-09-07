import React from 'react';
import { useCollaboration } from '@/context/CollaborationContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Wifi, WifiOff } from 'lucide-react';

export const CollaborationStatus: React.FC = () => {
  const { activeUsers, isCollaborating } = useCollaboration();

  if (!isCollaborating) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1">
        <WifiOff className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400">Solo editing</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2 px-3 py-1 relative">
        <div className="flex items-center space-x-1">
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600 font-medium">
            {activeUsers.length} active
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Users className="h-4 w-4 text-blue-500" />
          <div className="flex -space-x-2">
            {activeUsers.slice(0, 3).map((user, index) => (
              <Tooltip key={user.userId}>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6 border-2 border-white ">
                    <AvatarFallback 
                      className="text-xs font-medium absolute"
                      style={{ backgroundColor: user.color, color: 'white' }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center absolute -bottom-20 -left-1/2">
                    <p className="font-medium">{user.username}</p>
                    {user.activeFile && (
                      <p className="text-xs text-gray-500">
                        Editing: {user.activeFile}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
            {activeUsers.length > 3 && (
              <Badge variant="secondary" className="h-6 px-2 text-xs">
                +{activeUsers.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}; 