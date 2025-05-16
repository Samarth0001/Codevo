
import { useState,useContext } from "react";
import { Link, useAsyncError, useNavigate } from "react-router-dom";
import Button from "@/components/ui/button-custom";
import { Eye, EyeOff, LogIn, Mail } from "lucide-react";
import { login } from "@/services/operations/AuthAPI";
import { AuthContext } from "@/context/AuthContext";
import Spinner from "@/components/auth/Spinner";



const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRemembered, setIsRemembered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {setUser,setLoggedIn, setLoading,loading} = useContext(AuthContext);
  const navigate = useNavigate();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const data = {email,password,isRemembered};
    setEmail("");
    setPassword("");
    setIsRemembered(false);
    login(data,setUser,setLoggedIn,setLoading,navigate);
    setLoading(false);
  };

  if(loading){
    return (
      <div className="w-screen h-screen">
        <Spinner/>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link to="/" className="flex justify-center items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-codevo-blue to-codevo-cyan rounded-md flex items-center justify-center glow">
                <span className="text-white font-bold text-lg">&lt;/&gt;</span>
              </div>
              <span className="ml-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-codevo-blue to-codevo-cyan glow-text">
                Codevo
              </span>
            </Link>
            <h2 className="mt-4 text-3xl font-extrabold text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Log in to your Codevo account
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
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
                    <LogIn className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full pl-10 pr-10 py-2 border border-dark-border bg-dark-accent rounded-md placeholder-gray-500 text-black focus:outline-none focus:ring-2 focus:ring-codevo-blue focus:border-transparent"
                    placeholder="Password"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 focus:outline-none"
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-codevo-blue focus:ring-codevo-blue border-dark-border rounded bg-dark-accent"
                  onClick={() => setIsRemembered(!isRemembered)}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-codevo-blue hover:text-blue-500">
                  Forgot your password?
                </a>
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
                  "Log in"
                )}
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-400">
                Don't have an account?{" "}
                <Link to="/signup" className="font-medium text-codevo-blue hover:text-blue-500">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
      
      {/* Right side - Decorative */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1649972904349-6e44c42644a7?ixid=M3wzMjM4NDZ8MHwxfHJhbmRvbXx8fHx8fHx8fDE3MTI2ODcyOTZ8&ixlib=rb-4.0.3')] bg-no-repeat bg-cover opacity-20"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10">
          <div className="glass-card p-8 max-w-md">
            <h3 className="text-2xl font-bold text-white mb-4">The Complete Development Environment</h3>
            <p className="text-gray-200 mb-6">
              Code, collaborate, and create together in real-time with built-in IDE and terminal access.
            </p>
            <div className="flex gap-3 mb-6">
              <span className="inline-flex px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-white">
                Real-time collaboration
              </span>
              <span className="inline-flex px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-white">
                Built-in IDE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
