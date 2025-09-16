'use client';

import { useState } from 'react';
import axios from 'axios';
import ProtectedRoute from '../../components/ProtectedRoute';

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
  const [jobDescription, setJobDescription] = useState('Software Engineer with a focus on web development.');
  const [userResponse, setUserResponse] = useState('');
  const [interviewStatus, setInterviewStatus] = useState('not_started');
  const [conversation, setConversation] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getAudioUrl = (filePath) => {
    if (!filePath) return null;
    const fileName = filePath.substring(filePath.indexOf('/tmp/') + 5);
    return `http://localhost:8000/get-audio/${fileName}`;
  };

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
      const response = await axios.post('http://localhost:8000/start-interview/', formData);
      const { conversation: newConversation, audio_question_path: audioPath } = response.data;

      setConversation([{ sender: 'ai', text: newConversation }]);
      setCurrentAudio(getAudioUrl(audioPath));
      setInterviewStatus('in_progress');
    } catch (err) {
      setError('Failed to start interview. The AI might be waking up. Please wait 60 seconds and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseSubmit = async (event) => {
    event.preventDefault();
    if (!userResponse) return;

    setIsLoading(true);
    setError('');

    const updatedConversation = [...conversation, { sender: 'user', text: userResponse }];
    setConversation(updatedConversation);
    setUserResponse('');

    const formData = new FormData();
    formData.append('response', userResponse);

    try {
      const response = await axios.post('http://localhost:8000/handle-response/', formData);
      const { conversation: fullConversation, audio_question_path: audioPath } = response.data;

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
      setCurrentAudio(getAudioUrl(audioPath));
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
      <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto' }}>
        <h1>AI Mock Interview</h1>
        <form onSubmit={startInterview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          <div>
            <label>Upload Resume (PDF)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setResumeFile(e.target.files[0])}
              required
              style={{ display: 'block', marginTop: '0.5rem' }}
            />
          </div>
          <div>
            <label>Job Description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
              rows="4"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
            />
          </div>
          <button type="submit" disabled={isLoading} style={{ padding: '0.75rem', cursor: 'pointer' }}>
            {isLoading ? 'Starting...' : 'Start Interview'}
          </button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h1>Interview in Progress</h1>
      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '1rem',
          height: '500px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column-reverse',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {conversation.slice().reverse().map((msg, index) => (
            <ChatMessage key={index} sender={msg.sender} text={msg.text} />
          ))}
        </div>
      </div>

      {currentAudio && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Interviewer Question Audio:</h3>
          <audio controls autoPlay key={currentAudio}>
            <source src={currentAudio} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <form onSubmit={handleResponseSubmit} style={{ marginTop: '1rem', display: 'flex' }}>
        <textarea
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          placeholder="Type your answer here..."
          rows="4"
          style={{ flexGrow: 1, marginRight: '1rem', padding: '0.5rem', borderRadius: '8px' }}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading} style={{ padding: '0.75rem', cursor: 'pointer', borderRadius: '8px' }}>
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
    </main>
  );
}