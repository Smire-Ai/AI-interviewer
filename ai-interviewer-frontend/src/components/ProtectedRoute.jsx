// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // If user is not logged in, redirect them to the login page
    return <Navigate to="/" />;
  }

  // If user is logged in, show the page content
  return children;
};

export default ProtectedRoute;