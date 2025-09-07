import React, { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Folder, 
  Code, 
  Star, 
  Users, 
  Edit3, 
  Save, 
  X, 
  Calendar,
  Eye,
  EyeOff,
  GitBranch,
  Tag,
  MoreVertical,
  Trash2,
  UserX,
  UserCheck,
  Mail,
  UserPlus
} from "lucide-react";
import Button from "@/components/ui/button-custom";
import { AuthContext } from '@/context/AuthContext';
import { updateProjectDescription, deleteProject } from '@/services/operations/ProjectAPI';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiConnector } from '@/services/apiConnector';
import { invitationEndPoints } from '@/services/apis';
import { toast } from 'react-hot-toast';

const { MANAGE_INVITATIONS_API, REMOVE_COLLABORATOR_API, CREATE_INVITATION_API } = invitationEndPoints;

const ViewProject = () => {
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [collaboratorsModalOpen, setCollaboratorsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [removingCollaborator, setRemovingCollaborator] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'reader' | 'editor'>('reader');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Get projects and sort by creation time in descending order
  const projects = (user?.projects || [])
    .filter((p: any) => p?.isOwner)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.lastUpdatedAt || 0);
      const dateB = new Date(b.createdAt || b.lastUpdatedAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

  // Categorize projects by time
  const categorizedProjects = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const categories = {
      'Today': [] as any[],
      'This Week': [] as any[],
      'This Month': [] as any[],
      'Older': [] as any[]
    };

    projects.forEach(project => {
      const projectDate = new Date(project.createdAt || project.lastUpdatedAt || 0);
      const projectDay = new Date(projectDate.getFullYear(), projectDate.getMonth(), projectDate.getDate());
      const diffTime = today.getTime() - projectDay.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        categories['Today'].push(project);
      } else if (diffDays <= 7) {
        categories['This Week'].push(project);
      } else if (diffDays <= 30) {
        categories['This Month'].push(project);
      } else {
        categories['Older'].push(project);
      }
    });

    return categories;
  }, [projects]);

  // Get unique templates for filtering
  const uniqueTemplates = useMemo(() => {
    const templates = [...new Set(projects.map(project => project.language).filter(Boolean))];
    return templates;
  }, [projects]);

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

  // Handle description editing
  const startEditing = (project: any) => {
    setEditingProject(project.id);
    setEditDescription(project.description || '');
  };

  const saveDescription = async (projectId: string) => {
    try {
      setIsUpdating(true);
      await updateProjectDescription(projectId, editDescription);
      
      // Update the project in the user context
      if (user?.projects) {
        const updatedProjects = user.projects.map(project => 
          project.id === projectId 
            ? { ...project, description: editDescription }
            : project
        );
        setUser({ ...user, projects: updatedProjects });
      }
      
      setEditingProject(null);
      setEditDescription('');
    } catch (error) {
      // console.error('Error updating description:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setIsDeleting(projectId);
      await deleteProject(projectId);
      
      // Remove the project from the user context
      if (user?.projects) {
        const updatedProjects = user.projects.filter(project => project.id !== projectId);
        setUser({ ...user, projects: updatedProjects });
      }
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      // console.error('Error deleting project:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const cancelEditing = () => {
    setEditingProject(null);
    setEditDescription('');
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
      } else {
        toast.error(res.data.message || 'Failed to load collaborators');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load collaborators');
    } finally {
      setLoadingCollaborators(false);
    }
  };

  // Remove a collaborator
  const removeCollaborator = async (targetUserId: string) => {
    if (!selectedProject) return;
    
    try {
      setRemovingCollaborator(targetUserId);
      const res = await apiConnector('POST', REMOVE_COLLABORATOR_API, { 
        projectId: selectedProject.projectId || selectedProject.id, 
        userId: targetUserId 
      });
      
      if (res.data.success) {
        toast.success('Collaborator removed');
        // Refresh collaborators list
        await loadCollaborators(selectedProject);
      } else {
        toast.error(res.data.message || 'Failed to remove collaborator');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to remove collaborator');
    } finally {
      setRemovingCollaborator(null);
    }
  };

  // Send invitation to new collaborator
  const sendInvitation = async () => {
    if (!selectedProject || !inviteEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setSendingInvite(true);
      const res = await apiConnector('POST', CREATE_INVITATION_API, {
        projectId: selectedProject.projectId || selectedProject.id,
        projectName: selectedProject.name,
        invitedEmail: inviteEmail.trim(),
        invitedRole: inviteRole
      });

      if (res.data.success) {
        toast.success('Invitation sent successfully!');
        setInviteEmail('');
        setInviteRole('reader');
        // Refresh collaborators list to show new pending invitation
        await loadCollaborators(selectedProject);
      } else {
        toast.error(res.data.message || 'Failed to send invitation');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  // Filter projects based on selected category and template
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    // Filter by time category
    if (selectedCategory !== 'all') {
      filtered = categorizedProjects[selectedCategory as keyof typeof categorizedProjects] || [];
    }
    
    // Filter by template
    if (selectedTemplate !== 'all') {
      filtered = filtered.filter(project => project.language === selectedTemplate);
    }
    
    return filtered;
  }, [projects, selectedCategory, selectedTemplate, categorizedProjects]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">My Projects</h1>
          <p className="text-gray-400 mt-1">Manage and organize your projects</p>
        </div>
        {/* <Button 
          className="bg-codevo-blue hover:bg-codevo-blue/90"
          onClick={() => navigate('/dashboard/home')}
        >
          Create New Project
        </Button> */}
      </div>

      {/* Category Filters */}
      <div className="space-y-4">
        {/* Time Category Filter */}
        <div className="flex space-x-2 bg-dark-accent border border-dark-border rounded-lg p-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-codevo-blue text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Time ({projects.length})
          </button>
          {Object.entries(categorizedProjects).map(([category, projectList]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-codevo-blue text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {category} ({projectList.length})
            </button>
          ))}
        </div>

                 {/* Template Category Filter */}
         <div className="flex space-x-2 bg-dark-accent border border-dark-border rounded-lg p-2">
           <button
             onClick={() => setSelectedTemplate('all')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
               selectedTemplate === 'all'
                 ? 'bg-codevo-blue text-white'
                 : 'text-gray-400 hover:text-white'
             }`}
           >
             All Templates 
             {/* ({filteredProjects.length}) */}
           </button>
           {uniqueTemplates.map((template: string) => {
             // Get the count for this template based on the current time filter
             let templateCount = 0;
             if (selectedCategory === 'all') {
               templateCount = projects.filter(project => project.language === template).length;
             } else {
               const categoryProjects = categorizedProjects[selectedCategory as keyof typeof categorizedProjects] || [];
               templateCount = categoryProjects.filter(project => project.language === template).length;
             }
             
             return (
               <button
                 key={template}
                 onClick={() => setSelectedTemplate(template)}
                 className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                   selectedTemplate === template
                     ? 'bg-codevo-blue text-white'
                     : 'text-gray-400 hover:text-white'
                 }`}
               >
                 {template}
                 {/* ({templateCount}) */}
               </button>
             );
           })}
         </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No projects found</h3>
          <p className="text-gray-400">Create your first project to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
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
                                 {editingProject === project.id ? (
                   <div className="space-y-2">
                     <textarea
                       value={editDescription}
                       onChange={(e) => setEditDescription(e.target.value)}
                       className="w-full bg-gray-800 border border-gray-600 rounded-md p-3 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-codevo-blue"
                       rows={3}
                       placeholder="Enter project description..."
                     />
                     <div className="flex space-x-2">
                       <Button
                         size="sm"
                         onClick={() => saveDescription(project.id)}
                         className="bg-green-600 hover:bg-green-700"
                         disabled={isUpdating}
                       >
                         <Save className="h-3 w-3 mr-1" />
                         {isUpdating ? 'Saving...' : 'Save'}
                       </Button>
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={cancelEditing}
                         disabled={isUpdating}
                       >
                         <X className="h-3 w-3 mr-1" />
                         Cancel
                       </Button>
                     </div>
                   </div>
                 ) : (
                   <div className="flex justify-between items-start">
                     <p className="text-gray-300 text-sm flex-1">
                       {project.description || 'No description available'}
                     </p>
                     <div className="flex space-x-1">
                       <button
                         onClick={() => startEditing(project)}
                         className="p-1 text-gray-400 hover:text-white transition-colors"
                         title="Edit description"
                       >
                         <Edit3 className="h-4 w-4" />
                       </button>
                       <button
                         onClick={() => { setProjectToDelete(project.id); setDeleteModalOpen(true); }}
                         className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                         title="Delete project"
                         disabled={isDeleting === project.id}
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                   </div>
                 )}
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
                  Manage Collaborators
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

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent className="bg-dark-accent border border-dark-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete project?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This action cannot be undone. This will permanently delete the project and remove it from all collaborators.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-200 border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => projectToDelete && handleDeleteProject(projectToDelete)}
            >
              {isDeleting === projectToDelete ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Collaborators Management Modal */}
      <Dialog open={collaboratorsModalOpen} onOpenChange={setCollaboratorsModalOpen}>
        <DialogContent className="bg-gray-900 border border-dark-border text-white max-w-[60vw] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Manage Collaborators - {selectedProject?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-8 py-4">
            {/* Left Side - Invite New Collaborator Section */}
            <div className="w-1/2">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <UserPlus className="h-5 w-5 mr-2 text-blue-400" />
                Invite New Collaborator
              </h3>
              
              <div className="space-y-3 bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter collaborator's email"
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-codevo-blue"
                    onKeyPress={(e) => { if (e.key === 'Enter') { sendInvitation(); } }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'reader' | 'editor')}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-codevo-blue"
                  >
                    <option value="reader">Reader</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>
                
                <Button
                  onClick={sendInvitation}
                  disabled={sendingInvite || !inviteEmail.trim()}
                  className="w-full bg-codevo-blue hover:bg-codevo-blue/90 disabled:bg-gray-600"
                >
                  {sendingInvite ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Side - Collaborators and Pending Invitations */}
            <div className="w-1/2 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
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
                        
                        {collaborator.role !== 'owner' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400 border-red-400 hover:bg-red-500/10"
                            disabled={removingCollaborator === collaborator.userId}
                            onClick={() => removeCollaborator(collaborator.userId)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            {removingCollaborator === collaborator.userId ? 'Removing...' : 'Remove'}
                          </Button>
                        )}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewProject;