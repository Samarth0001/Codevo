import React, { useContext } from 'react'
import { Grid, BarChart, Calendar, Users } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import ProjectCard from "@/components/dashboard/ProjectCard";
import StatsCard from "@/components/dashboard/StatsCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { AuthContext } from '@/context/AuthContext';

const Home = () => {
    const { user } = useContext(AuthContext);
    
    // Get projects from user context and sort by creation time in descending order
    const projects = (user?.projects || []).sort((a, b) => {
      const dateA = new Date(a.createdAt || a.lastUpdatedAt || 0);
      const dateB = new Date(b.createdAt || b.lastUpdatedAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

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

  return (
    <div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard 
              title="Total Projects" 
              value={projects.length.toString()} 
              change="0%" 
              trend="up" 
              icon={<Grid size={24} className="text-codevo-blue" />}
            />
            <StatsCard 
              title="Active Sessions" 
              value="0" 
              change="0%" 
              trend="up" 
              icon={<Users size={24} className="text-green-500" />}
            />
            <StatsCard 
              title="Weekly Commits" 
              value="0" 
              change="0%" 
              trend="down" 
              icon={<BarChart size={24} className="text-purple-500" />}
            />
            {/* <StatsCard 
              title="Upcoming Deadlines" 
              value="0" 
              icon={<Calendar size={24} className="text-yellow-500" />}
            /> */}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-white">My Projects</h2>
                  <button className="text-sm text-codevo-blue hover:underline">View all</button>
                </div>
                {!user ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-codevo-blue"></div>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <p>No projects found. Create your first project to get started!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((project) => (
                      <ProjectCard key={project.id} {...project} />
                    ))}
                  </div>
                )}
              </div>

              {/* <div className="bg-dark-accent border border-dark-border rounded-lg p-4">
                <h2 className="text-md font-medium text-white mb-4">Current Usage</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Storage (250GB)</span>
                      <span className="text-white">62.5GB used</span>
                    </div>
                    <div className="w-full bg-dark-bg rounded-full h-2 mt-1">
                      <div className="bg-gradient-to-r from-codevo-blue to-codevo-cyan h-2 rounded-full" style={{ width: "25%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Bandwidth (5TB)</span>
                      <span className="text-white">1.8TB used</span>
                    </div>
                    <div className="w-full bg-dark-bg rounded-full h-2 mt-1">
                      <div className="bg-gradient-to-r from-codevo-blue to-codevo-cyan h-2 rounded-full" style={{ width: "36%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Compute (500 hours)</span>
                      <span className="text-white">324 hours used</span>
                    </div>
                    <div className="w-full bg-dark-bg rounded-full h-2 mt-1">
                      <div className="bg-gradient-to-r from-codevo-blue to-codevo-cyan h-2 rounded-full" style={{ width: "65%" }}></div>
                    </div>
                  </div>
                </div>
              </div> */}
            </div>

            <div>
              {/* <ActivityFeed activities={activities} /> */}
            </div>
          </div>
        </main>
    </div>
  )
}

export default Home