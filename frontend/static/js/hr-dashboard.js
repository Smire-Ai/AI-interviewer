/**
 * HR Dashboard functionality
 */

class HRDashboard {
    constructor() {
        this.sessions = [];
        this.init();
    }

    init() {
        // Check if user is HR
        if (!window.authManager.requireAuth(['hr'])) {
            return;
        }

        this.loadStats();
        this.loadSessions();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Status filter
        document.getElementById('statusFilter')?.addEventListener('change', () => {
            this.filterSessions();
        });
    }

    async loadStats() {
        try {
            const response = await window.authManager.makeAuthenticatedRequest('/api/admin/stats');
            if (response.ok) {
                const stats = await response.json();
                this.updateStatsUI(stats);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsUI(stats) {
        document.getElementById('totalInterviews').textContent = stats.total_sessions || '0';
        document.getElementById('completedInterviews').textContent = stats.completed_sessions || '0';
        document.getElementById('activeInterviews').textContent = stats.active_sessions || '0';
        document.getElementById('avgScore').textContent = stats.average_session_duration ? 
            Math.round(stats.average_session_duration) + 'm' : '-';
    }

    async loadSessions() {
        const container = document.getElementById('sessionsContainer');
        Utils.showLoading(container, 'Loading interview sessions...');

        try {
            const response = await window.authManager.makeAuthenticatedRequest('/api/interview/sessions');
            
            if (response.ok) {
                this.sessions = await response.json();
                this.renderSessions();
            } else {
                Utils.showError(container, 'Failed to load sessions');
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            Utils.showError(container, 'Network error occurred');
        }
    }

    renderSessions() {
        const container = document.getElementById('sessionsContainer');
        
        if (this.sessions.length === 0) {
            Utils.showEmpty(container, 'No interview sessions found. Create your first interview session!');
            return;
        }

        const filteredSessions = this.getFilteredSessions();
        
        if (filteredSessions.length === 0) {
            Utils.showEmpty(container, 'No sessions match the current filter.');
            return;
        }

        container.innerHTML = filteredSessions.map(session => this.createSessionHTML(session)).join('');
        this.attachSessionEventListeners();
    }

    getFilteredSessions() {
        const statusFilter = document.getElementById('statusFilter').value;
        
        if (!statusFilter) {
            return this.sessions;
        }
        
        return this.sessions.filter(session => session.status === statusFilter);
    }

    createSessionHTML(session) {
        const statusClass = Utils.getStatusBadgeClass(session.status);
        const statusText = Utils.getStatusText(session.status);
        const scheduledTime = Utils.formatDate(session.scheduled_time);
        
        return `
            <div class="card session-card ${session.status} mb-3" data-session-id="${session.session_id}">
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-8">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="mb-1">${session.job_title}</h6>
                                <span class="badge ${statusClass}">${statusText}</span>
                            </div>
                            <p class="text-muted mb-2">
                                <i class="fas fa-user me-1"></i>Candidate: ${session.candidate_name || 'Not assigned'}
                            </p>
                            <p class="text-muted mb-2">
                                <i class="fas fa-calendar me-1"></i>Scheduled: ${scheduledTime}
                            </p>
                            <div class="d-flex gap-2 mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-eye ${session.face_detection_enabled ? 'text-success' : 'text-muted'}"></i> Face Detection
                                </small>
                                <small class="text-muted">
                                    <i class="fas fa-volume-up ${session.voice_feedback_enabled ? 'text-success' : 'text-muted'}"></i> Voice Feedback
                                </small>
                                <small class="text-muted">
                                    <i class="fas fa-chart-bar ${session.ats_scoring_enabled ? 'text-success' : 'text-muted'}"></i> ATS Scoring
                                </small>
                            </div>
                        </div>
                        <div class="col-lg-4 text-end">
                            <div class="btn-group-vertical">
                                ${this.getSessionButtons(session)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSessionButtons(session) {
        let buttons = `
            <button class="btn btn-outline-primary btn-sm" onclick="hrDashboard.viewSessionDetails('${session.session_id}')">
                <i class="fas fa-info-circle me-1"></i>Details
            </button>
        `;

        if (session.status === 'scheduled') {
            buttons += `
                <button class="btn btn-success btn-sm" onclick="hrDashboard.startSession('${session.session_id}')">
                    <i class="fas fa-play me-1"></i>Start
                </button>
            `;
        }

        if (session.status === 'in_progress') {
            buttons += `
                <button class="btn btn-primary btn-sm" onclick="hrDashboard.joinSession('${session.session_id}')">
                    <i class="fas fa-video me-1"></i>Join
                </button>
                <button class="btn btn-danger btn-sm" onclick="hrDashboard.endSession('${session.session_id}')">
                    <i class="fas fa-stop me-1"></i>End
                </button>
            `;
        }

        if (session.status === 'completed') {
            buttons += `
                <button class="btn btn-info btn-sm" onclick="hrDashboard.viewReport('${session.session_id}')">
                    <i class="fas fa-chart-line me-1"></i>Report
                </button>
            `;
        }

        return buttons;
    }

    attachSessionEventListeners() {
        // Event listeners are handled by onclick attributes in the HTML
        // This could be refactored to use event delegation for better performance
    }

    filterSessions() {
        this.renderSessions();
    }

    async viewSessionDetails(sessionId) {
        Utils.showToast('Info', 'Loading session details...', 'info');
        // Implement session details modal
    }

    async startSession(sessionId) {
        try {
            const response = await window.authManager.makeAuthenticatedRequest(
                `/api/interview/sessions/${sessionId}/start`,
                { method: 'POST' }
            );

            if (response.ok) {
                Utils.showToast('Success', 'Interview session started!', 'success');
                this.loadSessions(); // Refresh the list
            } else {
                const error = await response.json();
                Utils.showToast('Error', error.detail || 'Failed to start session', 'danger');
            }
        } catch (error) {
            console.error('Error starting session:', error);
            Utils.showToast('Error', 'Network error occurred', 'danger');
        }
    }

    async endSession(sessionId) {
        if (!confirm('Are you sure you want to end this interview session?')) {
            return;
        }

        try {
            const response = await window.authManager.makeAuthenticatedRequest(
                `/api/interview/sessions/${sessionId}/end`,
                { method: 'POST' }
            );

            if (response.ok) {
                Utils.showToast('Success', 'Interview session ended!', 'success');
                this.loadSessions(); // Refresh the list
            } else {
                const error = await response.json();
                Utils.showToast('Error', error.detail || 'Failed to end session', 'danger');
            }
        } catch (error) {
            console.error('Error ending session:', error);
            Utils.showToast('Error', 'Network error occurred', 'danger');
        }
    }

    joinSession(sessionId) {
        window.open(`/interview/${sessionId}`, '_blank');
    }

    viewReport(sessionId) {
        window.open(`/ats/reports/${sessionId}`, '_blank');
    }
}

// Global functions for creating sessions
async function createSession() {
    const form = document.getElementById('createSessionForm');
    const formData = new FormData(form);
    
    // Validate form
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    // Combine date and time
    const date = document.getElementById('scheduledDate').value;
    const time = document.getElementById('scheduledTime').value;
    const scheduledTime = new Date(`${date}T${time}`).toISOString();

    const sessionData = {
        candidate_email: document.getElementById('candidateEmail').value,
        job_title: document.getElementById('jobTitle').value,
        job_description: document.getElementById('jobDescription').value,
        scheduled_time: scheduledTime,
        face_detection_enabled: document.getElementById('faceDetectionEnabled').checked,
        voice_feedback_enabled: document.getElementById('voiceFeedbackEnabled').checked,
        ats_scoring_enabled: document.getElementById('atsScoringEnabled').checked
    };

    try {
        const response = await window.authManager.makeAuthenticatedRequest('/api/interview/sessions', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });

        if (response.ok) {
            const session = await response.json();
            Utils.showToast('Success', 'Interview session created successfully!', 'success');
            
            // Close modal and refresh sessions
            const modal = bootstrap.Modal.getInstance(document.getElementById('createSessionModal'));
            modal.hide();
            form.reset();
            
            if (window.hrDashboard) {
                window.hrDashboard.loadSessions();
            }
        } else {
            const error = await response.json();
            Utils.showToast('Error', error.detail || 'Failed to create session', 'danger');
        }
    } catch (error) {
        console.error('Error creating session:', error);
        Utils.showToast('Error', 'Network error occurred', 'danger');
    }
}

// Global function to reload sessions
function loadSessions() {
    if (window.hrDashboard) {
        window.hrDashboard.loadSessions();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.hrDashboard = new HRDashboard();
});