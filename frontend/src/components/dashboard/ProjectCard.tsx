
import { useState } from "react";
import Button from "@/components/ui/button-custom";

interface ProjectCardProps {
  name: string;
  description: string;
  language: string;
  lastUpdated: string;
  stars: number;
  forks: number;
}

const ProjectCard = ({ 
  name, 
  description, 
  language, 
  lastUpdated,
  stars,
  forks 
}: ProjectCardProps) => {
  const [isStarred, setIsStarred] = useState(false);

  const toggleStar = () => {
    setIsStarred(!isStarred);
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
              className={`h-3 w-3 rounded-full mr-1
                ${language === "JavaScript" ? "bg-yellow-400" : 
                  language === "TypeScript" ? "bg-blue-500" : 
                  language === "Python" ? "bg-green-500" : 
                  language === "HTML" ? "bg-red-500" : 
                  language === "CSS" ? "bg-purple-500" : "bg-gray-500"}`}
            ></div>
            <span className="text-xs text-gray-400">{language}</span>
          </div>
          <div className="flex items-center text-xs text-gray-400">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{stars}</span>
          </div>
          <div className="flex items-center text-xs text-gray-400">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>{forks}</span>
          </div>
        </div>
        <time className="text-xs text-gray-400">{lastUpdated}</time>
      </div>
      <div className="mt-4 flex justify-between">
        <Button variant="outline" className="text-xs py-1 px-3">
          View Code
        </Button>
        <Button className="text-xs py-1 px-3 bg-codevo-blue hover:bg-codevo-blue/90">
          Open IDE
        </Button>
      </div>
    </div>
  );
};

export default ProjectCard;
