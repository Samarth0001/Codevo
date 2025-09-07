import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, GitBranch, Loader2 } from 'lucide-react';

const GitHubConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(2);

  const accountId = searchParams.get('accountId');
  const projectId = searchParams.get('projectId');
  const username = searchParams.get('username');
  const error = searchParams.get('error');

  useEffect(() => {
    if (error) {
      // If error, redirect with countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // If cancelled and we have projectId, redirect to IDE, otherwise to dashboard
            if (error === 'cancelled' && projectId) {
              navigate(`/coding/${projectId}`);
            } else {
              navigate('/dashboard');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }

    // Success case - countdown and redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect back to the IDE with the project
          navigate(`/coding/${projectId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [error, projectId, navigate]);

  if (error) {
    const isCancelled = error === 'cancelled';
    const redirectText = isCancelled && projectId 
      ? `Returning to your project in ${countdown} seconds...`
      : `Redirecting to dashboard in ${countdown} seconds...`;

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 border border-red-500 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-6">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-4">
            {isCancelled ? 'GitHub Authorization Cancelled' : 'GitHub Connection Failed'}
          </h1>
          <p className="text-gray-400 text-center mb-6">
            {isCancelled 
              ? 'You cancelled the GitHub authorization. You can try again anytime from the version control panel.'
              : 'There was an error connecting your GitHub account. Please try again.'
            }
          </p>
          <div className="flex items-center justify-center text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>{redirectText}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 border border-green-500 rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-4">
          GitHub Connected Successfully!
        </h1>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <GitBranch className="h-5 w-5 text-blue-400 mr-2" />
            <span className="text-white font-medium">@{username}</span>
          </div>
          <p className="text-gray-400 text-sm">
            Your GitHub account has been connected and is ready to use.
          </p>
        </div>
        <div className="flex items-center justify-center text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>Returning to your project in {countdown} seconds...</span>
        </div>
      </div>
    </div>
  );
};

export default GitHubConfirmation;
