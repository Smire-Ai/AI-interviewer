// File: frontend/context/AuthContext.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

// --- Role Selection Modal Component ---
function RoleSelectionModal({ user, onRoleSelected, isSyncing }) {
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
    border: '1px solid #007bff', color: '#007bff', background: 'white', borderRadius: '5px',
    // Disable button while syncing
    opacity: isSyncing ? 0.5 : 1,
  };

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <h2>Welcome, {user.displayName}!</h2>
        <p>Please select your role to continue.</p>
        <div style={{ marginTop: '30px' }}>
          <button style={buttonStyle} onClick={() => onRoleSelected('Job Seeker')} disabled={isSyncing}>
            {isSyncing ? 'Saving...' : 'I am a Job Seeker'}
          </button>
          <button style={buttonStyle} onClick={() => onRoleSelected('HR')} disabled={isSyncing}>
            {isSyncing ? 'Saving...' : 'I am an HR / Recruiter'}
          </button>
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
  const [isSyncingRole, setIsSyncingRole] = useState(false); // <-- NEW state to track API call

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed. User:", firebaseUser ? firebaseUser.email : 'null');
      if (firebaseUser) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('role')
          .eq('firebase_uid', firebaseUser.uid)
          .single();

        if (existingUser && existingUser.role) {
          setUser(firebaseUser);
          setUserRole(existingUser.role);
          setShowRoleModal(false);
        } else {
          setUser(firebaseUser);
          setShowRoleModal(true);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleSelected = async (role) => {
    if (!user || isSyncingRole) return;
    
    setIsSyncingRole(true); // <-- Start loading state
    console.log(`Role selected: ${role}. Attempting to sync.`);

    try {
      const token = await user.getIdToken(true);
      
      const response = await axios.post('http://localhost:8000/sync-user', { 
        token: token, 
        role: role 
      });
      
      console.log("Backend response:", response.data);
      if (response.data.status === 'success') {
        console.log("Sync successful! Closing modal.");
        setUserRole(role);
        setShowRoleModal(false); // <-- This will now definitely be called on success
      } else {
        throw new Error(response.data.message || "Backend responded with an error.");
      }
    } catch (error) {
      console.error("CRITICAL ERROR: Failed to sync user role. Is the backend server running? Details:", error);
      alert("Error: Could not save your role. Please make sure the server is running and try logging in again.");
    } finally {
      setIsSyncingRole(false); // <-- Stop loading state no matter what
    }
  };

  const value = { user, userRole, loading };

  return (
    <AuthContext.Provider value={value}>
      {showRoleModal && <RoleSelectionModal user={user} onRoleSelected={handleRoleSelected} isSyncing={isSyncingRole} />}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};