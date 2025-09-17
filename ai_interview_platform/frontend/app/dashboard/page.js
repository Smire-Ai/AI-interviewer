// File: frontend/app/dashboard/page.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext'; // Corrected path
import ProtectedRoute from '../../components/ProtectedRoute'; // Corrected path

export default function DashboardRouterPage() {
  const router = useRouter();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && userRole) {
      if (userRole === 'Job Seeker') {
        router.replace('/dashboard/seeker'); // Use replace to avoid back-button issues
      } else if (userRole === 'HR') {
        router.replace('/dashboard/hr');
      }
    }
  }, [user, userRole, loading, router]);

  // This page is protected. If not logged in, it will redirect to /login
  // If logged in but role isn't loaded yet, it shows this loading message
  return (
    <ProtectedRoute>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <h2>Loading your personalized dashboard...</h2>
      </div>
    </ProtectedRoute>
  );
}
