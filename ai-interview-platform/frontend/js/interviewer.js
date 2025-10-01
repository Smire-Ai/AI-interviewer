// Interviewer dashboard logic
const API_URL = 'http://127.0.0.1:8000'; // IMPORTANT: Change this to your Vercel backend URL after deployment
const token = localStorage.getItem('accessToken');

// --- DOM Elements ---
const createJobBtn = document.getElementById('create-job-btn');
const jobsListDiv = document.getElementById('jobs-list');

// --- Initializer ---
document.addEventListener('DOMContentLoaded', () => {
    // Auth guard: redirect to login if not authenticated
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    // Load the interviewer's jobs and applications when the page loads
    loadMyJobs();
});

// --- Event Listeners ---
createJobBtn.addEventListener('click', async () => {
    const titleInput = document.getElementById('job-title');
    const descriptionInput = document.getElementById('job-description');
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title || !description) {
        alert('Please fill out both the job title and description.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/interviewer/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, description })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create job posting.');
        }

        // Clear input fields and refresh the job list
        titleInput.value = '';
        descriptionInput.value = '';
        loadMyJobs();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});

// --- Core Functions ---

/**
 * Fetches and displays all jobs created by the current interviewer.
 */
async function loadMyJobs() {
    jobsListDiv.innerHTML = '<p>Loading your job postings...</p>';
    try {
        const response = await fetch(`${API_URL}/interviewer/jobs/my-postings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Could not fetch job postings.');

        const jobs = await response.json();

        if (jobs.length === 0) {
            jobsListDiv.innerHTML = '<p>You have not posted any jobs yet.</p>';
            return;
        }

        jobsListDiv.innerHTML = ''; // Clear the loading message
        for (const job of jobs) {
            const jobElement = document.createElement('div');
            jobElement.className = 'job-item';
            // Each job has a dedicated container for its applications
            jobElement.innerHTML = `
                <h3>${job.title}</h3>
                <p>${job.description}</p>
                <div class="applications-container" id="apps-for-${job.id}">
                    <p>Loading applications...</p>
                </div>
            `;
            jobsListDiv.appendChild(jobElement);
            // Asynchronously load applications for each job
            loadApplicationsForJob(job.id);
        }
    } catch (error) {
        jobsListDiv.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

/**
 * Fetches and displays applications for a specific job.
 * @param {string} jobId - The UUID of the job.
 */
async function loadApplicationsForJob(jobId) {
    const appsDiv = document.getElementById(`apps-for-${jobId}`);
    try {
        const response = await fetch(`${API_URL}/interviewer/applications/${jobId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load applications for this job.');

        const applications = await response.json();

        if (applications.length === 0) {
            appsDiv.innerHTML = '<h4>Applications</h4><p>No applications received yet.</p>';
            return;
        }

        let html = '<h4>Applications</h4>';
        applications.forEach(app => {
            // Safely parse the AI summary JSON string
            const aiSummary = app.ai_summary ? JSON.parse(app.ai_summary) : { summary: "Not available" };
            
            html += `
                <div class="application-item" data-job-id="${jobId}">
                    <p>
                        <strong>Candidate:</strong> ${app.candidate.full_name} (${app.candidate.email})<br>
                        <strong>Resume Score:</strong> ${app.match_score ? app.match_score.toFixed(0) : 'N/A'}%<br>
                        <strong>AI Summary:</strong> <em>${aiSummary.summary}</em><br>
                        <strong>Status:</strong> <span class="status">${app.status}</span>
                    </p>
                    ${app.status === 'pending' ?
                    `<div class="actions">
                        <button onclick="updateAppStatus('${app.id}', 'accepted')">Accept</button>
                        <button onclick="updateAppStatus('${app.id}', 'rejected')" class="reject-btn">Reject</button>
                    </div>` : ''
                    }
                </div>
            `;
        });
        appsDiv.innerHTML = html;

    } catch (error) {
        appsDiv.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

/**
 * Updates the status of an application (e.g., to 'accepted' or 'rejected').
 * @param {string} appId - The UUID of the application.
 * @param {string} status - The new status.
 */
async function updateAppStatus(appId, status) {
    // Find the button that was clicked to disable it during the request
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Updating...';

    try {
        const response = await fetch(`${API_URL}/interviewer/applications/${appId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('Failed to update application status.');
        
        // Find the application's parent job ID from the data attribute
        const jobElement = button.closest('.application-item');
        const jobId = jobElement.dataset.jobId;

        // Refresh only the application list for the relevant job
        loadApplicationsForJob(jobId);

    } catch (error) {
        alert(error.message);
        button.disabled = false; // Re-enable the button on failure
        button.textContent = status === 'accepted' ? 'Accept' : 'Reject';
    }
}