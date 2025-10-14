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

  // 🔍 --- AGGRESSIVE DEBUGGING VERSION OF useEffect ---
  useEffect(() => {
    const fetchJobs = async () => {
      // Don't proceed if there's no user.
      if (!currentUser) {
        setLoading(false);
        setError("Waiting for user authentication...");
        return;
      }

      setLoading(true);
      setError('');
      console.log("Attempting to fetch jobs for user:", currentUser.email);

      try {
        // --- MANUAL TOKEN HANDLING FOR DEBUGGING ---
        // 1. Manually get the ID token.
        const token = await currentUser.getIdToken(true); // 'true' forces a refresh

        // 2. Log the token to prove we have it.
        // Check your browser console. You should see "Bearer eyJ..."
        console.log("Authorization Header being sent:", `Bearer ${token.substring(0, 30)}...`);

        // 3. Manually make the API call with the token in the header.
        const response = await apiClient.get('/jobs/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // --- END OF MANUAL TOKEN HANDLING ---

        console.log("Successfully received jobs:", response.data);
        setJobs(response.data);
        if (response.data.length > 0) {
          setSelectedJobId(response.data[0].id);
        } else {
          setError("No job descriptions have been created in the admin panel yet.");
        }
      } catch (err) {
        console.error("--- AXIOS ERROR ---");
        if (err.response) {
          // The request was made and the server responded with a status code
          console.error("Status:", err.response.status);
          console.error("Data:", err.response.data);
          setError(`Error ${err.response.status}: ${err.response.data.detail || 'Server error'}`);
        } else if (err.request) {
          // The request was made but no response was received
          console.error("Request failed, no response received:", err.request);
          setError("Network Error: Could not connect to the server. Is it running?");
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Error setting up request:', err.message);
          setError(`An unexpected error occurred: ${err.message}`);
        }
        console.error("--- END AXIOS ERROR ---");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();

  }, [currentUser]); // Dependency array remains the same
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
