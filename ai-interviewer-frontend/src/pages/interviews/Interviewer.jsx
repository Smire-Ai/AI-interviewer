// src/pages/interviews/Interviewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/axiosConfig';

// src/pages/interviews/Interviewer.jsx
// ...
import Layout from '../../components/Layout'; // Correct path
import { useAuth } from '../../components/AuthProvider'; // Correct path
// ...

const Interviewer = () => {
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
    // Auto-scroll to the latest message
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interview]);

  // Fetch the initial state of the interview when the page loads
  useEffect(() => {
    const fetchInterviewState = async () => {
      // Don't fetch until we know who the user is
      if (!currentUser) return;

      try {
        const response = await apiClient.get(`/interviews/${interviewId}/`);
        setInterview(response.data);
        
        // Find the current question (the last turn in the list)
        const lastTurn = response.data.turns[response.data.turns.length - 1];
        setCurrentTurn(lastTurn);

      } catch (err) {
        setError("Failed to load interview session. It might be invalid or has expired.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInterviewState();
  }, [interviewId, currentUser]);

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      // Optimistically update the UI with the user's answer
      const updatedTurns = interview.turns.map(t => 
        t.turn_number === currentTurn.turn_number 
        ? { ...t, candidate_answer: userAnswer } 
        : t
      );
      setInterview({ ...interview, turns: updatedTurns });
      setUserAnswer(''); // Clear input immediately
      
      // Call the backend to get the AI's response
      const response = await apiClient.post(`/interviews/${interviewId}/submit_answer/`, {
        answer: userAnswer,
      });

      // If the interview is over, navigate to the results page
      if (response.data.status === "COMPLETED") {
        navigate(`/results/${interviewId}`);
        return;
      }

      // Create the new turn object for the AI's next question
      const newTurn = {
        turn_number: response.data.turn_number,
        question_text: response.data.next_question,
        candidate_answer: null,
        ai_feedback: null,
      };
      
      // Update the turn we just answered with the AI's feedback
      const finalTurns = updatedTurns.map(t => 
        t.turn_number === currentTurn.turn_number 
        ? { ...t, ai_feedback: response.data.feedback } 
        : t
      );

      // Add the new AI question to the chat
      setInterview({ ...interview, turns: [...finalTurns, newTurn] });
      setCurrentTurn(newTurn);

    } catch (err) {
      setError("Sorry, there was an error submitting your answer. Please try again.");
      // Optional: Revert optimistic update on error
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">AI Interview</h1>
        
        {/* Chat History */}
        <div className="bg-gray-800 rounded-lg p-4 h-[65vh] overflow-y-auto flex flex-col gap-6">
          {interview?.turns.map((turn) => (
            <React.Fragment key={turn.turn_number}>
              {/* AI Question */}
              <div className="chat chat-start">
                <div className="chat-bubble bg-indigo-600 text-white">
                  <p className="py-2 px-1">{turn.question_text}</p>
                </div>
              </div>
              
              {/* Candidate Answer & AI Feedback */}
              {turn.candidate_answer && (
                <div className="chat chat-end">
                  <div className="chat-bubble bg-gray-600 text-white">
                    <p className="py-2 px-1 whitespace-pre-wrap">{turn.candidate_answer}</p>
                  </div>
                   {turn.ai_feedback && (
                    <div className="chat-footer text-xs text-indigo-300 mt-1 pl-2">
                      <strong>AI Feedback:</strong> {turn.ai_feedback}
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
          {submitting && <p className="text-center text-gray-400">AI is thinking...</p>}
          <div ref={chatEndRef} />
        </div>

        {/* Answer Form */}
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

export default Interviewer;