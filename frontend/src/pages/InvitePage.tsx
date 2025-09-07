import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiConnector } from '@/services/apiConnector';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2, CheckCircle, XCircle, LogIn, UserPlus } from 'lucide-react';
import { invitationEndPoints } from '@/services/apis';

const { GET_INVITATION_DETAILS_API, ACCEPT_INVITATION_API } = invitationEndPoints;

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loggedIn, refreshUser } = useAuth();
  
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid invitation link');
      navigate('/dashboard');
      return;
    }

    fetchInvitationDetails();
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await apiConnector('GET', `${GET_INVITATION_DETAILS_API}/${token}`);
      
      if (response.data.success) {
        setInvitation(response.data.invitation);
      } else {
        toast.error(response.data.message || 'Invalid invitation');
        navigate('/dashboard');
      }
    } catch (error: any) {
      // console.error('Error fetching invitation:', error);
      toast.error(error.response?.data?.message || 'Invalid invitation link');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!loggedIn) {
      // Redirect to login with invitation token
      navigate('/login', { 
        state: { 
          invitationToken: token,
          redirectTo: `/invite/${token}`
        } 
      });
      return;
    }

    setAccepting(true);
    try {
      const response = await apiConnector('POST', `${ACCEPT_INVITATION_API}/${token}`);
      
      if (response.data.success) {
        // Refresh user to include newly shared project in list
        await refreshUser();
        toast.success('Successfully joined the project!');
        // Redirect to the project
        navigate(`/coding/${invitation.projectId}`);
      } else {
        toast.error(response.data.message || 'Failed to join project');
      }
    } catch (error: any) {
      // console.error('Error accepting invitation:', error);
      toast.error(error.response?.data?.message || 'Failed to join project');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-300">Loading invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {loggedIn ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : (
              <UserPlus className="h-12 w-12 text-blue-500" />
            )}
          </div>
          <CardTitle className="text-white text-xl">
            {loggedIn ? 'Join Project' : 'Sign in to Join'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {invitation?.projectName}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              {loggedIn 
                ? `You've been invited to collaborate on "${invitation?.projectName}". Click the button below to join the project.`
                : `You've been invited to collaborate on "${invitation?.projectName}". Please sign in to accept the invitation.`
              }
            </p>
          </div>

          <div className="space-y-3">
            {loggedIn ? (
              <Button 
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Join Project
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/login', { 
                  state: { 
                    invitationToken: token,
                    redirectTo: `/invite/${token}`
                  } 
                })}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In to Join
              </Button>
            )}

            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Go to Dashboard
            </Button>
          </div>

          <div className="text-center pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              This invitation link will expire in 24 hours
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitePage; 