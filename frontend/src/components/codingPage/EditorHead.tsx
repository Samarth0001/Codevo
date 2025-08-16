import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Terminal, Maximize, Minimize, Eye, Save, Play, RefreshCw, Mail } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiConnector } from '@/services/apiConnector';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { invitationEndPoints } from '@/services/apis';

const { CREATE_INVITATION_API } = invitationEndPoints;

interface EditorHeaderProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  toggleTerminal: () => void;
  togglePreview: () => void;
  runCode: () => void;
  isExecuting?: boolean;
  projectId?: string;
  projectName?: string;
}

const EditorHeader = ({ 
  isFullscreen, 
  toggleFullscreen, 
  toggleTerminal, 
  togglePreview,
  runCode,
  isExecuting = false,
  projectId,
  projectName
}: EditorHeaderProps) => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const { user, loggedIn } = useAuth();

  const handleSendInvitation = async () => {
    if (!loggedIn || !user) {
      toast.error('Please log in to send invitations');
      return;
    }

    if (!invitedEmail.trim() || !projectId || !projectName) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingInvite(true);
    try {
      console.log('Sending invitation with user:', user);
      console.log('User logged in:', loggedIn);
      console.log('API endpoint:', CREATE_INVITATION_API);
      console.log('Request payload:', {
        projectId,
        projectName,
        invitedEmail: invitedEmail.trim()
      });
      
      const response = await apiConnector('POST', CREATE_INVITATION_API, {
        projectId,
        projectName,
        invitedEmail: invitedEmail.trim()
      });

      if (response.data.success) {
        toast.success('Invitation sent successfully!');
        setInvitedEmail('');
        setIsInviteDialogOpen(false);
      } else {
        toast.error(response.data.message || 'Failed to send invitation');
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setIsSendingInvite(false);
    }
  };

  return (
    <header className="w-full  bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 shadow-md">
      <div className='flex items-center justify-between w-[100%] px-4 py-2'>
        <div className="flex items-center">
          <div className="text-2xl font-semibold mr-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text">Codevo</div>
          <div className="hidden sm:flex space-x-1">
            {/* <Button variant="ghost" size="sm" className="text-sm font-normal hover:bg-gray-700">
              File
            </Button> */}
            {/* <Button variant="ghost" size="sm" className="text-sm font-normal hover:bg-gray-700">
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-sm font-normal hover:bg-gray-700">
              View
            </Button>
            <Button variant="ghost" size="sm" className="text-sm font-normal hover:bg-gray-700">
              Help
            </Button> */}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="hidden sm:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs"
            onClick={runCode}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-400"></div>
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={14} className="text-green-400" />
                <span>Run</span>
              </>
            )}
          </Button>

          <Button variant="ghost" size="sm" className="hidden sm:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs">
            <Save size={14} className="text-blue-400" />
            <span>Save</span>
          </Button>

          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden sm:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs"
                onClick={() => {
                  if (!loggedIn || !user) {
                    toast.error('Please log in to send invitations');
                    return;
                  }
                  console.log('User info:', { loggedIn, user });
                }}
              >
                <UserPlus size={14} className="text-purple-400" />
                <span>Invite</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Invite Collaborators</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter collaborator's email"
                    value={invitedEmail}
                    onChange={(e) => setInvitedEmail(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendInvitation();
                      }
                    }}
                  />
                </div>
                
                <Button 
                  onClick={handleSendInvitation}
                  disabled={isSendingInvite || !invitedEmail.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                >
                  {isSendingInvite ? (
                    <>
                      <Mail size={16} className="mr-2 animate-pulse" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail size={16} className="mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
                
                <div className="pt-2">
                  <p className="text-sm text-gray-400">
                    An invitation email will be sent with a link to join this project. 
                    The link will expire in 24 hours.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className='w-28'></div>
          {/* <Button variant="ghost" size="sm" className="hidden md:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs">
            <RefreshCw size={14} className="text-purple-400" />
            <span>Format</span>
          </Button> */}



          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-gray-700">
                <Search size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white" align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem onClick={toggleTerminal} className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700">
                <Terminal className="mr-2" size={16} />
                <span>Terminal</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={togglePreview} className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700">
                <Eye className="mr-2" size={16} />
                <span>Preview</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}

          

          {/* <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullscreen}
            className="hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </Button> */}
        </div>
        <div></div>
      </div>
    </header>
  );
};

export default EditorHeader;
