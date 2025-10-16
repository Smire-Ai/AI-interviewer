// src/components/layout/Layout.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig'; // Fixed path
import { useAuth } from '../auth/AuthProvider.jsx';



const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="app-layout">
      <header className="header">
        <nav>
          <Link to="/">Home</Link>
          {currentUser && (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button onClick={handleLogout}>Logout</button>
            </>
          )}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="footer">
        <p>© 2025 AI Interviewer</p>
      </footer>
    </div>
  );
};

export default Layout;
