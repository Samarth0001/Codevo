import React, { ReactNode ,useContext} from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import Spinner from './Spinner';

interface OpenRouteProps {
  children: ReactNode;
}

const OpenRoute: React.FC<OpenRouteProps> = ({ children }) => {
  const {loggedIn} = useContext(AuthContext)

  if (!loggedIn) {
    return <>{children}</>;
  } else {
    // If token exists, redirect to profile/dashboard/home
    return <Navigate to="/dashboard/home" />;
  }
};

export default OpenRoute;
