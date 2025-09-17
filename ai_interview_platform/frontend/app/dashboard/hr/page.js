// File: frontend/app/dashboard/hr/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from "../../../components/ProtectedRoute";
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

export default function HRDashboard() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [candidateData, setCandidateData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);

  // ... (All of your data-fetching and handling functions remain exactly the same)
  const fetchCandidates = useCallback(async () => { if (!user) return; setIsLoadingCandidates(true); try { const token = await user.getIdToken(true); const response = await axios.get('http://localhost:8000/hr/get-candidates', { headers: { 'Authorization': `Bearer ${token}` } }); setCandidates(response.data); } catch (err) { console.error(err); setError("Could not load candidate list."); } finally { setIsLoadingCandidates(false); } }, [user]);
  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);
  const handleFileChange = (event) => { const selectedFiles = Array.from(event.target.files); setFiles(selectedFiles); setCandidateData(selectedFiles.map(() => ({ name: '', email: '' }))); };
  const handleCandidateDataChange = (index, field, value) => { const updatedData = [...candidateData]; updatedData[index][field] = value; setCandidateData(updatedData); };
  const handleSubmit = async (event) => { event.preventDefault(); if (files.length === 0 || !user) return; setIsLoading(true); setMessage(''); setError(''); try { const token = await user.getIdToken(true); const formData = new FormData(); formData.append('token', token); formData.append('candidate_data_json', JSON.stringify(candidateData)); files.forEach(file => formData.append('files', file)); const response = await axios.post('http://localhost:8000/hr/upload-resumes', formData); setMessage(response.data.message); setFiles([]); setCandidateData([]); document.getElementById('resume-uploader').value = ''; fetchCandidates(); } catch (err) { setError("Upload failed."); } finally { setIsLoading(false); } };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">HR / Recruiter Dashboard</h1>
          
          {/* Candidate List Card */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800">Your Candidates</h2>
            <div className="mt-4">
              {isLoadingCandidates ? (<p>Loading candidates...</p>) : candidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {candidates.map(candidate => (
                        <tr key={candidate.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <Link href={`/dashboard/hr/candidate/${candidate.id}`} className="text-blue-600 hover:text-blue-800">
                              {candidate.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(candidate.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : ( <p className="text-gray-500">You have not added any candidates yet.</p> )}
            </div>
          </div>

          {/* Upload Form Card */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <form onSubmit={handleSubmit} className="space-y-6">
               <h2 className="text-xl font-semibold text-gray-800">Upload New Resumes</h2>
               <div>
                <label htmlFor="resume-uploader" className="block text-sm font-medium text-gray-700">Select Resumes (PDF)</label>
                <div className="mt-1"><input type="file" id="resume-uploader" multiple accept=".pdf" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/></div>
              </div>
              
              {files.length > 0 && (<div className="space-y-4">{files.map((file, index) => ( <div key={index} className="border border-gray-200 p-4 rounded-md"><p className="text-sm font-medium text-gray-700">File: {file.name}</p><div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4"><input type="text" placeholder="Candidate Name" required value={candidateData[index].name} onChange={(e) => handleCandidateDataChange(index, 'name', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"/><input type="email" placeholder="Candidate Email (Optional)" value={candidateData[index].email} onChange={(e) => handleCandidateDataChange(index, 'email', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"/></div></div>))}</div>)}
              
              {files.length > 0 && (<div className="text-right"><button type="submit" disabled={isLoading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">{isLoading ? 'Uploading...' : `Upload ${files.length} Resumes`}</button></div>)}
            </form>
          </div>
          
          {message && <p className="mt-4 text-center text-green-600">{message}</p>}
          {error && <p className="mt-4 text-center text-red-600">{error}</p>}
        </div>
      </main>
    </ProtectedRoute>
  );
}