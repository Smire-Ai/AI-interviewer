// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// --- FIX THESE TWO LINES ---
import { useAuth } from './components/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';

// Import pages
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Interviewer from './pages/interviews/Interviewer';
import NotFound from './pages/NotFound';

function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/signup" element={currentUser ? <Navigate to="/dashboard" /> : <SignUp />} />

      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/interview/:interviewId" 
        element={
          <ProtectedRoute>
            <Interviewer />
          </ProtectedRoute>
        } 
      />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;