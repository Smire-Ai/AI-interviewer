// src/components/layout/Layout.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig'; // Corrected path
import { useAuth } from '../auth/AuthProvider'; // Corrected path

const Layout = ({ children }) => {
    // ... component logic ...
};

export default Layout; // <-- The default export is here.