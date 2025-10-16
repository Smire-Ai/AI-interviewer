// src/pages/interviews/Interviewer.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout'; // Note the path is '../..' to go up two levels

const Interviewer = () => {
  const { interviewId } = useParams();

  return (
    <Layout>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Interview in Progress</h1>
        <p className="mt-4 text-gray-400">
          This is where the chat with the AI will happen for interview ID: 
          <span className="font-mono text-indigo-400 ml-2">{interviewId}</span>
        </p>
      </div>
    </Layout>
  );
};

// This is the critical line that was missing
export default Interviewer;