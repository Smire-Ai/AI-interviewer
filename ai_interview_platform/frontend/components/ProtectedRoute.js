// File: frontend/components/ProtectedRoute.js

'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If authentication is finished loading and there's no user, redirect.
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // While loading, show a simple message or a spinner component.
  if (loading) {
    return <p style={{ textAlign: 'center', paddingTop: '2rem' }}>Loading user...</p>;
  }

  // If there is a user, render the child components (the actual page).
  if (user) {
    return <>{children}</>;
  }

  // If no user after loading, render null (as the redirect is happening).
  return null;
}