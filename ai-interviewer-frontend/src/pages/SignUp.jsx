// src/pages/SignUp.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import apiClient from '../api/axiosConfig';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'CANDIDATE', // Default role
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Step 2: After successful Firebase signup, get the token
      const token = await user.getIdToken();

      // Step 3: Create the user profile in our Django backend
      // We need a specific endpoint for this.
      await apiClient.post('/auth/signup/', 
        {
          full_name: `${formData.firstName} ${formData.lastName}`,
          role: formData.role,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Step 4: Navigate to the main dashboard
      navigate('/dashboard');

    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-white">Create Your Account</h1>
        {error && <p className="text-red-400 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields for firstName, lastName, email, password, role */}
          <input name="firstName" placeholder="First Name" onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded text-white" />
          <input name="lastName" placeholder="Last Name" onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded text-white" />
          <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded text-white" />
          <input type="password" name="password" placeholder="Password (min. 6 characters)" onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded text-white" />
          <select name="role" value={formData.role} onChange={handleChange} className="w-full p-3 bg-gray-700 rounded text-white">
            <option value="CANDIDATE">I am a Candidate</option>
            <option value="ADMIN">I am an HR / Admin</option>
          </select>
          <button type="submit" disabled={loading} className="w-full py-3 font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:bg-indigo-400">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400">
          Already have an account? <Link to="/login" className="font-medium text-indigo-400 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;