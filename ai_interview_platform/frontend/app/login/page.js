'use client';

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase'; // Correct path from app/login -> lib
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext'; // Correct path from app/login -> context

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  if (loading) {
    return <p style={{ textAlign: 'center', paddingTop: '2rem' }}>Loading...</p>;
  }

  if (user) {
    router.push('/');
    return null;
  }

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