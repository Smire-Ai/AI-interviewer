// src/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './components/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Interviewer from './pages/interviews/Interviewer';
import NotFound from './pages/NotFound';

const AppRoutes = () => {
  const { currentUser } = useAuth(); // This will now work correctly

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/signup" element={currentUser ? <Navigate to="/dashboard" /> : <SignUp />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/interview/:interviewId" element={<ProtectedRoute><Interviewer /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;