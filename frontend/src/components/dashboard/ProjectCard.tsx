
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/button-custom";
import { AuthContext } from "@/context/AuthContext";
import { Users } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  description: string;
  language: string;
  lastUpdated: string;
  lastUpdatedBy: string;
  forks?: number;
  projectId?: string;
  templateId?: string;
  visibility?: string;
  tags?: string[];
}

const ProjectCard = ({
  id,
  name,
  description,
  language,
  lastUpdated,
  lastUpdatedBy,
  forks = 0,
  projectId,
  templateId,
  visibility,
  tags
}: ProjectCardProps) => {
  const [isStarred, setIsStarred] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const toggleStar = () => {
    setIsStarred(!isStarred);
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

  return (
    <div className="bg-dark-accent border border-dark-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-white">{name}</h3>
        <button
          onClick={toggleStar}
          className="p-1 rounded-full hover:bg-dark-bg"
        >
          <svg
            className={`h-5 w-5 ${isStarred ? "text-yellow-400 fill-yellow-400" : "text-gray-400"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      </div>
      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{description}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <div 
              className={`h-3 w-3 rounded-full mr-1 ${getLanguageColor(language)}`}
            ></div>
            <span className="text-xs text-gray-400">{language}</span>
          </div>
          {/* <div className="flex items-center text-xs text-gray-400">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{stars}</span>
          </div> */}
          <div className="flex items-center text-xs text-gray-400 gap-1">
            <Users className="h-4 w-4" />
            <span>{forks}</span>
          </div>
        </div>
        <div className="text-right">
          <time className="text-xs text-gray-400 block">{lastUpdated}</time>
          <span className="text-xs text-gray-500">by {lastUpdatedBy}</span>
        </div>
      </div>
      <div className="mt-4 flex justify-between">
        <Button 
          variant="outline" 
          className="text-xs py-1 px-3"
          onClick={() => navigate(`/coding/${projectId || id}`, {
            state: {
              projectName: name,
              description,
              templateId,
              userId: user?._id,
              visibility,
              tags
            }
          })}
        >
          View Code
        </Button>
        <Button 
          className="text-xs py-1 px-3 bg-codevo-blue hover:bg-codevo-blue/90"
          onClick={() => navigate(`/coding/${projectId || id}`, {
            state: {
              projectName: name,
              description,
              templateId,
              userId: user?._id,
              visibility,
              tags
            }
          })}
        >
          Open IDE
        </Button>
      </div>
    </div>
  );
};

export default ProjectCard;
