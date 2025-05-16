
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import Spinner from "@/components/auth/Spinner";

const Dashboard = () => {
  // Mock data
  const projects = [
    {
      id: 1,
      name: "react-dashboard",
      description: "A beautiful React dashboard with Tailwind CSS and TypeScript.",
      language: "TypeScript",
      lastUpdated: "2h ago",
      stars: 24,
      forks: 5,
    },
    {
      id: 2,
      name: "api-client",
      description: "REST API client with authentication, request caching, and error handling.",
      language: "JavaScript",
      lastUpdated: "1d ago",
      stars: 18,
      forks: 3,
    },
    {
      id: 3,
      name: "ml-classifier",
      description: "Machine learning image classification model with Python and TensorFlow.",
      language: "Python",
      lastUpdated: "3d ago",
      stars: 42,
      forks: 8,
    },
    {
      id: 4,
      name: "landing-page",
      description: "Responsive landing page template with smooth animations.",
      language: "HTML",
      lastUpdated: "1w ago",
      stars: 12,
      forks: 2,
    },
  ];
  
  const activities = [
    {
      id: 1,
      user: "John Doe",
      action: "pushed to",
      target: "main branch of react-dashboard",
      time: "2 hours ago",
    },
    {
      id: 2,
      user: "Alice Smith",
      action: "commented on",
      target: "issue #42: Fix responsive layout",
      time: "5 hours ago",
    },
    {
      id: 3,
      user: "Robert Johnson",
      action: "merged",
      target: "pull request #17",
      time: "Yesterday",
    },
    {
      id: 4,
      user: "Emily Wilson",
      action: "created",
      target: "api-client repository",
      time: "2 days ago",
    },
    {
      id: 5,
      user: "Michael Brown",
      action: "closed",
      target: "issue #23: Improve performance",
      time: "3 days ago",
    },
  ];

  const {loading} = useContext(AuthContext);
  if(loading){
    return (
      <div className="w-screen h-screen">
        <Spinner/>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-dark-bg text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="overflow-auto h-full">
          <Outlet/> 
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
