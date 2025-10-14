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
  
  // Ref to auto-scroll to the bottom of the chat
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Scroll to the bottom whenever the interview state changes
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interview]);

  // Fetch the initial interview state
  useEffect(() => {
    const fetchInterviewState = async () => {
      if (!currentUser) return; // Wait for user
      try {
        // We need a backend endpoint to fetch an interview's state
        const response = await apiClient.get(`/interviews/${interviewId}/`);
        setInterview(response.data);
        // Find the most recent turn that has a question but no answer
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
      // Add the user's answer to the current turn for immediate UI feedback
      const updatedTurns = interview.turns.map(t => 
        t.turn_number === currentTurn.turn_number 
        ? { ...t, candidate_answer: userAnswer } 
        : t
      );
      setInterview({ ...interview, turns: updatedTurns });
      
      // Call the backend to submit the answer and get the next question
      const response = await apiClient.post(`/interviews/${interviewId}/submit_answer/`, {
        answer: userAnswer,
      });

      // Create the new turn from the response
      const newTurn = {
        turn_number: response.data.turn_number,
        question_text: response.data.next_question,
        candidate_answer: null,
        ai_feedback: null, // Feedback is on the *previous* turn
      };
      
      // Add the AI's feedback to the turn we just answered
      const finalTurns = updatedTurns.map(t => 
        t.turn_number === currentTurn.turn_number 
        ? { ...t, ai_feedback: response.data.feedback } 
        : t
      );

      // Update the state with the new turn
      setInterview({ ...interview, turns: [...finalTurns, newTurn] });
      setCurrentTurn(newTurn);
      setUserAnswer(''); // Clear the input box

    } catch (err) {
      setError("Sorry, there was an error submitting your answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return <Layout><p>Loading interview...</p></Layout>;
  }

  if (error) {
    return <Layout><p className="text-red-400">{error}</p></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Interview in Progress</h1>
        <div className="bg-gray-800 rounded-lg p-4 h-[60vh] overflow-y-auto">
          {interview?.turns.map((turn) => (
            <div key={turn.turn_number}>
              {/* AI Question */}
              <div className="chat chat-start">
                <div className="chat-bubble bg-indigo-600">
                  {turn.question_text}
                </div>
              </div>
              
              {/* Candidate Answer and AI Feedback */}
              {turn.candidate_answer && (
                <div className="chat chat-end">
                  <div className="chat-bubble bg-gray-600">
                    {turn.candidate_answer}
                  </div>
                   {turn.ai_feedback && (
                    <div className="chat-footer opacity-50 text-xs mt-1">
                      Feedback: {turn.ai_feedback}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
           <div ref={chatEndRef} />
        </div>

        {/* Answer Form */}
        <form onSubmit={handleSubmitAnswer} className="mt-4 flex gap-4">
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="flex-grow p-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Type your answer here..."
            rows="3"
            disabled={submitting}
          />
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            disabled={submitting || !userAnswer.trim()}
          >
            {submitting ? "Submitting..." : "Send"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Interview;