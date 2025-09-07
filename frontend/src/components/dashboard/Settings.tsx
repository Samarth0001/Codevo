import React, { useState, useContext, useEffect } from 'react';
import { User, Github, Shield, Bell, Palette } from 'lucide-react';
import { AuthContext } from '@/context/AuthContext';
import { GitHubAPI } from '@/services/operations/GitHubAPI';
import { PasswordResetAPI } from '@/services/operations/PasswordResetAPI';
import { getProfile, updateProfile } from '@/services/operations/AuthAPI';
import Button from '@/components/ui/button-custom';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type TabType = 'profile' | 'github' | 'security';

const Settings = () => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    isConnected: boolean;
    username: string;
    accounts: any[];
  } | null>(null);
  
  const { user, setUser } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    gender: '',
    dateOfBirth: '',
    about: '',
    bio: '',
    contactNumber: ''
  });

  const tabs = [
    { id: 'profile', name: 'Profile', icon: <User size={20} /> },
    { id: 'github', name: 'GitHub', icon: <Github size={20} /> },
    { id: 'security', name: 'Security', icon: <Shield size={20} /> },
  ];

  useEffect(() => {
    // Fetch GitHub status when component mounts
    fetchGitHubStatus();
    // Fetch profile data
    fetchProfileData();
    
    // Check if we're returning from GitHub authentication
    const urlParams = new URLSearchParams(window.location.search);
    const githubConnected = urlParams.get('githubConnected');
    const username = urlParams.get('username');
    
    if (githubConnected === 'true' && username) {
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show success message
      toast({
        title: "Success",
        description: `Successfully connected to GitHub as @${username}`,
        variant: "default",
      });
      
      // Refresh GitHub status
      fetchGitHubStatus();
    }
    
    // Check for cancellation
    const error = urlParams.get('error');
    if (error === 'cancelled') {
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show cancellation message
      toast({
        title: "Cancelled",
        description: "GitHub authentication was cancelled",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    // Update profile data when user changes
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const fetchGitHubStatus = async () => {
    try {
      const response = await GitHubAPI.getStatus();
      setGithubStatus({
        isConnected: response.isConnected,
        username: response.username,
        accounts: response.accounts || []
      });
    } catch (error) {
      // console.error('Error fetching GitHub status:', error);
      // Fallback to mock data if API fails
      setGithubStatus({
        isConnected: false,
        username: '',
        accounts: []
      });
    }
  };

  const fetchProfileData = async () => {
    try {
      const response = await getProfile();
      if (response.success && response.data) {
        const userData = response.data;
        setProfileData({
          name: userData.name || '',
          email: userData.email || '',
          gender: userData.additionalDetails?.gender || '',
          dateOfBirth: userData.additionalDetails?.dateOfBirth || '',
          about: userData.additionalDetails?.about || '',
          bio: userData.additionalDetails?.bio || '',
          contactNumber: userData.additionalDetails?.contactNumber || ''
        });
      }
    } catch (error) {
      // console.error('Error fetching profile data:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      const response = await updateProfile(profileData);
      if (response.success) {
        // Update the user context with new data
        if (setUser && response.data) {
          setUser(response.data);
        }
        toast({
          title: "Success",
          description: "Profile updated successfully",
          variant: "default",
        });
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      // console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConnectGitHub = async () => {
    try {
      const response = await GitHubAPI.getGeneralAuthUrl();
      if (response.success && response.authUrl) {
        window.location.href = response.authUrl;
      } else {
        toast({
          title: "Error",
          description: "Failed to get GitHub authentication URL",
          variant: "destructive",
        });
      }
    } catch (error) {
      // console.error('Error initiating GitHub authentication:', error);
      toast({
        title: "Error",
        description: "Failed to initiate GitHub authentication",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      setIsDisconnecting(true);
      await GitHubAPI.disconnectGitHub();
      setGithubStatus({
        isConnected: false,
        username: '',
        accounts: []
      });
      toast({
        title: "Success",
        description: "GitHub account disconnected successfully",
        variant: "default",
      });
    } catch (error) {
      // console.error('Error disconnecting GitHub:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect GitHub account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={profileData.name}
              className="w-full bg-dark-accent border border-dark-border text-white px-3 py-2 rounded-md focus:outline-none focus:border-codevo-blue"
              placeholder="Enter your name"
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={profileData.email}
              className="w-full bg-dark-accent border border-dark-border text-white px-3 py-2 rounded-md focus:outline-none focus:border-codevo-blue"
              placeholder="Enter your email"
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gender</label>
            <select
              value={profileData.gender}
              onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
              className="w-full bg-gray-800 border border-dark-border text-white px-3 py-2 rounded-md focus:outline-none focus:border-codevo-blue"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date of Birth</label>
            <input
              type="date"
              value={profileData.dateOfBirth}
              onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
              className="w-full bg-gray-800 border border-dark-border text-white px-3 py-2 rounded-md focus:outline-none focus:border-codevo-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Contact Number</label>
            <input
              type="tel"
              value={profileData.contactNumber}
              onChange={(e) => setProfileData({ ...profileData, contactNumber: e.target.value })}
              className="w-full bg-gray-800 border border-dark-border text-white px-3 py-2 rounded-md focus:outline-none focus:border-codevo-blue"
              placeholder="Enter your contact number"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
            className="w-full bg-gray-800 border border-dark-border text-white px-3 py-2 rounded-md focus:outline-none focus:border-codevo-blue"
            placeholder="Tell us about yourself in a few words..."
            rows={3}
            maxLength={300}
          />
          <p className="text-xs text-gray-400 mt-1">{profileData.bio.length}/300 characters</p>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">About</label>
          <textarea
            value={profileData.about}
            onChange={(e) => setProfileData({ ...profileData, about: e.target.value })}
            className="w-full bg-gray-800 border border-dark-border text-white px-3 py-2 rounded-md focus:outline-none focus:border-codevo-blue"
            placeholder="Tell us more about yourself..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-gray-400 mt-1">{profileData.about.length}/500 characters</p>
        </div>
        <div className="mt-6">
          <Button 
            className="bg-codevo-blue hover:bg-codevo-blue/90 text-white"
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
          >
            {isSavingProfile ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderGitHubTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">GitHub Integration</h3>
        
        {githubStatus?.isConnected ? (
          <div className="bg-dark-accent border border-dark-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Github size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Connected to GitHub</p>
                  <p className="text-gray-400 text-sm">@{githubStatus.username}</p>
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-dark-card border-dark-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Disconnect GitHub Account</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-300">
                      Are you sure you want to disconnect your GitHub account? This will remove all GitHub integrations from your projects.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-dark-border text-white hover:border-blue-500 hover:bg-dark-accent/50">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleDisconnectGitHub}
                    >
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="bg-dark-accent border border-dark-border rounded-lg p-4">
            <div className="text-center">
              <Github size={48} className="text-gray-400 mx-auto mb-3" />
                             <p className="text-gray-300 mb-3">No GitHub account connected</p>
               <Button 
                 className="bg-codevo-blue hover:bg-codevo-blue/90 text-white"
                 onClick={handleConnectGitHub}
               >
                 Connect GitHub Account
               </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const handleChangePassword = async () => {
    try {
      if (!user?.email) {
        toast({
          title: "Error",
          description: "User email not found. Please try logging in again.",
          variant: "destructive",
        });
        return;
      }

      const response = await PasswordResetAPI.generatePasswordChangeToken(user.email);
      
      if (response.success) {
        toast({
          title: "Email Sent",
          description: "A password change link has been sent to your email address. Please check your inbox.",
          variant: "default",
        });
      } else {
        throw new Error(response.message || 'Failed to send email');
      }
    } catch (error: any) {
      // console.error('Error initiating password change:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send password change email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Security Settings</h3>
        <div className="bg-dark-accent border border-dark-border rounded-lg p-6">
          <div className="text-center">
            <Shield size={48} className="text-gray-400 mx-auto mb-4" />
            <h4 className="text-white font-medium mb-2">Change Password</h4>
            <p className="text-gray-300 mb-6">
              For security reasons, password changes require email verification. 
              Click the button below to receive a secure link in your email.
            </p>
            <Button 
              className="bg-codevo-blue hover:bg-codevo-blue/90 text-white"
              onClick={handleChangePassword}
            >
              Change Password
            </Button>
            <p className="text-xs text-gray-400 mt-4">
              The link will expire in 10 minutes for security purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'github':
        return renderGitHubTab();
      case 'security':
        return renderSecurityTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Manage your account preferences and settings</p>
      </div>

      <div className="flex space-x-8">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-codevo-blue text-white'
                    : 'text-gray-400 hover:bg-dark-accent hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 mr-28">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
