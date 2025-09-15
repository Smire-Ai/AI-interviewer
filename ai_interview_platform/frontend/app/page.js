// This line is important! It tells Next.js that this is an interactive component.
'use client';

// We need to import 'useState' from React to manage our form's data.
import { useState } from 'react';
// We'll use axios to send data to our backend.
import axios from 'axios';

export default function HomePage() {
  // --- STATE MANAGEMENT ---
  // These are like memory boxes to hold the data from our form.
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('A software engineer with 3+ years of experience in Python and JavaScript.');
  const [githubUser, setGithubUser] = useState('ahmedatk');
  
  // These states help us manage the UI (e.g., show a loading message).
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- FORM SUBMISSION HANDLER ---
  // This function runs when the user clicks the "Analyze Resume" button.
  const handleSubmit = async (event) => {
    // Prevent the browser from reloading the page, which is the default form behavior.
    event.preventDefault();

    // Check if a file was selected.
    if (!resumeFile) {
      setError('Please select a resume file to upload.');
      return;
    }

    // Set loading state to true to show a message to the user.
    setIsLoading(true);
    setError('');
    setAnalysisResult(null);

    // FormData is a special object for sending files and text together.
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jd', jobDescription);
    formData.append('github_user', githubUser);

    try {
      // Send the data to our backend API endpoint using axios.
      const response = await axios.post('http://localhost:8000/analyze-resume/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // If successful, store the result from the backend.
      setAnalysisResult(response.data);
    } catch (err) {
      // If there's an error, store the error message.
      setError('An error occurred during analysis. Make sure the backend server is running.');
      console.error(err);
    } finally {
      // No matter what, stop the loading state.
      setIsLoading(false);
    }
  };

  // --- JSX (The HTML part of the component) ---
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h1>AI Resume Analyzer</h1>
      <p>Upload a resume (PDF), provide a job description, and get an instant ATS score and analysis.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            rows="5"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
          />
        </div>

        <div>
          <label>GitHub Username (Optional)</label>
          <input
            type="text"
            value={githubUser}
            onChange={(e) => setGithubUser(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
          />
        </div>

        <button type="submit" disabled={isLoading} style={{ padding: '0.75rem', cursor: 'pointer' }}>
          {isLoading ? 'Analyzing...' : 'Analyze Resume'}
        </button>
      </form>

      {/* --- DISPLAY RESULTS --- */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {analysisResult && (
        <div style={{ marginTop: '2rem', border: '1px solid #ccc', padding: '1rem' }}>
          <h2>Analysis Complete</h2>
          <h3>ATS Score &amp; Details</h3>
          <pre style={{ background: '#f4f4f4', padding: '1rem', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {JSON.stringify(analysisResult.analysis_json, null, 2)}
          </pre>
          <h3>Skills Radar Chart</h3>
          {/* This securely displays the HTML chart received from the backend */}
          <div dangerouslySetInnerHTML={{ __html: analysisResult.radar_chart_html }} />
        </div>
      )}
    </main>
  );
}