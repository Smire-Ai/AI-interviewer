// File: frontend/app/page.js
'use client';

import Link from 'next/link';

export default function LandingPage() {
  const containerStyle = {
    padding: '4rem 2rem',
    fontFamily: 'sans-serif',
    textAlign: 'center',
    maxWidth: '800px',
    margin: 'auto',
  };

  const buttonStyle = {
    display: 'inline-block',
    marginTop: '2rem',
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    textDecoration: 'none',
  };

  return (
    <main style={containerStyle}>
      <h1>Welcome to the Future of Interviewing</h1>
      <p style={{ fontSize: '1.2rem', color: '#555', marginTop: '1rem' }}>
        Utilize cutting-edge AI to analyze resumes, conduct mock interviews, and find the perfect candidate—or land your dream job.
      </p>
      <Link href="/dashboard" style={buttonStyle}>
        Get Started
      </Link>
    </main>
  );
}