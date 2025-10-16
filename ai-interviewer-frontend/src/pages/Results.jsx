// src-frontend/src/pages/Results.jsx
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../components/AuthProvider';
// src/pages/Results.jsx
// ...
import Layout from '../components/Layout'; // Correct path
// ...

const Results = () => {
  const { interviewId } = useParams();
  const { currentUser } = useAuth();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInterviewResults = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        // We re-use the same detail endpoint from the interview page
        const response = await apiClient.get(`/interviews/${interviewId}/`);
        setInterview(response.data);
      } catch (err) {
        setError("Failed to load interview results. This session may not exist or you may not have permission to view it.");
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewResults();
  }, [interviewId, currentUser]);

  if (loading) {
    return <Layout><p className="text-center">Loading results...</p></Layout>;
  }

  if (error) {
    return <Layout><p className="text-center text-red-400">{error}</p></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Interview Results</h1>
          <p className="text-gray-400 mb-6">A summary of your conversation with the AI.</p>
          
          <div className="border-t border-gray-700 pt-6">
            <h2 className="text-xl font-semibold mb-4">Conversation History</h2>
            <div className="space-y-6">
              {interview?.turns.map((turn) => (
                // We only show turns where the user provided an answer
                turn.candidate_answer && (
                  <div key={turn.turn_number} className="p-4 bg-gray-700 rounded-lg">
                    <p className="font-semibold text-gray-300">Question {turn.turn_number}:</p>
                    <p className="mt-1 text-white">{turn.question_text}</p>
                    
                    <div className="mt-4 p-3 bg-gray-600 rounded-md">
                      <p className="font-semibold text-gray-300">Your Answer:</p>
                      <p className="mt-1 text-white whitespace-pre-wrap">{turn.candidate_answer}</p>
                    </div>

                    {turn.ai_feedback && (
                      <div className="mt-3 p-3 bg-indigo-900/50 border border-indigo-700 rounded-md">
                        <p className="font-semibold text-indigo-300">AI Feedback:</p>
                        <p className="mt-1 text-indigo-200">{turn.ai_feedback}</p>
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
        <div className="text-center mt-8">
            <Link to="/dashboard" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition">
                Start a New Interview
            </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Results;