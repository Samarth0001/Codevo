import { apiConnector } from '@/services/apiConnector';
import React,{createContext, useEffect, useState, useContext} from 'react'
import {authEndpoints} from '../services/apis'

const USER_DETAILS_API = authEndpoints.USER_DETAILS_API;

type AuthContextType = {
  user: any | null;
  setUser: React.Dispatch<React.SetStateAction<any | null>>;
  signupData: any | null;
  setSignupData: React.Dispatch<React.SetStateAction<any | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loggedIn: boolean;
  setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  refreshUser: () => Promise<void>;
  // currentPath: string;
  // setCurrentPath: React.Dispatch<React.SetStateAction<string>>;
};

const AuthContext = createContext<AuthContextType>(undefined);

const AuthProvider= ({children}:{children:React.ReactNode}) => {

  const [loggedIn,setLoggedIn] = useState(false);
  const [user,setUser] = useState<any>(null);
  const [loading,setLoading] = useState<boolean>(false);
  const [signupData,setSignupData] = useState<any>(null);

  const getUserDetails = async() => {
    setLoading(true)
    try{
      const userDetails = await apiConnector("GET",USER_DETAILS_API,{
        withCredentials: true
      });
      if(!userDetails?.data?.success){
        throw new Error("Not authenticated")
      }
      setLoggedIn(true);
      setUser(userDetails?.data?.user);
    }catch(err){
      setLoggedIn(false);
      setUser(null);
      // console.log("User not logged in");
    }
    setLoading(false);
  }

  const refreshUser = async() => {
    await getUserDetails();
  }

  useEffect(() => {
    // getUserDetails();
  }, []);   //runs only one time after refresh

  const value = {
    loggedIn,
    setLoggedIn,
    loading,
    setLoading,
    user,
    setUser,
    signupData,
    setSignupData,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext);
};


export {AuthContext,AuthProvider}