
import { useState ,useContext} from "react";
import { Link, matchPath, useNavigate } from "react-router-dom";
import { LayoutDashboard, Grid, BarChart, Calendar, MessageSquare, Settings, LogIn } from "lucide-react";
import Button from "@/components/ui/button-custom";
import { logout } from "@/services/operations/AuthAPI";
import { AuthContext } from "@/context/AuthContext";
import { FaPlus } from "react-icons/fa";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  href: string;
  current: boolean;
};

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [navigation, setNavigation] = useState<NavItem[]>([
    { name: "Home", icon: <LayoutDashboard size={20} />, href: "/dashboard/home", current: false },
    { name: "Projects", icon: <Grid size={20} />, href: "/dashboard/viewProjects", current: false },
    // { name: "Analytics", icon: <BarChart size={20} />, href: "/dashboard/analytics", current: false },
    // { name: "Calendar", icon: <Calendar size={20} />, href: "/dashboard/calendar", current: false },
    // { name: "Messages", icon: <MessageSquare size={20} />, href: "/dashboard/messages", current: false },
    // { name: "Settings", icon: <Settings size={20} />, href: "/dashboard/settings", current: false },
  ]);

  const handleNavClick = (index: number) => {
    const newNavigation = navigation.map((item, i) => ({
      ...item,
      current: i === index,
    }));
    setNavigation(newNavigation);
  };

  const {user, setUser,setLoading,setLoggedIn} = useContext(AuthContext)
  const navigate = useNavigate();

  return (
    <div
      className={`bg-dark-card border-r border-dark-border h-screen transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-dark-border">
          <Link 
            to="/"
            className={`flex items-center ${collapsed ? "justify-center" : ""}`}
          >
            <div className="w-8 h-8 bg-gradient-to-r from-codevo-blue to-codevo-cyan rounded-md flex items-center justify-center glow">
              <span className="text-white font-bold text-lg">&lt;/&gt;</span>
            </div>
            {!collapsed && (
              <span className="ml-2 text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-codevo-blue to-codevo-cyan glow-text">
                Codevo
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-dark-accent"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {collapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              )}
            </svg>
          </button>
        </div>

        <button className={`flex items-center justify-center gap-4 mx-2 mt-4 py-2 border-2 border-gray-700 text-white rounded-md hover:bg-gray-100  hover:text-black transition duration-300 ease-in-out shadow-lg ${collapsed ? "px-0" : "px-6"} `}
        onClick={() => {
          handleNavClick(-1);
          navigate('/dashboard/createProject')
        }}>
          <FaPlus />
          {!collapsed && <span>Create Project</span>}
        </button>


        <div className="flex flex-1 flex-col overflow-y-auto">
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item, index) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  ${
                    matchPath(item.href,location.pathname)
                      ? "bg-gray-500 bg-opacity-20 border-l-2 border-codevo-blue text-white"
                      : "text-gray-400 hover:bg-dark-accent/50 hover:text-white"
                  }
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                `}
                onClick={() => handleNavClick(index)}
              >
                <div className="mr-3 flex-shrink-0 text-current">
                  {item.icon}
                </div>
                {!collapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="px-2 py-4 border-t border-dark-border">
          <Button 
            variant="outline"
            className={`w-full flex items-center justify-${
              collapsed ? "center" : "start"
            } text-sm`}
          >
            <LogIn size={18} />
            {!collapsed && <span className="ml-2" onClick={() => logout(setUser,setLoggedIn,setLoading,navigate)}>Log Out</span>}
          </Button>
          
          <div className={`mt-4 flex items-center ${collapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-codevo-blue flex items-center justify-center text-white font-medium">
              JD
            </div>
            {!collapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
