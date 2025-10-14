// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import { useAuth } from '../components/AuthProvider';

const Dashboard = () => {
  const { currentUser } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  // 🔍 --- BARE-METAL FETCH DEBUGGING VERSION ---
  useEffect(() => {
    const fetchJobs = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      console.log("Starting bare-metal fetch for user:", currentUser.email);

      try {
        // 1. Get Firebase token
        const token = await currentUser.getIdToken();
        console.log("Got token, starting fetch...");

        // 2. Perform direct fetch
        const response = await fetch('https://ai-interviewer-theta-ivory.vercel.app/api/jobs/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log("Fetch response received. Status:", response.status);

        // 3. Handle non-OK responses
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Server responded with status ${response.status}`);
        }

        // 4. Parse response and update state
        const data = await response.json();
        console.log("Success! Data received:", data);
        setJobs(data);

        if (data.length > 0) {
          setSelectedJobId(data[0].id);
        } else {
          setError("No jobs available.");
        }

      } catch (err) {
        console.error("Fetch failed:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [currentUser]);
  // 🔍 --- END DEBUGGING useEffect ---

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

  if (!currentUser) {
    return (
      <Layout>
        <div className="text-center text-gray-300 mt-10">
          Please log in to access the dashboard.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Start Your Mock Interview</h1>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-200 bg-red-800 rounded-lg text-center">
            {error}
          </div>
        )}

        <form
          onSubmit={handleStartInterview}
          className="p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg"
        >
          {/* Job Selection */}
          <div>
            <label
              htmlFor="job"
              className="block text-sm font-medium text-gray-300"
            >
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
            <label
              htmlFor="resume"
              className="block text-sm font-medium text-gray-300"
            >
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
