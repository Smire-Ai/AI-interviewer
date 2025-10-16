// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import Loader from './Loader'; // Import the loader

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth(); // Destructure loading as well

  if (loading) {
    // If we are still checking for the user, show a loading screen
    return <Loader />;
  }

  if (!currentUser) {
    // If the check is done and there's no user, redirect to login
    return <Navigate to="/login" />;
  }

  // If the check is done and there is a user, show the requested page
  return children;
};

export default ProtectedRoute;