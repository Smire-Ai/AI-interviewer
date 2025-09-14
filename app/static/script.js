// AI Interviewer Frontend JavaScript

let currentInterview = null;
let currentQuestions = [];

// API Base URL
const API_BASE = '';

// Utility functions
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

function getScoreClass(score) {
    if (score >= 8.5) return 'score-a';
    if (score >= 7.0) return 'score-b';
    if (score >= 6.0) return 'score-c';
    if (score >= 5.0) return 'score-d';
    return 'score-f';
}

function getMatchClass(score) {
    if (score >= 70) return 'match-high';
    if (score >= 50) return 'match-medium';
    return 'match-low';
}

// Resume functions
async function uploadResume(formData) {
    try {
        const response = await fetch('/api/resume/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
}

async function loadResumes() {
    try {
        const response = await fetch('/api/resume/list');
        const resumes = await response.json();
        
        const resumeList = document.getElementById('resume-list');
        const selectResume = document.getElementById('select-resume');
        
        // Clear existing options
        selectResume.innerHTML = '<option value="">Choose a resume...</option>';
        
        if (resumes.length === 0) {
            resumeList.innerHTML = '<p class="text-muted">No resumes uploaded yet.</p>';
            return;
        }
        
        resumeList.innerHTML = resumes.map(resume => `
            <div class="resume-item" data-id="${resume.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${resume.filename}</h6>
                        <small class="text-muted">Uploaded: ${formatDate(resume.created_at)}</small>
                        <div class="skills-list">
                            ${resume.skills.slice(0, 5).map(skill => 
                                `<span class="skill-tag">${skill}</span>`
                            ).join('')}
                            ${resume.skills.length > 5 ? `<span class="skill-tag">+${resume.skills.length - 5} more</span>` : ''}
                        </div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteResume(${resume.id})">Delete</button>
                </div>
            </div>
        `).join('');
        
        // Populate select dropdown
        resumes.forEach(resume => {
            const option = document.createElement('option');
            option.value = resume.id;
            option.textContent = resume.filename;
            selectResume.appendChild(option);
        });
        
    } catch (error) {
        showAlert('Error loading resumes: ' + error.message, 'danger');
    }
}

async function deleteResume(resumeId) {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    
    try {
        const response = await fetch(`/api/resume/${resumeId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Resume deleted successfully', 'success');
            loadResumes();
        } else {
            throw new Error('Failed to delete resume');
        }
    } catch (error) {
        showAlert('Error deleting resume: ' + error.message, 'danger');
    }
}

// Job Description functions
async function createJobDescription(jobData) {
    try {
        const formData = new FormData();
        formData.append('title', jobData.title);
        formData.append('content', jobData.content);
        formData.append('required_skills', jobData.required_skills);
        formData.append('experience_level', jobData.experience_level);
        
        const response = await fetch('/api/resume/job-description', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
}

async function loadJobDescriptions() {
    try {
        const response = await fetch('/api/resume/job-description/list');
        const jobs = await response.json();
        
        const jobList = document.getElementById('job-list');
        const selectJob = document.getElementById('select-job');
        
        // Clear existing options
        selectJob.innerHTML = '<option value="">Choose a job description...</option>';
        
        if (jobs.length === 0) {
            jobList.innerHTML = '<p class="text-muted">No job descriptions created yet.</p>';
            return;
        }
        
        jobList.innerHTML = jobs.map(job => `
            <div class="job-item" data-id="${job.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${job.title}</h6>
                        <small class="text-muted">${job.experience_level} • Created: ${formatDate(job.created_at)}</small>
                        <div class="skills-list">
                            ${job.required_skills.slice(0, 5).map(skill => 
                                `<span class="skill-tag">${skill}</span>`
                            ).join('')}
                            ${job.required_skills.length > 5 ? `<span class="skill-tag">+${job.required_skills.length - 5} more</span>` : ''}
                        </div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteJob(${job.id})">Delete</button>
                </div>
            </div>
        `).join('');
        
        // Populate select dropdown
        jobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = `${job.title} (${job.experience_level})`;
            selectJob.appendChild(option);
        });
        
    } catch (error) {
        showAlert('Error loading job descriptions: ' + error.message, 'danger');
    }
}

async function deleteJob(jobId) {
    // Note: We need to add a delete endpoint for job descriptions
    showAlert('Delete job description functionality not implemented yet', 'warning');
}

// Interview functions
async function startInterview(interviewData) {
    try {
        const response = await fetch('/api/interview/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(interviewData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
}

async function submitAnswer(questionId, answer) {
    try {
        const response = await fetch('/api/interview/answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question_id: questionId,
                answer: answer
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
}

async function completeInterview(interviewId) {
    try {
        const response = await fetch(`/api/interview/${interviewId}/complete`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
}

async function loadInterviewHistory() {
    try {
        const response = await fetch('/api/interview/list');
        const interviews = await response.json();
        
        const historyDiv = document.getElementById('interview-history');
        
        if (interviews.length === 0) {
            historyDiv.innerHTML = '<p class="text-muted">No interviews conducted yet.</p>';
            return;
        }
        
        historyDiv.innerHTML = interviews.map(interview => `
            <div class="interview-item" onclick="viewInterview(${interview.id})">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${interview.resume_filename}</h6>
                        <small class="text-muted">${interview.job_title}</small>
                        <div class="mt-1">
                            <span class="badge bg-${interview.status === 'completed' ? 'success' : 'warning'}">${interview.status}</span>
                            ${interview.score > 0 ? `<span class="badge ${getScoreClass(interview.score)}">${interview.score}/10</span>` : ''}
                        </div>
                    </div>
                    <small class="text-muted">${formatDate(interview.created_at)}</small>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        showAlert('Error loading interview history: ' + error.message, 'danger');
    }
}

async function viewInterview(interviewId) {
    try {
        const response = await fetch(`/api/interview/${interviewId}`);
        const interview = await response.json();
        
        const resultsDiv = document.getElementById('interview-results');
        
        resultsDiv.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5>Interview Results - ${interview.resume.filename}</h5>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <h6>Job Position</h6>
                            <p>${interview.job_description.title}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Overall Score</h6>
                            <span class="badge ${getScoreClass(interview.overall_score)} score-badge">${interview.overall_score}/10</span>
                        </div>
                    </div>
                    
                    ${interview.feedback ? `
                        <div class="mb-3">
                            <h6>Feedback</h6>
                            <div class="alert alert-info">
                                <strong>Grade:</strong> ${interview.feedback.grade}<br>
                                <strong>Resume Match:</strong> ${interview.feedback.resume_match}%<br>
                                <strong>Interview Performance:</strong> ${interview.feedback.interview_performance}/10<br>
                                <p class="mt-2">${interview.feedback.feedback}</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    <h6>Questions and Answers</h6>
                    <div class="questions-review">
                        ${interview.questions_and_answers.map((qa, index) => `
                            <div class="question-card">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h6>Question ${index + 1}</h6>
                                    <span class="badge bg-secondary">${qa.type}</span>
                                </div>
                                <p><strong>Q:</strong> ${qa.question}</p>
                                <p><strong>A:</strong> ${qa.answer || '<em>No answer provided</em>'}</p>
                                ${qa.score > 0 ? `<div class="text-end"><span class="badge bg-primary">${qa.score}/10</span></div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Scroll to results
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        showAlert('Error loading interview details: ' + error.message, 'danger');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadResumes();
    loadJobDescriptions();
    loadInterviewHistory();
    
    // Resume upload form
    document.getElementById('resume-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('resume-file');
        const file = fileInput.files[0];
        
        if (!file) {
            showAlert('Please select a file', 'warning');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const result = await uploadResume(formData);
            showAlert('Resume uploaded successfully!', 'success');
            document.getElementById('resume-form').reset();
            loadResumes();
            
        } catch (error) {
            showAlert('Error uploading resume: ' + error.message, 'danger');
        }
    });
    
    // Job description form
    document.getElementById('job-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const jobData = {
            title: document.getElementById('job-title').value,
            content: document.getElementById('job-content').value,
            required_skills: document.getElementById('required-skills').value,
            experience_level: document.getElementById('experience-level').value
        };
        
        try {
            const result = await createJobDescription(jobData);
            showAlert('Job description created successfully!', 'success');
            document.getElementById('job-form').reset();
            loadJobDescriptions();
            
        } catch (error) {
            showAlert('Error creating job description: ' + error.message, 'danger');
        }
    });
    
    // Interview start form
    document.getElementById('interview-start-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const resumeId = document.getElementById('select-resume').value;
        const jobId = document.getElementById('select-job').value;
        const numQuestions = document.getElementById('num-questions').value;
        
        if (!resumeId || !jobId) {
            showAlert('Please select both resume and job description', 'warning');
            return;
        }
        
        try {
            const result = await startInterview({
                resume_id: parseInt(resumeId),
                jd_id: parseInt(jobId),
                num_questions: parseInt(numQuestions)
            });
            
            currentInterview = result.interview_id;
            currentQuestions = result.questions;
            
            showAlert(`Interview started! Resume-Job match: ${result.match_score}%`, 'success');
            
            // Show questions
            displayQuestions(result.questions);
            
        } catch (error) {
            showAlert('Error starting interview: ' + error.message, 'danger');
        }
    });
    
    // Complete interview button
    document.getElementById('complete-interview').addEventListener('click', async function() {
        if (!currentInterview) {
            showAlert('No active interview', 'warning');
            return;
        }
        
        try {
            const result = await completeInterview(currentInterview);
            showAlert(`Interview completed! Score: ${result.overall_score}/10 (${result.grade})`, 'success');
            
            // Hide questions and show results
            document.getElementById('interview-questions').style.display = 'none';
            loadInterviewHistory();
            
            // Reset current interview
            currentInterview = null;
            currentQuestions = [];
            
        } catch (error) {
            showAlert('Error completing interview: ' + error.message, 'danger');
        }
    });
});

function displayQuestions(questions) {
    const container = document.getElementById('questions-container');
    const questionsDiv = document.getElementById('interview-questions');
    
    container.innerHTML = questions.map((q, index) => `
        <div class="question-card" id="question-${q.id}">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6>Question ${index + 1}</h6>
                <span class="badge bg-info">${q.type}</span>
            </div>
            <p class="mb-3">${q.question}</p>
            <textarea class="form-control mb-2" id="answer-${q.id}" placeholder="Your answer..." rows="4"></textarea>
            <button class="btn btn-primary btn-sm" onclick="submitQuestionAnswer(${q.id})">Submit Answer</button>
            <div id="feedback-${q.id}" class="mt-2"></div>
        </div>
    `).join('');
    
    questionsDiv.style.display = 'block';
    questionsDiv.scrollIntoView({ behavior: 'smooth' });
}

async function submitQuestionAnswer(questionId) {
    const answerTextarea = document.getElementById(`answer-${questionId}`);
    const answer = answerTextarea.value.trim();
    
    if (!answer) {
        showAlert('Please provide an answer', 'warning');
        return;
    }
    
    try {
        const result = await submitAnswer(questionId, answer);
        
        // Update UI
        const questionCard = document.getElementById(`question-${questionId}`);
        questionCard.classList.add('answered');
        
        const feedbackDiv = document.getElementById(`feedback-${questionId}`);
        feedbackDiv.innerHTML = `
            <div class="alert alert-success">
                <strong>Score: ${result.evaluation.score}/10</strong><br>
                ${result.evaluation.feedback}
            </div>
        `;
        
        // Disable the textarea and button
        answerTextarea.disabled = true;
        questionCard.querySelector('button').disabled = true;
        
        showAlert('Answer submitted successfully!', 'success');
        
    } catch (error) {
        showAlert('Error submitting answer: ' + error.message, 'danger');
    }
}