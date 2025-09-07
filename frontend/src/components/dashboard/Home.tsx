import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid, BarChart, Calendar, Users } from "lucide-react";
import ProjectCard from "@/components/dashboard/ProjectCard";
import StatsCard from "@/components/dashboard/StatsCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { AuthContext } from '@/context/AuthContext';
import { getCommitStats } from '@/services/operations/AuthAPI';

const Home = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [commitStats, setCommitStats] = useState({
        totalCommits: 0,
        monthlyBreakdown: []
    });
    const [loadingStats, setLoadingStats] = useState(true);

    // Fetch commit statistics
    useEffect(() => {
        const fetchCommitStats = async () => {
            try {
                setLoadingStats(true);
                const response = await getCommitStats();
                if (response.success) {
                    // console.log("Printing response -> ", response.data);
                    setCommitStats(response.data);
                }
            } catch (error) {
                // console.error('Error fetching commit stats:', error);
            } finally {
                setLoadingStats(false);
            }
        };

        if (user) {
            fetchCommitStats();
        }
    }, [user]);

    // Build lists
    const allProjects = (user?.projects || []).sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.lastUpdatedAt || 0);
      const dateB = new Date(b.createdAt || b.lastUpdatedAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    const ownedProjects = allProjects.filter((p: any) => p.isOwner);
    const sharedProjects = allProjects.filter((p: any) => !p.isOwner);

      // const activities = [
      //   {
      //     id: 1,
      //     user: "John Doe",
      //     action: "pushed to",
      //     target: "main branch of react-dashboard",
      //     time: "2 hours ago",
      //   },
      //   {
      //     id: 2,
      //     user: "Alice Smith",
      //     action: "commented on",
      //     target: "issue #42: Fix responsive layout",
      //     time: "5 hours ago",
      //   },
      //   {
      //     id: 3,
      //     user: "Robert Johnson",
      //     action: "merged",
      //     target: "pull request #17",
      //     time: "Yesterday",
      //   },
      //   {
      //     id: 4,
      //     user: "Emily Wilson",
      //     action: "created",
      //     target: "api-client repository",
      //     time: "2 days ago",
      //   },
      //   {
      //     id: 5,
      //     user: "Michael Brown",
      //     action: "closed",
      //     target: "issue #23: Improve performance",
      //     time: "3 days ago",
      //   },
      // ];

  return (
    <div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard 
              title="Total Projects" 
              value={allProjects.length.toString()} 
              change="" 
              trend="up" 
              icon={<Grid size={24} className="text-codevo-blue" />}
            />
            <StatsCard 
              title="Shared with me" 
              value={sharedProjects.length.toString()} 
              change="" 
              trend="up" 
              icon={<Users size={24} className="text-purple-500" />}
            />
            {/* <StatsCard 
              title="Active Sessions" 
              value="0" 
              change="0%" 
              trend="up" 
              icon={<Users size={24} className="text-green-500" />}
            /> */}
            {/* <StatsCard 
              title="Monthly Commits" 
              value={loadingStats ? "..." : commitStats.monthlyBreakdown!.at(-1)!.count!.toString() || 0} 
              change="" 
              trend="up" 
              icon={<BarChart size={24} className="text-purple-500" />}
            /> */}
            <StatsCard 
              title="Total Commits" 
              value={loadingStats ? "..." : commitStats.totalCommits!.toString()} 
              change="" 
              trend="up" 
              icon={<Calendar size={24} className="text-green-500" />}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-white">My Projects</h2>
                  <button onClick={() => navigate('/dashboard/viewProjects')} className="text-sm text-codevo-blue hover:underline">View all</button>
                </div>
                {!user ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-codevo-blue"></div>
                  </div>
                ) : ownedProjects.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <p>No projects found. Create your first project to get started!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ownedProjects.map((project) => (
                      <ProjectCard key={project.id} {...project} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-white">Shared with me</h2>
                  <button onClick={() => navigate('/dashboard/sharedProjects')} className="text-sm text-codevo-blue hover:underline">View all</button>
                </div>
                {!user ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-codevo-blue"></div>
                  </div>
                ) : sharedProjects.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <p>No shared projects yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sharedProjects.slice(0, 4).map((project) => (
                      <ProjectCard key={project.id} {...project} />
                    ))}
                  </div>
                )}
              </div>
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