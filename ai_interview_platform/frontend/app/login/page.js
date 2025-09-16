// File: frontend/app/login/page.js
'use client';

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react'; // <-- IMPORT useEffect

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // --- THIS IS THE FIX ---
  // We use a useEffect to handle the redirect.
  // This code will run only after the component has rendered.
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);


  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  if (loading || user) {
    // While loading or redirecting, show a message
    return <p style={{ textAlign: 'center', paddingTop: '2rem' }}>Loading...</p>;
  }

  // If not loading and no user, show the login button
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Login to Your Account</h1>
      <p>Please sign in to access the platform features.</p>
      <button 
        onClick={handleSignIn}
        style={{ marginTop: '2rem', padding: '1rem 2rem', fontSize: '1.2rem', cursor: 'pointer', backgroundColor: '#4285F4', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Sign in with Google
      </button>
    </main>
  );
}