// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import apiClient from '../api/axiosConfig'; // We'll use this for the real API calls

const Dashboard = () => {
  const navigate = useNavigate();

  // --- State Management ---
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(true);
  
  // State for UI feedback
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [atsResult, setAtsResult] = useState(null);
  const [checkingAts, setCheckingAts] = useState(false);

  // --- MOCK DATA WORKAROUND ---
  useEffect(() => {
    console.log("Using mock data for jobs list.");
    // This is our fake API response.
    // REMEMBER: The 'id' here must match a REAL JobDescription ID from your Django Admin for 'Start Interview' to work.
    const mockJobs = [
      { id: '8284d9d3-d5e7-4153-8107-8d5c47d47b49', title: 'Senior Python Developer' },
      { id: 'c7a8b9e0-f1d2-4c3b-a2e1-9d8c7b6a5f4d', title: 'Frontend React Developer' },
      { id: 'b6d5c4e3-a2f1-4b9c-8d7e-6a5f4d3c2b1a', title: 'Data Scientist' },
    ];
    
    setJobs(mockJobs);
    if (mockJobs.length > 0) {
      setSelectedJobId(mockJobs[0].id); // Pre-select the first job
    }
    setLoading(false); // We're done "loading"
  }, []); // The empty array means this runs only once when the component mounts.

  const handleStartInterview = async (e) => {
    e.preventDefault();
    if (!selectedJobId || !resumeText) {
      setError('Please select a job and paste your resume text.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // This is a REAL API call. It needs to work to proceed.
      const response = await apiClient.post('/interviews/start/', {
        job_description_id: selectedJobId,
        resume_text: resumeText,
      });
      navigate(`/interview/${response.data.id}`);
    } catch (err) {
      setError('Failed to start the interview. The backend might be down or an error occurred.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleAtsCheck = async () => {
    // We can also mock this for now
    if (!selectedJobId || !resumeText) {
      setError('Please select a job and paste your resume to check the score.');
      return;
    }
    setCheckingAts(true);
    setError('');
    setAtsResult(null);

    // Simulate an API call
    setTimeout(() => {
      const mockAtsResult = {
        score: Math.floor(Math.random() * 30) + 70, // Random score between 70-99
        summary: "The resume shows strong alignment with key skills like Python and API development.",
        suggestions: "Consider adding specific metrics to your project descriptions (e.g., 'improved performance by 15%') and include keywords like 'cloud deployment' and 'CI/CD'."
      };
      setAtsResult(mockAtsResult);
      setCheckingAts(false);
    }, 1500); // Simulate a 1.5 second delay
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Start Your Mock Interview</h1>
        <p className="text-gray-400 mb-8">Select a template, paste your resume, and get ready to practice.</p>
        
        <form onSubmit={handleStartInterview} className="p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
          {error && <div className="p-4 mb-4 text-sm text-red-200 bg-red-800/80 rounded-lg text-center">{error}</div>}
          
          {loading ? <p>Loading interview templates...</p> : (
            <>
              <div>
                <label htmlFor="job" className="block text-sm font-medium text-gray-300">
                  1. Select an Interview Template
                </label>
                <select
                  id="job"
                  name="job"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full mt-1 p-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="resume" className="block text-sm font-medium text-gray-300">
                  2. Paste Your Resume
                </label>
                <textarea
                  id="resume"
                  name="resume"
                  rows="15"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="w-full mt-1 p-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Paste the full text content of your resume here. The AI will use this to ask you more relevant questions."
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center pt-2">
                <button
                  type="button"
                  onClick={handleAtsCheck}
                  disabled={checkingAts || !resumeText || !selectedJobId}
                  className="w-full sm:w-1/2 py-3 px-4 font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed transition-colors"
                >
                  {checkingAts ? 'Analyzing...' : 'Check ATS Score'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || loading || jobs.length === 0}
                  className="w-full sm:w-1/2 py-3 px-4 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Initializing...' : 'Start Interview'}
                </button>
              </div>

              {atsResult && (
                <div className="p-4 mt-4 bg-gray-700 rounded-lg border border-gray-600 animate-fade-in">
                  <h3 className="font-bold text-lg text-sky-300">ATS Analysis Report</h3>
                  <p className="text-3xl font-bold my-2">Match Score: <span className="text-sky-400">{atsResult.score}%</span></p>
                  <div className="space-y-2 text-sm">
                    <p><strong className="text-gray-300">Summary:</strong> {atsResult.summary}</p>
                    <p><strong className="text-gray-300">Suggestions:</strong> {atsResult.suggestions}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </form>
      </div>
    </Layout>
  );
};

export default Dashboard;