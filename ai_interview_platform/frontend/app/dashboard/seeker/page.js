// File: frontend/app/dashboard/seeker/page.js
'use client';

import { useState } from 'react';
import axios from 'axios';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function SeekerDashboard() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('A senior software engineer with 5+ years of experience in Python, Django, and cloud services.');
  const [githubUser, setGithubUser] = useState('');
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
      const response = await axios.post(
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/analyze-resume/`,
  formData
);

      setAnalysisResult(response.data);
    } catch (err) {
      setError('An error occurred during analysis. The AI model might be waking up. Please try again in 60 seconds.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Job Seeker Dashboard</h1>
          <p className="mt-1 text-gray-600">Check your resume's ATS score to improve your job application chances.</p>

          {/* Resume Analyzer Form Card */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-3">Resume Analyzer</h2>
              
              <div>
                <label htmlFor="resume-upload" className="block text-sm font-medium text-gray-700">
                  Upload Your Resume (PDF)
                </label>
                <div className="mt-1">
                  <input
                    id="resume-upload"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                    required
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="job-description" className="block text-sm font-medium text-gray-700">
                  Job Description
                </label>
                <textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  required
                  rows="5"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="github-user" className="block text-sm font-medium text-gray-700">
                  GitHub Username (Optional)
                </label>
                <input
                  id="github-user"
                  type="text"
                  value={githubUser}
                  onChange={(e) => setGithubUser(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., torvalds"
                />
              </div>

              <div className="text-right">
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                  {isLoading ? 'Analyzing...' : 'Analyze My Resume'}
                </button>
              </div>
            </form>
          </div>

          {/* --- DISPLAY RESULTS --- */}
          {error && <p className="mt-4 text-center text-red-600">{error}</p>}
          
          {analysisResult && (
            <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800">Analysis Complete</h2>
              <div className="mt-4 space-y-4">
                <h3 className="font-medium">ATS Score & Details</h3>
                <pre className="bg-gray-100 p-4 rounded-md text-sm whitespace-pre-wrap word-wrap-break-word">
                  {JSON.stringify(analysisResult.analysis_json, null, 2)}
                </pre>
                <h3 className="font-medium">Skills Radar Chart</h3>
                {/* This chart has its own internal styling, so we just wrap it */}
                <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: analysisResult.radar_chart_html }} />
              </div>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}