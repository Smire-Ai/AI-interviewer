// src/components/Layout.jsx
import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useAuth } from './AuthProvider';

const Layout = ({ children }) => {
  const { currentUser } = useAuth();

  const handleLogout = async () => { /* ... (no changes here) ... */ };

  // --- ADD THIS TEMPORARY FUNCTION ---
  const logToken = async () => {
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true); // Force refresh
        console.log("--- FIREBASE ID TOKEN ---");
        console.log(token);
        console.log("--- END TOKEN --- (Copy the long string above)");
      } catch (error) {
        console.error("Error getting ID token:", error);
      }
    } else {
      console.log("No user is currently logged in.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="font-bold text-xl">AI Interviewer</span>
            </div>
            {currentUser && (
              <div className="flex items-center">
                {/* --- ADD THIS TEMPORARY BUTTON --- */}
                <button
                  onClick={logToken}
                  className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 mr-4"
                >
                  Log Token
                </button>
                {/* --- END OF ADDED BUTTON --- */}

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
        {/* ... (no changes here) ... */ }
      </main>
    </div>
  );
};

export default Layout;