import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useAuth } from './AuthProvider';

const Layout = ({ children }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await signOut(auth); navigate('/'); };
  return (
    <div>
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <Link to="/dashboard" className="font-bold text-xl">AI Interviewer</Link>
        {currentUser && (
          <div className="flex items-center gap-4">
            <span>{currentUser.email}</span>
            <button onClick={handleLogout} className="bg-indigo-600 px-3 py-1 rounded">Logout</button>
          </div>
        )}
      </header>
      <main className="p-8">{children}</main>
    </div>
  );
};
export default Layout;