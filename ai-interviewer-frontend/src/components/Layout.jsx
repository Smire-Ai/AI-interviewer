import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebaseConfig'; // This path is correct
// --- FIX THIS LINE ---
import { useAuth } from './AuthProvider'; // Changed from '../components/auth/AuthProvider'

const Layout = ({ children }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/'); // Redirect to login page after logout
  };

  // --- Temporary function to get and log the token ---
  const logToken = async () => {
    if (currentUser) {
      const token = await currentUser.getIdToken(true);
      console.log("--- FIREBASE ID TOKEN ---");
      console.log(token);
      console.log("--- END TOKEN ---");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="font-bold text-xl">AI Interviewer</Link>
              {/* Add links to other pages for navigation */}
              <Link to="/admin" className="text-gray-300 hover:text-white">Admin</Link>
            </div>
            {currentUser && (
              <div className="flex items-center">
                <button onClick={logToken} className="hidden">Log Token</button> {/* Hidden but available for debugging */}
                <span className="text-gray-300 mr-4">{currentUser.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;