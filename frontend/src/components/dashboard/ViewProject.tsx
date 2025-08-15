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
  Trash2
} from "lucide-react";
import Button from "@/components/ui/button-custom";
import { AuthContext } from '@/context/AuthContext';
import { updateProjectDescription, deleteProject } from '@/services/operations/ProjectAPI';

const ViewProject = () => {
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Get projects and sort by creation time in descending order
  const projects = (user?.projects || []).sort((a, b) => {
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
      console.error('Error updating description:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsDeleting(projectId);
      await deleteProject(projectId);
      
      // Remove the project from the user context
      if (user?.projects) {
        const updatedProjects = user.projects.filter(project => project.id !== projectId);
        setUser({ ...user, projects: updatedProjects });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
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
        <Button 
          className="bg-codevo-blue hover:bg-codevo-blue/90"
          onClick={() => navigate('/dashboard/home')}
        >
          Create New Project
        </Button>
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
                         onClick={() => handleDeleteProject(project.id)}
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
                    {/* <div className="flex items-center space-x-1 text-gray-400">
                      <Star className="h-4 w-4" />
                      <span>{project.stars || 0}</span>
                    </div> */}
                    <div className="flex items-center space-x-1 text-gray-400">
                      <GitBranch className="h-4 w-4" />
                      <span>{project.forks || 0}</span>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    Created {formatDate(project.createdAt || project.lastUpdatedAt || '')}
                  </div>
                </div>

                {/* Collaborators */}
                {project.collaborators && project.collaborators.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-400">Collaborators</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.collaborators.slice(0, 3).map((collaborator: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center space-x-1 px-2 py-1 bg-dark-bg rounded-md"
                        >
                          <div className="w-6 h-6 bg-codevo-blue rounded-full flex items-center justify-center text-xs text-white">
                            {collaborator.name?.charAt(0) || 'U'}
                          </div>
                          <span className="text-xs text-gray-300">{collaborator.name || 'Unknown'}</span>
                        </div>
                      ))}
                      {project.collaborators.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{project.collaborators.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2 border-t border-dark-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
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
                  <Code className="h-4 w-4 mr-1" />
                  View Code
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
    </div>
  );
};

export default ViewProject;