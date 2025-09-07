import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Terminal, Maximize, Minimize, Eye, Save, Play, RefreshCw, Mail, GitBranch } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiConnector } from '@/services/apiConnector';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useCollaboration } from '@/context/CollaborationContext';
import { invitationEndPoints } from '@/services/apis';

const { CREATE_INVITATION_API, MANAGE_INVITATIONS_API, REVOKE_INVITATION_API, REMOVE_COLLABORATOR_API } = invitationEndPoints;

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
  const [isGitHubDialogOpen, setIsGitHubDialogOpen] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [invitedRole, setInvitedRole] = useState<'reader' | 'editor'>('reader');
  const [manageOpen, setManageOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingManage, setLoadingManage] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const { user, loggedIn } = useAuth();
  const { permissions, userRole } = useCollaboration();
  const canInviteCollaborators = permissions?.canInviteCollaborators || false;
  const isProjectOwner = userRole === 'owner';

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
      const response = await apiConnector('POST', CREATE_INVITATION_API, {
        projectId,
        projectName,
        invitedEmail: invitedEmail.trim(),
        invitedRole
      });

      if (response.data.success) {
        toast.success('Invitation sent successfully!');
        setInvitedEmail('');
        setInvitedRole('reader');
        setIsInviteDialogOpen(false);
      } else {
        toast.error(response.data.message || 'Failed to send invitation');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const fetchManageData = async () => {
    if (!projectId) return;
    setLoadingManage(true);
    try {
      const res = await apiConnector('GET', `${MANAGE_INVITATIONS_API}/${projectId}`);
      if (res.data.success) {
        setCollaborators(res.data.collaborators || []);
        setPendingInvites(res.data.pendingInvitations || []);
      } else {
        toast.error(res.data.message || 'Failed to load collaborators');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load collaborators');
    } finally {
      setLoadingManage(false);
    }
  };

  const revokeInvite = async (invitationId: string) => {
    try {
      setWorkingId(invitationId);
      const res = await apiConnector('POST', REVOKE_INVITATION_API, { projectId, invitationId });
      if (res.data.success) {
        toast.success('Invitation revoked');
        await fetchManageData();
      } else {
        toast.error(res.data.message || 'Failed to revoke invitation');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to revoke invitation');
    } finally { setWorkingId(null); }
  };

  const removeCollab = async (targetUserId: string) => {
    try {
      setWorkingId(targetUserId);
      const res = await apiConnector('POST', REMOVE_COLLABORATOR_API, { projectId, userId: targetUserId });
      if (res.data.success) {
        toast.success('Collaborator removed');
        await fetchManageData();
      } else {
        toast.error(res.data.message || 'Failed to remove collaborator');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to remove collaborator');
    } finally { setWorkingId(null); }
  };

  return (
    <header className="w-full  bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 shadow-md">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 m-auto">
            {/* <Button variant="ghost" size="sm" className="hidden md:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs" onClick={togglePreview}>
              <Eye size={14} className="text-green-400" />
              <span>Preview</span>
            </Button>

            <Button variant="ghost" size="sm" className="hidden sm:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs" onClick={toggleTerminal}>
              <Terminal size={14} className="text-yellow-400" />
              <span>Terminal</span>
            </Button> */}

            <Button variant="ghost" size="sm" className="hidden sm:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs" onClick={runCode}>
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

            {canInviteCollaborators && (
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="hidden sm:flex items-center space-x-1 bg-gray-700/50 hover:bg-gray-700 text-xs"
                    onClick={() => { if (!loggedIn || !user) { toast.error('Please log in to send invitations'); return; } fetchManageData(); }}
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
                        onKeyPress={(e) => { if (e.key === 'Enter') { handleSendInvitation(); } }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm font-medium text-gray-300">
                        Role
                      </Label>
                      <select
                        id="role"
                        value={invitedRole}
                        onChange={(e) => setInvitedRole(e.target.value as 'reader' | 'editor')}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-white"
                      >
                        <option value="reader">Reader</option>
                        <option value="editor">Editor</option>
                      </select>
                    </div>
                    <Button onClick={handleSendInvitation} disabled={isSendingInvite || !invitedEmail.trim()} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600">
                      {isSendingInvite ? (<><Mail size={16} className="mr-2 animate-pulse" />Sending...</>) : (<><Mail size={16} className="mr-2" />Send Invitation</>)}
                    </Button>

                    {/* Management lists */}
                    <div className="pt-4 space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Collaborators</h3>
                        {loadingManage ? (
                          <p className="text-gray-400 text-sm">Loading...</p>
                        ) : collaborators.length === 0 ? (
                          <p className="text-gray-400 text-sm">No collaborators yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {collaborators.map((c) => (
                              <li key={c.userId} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded p-2">
                                <div>
                                  <p className="text-sm">{c.name || c.email}</p>
                                  <p className="text-xs text-gray-400">{c.email} • {c.role}</p>
                                </div>
                                <div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-400 border-red-400 hover:bg-red-500/10"
                                    disabled={workingId === c.userId || c.role === 'owner'}
                                    onClick={() => removeCollab(c.userId)}
                                  >
                                    {workingId === c.userId ? 'Removing...' : 'Remove'}
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Pending invitations</h3>
                        {loadingManage ? (
                          <p className="text-gray-400 text-sm">Loading...</p>
                        ) : pendingInvites.length === 0 ? (
                          <p className="text-gray-400 text-sm">No pending invites.</p>
                        ) : (
                          <ul className="space-y-2">
                            {pendingInvites.map((i) => (
                              <li key={i._id} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded p-2">
                                <div>
                                  <p className="text-sm">{i.invitedEmail}</p>
                                  <p className="text-xs text-gray-400">Role: {i.invitedRole}</p>
                                </div>
                                <div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-400 border-red-400 hover:bg-red-500/10"
                                    disabled={workingId === i._id}
                                    onClick={() => revokeInvite(i._id)}
                                  >
                                    {workingId === i._id ? 'Revoking...' : 'Revoke'}
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <div className='w-28'></div>
          </div>
          <div></div>
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;
