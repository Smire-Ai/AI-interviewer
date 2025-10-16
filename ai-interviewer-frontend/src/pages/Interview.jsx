// src/pages/Interview.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import Layout from '../components/Layout';
import { useAuth } from '../components/AuthProvider';

const Interview = () => {
  const { interviewId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interview]);

  useEffect(() => {
    const fetchInterviewState = async () => {
      if (!currentUser) return;
      try {
        const response = await apiClient.get(`/interviews/${interviewId}/`);
        setInterview(response.data);
        const activeTurn = response.data.turns.find(turn => !turn.candidate_answer);
        setCurrentTurn(activeTurn);
      } catch (err) {
        setError("Failed to load interview session. It might be invalid or expired.");
      } finally {
        setLoading(false);
      }
    };
    fetchInterviewState();
  }, [interviewId, currentUser]);

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      // Optimistically update the UI
      const updatedTurns = interview.turns.map(t => 
        t.turn_number === currentTurn.turn_number 
        ? { ...t, candidate_answer: userAnswer } 
        : t
      );
      setInterview({ ...interview, turns: updatedTurns });

      const response = await apiClient.post(`/interviews/${interviewId}/submit_answer/`, {
        answer: userAnswer,
      });

      // --- START OF MODIFICATION: Handle completed interview ---
      if (response.data.status === "COMPLETED") {
        navigate(`/results/${interviewId}`);
        return; // Stop further execution
      }
      // --- END OF MODIFICATION ---

      // If interview not completed, continue as normal
      const newTurn = {
        turn_number: response.data.turn_number,
        question_text: response.data.next_question,
        candidate_answer: null,
        ai_feedback: null,
      };

      const finalTurns = updatedTurns.map(t => 
        t.turn_number === currentTurn.turn_number 
        ? { ...t, ai_feedback: response.data.feedback } 
        : t
      );

      setInterview({ ...interview, turns: [...finalTurns, newTurn] });
      setCurrentTurn(newTurn);
      setUserAnswer('');

    } catch (err) {
      setError("Sorry, there was an error submitting your answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Layout><p className="text-center text-lg">Loading your interview session...</p></Layout>;
  }

  if (error) {
    return <Layout><p className="text-center text-lg text-red-400">{error}</p></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">Interview in Progress</h1>
        <div className="bg-gray-800 rounded-lg p-4 h-[60vh] overflow-y-auto flex flex-col gap-4">
          {interview?.turns.map((turn) => (
            <React.Fragment key={turn.turn_number}>
              <div className="chat chat-start">
                <div className="chat-bubble bg-indigo-600 text-white">
                  <p>{turn.question_text}</p>
                </div>
              </div>
              
              {turn.candidate_answer && (
                <div className="chat chat-end">
                  <div className="chat-bubble bg-gray-600 text-white">
                    <p>{turn.candidate_answer}</p>
                  </div>
                   {turn.ai_feedback && (
                    <div className="chat-footer text-xs text-gray-400 mt-1">
                      <strong>AI Feedback:</strong> {turn.ai_feedback}
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
           <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSubmitAnswer} className="mt-4 flex items-center gap-4">
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="flex-grow p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            placeholder="Type your answer here..."
            rows="3"
            disabled={submitting}
          />
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition"
            disabled={submitting || !userAnswer.trim()}
          >
            {submitting ? "..." : "Send"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Interview;
