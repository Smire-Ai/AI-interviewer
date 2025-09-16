'use client';

import { useState } from 'react';
import axios from 'axios';
// --- THIS IS THE CORRECTED IMPORT PATH ---
import ProtectedRoute from '../components/ProtectedRoute';

export default function HomePage() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('A software engineer...');
  const [githubUser, setGithubUser] = useState('ahmedatk');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!resumeFile) {
      setError('Please select a resume file to upload.');
      return;
    }
    setIsLoading(true);
    setError('');
    setAnalysisResult(null);
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jd', jobDescription);
    formData.append('github_user', githubUser);
    try {
      const response = await axios.post('http://localhost:8000/analyze-resume/', formData);
      setAnalysisResult(response.data);
    } catch (err) {
      setError('An error occurred during analysis...');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
        <h1>AI Resume Analyzer</h1>
        <p>Upload a resume (PDF), provide a job description, and get an instant ATS score and analysis.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
           <div><label>Upload Resume (PDF)</label><input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files[0])} required style={{ display: 'block', marginTop: '0.5rem' }}/></div>
           <div><label>Job Description</label><textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} required rows="5" style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}/></div>
           <div><label>GitHub Username (Optional)</label><input type="text" value={githubUser} onChange={(e) => setGithubUser(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}/></div>
           <button type="submit" disabled={isLoading} style={{ padding: '0.75rem', cursor: 'pointer' }}>{isLoading ? 'Analyzing...' : 'Analyze Resume'}</button>
        </form>
        {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
        {analysisResult && ( <div style={{ marginTop: '2rem', border: '1px solid #ccc', padding: '1rem' }}><h2>Analysis Complete</h2><h3>ATS Score &amp; Details</h3><pre style={{ background: '#f4f4f4', padding: '1rem', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{JSON.stringify(analysisResult.analysis_json, null, 2)}</pre><h3>Skills Radar Chart</h3><div dangerouslySetInnerHTML={{ __html: analysisResult.radar_chart_html }} /></div>)}
      </main>
    </ProtectedRoute>
  );
}