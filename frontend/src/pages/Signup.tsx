
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@/components/ui/button-custom";
import { Eye, EyeOff, Key, Mail, User } from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import { verifyDetailsAndSendOTP } from "@/services/operations/AuthAPI";

const Signup = () => {
  const {user, setUser,setLoggedIn,loading, setLoading,setSignupData} = useContext(AuthContext);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const data = {username, email,password,confirmPassword};
    setSignupData(data);
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    verifyDetailsAndSendOTP(data,setLoading,navigate);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Left side - Signup Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link to="/" className="flex justify-center items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-codevo-blue to-codevo-cyan rounded-md flex items-center justify-center glow">
                <span className="text-white font-bold text-lg">&lt;/&gt;</span>
              </div>
              <span className="ml-2 text-2xl font-bold bg-clip-text bg-gradient-to-r from-codevo-blue to-codevo-cyan glow-text">
                Codevo
              </span>
            </Link>
            <h2 className="mt-4 text-3xl font-extrabold text-white">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Start building amazing projects with Codevo
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="username" className="sr-only">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-dark-border bg-dark-accent rounded-md placeholder-gray-500 text-black focus:outline-none focus:ring-2 focus:ring-codevo-blue focus:border-transparent"
                    placeholder="Username"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-dark-border bg-dark-accent rounded-md placeholder-gray-500 text-black focus:outline-none focus:ring-2 focus:ring-codevo-blue focus:border-transparent"
                    placeholder="Email address"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full pl-10 pr-10 py-2 border border-dark-border bg-dark-accent rounded-md placeholder-gray-500 text-black focus:outline-none focus:ring-2 focus:ring-codevo-blue focus:border-transparent"
                    placeholder="Password (min. 8 characters)"
                    minLength={8}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-white focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-10 py-2 border border-dark-border bg-dark-accent rounded-md placeholder-gray-500 text-black focus:outline-none focus:ring-2 focus:ring-codevo-blue focus:border-transparent"
                  placeholder="Password (min. 8 characters)"
                  minLength={8}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-white focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center bg-codevo-blue hover:bg-blue-600 text-white py-2 px-4 rounded-md transition ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Sign up"
                )}
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-400">
                By signing up, you agree to our{" "}
                <a href="#" className="font-medium text-codevo-blue hover:text-blue-500">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="font-medium text-codevo-blue hover:text-blue-500">
                  Privacy Policy
                </a>
              </p>
              
              <p className="mt-4 text-sm text-gray-400">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-codevo-blue hover:text-blue-500">
                  Log in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
      
      {/* Right side - Decorative */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-700 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixid=M3wzMjM4NDZ8MHwxfHJhbmRvbXx8fHx8fHx8fDE3MTI2ODcyOTZ8&ixlib=rb-4.0.3')] bg-no-repeat bg-cover opacity-20"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10">
          <div className="glass-card p-8 max-w-md">
            <h3 className="text-2xl font-bold text-white mb-4">Start Your Coding Journey Today</h3>
            <p className="text-gray-200 mb-6">
              Join thousands of developers already building and sharing amazing projects with Codevo.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <span className="inline-flex px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-white">
                Integrated tools
              </span>
              <span className="inline-flex px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-white">
                Cloud hosting
              </span>
              <span className="inline-flex px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-white">
                Version control
              </span>
              <span className="inline-flex px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-white">
                Deployments
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
