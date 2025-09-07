
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import Spinner from "@/components/auth/Spinner";
import { Toaster } from "@/components/ui/toaster";

const Dashboard = () => {
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
      <Toaster />
    </div>
  );
};

export default Dashboard;
