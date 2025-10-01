// Candidate dashboard logic
const API_URL = 'http://127.0.0.1:8000'; // IMPORTANT: Change this
const token = localStorage.getItem('accessToken');

const availableJobsDiv = document.getElementById('available-jobs');
const myApplicationsDiv = document.getElementById('my-applications');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    loadAvailableJobs();
    loadMyApplications();
});

async function loadAvailableJobs() {
    try {
        const response = await fetch(`${API_URL}/candidate/jobs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load jobs.');
        const jobs = await response.json();

        if(jobs.length === 0){
            availableJobsDiv.innerHTML = "<p>No jobs available right now.</p>";
            return;
        }

        let html = '';
        jobs.forEach(job => {
            html += `
                <div class="job-item">
                    <h3>${job.title}</h3>
                    <p>${job.description}</p>
                    <form onsubmit="applyForJob(event, '${job.id}')">
                        <label for="resume-${job.id}">Upload Resume (PDF):</label>
                        <input type="file" id="resume-${job.id}" name="resume" accept=".pdf" required>
                        <button type="submit">Apply</button>
                    </form>
                </div>
            `;
        });
        availableJobsDiv.innerHTML = html;
    } catch (error) {
        availableJobsDiv.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

async function applyForJob(event, jobId) {
    event.preventDefault();
    const resumeInput = document.getElementById(`resume-${jobId}`);
    const resumeFile = resumeInput.files[0];

    if (!resumeFile) {
        alert('Please select a resume file.');
        return;
    }

    const formData = new FormData();
    formData.append('job_id', jobId);
    formData.append('resume', resumeFile);

    try {
        const response = await fetch(`${API_URL}/candidate/applications`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.detail || 'Application failed.');
        }

        alert('Application submitted successfully!');
        loadMyApplications(); // Refresh my applications list
    } catch (error) {
        alert(error.message);
    }
}


async function loadMyApplications() {
    try {
        const response = await fetch(`${API_URL}/candidate/my-applications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load your applications.');
        const applications = await response.json();
        
        if (applications.length === 0) {
            myApplicationsDiv.innerHTML = '<p>You have not applied to any jobs yet.</p>';
            return;
        }

        let html = '';
        applications.forEach(app => {
            html += `
                <div class="application-item">
                    <h3>${app.job.title}</h3>
                    <p><strong>Status:</strong> ${app.status}</p>
                    ${app.status === 'accepted' ? 
                    `<button onclick="startInterview('${app.id}')">Start Interview</button>` : ''
                    }
                </div>
            `;
        });
        myApplicationsDiv.innerHTML = html;
    } catch (error) {
        myApplicationsDiv.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

function startInterview(applicationId) {
    window.location.href = `interview.html?appId=${applicationId}`;
}