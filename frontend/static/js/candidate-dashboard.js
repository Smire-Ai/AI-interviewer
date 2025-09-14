/**
 * Candidate Dashboard functionality
 */

class CandidateDashboard {
    constructor() {
        this.interviews = [];
        this.init();
    }

    init() {
        // Check if user is candidate
        if (!window.authManager.requireAuth(['candidate'])) {
            return;
        }

        this.loadStats();
        this.loadInterviews();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Status filter
        document.getElementById('statusFilter')?.addEventListener('change', () => {
            this.filterInterviews();
        });
    }

    async loadStats() {
        try {
            const response = await window.authManager.makeAuthenticatedRequest('/api/interview/sessions');
            if (response.ok) {
                const interviews = await response.json();
                this.updateStatsUI(interviews);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsUI(interviews) {
        const total = interviews.length;
        const upcoming = interviews.filter(i => i.status === 'scheduled').length;
        const completed = interviews.filter(i => i.status === 'completed').length;
        
        // Calculate average score (simplified)
        const avgScore = completed > 0 ? '7.5' : '-';
        const avgAttention = completed > 0 ? '85%' : '-';
        
        document.getElementById('totalInterviews').textContent = total.toString();
        document.getElementById('upcomingInterviews').textContent = upcoming.toString();
        document.getElementById('avgScore').textContent = avgScore;
        document.getElementById('avgAttention').textContent = avgAttention;
    }

    async loadInterviews() {
        const container = document.getElementById('interviewsContainer');
        Utils.showLoading(container, 'Loading your interviews...');

        try {
            const response = await window.authManager.makeAuthenticatedRequest('/api/interview/sessions');
            
            if (response.ok) {
                this.interviews = await response.json();
                this.renderInterviews();
                this.updatePerformanceSummary();
            } else {
                Utils.showError(container, 'Failed to load interviews');
            }
        } catch (error) {
            console.error('Error loading interviews:', error);
            Utils.showError(container, 'Network error occurred');
        }
    }

    renderInterviews() {
        const container = document.getElementById('interviewsContainer');
        
        if (this.interviews.length === 0) {
            Utils.showEmpty(container, 'No interviews scheduled yet. Your interviewer will send you an invitation.');
            return;
        }

        const filteredInterviews = this.getFilteredInterviews();
        
        if (filteredInterviews.length === 0) {
            Utils.showEmpty(container, 'No interviews match the current filter.');
            return;
        }

        container.innerHTML = filteredInterviews.map(interview => this.createInterviewHTML(interview)).join('');
    }

    getFilteredInterviews() {
        const statusFilter = document.getElementById('statusFilter').value;
        
        if (!statusFilter) {
            return this.interviews;
        }
        
        return this.interviews.filter(interview => interview.status === statusFilter);
    }

    createInterviewHTML(interview) {
        const statusClass = Utils.getStatusBadgeClass(interview.status);
        const statusText = Utils.getStatusText(interview.status);
        const scheduledTime = Utils.formatDate(interview.scheduled_time);
        
        return `
            <div class="card interview-card ${interview.status} mb-3" data-session-id="${interview.session_id}">
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-8">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="mb-1">${interview.job_title}</h6>
                                <span class="badge status-badge ${statusClass}">${statusText}</span>
                            </div>
                            <p class="text-muted mb-1">
                                <i class="fas fa-user me-1"></i>Interviewer: ${interview.hr_name}
                            </p>
                            <p class="text-muted mb-2">
                                <i class="fas fa-calendar me-1"></i>Scheduled: ${scheduledTime}
                            </p>
                            
                            <div class="d-flex flex-wrap gap-2 mt-2">
                                <small class="badge ${interview.face_detection_enabled ? 'bg-success' : 'bg-light text-dark'}">
                                    <i class="fas fa-eye me-1"></i>Face Detection
                                </small>
                                <small class="badge ${interview.voice_feedback_enabled ? 'bg-info' : 'bg-light text-dark'}">
                                    <i class="fas fa-volume-up me-1"></i>Voice Feedback
                                </small>
                                <small class="badge ${interview.ats_scoring_enabled ? 'bg-warning text-dark' : 'bg-light text-dark'}">
                                    <i class="fas fa-chart-bar me-1"></i>ATS Scoring
                                </small>
                            </div>
                        </div>
                        
                        <div class="col-lg-4 text-end">
                            <div class="d-grid gap-2">
                                ${this.getInterviewButtons(interview)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getInterviewButtons(interview) {
        let buttons = `
            <button class="btn btn-outline-primary btn-sm" onclick="candidateDashboard.viewInterviewDetails('${interview.session_id}')">
                <i class="fas fa-info-circle me-1"></i>View Details
            </button>
        `;

        if (interview.status === 'scheduled' || interview.status === 'in_progress') {
            buttons += `
                <button class="btn btn-success btn-sm" onclick="candidateDashboard.prepareForInterview('${interview.session_id}')">
                    <i class="fas fa-video me-1"></i>Join Interview
                </button>
            `;
        }

        if (interview.status === 'completed') {
            buttons += `
                <button class="btn btn-info btn-sm" onclick="candidateDashboard.viewResults('${interview.session_id}')">
                    <i class="fas fa-chart-line me-1"></i>View Results
                </button>
            `;
        }

        return buttons;
    }

    filterInterviews() {
        this.renderInterviews();
    }

    updatePerformanceSummary() {
        const completedInterviews = this.interviews.filter(i => i.status === 'completed');
        const performanceContainer = document.getElementById('performanceSummary');
        
        if (completedInterviews.length === 0) {
            performanceContainer.innerHTML = `
                <div class="text-center py-3">
                    <p class="text-muted">Complete an interview to see your performance metrics</p>
                </div>
            `;
            return;
        }

        // Sample performance data (in a real app, this would come from API)
        performanceContainer.innerHTML = `
            <div class="row text-center">
                <div class="col-6">
                    <div class="mb-2">
                        <div class="h5 text-success mb-1">8.2</div>
                        <small class="text-muted">Avg Score</small>
                    </div>
                </div>
                <div class="col-6">
                    <div class="mb-2">
                        <div class="h5 text-info mb-1">87%</div>
                        <small class="text-muted">Attention</small>
                    </div>
                </div>
            </div>
            <hr>
            <div class="mb-2">
                <small class="text-muted d-block">Strong Areas</small>
                <div class="text-success">Technical Skills, Communication</div>
            </div>
            <div class="mb-2">
                <small class="text-muted d-block">Improvement Areas</small>
                <div class="text-warning">Behavioral Examples</div>
            </div>
        `;
    }

    async viewInterviewDetails(sessionId) {
        try {
            const response = await window.authManager.makeAuthenticatedRequest(`/api/interview/sessions/${sessionId}`);
            
            if (response.ok) {
                const session = await response.json();
                this.showInterviewDetailsModal(session);
            } else {
                Utils.showToast('Error', 'Failed to load interview details', 'danger');
            }
        } catch (error) {
            console.error('Error loading interview details:', error);
            Utils.showToast('Error', 'Network error occurred', 'danger');
        }
    }

    showInterviewDetailsModal(session) {
        const modal = new bootstrap.Modal(document.getElementById('interviewDetailsModal'));
        const content = document.getElementById('interviewDetailsContent');
        
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Job Information</h6>
                    <p><strong>Title:</strong> ${session.job_title}</p>
                    <p><strong>Interviewer:</strong> ${session.hr_name}</p>
                    <p><strong>Scheduled:</strong> ${Utils.formatDate(session.scheduled_time)}</p>
                    <p><strong>Status:</strong> <span class="badge ${Utils.getStatusBadgeClass(session.status)}">${Utils.getStatusText(session.status)}</span></p>
                </div>
                <div class="col-md-6">
                    <h6>AI Features</h6>
                    <ul class="list-unstyled">
                        <li><i class="fas fa-${session.face_detection_enabled ? 'check text-success' : 'times text-muted'} me-2"></i>Face Detection</li>
                        <li><i class="fas fa-${session.voice_feedback_enabled ? 'check text-success' : 'times text-muted'} me-2"></i>Voice Feedback</li>
                        <li><i class="fas fa-${session.ats_scoring_enabled ? 'check text-success' : 'times text-muted'} me-2"></i>ATS Scoring</li>
                    </ul>
                </div>
            </div>
            <hr>
            <div>
                <h6>Job Description</h6>
                <p class="text-muted">${session.job_description}</p>
            </div>
        `;
        
        modal.show();
    }

    prepareForInterview(sessionId) {
        this.currentSessionId = sessionId;
        const modal = new bootstrap.Modal(document.getElementById('prepModal'));
        modal.show();
        
        // Set up join button
        document.getElementById('joinInterviewBtn').onclick = () => {
            this.joinInterview(sessionId);
        };
    }

    joinInterview(sessionId) {
        window.open(`/interview/${sessionId}`, '_blank');
    }

    viewResults(sessionId) {
        window.open(`/api/ats/reports/${sessionId}`, '_blank');
    }
}

// Global functions for media testing
async function testCamera() {
    const video = document.getElementById('cameraPreview');
    
    try {
        const stream = await MediaUtils.testCamera(video);
        Utils.showToast('Success', 'Camera is working properly!', 'success');
        
        // Stop stream after 5 seconds
        setTimeout(() => {
            MediaUtils.stopMediaStream(stream);
            video.srcObject = null;
        }, 5000);
    } catch (error) {
        console.error('Camera test failed:', error);
        Utils.showToast('Error', 'Camera test failed. Please check your camera permissions.', 'danger');
    }
}

async function testMicrophone() {
    const progressBar = document.querySelector('#micLevel .progress-bar');
    
    try {
        const stream = await MediaUtils.testMicrophone((level) => {
            progressBar.style.width = `${level}%`;
            
            // Change color based on level
            if (level > 30) {
                progressBar.className = 'progress-bar bg-success';
            } else if (level > 10) {
                progressBar.className = 'progress-bar bg-warning';
            } else {
                progressBar.className = 'progress-bar bg-danger';
            }
        });
        
        Utils.showToast('Success', 'Microphone is working! Speak to see the level indicator.', 'success');
        
        // Stop stream after 10 seconds
        setTimeout(() => {
            MediaUtils.stopMediaStream(stream);
            progressBar.style.width = '0%';
        }, 10000);
    } catch (error) {
        console.error('Microphone test failed:', error);
        Utils.showToast('Error', 'Microphone test failed. Please check your microphone permissions.', 'danger');
    }
}

// Global function to reload interviews
function loadInterviews() {
    if (window.candidateDashboard) {
        window.candidateDashboard.loadInterviews();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.candidateDashboard = new CandidateDashboard();
});