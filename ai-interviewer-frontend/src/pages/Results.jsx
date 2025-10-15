// src/pages/Results.jsx
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';

const Results = () => {
  const { interviewId } = useParams();
  return (
    <Layout>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Interview Results</h1>
        <p className="mt-4 text-gray-400">This page will show the final results and feedback for interview ID: <span className="font-mono text-indigo-400">{interviewId}</span></p>
        <div className="mt-8">
          <Link to="/dashboard" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Results;