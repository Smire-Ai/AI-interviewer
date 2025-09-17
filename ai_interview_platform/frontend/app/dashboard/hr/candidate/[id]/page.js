'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import ProtectedRoute from '../../../../../components/ProtectedRoute';
import axios from 'axios';
import { useParams } from 'next/navigation';

export default function CandidateDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const candidateId = params.id;

  const [candidate, setCandidate] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobDescription, setJobDescription] = useState('Senior Software Engineer');

  const fetchCandidateDetails = useCallback(async () => {
    if (!user || !candidateId) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken(true);
      const response = await axios.get(`http://localhost:8000/hr/candidate/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidate(response.data.details);
      setResumes(response.data.resumes);
    } catch (err) {
      console.error(err);
      setError("Failed to load candidate details.");
    } finally {
      setIsLoading(false);
    }
  }, [user, candidateId]);

  useEffect(() => {
    fetchCandidateDetails();
  }, [fetchCandidateDetails]);

  const handleAnalyze = async (resumeId) => {
    if (!user) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError('');
    try {
      const token = await user.getIdToken(true);
      const response = await axios.post('http://localhost:8000/hr/analyze-resume',
        { resume_id: resumeId, job_description: jobDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalysisResult(response.data);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) return <p style={{ textAlign: 'center', paddingTop: '2rem' }}>Loading candidate details...</p>;
  if (error) return <p style={{ textAlign: 'center', paddingTop: '2rem', color: 'red' }}>{error}</p>;

  return (
    <ProtectedRoute>
      <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: 'auto' }}>
        {candidate && (
          <div>
            <h1>{candidate.name}</h1>
            <p style={{ color: '#666' }}>{candidate.email}</p>
          </div>
        )}

        <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '2rem' }}>
          <h2>Resumes</h2>
          {resumes.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {resumes.map(resume => (
                <li key={resume.id} style={{ border: '1px solid #eee', padding: '1rem', marginBottom: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{resume.original_filename}</strong>
                    <br />
                    <small style={{ color: '#888' }}>Uploaded on: {new Date(resume.created_at).toLocaleDateString()}</small>
                  </div>
                  <button onClick={() => handleAnalyze(resume.id)} disabled={isAnalyzing} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No resumes have been uploaded for this candidate.</p>
          )}
        </div>

        {isAnalyzing && <p>Running analysis, this may take a moment...</p>}
        {analysisResult && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '2rem' }}>
            <h2>Analysis Result</h2>
            <div>
              <label><strong>For Job Description:</strong></label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows="4"
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}
              />
            </div>
            <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
              <h3>ATS Score &amp; Details</h3>
              <pre style={{ background: '#f4f4f4', padding: '1rem', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {JSON.stringify(analysisResult.analysis_json, null, 2)}
              </pre>
              <h3>Skills Radar Chart</h3>
              <div dangerouslySetInnerHTML={{ __html: analysisResult.radar_chart_html }} />
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
