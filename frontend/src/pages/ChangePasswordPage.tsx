import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import Button from '@/components/ui/button-custom';
import { PasswordResetAPI } from '@/services/operations/PasswordResetAPI';
import toast from 'react-hot-toast';

const ChangePasswordPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setIsValidatingToken(false);
      setTokenValid(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      if (!token) {
        setIsValidatingToken(false);
        setTokenValid(false);
        return;
      }

      const response = await PasswordResetAPI.validatePasswordChangeToken(token);
      
      if (response.success) {
        setTokenValid(true);
      } else {
        setTokenValid(false);
      }
    } catch (error) {
      // console.error('Error validating token:', error);
      setTokenValid(false);
    } finally {
      setIsValidatingToken(false);
    }
  };

  const validatePassword = (password: string) => {
    setPasswordRequirements({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'newPassword') {
      validatePassword(value);
    }
  };

  const isPasswordValid = Object.values(passwordRequirements).every(req => req);
  const passwordsMatch = formData.newPassword === formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast.error("Invalid Password");
      return;
    }

    if (!passwordsMatch) {
      toast.error("Passwords Don't Match");
      return;
    }

    setIsLoading(true);
    try {
          if (!token) {
      throw new Error('Token is missing');
    }

    if (!formData.oldPassword) {
      toast.error("Please enter your current password.");
      return;
    }

    const response = await PasswordResetAPI.changePasswordWithToken(token, formData.oldPassword, formData.newPassword);
      
      if (response.success) {
        toast.success("Success");
        
        // Redirect to login page after successful password change
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error: any) {
      // console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || "Failed to change password. The link may have expired or is invalid.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="bg-dark-card border border-dark-border rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-codevo-blue mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-white mb-2">Validating Link</h2>
            <p className="text-gray-400">Please wait while we verify your password change link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="bg-dark-card border border-dark-border rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Invalid Link</h2>
            <p className="text-gray-400 mb-6">
              This password change link is invalid or has expired. Please request a new one from your account settings.
            </p>
            <Button 
              className="bg-codevo-blue hover:bg-codevo-blue/90 text-white"
              onClick={() => navigate('/dashboard/settings')}
            >
              Go to Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center py-12 px-4">
      <div className="bg-dark-card border border-dark-border rounded-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Shield size={48} className="text-codevo-blue mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Change Password</h1>
          <p className="text-gray-400">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showOldPassword ? "text" : "password"}
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleInputChange}
                className="w-full bg-dark-accent border border-dark-border text-black px-3 py-2 pr-10 rounded-md focus:outline-none focus:border-codevo-blue"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showOldPassword ? <EyeOff size={20} color='black' /> : <Eye size={20} color='black' />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full bg-dark-accent border border-dark-border text-black px-3 py-2 pr-10 rounded-md focus:outline-none focus:border-codevo-blue"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} color='black' /> : <Eye size={20} color='black' />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full bg-dark-accent border border-dark-border text-black px-3 py-2 pr-10 rounded-md focus:outline-none focus:border-codevo-blue"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff size={20} color='black' /> : <Eye size={20} color='black' />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="bg-dark-accent border border-dark-border rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Password Requirements:</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {passwordRequirements.minLength ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
                <span className={`text-sm ${passwordRequirements.minLength ? 'text-green-400' : 'text-red-400'}`}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {passwordRequirements.hasUppercase ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
                <span className={`text-sm ${passwordRequirements.hasUppercase ? 'text-green-400' : 'text-red-400'}`}>
                  One uppercase letter
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {passwordRequirements.hasLowercase ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
                <span className={`text-sm ${passwordRequirements.hasLowercase ? 'text-green-400' : 'text-red-400'}`}>
                  One lowercase letter
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {passwordRequirements.hasNumber ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
                <span className={`text-sm ${passwordRequirements.hasNumber ? 'text-green-400' : 'text-red-400'}`}>
                  One number
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {passwordRequirements.hasSpecialChar ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
                <span className={`text-sm ${passwordRequirements.hasSpecialChar ? 'text-green-400' : 'text-red-400'}`}>
                  One special character
                </span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-codevo-blue hover:bg-codevo-blue/90 text-white"
            disabled={!formData.oldPassword || !isPasswordValid || !passwordsMatch || isLoading}
          >
            {isLoading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Remember to keep your password secure and don't share it with anyone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
