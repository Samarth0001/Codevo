import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Folder, 
  Code, 
  Users, 
  Eye,
  EyeOff,
  GitBranch,
  Tag,
  UserCheck,
  Mail
} from "lucide-react";
import Button from "@/components/ui/button-custom";
import { AuthContext } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiConnector } from '@/services/apiConnector';
import { invitationEndPoints } from '@/services/apis';
import { toast } from 'react-hot-toast';

const { MANAGE_INVITATIONS_API } = invitationEndPoints;

const SharedWithMe = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [collaboratorsModalOpen, setCollaboratorsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  // Projects where the current user is not the owner
  const sharedProjects = useMemo(() => {
    const projects = user?.projects || [];
    return projects
      .filter((p: any) => !p.isOwner)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.lastUpdatedAt || 0);
        const dateB = new Date(b.createdAt || b.lastUpdatedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [user]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get time ago string
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Get language color
  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'JavaScript': return 'bg-yellow-400';
      case 'TypeScript': return 'bg-blue-500';
      case 'Python': return 'bg-green-500';
      case 'HTML': return 'bg-red-500';
      case 'CSS': return 'bg-purple-500';
      case 'React Javascript': return 'bg-cyan-400';
      case 'Node.js': return 'bg-green-600';
      default: return 'bg-gray-500';
    }
  };

  // Load collaborators for a project
  const loadCollaborators = async (project: any) => {
    setSelectedProject(project);
    setCollaboratorsModalOpen(true);
    setLoadingCollaborators(true);
    
    try {
      const res = await apiConnector('GET', `${MANAGE_INVITATIONS_API}/${project.projectId || project.id}`);
      if (res.data.success) {
        setCollaborators(res.data.collaborators || []);
        setPendingInvites(res.data.pendingInvitations || []);
        // Store isOwner flag for UI decisions
        setSelectedProject({ ...project, isOwner: res.data.isOwner });
      } else {
        toast.error(res.data.message || 'Failed to load collaborators');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load collaborators');
    } finally {
      setLoadingCollaborators(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Shared with me</h1>
          <p className="text-gray-400 mt-1">Projects shared with you by other users</p>
        </div>
      </div>

      {/* Projects Grid */}
      {(!user || sharedProjects.length === 0) ? (
        <div className="text-center py-12">
          <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No shared projects</h3>
          <p className="text-gray-400">Projects shared with you will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sharedProjects.map((project) => (
            <div key={project.id} className="bg-dark-accent border border-dark-border rounded-lg p-6 space-y-4">
              {/* Project Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{project.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>{getTimeAgo(project.createdAt || project.lastUpdatedAt || '')}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {project.visibility === 'private' ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-400 capitalize">{project.visibility || 'public'}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-gray-300 text-sm">
                  {project.description || 'No description available'}
                </p>
              </div>

              {/* Project Details */}
              <div className="space-y-3">
                {/* Language */}
                <div className="flex items-center space-x-2">
                  <div className={`h-3 w-3 rounded-full ${getLanguageColor(project.language)}`}></div>
                  <span className="text-sm text-gray-300">{project.language}</span>
                </div>

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.tags.slice(0, 3).map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-dark-bg text-xs text-gray-300 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="px-2 py-1 bg-dark-bg text-xs text-gray-400 rounded-md">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 text-gray-400">
                      <Users className="h-4 w-4" />
                      <span>{project.forks || 1}</span>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    Created {formatDate(project.createdAt || project.lastUpdatedAt || '')}
                  </div>
                </div>

                {/* Your Role */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Your role:</span>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    project.role === 'editor' 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-gray-600 text-white'
                  }`}>
                    {project.role}
                  </span>
                </div>                
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2 border-t border-dark-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => loadCollaborators(project)}
                >
                  <Users className="h-4 w-4 mr-1" />
                  View Collaborators
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-codevo-blue hover:bg-codevo-blue/90"
                  onClick={() => navigate(`/coding/${project.projectId || project.id}`, {
                    state: {
                      projectName: project.name,
                      description: project.description,
                      templateId: project.templateId,
                      userId: user?._id,
                      visibility: project.visibility,
                      tags: project.tags
                    }
                  })}
                >
                  <Folder className="h-4 w-4 mr-1" />
                  Open IDE
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collaborators View Modal */}
      <Dialog open={collaboratorsModalOpen} onOpenChange={setCollaboratorsModalOpen}>
        <DialogContent className="bg-gray-900 border border-dark-border text-white max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Project Collaborators - {selectedProject?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Collaborators Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-green-400" />
                Active Collaborators ({collaborators.length})
              </h3>
              
              {loadingCollaborators ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-codevo-blue mx-auto"></div>
                  <p className="text-gray-400 mt-2">Loading collaborators...</p>
                </div>
              ) : collaborators.length === 0 ? (
                <p className="text-gray-400 text-sm">No collaborators yet.</p>
              ) : (
                <div className="space-y-3">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.userId} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-codevo-blue rounded-full flex items-center justify-center text-white font-semibold">
                          {collaborator.name?.charAt(0) || collaborator.email?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-white font-medium">{collaborator.name || 'Unknown User'}</p>
                          <p className="text-gray-400 text-sm">{collaborator.email}</p>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            collaborator.role === 'owner' 
                              ? 'bg-purple-600 text-white' 
                              : collaborator.role === 'editor' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-600 text-white'
                          }`}>
                            {collaborator.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Invitations Section */}
            {selectedProject?.isOwner && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-yellow-400" />
                  Pending Invitations ({pendingInvites.length})
                </h3>
                
                {loadingCollaborators ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-codevo-blue mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading invitations...</p>
                  </div>
                ) : pendingInvites.length === 0 ? (
                  <p className="text-gray-400 text-sm">No pending invitations.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingInvites.map((invite) => (
                      <div key={invite._id} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{invite.invitedEmail}</p>
                            <p className="text-gray-400 text-sm">Invited as {invite.invitedRole}</p>
                            <p className="text-gray-500 text-xs">
                              {formatDate(invite.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        <span className="text-yellow-400 text-sm font-medium">Pending</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SharedWithMe;


