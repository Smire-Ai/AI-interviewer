import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/axiosConfig';

const AdminDashboard = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/jobs/');
      setJobs(response.data);
    } catch (err) {
      setError('Failed to load job descriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      setError('Title and Description are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    
    try {
      await apiClient.post('/jobs/create/', { title, description });
      setTitle('');
      setDescription('');
      fetchJobs();
    } catch (err) {
      setError('Failed to create job. You may not have permission.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Create New Interview Template</h2>
          <form onSubmit={handleSubmit} className="p-6 bg-gray-800 rounded-lg space-y-4">
            {error && <p className="text-red-400">{error}</p>}
            <div>
              <label htmlFor="title" className="block text-sm font-medium">Title</label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium">Job Description / Prompt Details</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="5"
                className="w-full mt-1 p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 px-4 bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {submitting ? 'Creating...' : 'Create Template'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Existing Templates</h2>
          <div className="p-6 bg-gray-800 rounded-lg max-h-[60vh] overflow-y-auto">
            {loading ? <p>Loading...</p> : (
              <ul className="space-y-4">
                {jobs.length > 0 ? jobs.map(job => (
                  <li key={job.id} className="p-4 bg-gray-700 rounded-md">
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-sm text-gray-400 mt-1 truncate">{job.description}</p>
                  </li>
                )) : <p>No templates found.</p>}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
