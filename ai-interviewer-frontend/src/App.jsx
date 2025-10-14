// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Interview from './pages/Interview';
import NotFound from './pages/NotFound';
import { useAuth } from './components/AuthProvider';

function App() {
  const { currentUser } = useAuth();

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100">
      <Routes>
        {/* If user is logged in, the homepage is the Dashboard. Otherwise, it's the Login page. */}
        <Route path="/" element={currentUser ? <Dashboard /> : <Login />} />
        
        {/* We will protect this route later */}
        <Route path="/interview/:interviewId" element={<Interview />} />

        {/* Catch-all for any other URL */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;