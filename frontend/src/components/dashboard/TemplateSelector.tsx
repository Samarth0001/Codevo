
import React, { useState, useEffect ,useRef} from "react";
import Button from "@/components/ui/button-custom";
import { 
  X, 
  Search,
  Plus,
  Globe,
  Lock,
  ChevronDown
} from "lucide-react";
import { useOnClickOutside } from 'usehooks-ts'
import { useNavigate } from "react-router-dom";
import { copyBaseCode } from "@/services/operations/ProjectAPI";
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { v4 as uuidv4 } from 'uuid';


interface TemplateSelectorProps {
  onCancel: () => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onCancel }) => {
  const adjectives = [
    "Agile", "Brave", "Calm", "Clever", "Curious", "Daring", "Eager", "Elegant", "Fancy", "Fierce",
    "Gentle", "Happy", "Jolly", "Kind", "Lively", "Mighty", "Noble", "Quick", "Quiet", "Rapid",
    "Shy", "Silent", "Smart", "Strong", "Swift", "Thoughtful", "Tiny", "Witty", "Zany", "Bold",
    "Bright", "Chilly", "Dusty", "Glowing", "Icy", "Lazy", "Lucky", "Noisy", "Odd", "Proud",
    "Rusty", "Silly", "Sleepy", "Stormy", "Sunny", "Tough", "Warm", "Wild", "Young", "Zealous"
  ];
  
  const nouns = [
    "Antelope", "Banana", "Beaver", "Cat", "Cloud", "Comet", "Coyote", "Dragon", "Duck", "Eagle",
    "Falcon", "Fox", "Giraffe", "Gorilla", "Guitar", "Hamster", "Jaguar", "Koala", "Leopard",
    "Lion", "Lizard", "Monkey", "Moon", "Mouse", "Ocean", "Octopus", "Panda", "Panther", "Parrot",
    "Pebble", "Penguin", "Phoenix", "Pony", "Puma", "Quokka", "Rabbit", "Raccoon", "Robot",
    "Rocket", "Shark", "Sheep", "Sloth", "Snake", "Squirrel", "Star", "Sun", "Tiger", "Turtle",
    "Unicorn", "Vulture", "Whale", "Wolf", "Yak", "Zebra"
  ];
  

const generateRandomName = (): string => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const suffix = Math.floor(Math.random() * 10000); // optional unique number

  const randomName = `${adj}${noun}${suffix}`.toLowerCase();
  return randomName;
};
  const [activeTab, setActiveTab] = useState<string>("template");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [projectTitle, setProjectTitle] = useState<string>(generateRandomName());
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string>('')

  const ref = useRef(null)
  const navigate = useNavigate();
  
  const tabs = [
    { id: "agent", name: "Create with Replit Agent" },
    { id: "template", name: "Choose a Template" },
    { id: "github", name: "Import from GitHub" },
  ];

  const templates = [
    { 
      id: "python", 
      name: "Python", 
      category: "favorites",
      source: "replit",
      technology: "python"
    },
    { 
      id: "nodejs", 
      name: "Node.js", 
      category: "favorites",
      source: "replit",
      technology: "nodejs"
    },
    { 
      id: "c", 
      name: "C", 
      category: "favorites",
      source: "replit",
      technology: "c"
    },
    { 
      id: "html", 
      name: "HTML, CSS, JS", 
      category: "templates",
      source: "replit",
      technology: "html"
    },
    { 
      id: "cpp", 
      name: "C++", 
      category: "templates",
      source: "replit",
      technology: "cpp"
    },
    { 
      id: "react", 
      name: "React", 
      category: "templates",
      source: "replit",
      technology: "react"
    },
    { 
      id: "java", 
      name: "Java", 
      category: "templates",
      source: "replit",
      technology: "java"
    },
    { 
      id: "ruby", 
      name: "Ruby", 
      category: "templates",
      source: "replit",
      technology: "ruby"
    },
  ];

  // Filter templates based on search query
  useEffect(() => {
    const filtered = templates.filter(template => {
      const matchesSearch = searchQuery.trim() === '' || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
    setFilteredTemplates(filtered);
  }, [searchQuery]);


  const {setLoading} = useContext(AuthContext)

  const handleCreateProject = () => {
    const uniqueId = `${projectTitle}-${uuidv4()}`;
    setProjectId(uniqueId);
    console.log(`Creating project with title: ${projectTitle}, public: ${isPublic}, template: ${selectedTemplate}`);
    // an api call will be done to initiate new project and then redirect to Coding page
    copyBaseCode({uniqueId,selectedTemplate},setLoading,navigate);
    // onCancel();
  };

  // Function to handle template selection
  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template.id);
    setSearchQuery(template.name);
    setIsSearchFocused(false);
  };

  const handleClickOutside = () => {
    setIsSearchFocused(false);
  }
  useOnClickOutside(ref, handleClickOutside)

  // Function to get the appropriate icon for each template
  const getTemplateIcon = (templateId: string) => {
    switch(templateId) {
      case "python":
        return (
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <img src="/lovable-uploads/caaaed66-a113-403c-8cf9-267e8b15dd7d.png" alt="Python" className="w-5 h-5" />
          </div>
        );
      case "nodejs":
        return (
          <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
            <img src="/lovable-uploads/caaaed66-a113-403c-8cf9-267e8b15dd7d.png" alt="Node.js" className="w-5 h-5" />
          </div>
        );
      case "c":
        return (
          <div className="w-8 h-8 bg-gray-500 rounded flex items-center justify-center">
            <img src="/lovable-uploads/caaaed66-a113-403c-8cf9-267e8b15dd7d.png" alt="C" className="w-5 h-5" />
          </div>
        );
      case "html":
        return (
          <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
            <img src="/lovable-uploads/caaaed66-a113-403c-8cf9-267e8b15dd7d.png" alt="HTML" className="w-5 h-5" />
          </div>
        );
      case "cpp":
        return (
          <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center">
            <img src="/lovable-uploads/caaaed66-a113-403c-8cf9-267e8b15dd7d.png" alt="C++" className="w-5 h-5" />
          </div>
        );
      case "react":
        return (
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <img src="/lovable-uploads/caaaed66-a113-403c-8cf9-267e8b15dd7d.png" alt="React" className="w-5 h-5" />
          </div>
        );
      case "java":
        return (
          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
            <img src="/lovable-uploads/caaaed66-a113-403c-8cf9-267e8b15dd7d.png" alt="Java" className="w-5 h-5" />
          </div>
        );
      case "ruby":
        return (
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
            <img src="/lovable-uploads/caaaed66-a113-403c-8cf9-267e8b15dd7d.png" alt="Ruby" className="w-5 h-5" />
          </div>
        );
      default:
        return <div className="w-8 h-8 bg-gray-500 rounded"></div>;
    }
  };

  return (
    <div className="bg-dark-accent rounded-lg w-4/5 h-11/12 m-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Create a new App</h1>
          <button onClick={onCancel} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-dark-border mb-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`pb-3 px-1 ${
                  activeTab === tab.id 
                    ? 'border-b-2 border-blue-500 text-white font-medium' 
                    : 'text-gray-400'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Left Column - Template Selection */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-white">Template</h2>
            </div>
            
            {/* Template Selection with Search */}
            <div className="space-y-4"
            
             ref={ref}
             onClick={(e) => {
              e.stopPropagation();  //Prevents closing when clicking inside this div. It stops the event from reaching parent elements.
              handleClickOutside
             }}>
              {/* Search Input */}
              <div className="relative">
                <div className="relative">
                  {
                    !selectedTemplate || isSearchFocused? 
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  :
                  <div className="absolute left-3 top-1 h-2 w-2">
                    {
                      getTemplateIcon(selectedTemplate)
                    }
                  </div>
                  }  
                  <input
                    type="text"
                    placeholder="Search Templates"
                    className={`w-full bg-dark-bg border border-dark-border focus:border-blue-500 text-black py-2 pl-10 pr-4 rounded-md focus:outline-none
                      ${selectedTemplate? "pl-14" : ""}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                  />
                </div>
                
                
                {/* Dropdown Results */}
                {isSearchFocused && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-dark-bg border border-dark-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                    {filteredTemplates.length > 0 ? (
                      <>
                        {/* Favorites Section */}
                        {filteredTemplates.filter(t => t.category === 'favorites').length > 0 && (
                          <>
                            <div className="px-3 py-2 text-sm text-gray-400 font-medium border-b border-dark-border">
                              Favorites
                            </div>
                            {filteredTemplates
                              .filter(t => t.category === 'favorites')
                              .map(template => (
                                <div 
                                  key={template.id}
                                  className="flex items-center gap-3 p-3 hover:bg-dark-accent cursor-pointer"
                                  onClick={() => handleTemplateSelect(template)}
                                >
                                  {getTemplateIcon(template.id)}
                                  <div>
                                    <p className="text-white">{template.name}</p>
                                    <p className="text-xs text-gray-400">{template.source}</p>
                                  </div>
                                </div>
                              ))
                            }
                          </>
                        )}
                        
                        {/* Templates Section */}
                        {filteredTemplates.filter(t => t.category === 'templates').length > 0 && (
                          <>
                            <div className="px-3 py-2 text-sm text-gray-400 font-medium border-b border-dark-border">
                              Templates
                            </div>
                            {filteredTemplates
                              .filter(t => t.category === 'templates')
                              .map(template => (
                                <div 
                                  key={template.id}
                                  className="flex items-center gap-3 p-3 hover:bg-dark-accent cursor-pointer"
                                  onClick={() => handleTemplateSelect(template)}
                                >
                                  {getTemplateIcon(template.id)}
                                  <div>
                                    <p className="text-white">{template.name}</p>
                                    <p className="text-xs text-gray-400">{template.source}</p>
                                  </div>
                                </div>
                              ))
                            }
                          </>
                        )}
                      </>
                    ) : (
                      <div className="p-4 text-center text-gray-400">
                        No templates found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Selected Template Display */}
              {selectedTemplate && !isSearchFocused && (
                <div className="flex items-center gap-3 p-3 bg-dark-bg border border-dark-border rounded-md">
                  {getTemplateIcon(selectedTemplate)}
                  <div>
                    <p className="text-white">
                      {templates.find(t => t.id === selectedTemplate)?.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {templates.find(t => t.id === selectedTemplate)?.source}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Project Details */}
          <div className="flex-1">
            <div className="mb-6">
              <h2 className="text-white mb-3">Title</h2>
              <input
                type="text"
                placeholder="Name your App"
                className="w-full bg-dark-bg border border-dark-border text-black py-2 px-4 rounded-md focus:outline-none focus:border-blue-500"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
              />
            </div>
            
            <div className="mb-6">
              <h2 className="text-white mb-3">Privacy</h2>
              <div className="space-y-3">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setIsPublic(true)}
                >
                  <div className={`w-5 h-5 rounded-full border ${isPublic ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}`}>
                    {isPublic && (
                      <div className="w-2 h-2 bg-white m-auto rounded-full mt-1.5"></div>
                    )}
                  </div>
                  <Globe size={18} className="text-white" />
                  <div>
                    <p className="text-white">Public</p>
                    <p className="text-xs text-gray-400">Anyone can view and fork this App.</p>
                  </div>
                </div>
                
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setIsPublic(false)}
                >
                  <div className={`w-5 h-5 rounded-full border ${!isPublic ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}`}>
                    {!isPublic && (
                      <div className="w-2 h-2 bg-white m-auto rounded-full mt-1.5"></div>
                    )}
                  </div>
                  <Lock size={18} className="text-white" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white">Private</p>
                      <span className="bg-orange-700 text-xs text-white px-2 py-0.5 rounded">Core</span>
                    </div>
                    <p className="text-xs text-gray-400">Only you can see and edit this App.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center text-gray-400 mb-1">
                <span>You have 2 free apps left</span>
              </div>
              <div className="w-full bg-dark-border rounded-full h-1.5 mb-4">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: "33%" }}></div>
              </div>
            </div>

            <div className="bg-dark-bg py-4 flex justify-end rounded-b-lg">
              {/* <Button onClick={onCancel} variant="outline" className="mr-2">
                Cancel
              </Button> */}
              <Button 
                onClick={handleCreateProject}
                className="bg-blue-600 hover:bg-blue-700 w-full"
                disabled={!projectTitle.trim() || !selectedTemplate}
              >
                <Plus size={18} className="mr-1" /> Create App
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;
