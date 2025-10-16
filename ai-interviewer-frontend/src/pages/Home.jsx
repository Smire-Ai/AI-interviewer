import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white text-center px-4 bg-gray-900">
      <h1 className="text-5xl font-extrabold md:text-7xl">Practice, Perfect, Perform.</h1>
      <p className="mt-4 max-w-3xl text-lg text-gray-300">
        Hone your interview skills with an AI-powered mock interviewer. Get instant, objective feedback and land your dream job with confidence.
      </p>
      <div className="mt-10">
        <Link to="/signup" className="px-10 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition duration-300">
          Get Started for Free
        </Link>
        <p className="mt-4 text-sm text-gray-400">
          Already have an account? <Link to="/login" className="font-medium text-indigo-400 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Home;