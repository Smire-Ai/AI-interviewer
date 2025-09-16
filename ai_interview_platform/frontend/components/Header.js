'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user } = useAuth(); // Get the current user from our context
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // After logout, redirect to the login page
      router.push('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const navStyle = {
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #eaeaea',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const linkStyle = {
    textDecoration: 'none',
    color: '#0070f3',
    fontSize: '1.1rem',
    fontWeight: '600',
  };

  const userInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  };

  const logoutButtonStyle = {
    ...linkStyle,
    color: '#dc3545', // A red color for logout
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontFamily: 'inherit',
  };

  return (
    <nav style={navStyle}>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <Link href="/" style={linkStyle}>
          Resume Analyzer
        </Link>
        <Link href="/interview" style={linkStyle}>
          AI Interview
        </Link>
      </div>

      <div style={userInfoStyle}>
        {user ? (
          // If the user is logged in, show their name and a logout button
          <>
            <span>Welcome, {user.displayName || user.email}</span>
            <button onClick={handleLogout} style={logoutButtonStyle}>
              Logout
            </button>
          </>
        ) : (
          // If the user is logged out, show a login link
          <Link href="/login" style={linkStyle}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}