import React, { ReactNode ,useContext} from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import Spinner from './Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const {loggedIn} = useContext(AuthContext)
  // If token is not null, render children, else redirect to login page
  if (loggedIn) {
    return <>{children}</>;
  } else {
    return <Navigate to="/login" />;
  }
};

export default ProtectedRoute;
