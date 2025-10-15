// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Interview from './pages/Interview';
import Results from './pages/Results'; // New Page
import AdminDashboard from './pages/AdminDashboard'; // New Page
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute'; // Import our protector
import { useAuth } from './components/AuthProvider';

function App() {
  const { currentUser } = useAuth();

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100">
      <Routes>
        {/* Public Route: Login Page */}
        {/* If a user is logged in and tries to go to '/', they are redirected to the dashboard */}
        <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />

        {/* Protected Routes: These pages require a user to be logged in */}
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
              <Interview />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/results/:interviewId" 
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;