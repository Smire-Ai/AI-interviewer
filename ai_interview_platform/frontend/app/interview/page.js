'use client';

import { useState } from 'react';
import axios from 'axios';
import ProtectedRoute from '../../components/ProtectedRoute';
import WebcamAnalysis from '../../components/WebcamAnalysis';
import { useAuth } from '../../context/AuthContext';

function ChatMessage({ sender, text }) {
  const style = {
    padding: '10px 15px',
    borderRadius: '15px',
    marginBottom: '10px',
    maxWidth: '80%',
    lineHeight: '1.4',
    alignSelf: sender === 'ai' ? 'flex-start' : 'flex-end',
    backgroundColor: sender === 'ai' ? '#e9ecef' : '#007bff',
    color: sender === 'ai' ? '#000' : '#fff',
  };
  const formattedText = text.replace(/\n/g, '<br />');
  return <div style={style} dangerouslySetInnerHTML={{ __html: formattedText }} />;
}

export default function InterviewPage() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('Software Engineer...');
  const [userResponse, setUserResponse] = useState('');
  const [interviewStatus, setInterviewStatus] = useState('not_started');
  const [conversation, setConversation] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const startInterview = async (event) => {
    event.preventDefault();
    if (!resumeFile) {
      setError('Please upload a resume to start.');
      return;
    }
    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('job_desc', jobDescription);

    try {
      const interviewResponse = await axios.post('http://localhost:8000/start-interview/', formData);
      const { conversation: newConversation } = interviewResponse.data;

      setConversation([{ sender: 'ai', text: newConversation }]);
      setInterviewStatus('in_progress');

      if (user) {
        const token = await user.getIdToken(true);
        const audioResponse = await axios.post(
          'http://localhost:8000/generate-audio',
          { text: newConversation },
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
          }
        );
        const audioBlobUrl = URL.createObjectURL(audioResponse.data);
        setCurrentAudio(audioBlobUrl);
      }
    } catch (err) {
      setError('Failed to start interview. The AI might be waking up. Please wait and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseSubmit = async (event) => {
    event.preventDefault();
    if (!userResponse || !user) return;

    setIsLoading(true);
    setError('');

    const updatedConversation = [...conversation, { sender: 'user', text: userResponse }];
    setConversation(updatedConversation);
    const userMessage = userResponse;
    setUserResponse('');

    const formData = new FormData();
    formData.append('response', userMessage);

    try {
      const interviewResponse = await axios.post('http://localhost:8000/handle-response/', formData);
      const { conversation: fullConversation } = interviewResponse.data;

      const messages = fullConversation
        .split(/(AI:|User:)/)
        .filter(Boolean)
        .reduce((acc, curr, i, arr) => {
          if (curr === 'AI:' || curr === 'User:') {
            acc.push({ sender: curr === 'AI:' ? 'ai' : 'user', text: arr[i + 1].trim() });
          }
          return acc;
        }, []);

      setConversation(messages);

      const latestAiMessage = messages.filter((m) => m.sender === 'ai').pop()?.text;
      if (latestAiMessage) {
        const token = await user.getIdToken(true);
        const audioResponse = await axios.post(
          'http://localhost:8000/generate-audio',
          { text: latestAiMessage },
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
          }
        );
        const audioBlobUrl = URL.createObjectURL(audioResponse.data);
        setCurrentAudio(audioBlobUrl);
      }
    } catch (err) {
      setError('Failed to handle response.');
      console.error(err);
      setConversation(conversation);
    } finally {
      setIsLoading(false);
    }
  };

  if (interviewStatus === 'not_started') {
    return (
      <ProtectedRoute>
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto' }}>
          <h1>AI Mock Interview</h1>
          <form onSubmit={startInterview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
            <div>
              <label>Upload Resume (PDF)</label>
              <input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files[0])} required style={{ display: 'block', marginTop: '0.5rem' }} />
            </div>
            <div>
              <label>Job Description</label>
              <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} required rows="4" style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} />
            </div>
            <button type="submit" disabled={isLoading} style={{ padding: '0.75rem', cursor: 'pointer' }}>
              {isLoading ? 'Starting...' : 'Start Interview'}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </form>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: 'auto' }}>
        <h1>Interview in Progress</h1>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
          <div style={{ flex: 1 }}>
            <h3>Your Camera</h3>
            <WebcamAnalysis />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3>Conversation</h3>
            <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', height: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {conversation.slice().reverse().map((msg, index) => (
                  <ChatMessage key={index} sender={msg.sender} text={msg.text} />
                ))}
              </div>
            </div>
            {currentAudio && (
              <div>
                <audio controls autoPlay key={currentAudio}>
                  <source src={currentAudio} type="audio/mpeg" />
                </audio>
              </div>
            )}
            <form onSubmit={handleResponseSubmit} style={{ marginTop: 'auto', display: 'flex' }}>
              <textarea
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                placeholder="Type your answer here..."
                rows="3"
                style={{ flexGrow: 1, marginRight: '1rem', padding: '0.5rem', borderRadius: '8px' }}
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading} style={{ padding: '0.75rem', cursor: 'pointer', borderRadius: '8px' }}>
                {isLoading ? 'Thinking...' : 'Send'}
              </button>
            </form>
            {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
