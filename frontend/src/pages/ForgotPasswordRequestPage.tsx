import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/button-custom';
import { PasswordResetAPI } from '@/services/operations/PasswordResetAPI';
import toast from 'react-hot-toast';


const ForgotPasswordRequestPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Email Required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await PasswordResetAPI.generateForgotPasswordToken(email);
      
      if (response.success) {
        setEmailSent(true);
        toast.success("Email Sent");
      } else {
        toast.error(response.message || 'Failed to send email');
        throw new Error(response.message || 'Failed to send email');
      }
    } catch (error: any) {
      // console.error('Error sending forgot password email:', error);
      toast.error(error.response?.data?.message || "Failed to send password reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center py-12 px-4">
        <div className="bg-dark-card border border-dark-border rounded-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
            <p className="text-gray-400 mb-6">
              We've sent a password reset link to <strong className="text-white">{email}</strong>
            </p>
            <p className="text-sm text-gray-400 mb-6">
              The link will expire in 10 minutes for security reasons. If you don't see the email, check your spam folder.
            </p>
            <div className="space-y-3">
              <Button
                className="w-full bg-codevo-blue hover:bg-codevo-blue/90 text-white"
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
              >
                Send Another Email
              </Button>
              <Link
                to="/login"
                className="block w-full text-center text-codevo-blue hover:text-blue-500 text-sm"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center py-12 px-4">
      <div className="bg-dark-card border border-dark-border rounded-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-codevo-blue rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Forgot Password?</h1>
          <p className="text-gray-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-accent border border-dark-border text-black px-3 py-2 pl-10 rounded-md focus:outline-none focus:border-codevo-blue"
                placeholder="Enter your email address"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-codevo-blue hover:bg-codevo-blue/90 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-codevo-blue hover:text-blue-500 text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordRequestPage;
