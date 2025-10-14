// src/pages/Login.jsx
import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

const Login = () => {
  // State to manage component's data and UI mode
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to handle email/password authentication
  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      } // end if-else
      // On success, the AuthProvider will handle the redirect.
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    } // end try-catch-finally
  }; // end handleAuthAction

  // Function to handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // On success, the AuthProvider will handle the redirect.
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    } // end try-catch-finally
  }; // end handleGoogleSignIn

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">

        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">AI Interviewer</h1>
          <p className="text-gray-400">
            {isLoginView ? 'Welcome back! Please sign in.' : 'Create your account to get started.'}
          </p>
        </div>{/* end header div */}

        {/* Error Display Section */}
        {error && (
          <div className="p-3 text-sm text-red-200 bg-red-800 rounded-lg text-center">
            { error.includes("auth/invalid-credential")
              ? "Invalid email or password. Please try again."
              : "An error occurred. Please try again." }
          </div>
        )}{/* end error div */}

        {/* Email/Password Form */}
        <form onSubmit={handleAuthAction} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>{/* end email input div */}

          {/* Password Input */}
          <div>
            <label htmlFor="password"className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLoginView ? "current-password" : "new-password"}
              required
              minLength="6"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>{/* end password input div */}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Create Account')}
            </button>
          </div>{/* end submit button div */}
        </form>{/* end form */}

        {/* Separator */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-gray-400 bg-gray-800">Or continue with</span>
          </div>
        </div>{/* end separator div */}

        {/* Google Sign-In Button */}
        <div>
           <button
             onClick={handleGoogleSignIn}
             disabled={loading}
             className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-800 disabled:bg-gray-500"
           >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C43.021,36.697,44,34,44,30C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            Sign in with Google
           </button>
        </div>{/* end google button div */}

        {/* Toggle between Login and Signup */}
        <div className="text-sm text-center">
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setError(''); // Clear error on view switch
            }}
            className="font-medium text-indigo-400 hover:text-indigo-300"
          >
            {isLoginView ? 'Don\'t have an account? Sign Up' : 'Already have an account? Sign In'}
          </button>
        </div>{/* end toggle div */}

      </div>{/* end main card div */}
    </div>// end container div
  ); // end return
}; // end Login component

export default Login;