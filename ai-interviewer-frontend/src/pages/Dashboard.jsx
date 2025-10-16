// src/pages/Dashboard.jsx
import React from 'react';
// --- FIX THIS LINE ---
import Layout from '../components/Layout'; // Changed from '../components/layout/Layout'

const Dashboard = () => {
  return (
    <Layout>
      <div className="text-center">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="mt-4 text-xl text-gray-300">
          If you can see this page, the routing is working.
        </p>
      </div>
    </Layout>
  );
};

export default Dashboard;