// File: frontend/context/AuthContext.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

// --- Role Selection Modal Component ---
// This component itself is likely fine, but we'll include it for completeness.
function RoleSelectionModal({ user, onRoleSelected }) {
  const modalStyle = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  };
  const contentStyle = {
    padding: '40px', background: 'white', borderRadius: '8px', textAlign: 'center',
    color: '#333',
  };
  const buttonStyle = {
    padding: '10px 20px', margin: '0 10px', fontSize: '1rem', cursor: 'pointer',
    border: '1px solid #007bff', color: '#007bff', background: 'white', borderRadius: '5px'
  };

  const handleJobSeekerClick = () => {
    console.log("Job Seeker button clicked. Calling onRoleSelected...");
    onRoleSelected('Job Seeker');
  };
  
  const handleHrClick = () => {
    console.log("HR button clicked. Calling onRoleSelected...");
    onRoleSelected('HR');
  };

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <h2>Welcome, {user.displayName}!</h2>
        <p>Please select your role to continue.</p>
        <div style={{ marginTop: '30px' }}>
          <button style={buttonStyle} onClick={handleJobSeekerClick}>I am a Job Seeker</button>
          <button style={buttonStyle} onClick={handleHrClick}>I am an HR / Recruiter</button>
        </div>
      </div>
    </div>
  );
}


const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed. User:", firebaseUser ? firebaseUser.email : 'null');
      if (firebaseUser) {
        // User is logged in
        const { data: existingUser } = await supabase
          .from('users')
          .select('role')
          .eq('firebase_uid', firebaseUser.uid)
          .single();

        console.log("Checked Supabase for user. Found:", existingUser);
        if (existingUser && existingUser.role) {
          setUser(firebaseUser);
          setUserRole(existingUser.role);
          setShowRoleModal(false);
          console.log("User has a role. Hiding modal.");
        } else {
          setUser(firebaseUser);
          setShowRoleModal(true);
          console.log("User is new or has no role. Showing modal.");
        }
      } else {
        // User is logged out
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- THIS IS THE CRITICAL FUNCTION ---
  const handleRoleSelected = async (role) => {
    if (!user) {
      console.error("handleRoleSelected called but there is no user!");
      return;
    }
    
    console.log(`Role selected: ${role}. Preparing to sync with backend.`);
    try {
      console.log("Getting Firebase ID token...");
      const token = await user.getIdToken(true);
      console.log("Token acquired. Sending to /sync-user endpoint...");
      
      const response = await axios.post('http://localhost:8000/sync-user', { token, role });
      
      console.log("Backend response:", response.data);
      if (response.data.status === 'success') {
        console.log("Sync successful! Closing modal.");
        setUserRole(role);
        setShowRoleModal(false);
      } else {
        console.error("Backend returned an error:", response.data);
      }
    } catch (error) {
      console.error("CRITICAL ERROR: Failed to sync user role. Is the backend server running? Details:", error);
      // You can add logic here to show an error message to the user
    }
  };

  const value = { user, userRole, loading };

  return (
    <AuthContext.Provider value={value}>
      {showRoleModal && <RoleSelectionModal user={user} onRoleSelected={handleRoleSelected} />}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};