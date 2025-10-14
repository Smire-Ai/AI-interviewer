// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import Layout from '../components/Layout';
import Loader from '../components/Loader';

const Dashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  // Fetch available jobs from the backend when the component mounts
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // NOTE: For now, we need to add a dummy Job to our database via the Django Admin
        // for this endpoint to return anything. We will build the Admin UI later.
        // The endpoint is protected, but axiosConfig attaches our auth token automatically.
        const response = await apiClient.get('/jobs/'); // This endpoint doesn't exist yet, we'll add it
        setJobs(response.data);
        if (response.data.length > 0) {
          setSelectedJobId(response.data[0].id);
        }
      } catch (err) {
        setError('Failed to load available jobs. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []); // The empty array means this effect runs once on mount

  const handleStartInterview = async (e) => {
    e.preventDefault();
    if (!selectedJobId || !resumeText) {
      setError('Please select a job and provide your resume text.');
      return;
    }

    setStarting(true);
    setError('');

    try {
      const response = await apiClient.post('/interviews/start/', {
        job_description_id: selectedJobId,
        resume_text: resumeText,
      });
      // On success, navigate to the interview page with the new interview ID
      navigate(`/interview/${response.data.id}`);
    } catch (err) {
      setError('Failed to start the interview. Please try again.');
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center">Loading jobs...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Start Your Mock Interview</h1>
        
        {error && <div className="p-3 mb-4 text-sm text-red-200 bg-red-800 rounded-lg text-center">{error}</div>}
        
        <form onSubmit={handleStartInterview} className="p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
          {/* Job Selection */}
          <div>
            <label htmlFor="job" className="block text-sm font-medium text-gray-300">
              Select an Interview Type
            </label>
            <select
              id="job"
              name="job"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))
              ) : (
                <option disabled>No jobs available</option>
              )}
            </select>
          </div>

          {/* Resume Text Area */}
          <div>
            <label htmlFor="resume" className="block text-sm font-medium text-gray-300">
              Paste Your Resume
            </label>
            <textarea
              id="resume"
              name="resume"
              rows="10"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Paste the text content of your resume here..."
              required
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={starting || jobs.length === 0}
              className="w-full px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {starting ? 'Initializing...' : 'Start Interview'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Dashboard;