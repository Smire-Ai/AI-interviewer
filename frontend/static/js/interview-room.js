/**
 * Interview Room functionality with real-time AI features
 */

class InterviewRoom {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.websocket = null;
        this.localStream = null;
        this.remoteStream = null;
        this.currentUser = null;
        this.isRecording = false;
        this.sessionTimer = null;
        this.startTime = null;
        this.faceDetectionWorker = null;
        
        this.init();
    }

    async init() {
        // Check authentication
        if (!window.authManager.requireAuth()) {
            return;
        }

        this.currentUser = window.authManager.getUser();
        
        // Initialize UI
        this.updateSessionInfo();
        this.setupEventListeners();
        this.setupMediaDevices();
        
        // Connect WebSocket
        this.connectWebSocket();
        
        // Load session details
        await this.loadSessionDetails();
    }

    setupEventListeners() {
        // Video controls
        document.getElementById('muteBtn')?.addEventListener('click', () => this.toggleMute());
        document.getElementById('cameraBtn')?.addEventListener('click', () => this.toggleCamera());
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.showSettings());
        document.getElementById('leaveBtn')?.addEventListener('click', () => this.leaveInterview());
        
        // HR controls
        if (this.currentUser.role === 'hr') {
            document.getElementById('startInterviewBtn')?.addEventListener('click', () => this.startInterview());
            document.getElementById('endInterviewBtn')?.addEventListener('click', () => this.endInterview());
        }
    }

    async setupMediaDevices() {
        try {
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            // Set local video
            const localVideo = this.currentUser.role === 'candidate' ? 
                document.getElementById('candidateVideo') : 
                document.getElementById('hrVideo');
            
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }
            
            // Start face detection for candidates
            if (this.currentUser.role === 'candidate') {
                this.startFaceDetection();
            }
            
        } catch (error) {
            console.error('Error accessing media devices:', error);
            this.showError('Unable to access camera/microphone. Please check permissions.');
        }
    }

    connectWebSocket() {
        this.websocket = new WebSocketManager();
        
        this.websocket.on('connected', () => {
            this.updateConnectionStatus('Connected', 'success');
        });
        
        this.websocket.on('disconnected', () => {
            this.updateConnectionStatus('Disconnected', 'danger');
        });
        
        this.websocket.on('session_started', (data) => {
            this.onSessionStarted(data);
        });
        
        this.websocket.on('session_ended', (data) => {
            this.onSessionEnded(data);
        });
        
        this.websocket.on('new_question', (data) => {
            this.onNewQuestion(data);
        });
        
        this.websocket.on('answer_submitted', (data) => {
            this.onAnswerSubmitted(data);
        });
        
        this.websocket.on('attention_score', (data) => {
            this.updateAttentionScore(data.score);
        });
        
        this.websocket.connect(this.sessionId);
    }

    async loadSessionDetails() {
        try {
            const response = await window.authManager.makeAuthenticatedRequest(
                `/api/interview/sessions/${this.sessionId}`
            );
            
            if (response.ok) {
                const session = await response.json();
                this.updateSessionInfo(session);
                this.setupRoleSpecificUI(session);
            } else {
                this.showError('Failed to load session details');
            }
        } catch (error) {
            console.error('Error loading session:', error);
            this.showError('Network error occurred');
        }
    }

    updateSessionInfo(session = null) {
        const sessionInfo = document.getElementById('sessionInfo');
        if (session && sessionInfo) {
            sessionInfo.textContent = `${session.job_title} - ${session.status}`;
        }
        
        // Update AI feature status
        if (session) {
            this.updateFeatureStatus('faceDetectionStatus', session.face_detection_enabled);
            this.updateFeatureStatus('audioFeedbackStatus', session.voice_feedback_enabled);
            this.updateFeatureStatus('atsScoringStatus', session.ats_scoring_enabled);
        }
    }

    updateFeatureStatus(elementId, enabled) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = enabled ? 'On' : 'Off';
            element.className = enabled ? 'badge bg-success' : 'badge bg-secondary';
        }
    }

    setupRoleSpecificUI(session) {
        const hrControls = document.getElementById('hrControls');
        const answerPanel = document.getElementById('answerPanel');
        const attentionMeter = document.getElementById('attentionMeter');
        
        if (this.currentUser.role === 'hr') {
            if (hrControls) hrControls.style.display = 'block';
            if (attentionMeter) attentionMeter.style.display = 'block';
        } else {
            if (answerPanel) answerPanel.style.display = 'block';
        }
    }

    startFaceDetection() {
        if (!this.localStream || this.currentUser.role !== 'candidate') return;
        
        const video = document.getElementById('candidateVideo');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const detectFace = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);
                
                // Convert to base64 and send for analysis
                const imageData = canvas.toDataURL('image/jpeg', 0.8);
                this.websocket.send('face_detection', { face_data: imageData });
            }
            
            // Analyze every 2 seconds
            setTimeout(detectFace, 2000);
        };
        
        video.addEventListener('loadedmetadata', detectFace);
    }

    updateAttentionScore(score) {
        const attentionBar = document.getElementById('attentionBar');
        const attentionScore = document.getElementById('attentionScore');
        
        if (attentionBar && attentionScore) {
            const percentage = Math.round(score * 100);
            attentionBar.style.width = `${percentage}%`;
            attentionScore.textContent = `${percentage}%`;
            
            // Update color based on score
            attentionBar.className = 'progress-bar ' + 
                (percentage >= 80 ? 'bg-success' :
                 percentage >= 60 ? 'bg-warning' : 'bg-danger');
        }
    }

    async startInterview() {
        try {
            const response = await window.authManager.makeAuthenticatedRequest(
                `/api/interview/sessions/${this.sessionId}/start`,
                { method: 'POST' }
            );
            
            if (response.ok) {
                this.addMessage('system', 'Interview started successfully!');
                this.startTimer();
            } else {
                const error = await response.json();
                this.showError(error.detail || 'Failed to start interview');
            }
        } catch (error) {
            console.error('Error starting interview:', error);
            this.showError('Network error occurred');
        }
    }

    async endInterview() {
        if (!confirm('Are you sure you want to end this interview?')) {
            return;
        }
        
        try {
            const response = await window.authManager.makeAuthenticatedRequest(
                `/api/interview/sessions/${this.sessionId}/end`,
                { method: 'POST' }
            );
            
            if (response.ok) {
                this.addMessage('system', 'Interview ended successfully!');
                this.stopTimer();
            } else {
                const error = await response.json();
                this.showError(error.detail || 'Failed to end interview');
            }
        } catch (error) {
            console.error('Error ending interview:', error);
            this.showError('Network error occurred');
        }
    }

    async askQuestion() {
        const questionInput = document.getElementById('questionInput');
        const questionType = document.getElementById('questionTypeSelect');
        
        if (!questionInput.value.trim()) {
            Utils.showToast('Error', 'Please enter a question', 'warning');
            return;
        }
        
        try {
            const response = await window.authManager.makeAuthenticatedRequest(
                `/api/interview/sessions/${this.sessionId}/questions`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        question_text: questionInput.value,
                        question_type: questionType.value
                    })
                }
            );
            
            if (response.ok) {
                questionInput.value = '';
                this.addMessage('hr', `Question: ${questionInput.value}`);
            } else {
                const error = await response.json();
                this.showError(error.detail || 'Failed to ask question');
            }
        } catch (error) {
            console.error('Error asking question:', error);
            this.showError('Network error occurred');
        }
    }

    async submitAnswer() {
        const answerInput = document.getElementById('answerInput');
        const currentQuestionId = this.currentQuestionId;
        
        if (!answerInput.value.trim()) {
            Utils.showToast('Error', 'Please provide an answer', 'warning');
            return;
        }
        
        if (!currentQuestionId) {
            Utils.showToast('Error', 'No active question to answer', 'warning');
            return;
        }
        
        try {
            const response = await window.authManager.makeAuthenticatedRequest(
                `/api/interview/sessions/${this.sessionId}/answers`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        question_id: currentQuestionId,
                        answer_text: answerInput.value
                    })
                }
            );
            
            if (response.ok) {
                const result = await response.json();
                answerInput.value = '';
                this.showAIFeedback(result.feedback, result.score);
                this.addMessage('candidate', `Answer submitted (Score: ${result.score}/10)`);
            } else {
                const error = await response.json();
                this.showError(error.detail || 'Failed to submit answer');
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
            this.showError('Network error occurred');
        }
    }

    onSessionStarted(data) {
        this.addMessage('system', 'Interview session started');
        this.startTimer();
        
        // Update UI
        const startBtn = document.getElementById('startInterviewBtn');
        const endBtn = document.getElementById('endInterviewBtn');
        
        if (startBtn) startBtn.style.display = 'none';
        if (endBtn) endBtn.style.display = 'block';
    }

    onSessionEnded(data) {
        this.addMessage('system', 'Interview session ended');
        this.stopTimer();
        
        // Show final message
        setTimeout(() => {
            alert('Interview completed! Thank you for your participation.');
        }, 2000);
    }

    onNewQuestion(data) {
        this.currentQuestionId = data.question_id;
        
        // Update question panel
        const questionPanel = document.getElementById('questionPanel');
        const currentQuestion = document.getElementById('currentQuestion');
        const questionType = document.getElementById('questionType');
        
        if (questionPanel) questionPanel.style.display = 'block';
        if (currentQuestion) currentQuestion.textContent = data.question_text;
        if (questionType) questionType.textContent = `Type: ${data.question_type}`;
        
        this.addMessage('hr', `Question: ${data.question_text}`);
        
        // Play audio if available
        this.playQuestionAudio(data.question_text);
    }

    onAnswerSubmitted(data) {
        this.addMessage('candidate', `Answer: ${data.answer_text}`);
        if (data.ai_feedback) {
            this.addMessage('ai', `AI Feedback: ${data.ai_feedback} (Score: ${data.score}/10)`);
        }
    }

    async playQuestionAudio(text) {
        // This would integrate with the TTS service
        // For now, we'll just show a placeholder
        console.log('Playing audio for:', text);
    }

    showAIFeedback(feedback, score) {
        const feedbackContainer = document.getElementById('aiFeedbackContainer');
        const feedbackContent = document.getElementById('aiFeedbackContent');
        const aiScore = document.getElementById('aiScore');
        
        if (feedbackContainer && feedbackContent && aiScore) {
            feedbackContent.textContent = feedback;
            aiScore.textContent = score;
            feedbackContainer.style.display = 'block';
            
            // Hide after 10 seconds
            setTimeout(() => {
                feedbackContainer.style.display = 'none';
            }, 10000);
        }
    }

    addMessage(sender, text) {
        const messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const time = new Date().toLocaleTimeString();
        messageDiv.innerHTML = `
            <small class="text-muted">${sender.toUpperCase()} - ${time}</small>
            <div>${text}</div>
        `;
        
        messageContainer.appendChild(messageDiv);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    startTimer() {
        this.startTime = Date.now();
        this.sessionTimer = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    stopTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    updateTimer() {
        if (!this.startTime) return;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const timer = document.getElementById('sessionTimer');
        
        if (timer) {
            timer.textContent = Utils.formatDuration(elapsed);
        }
    }

    updateConnectionStatus(status, type) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `badge bg-${type === 'success' ? 'success' : 'danger'}`;
        }
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const muteBtn = document.getElementById('muteBtn');
                const icon = muteBtn.querySelector('i');
                
                if (audioTrack.enabled) {
                    muteBtn.className = 'control-btn bg-danger text-white';
                    icon.className = 'fas fa-microphone';
                } else {
                    muteBtn.className = 'control-btn bg-secondary text-white';
                    icon.className = 'fas fa-microphone-slash';
                }
            }
        }
    }

    toggleCamera() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                const cameraBtn = document.getElementById('cameraBtn');
                const icon = cameraBtn.querySelector('i');
                
                if (videoTrack.enabled) {
                    cameraBtn.className = 'control-btn bg-primary text-white';
                    icon.className = 'fas fa-video';
                } else {
                    cameraBtn.className = 'control-btn bg-secondary text-white';
                    icon.className = 'fas fa-video-slash';
                }
            }
        }
    }

    showSettings() {
        const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
        modal.show();
    }

    leaveInterview() {
        if (confirm('Are you sure you want to leave the interview?')) {
            this.cleanup();
            window.close();
        }
    }

    showError(message) {
        Utils.showToast('Error', message, 'danger');
    }

    cleanup() {
        // Stop media streams
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        // Close WebSocket
        if (this.websocket) {
            this.websocket.disconnect();
        }
        
        // Stop timer
        this.stopTimer();
    }
}

// Global functions
async function askQuestion() {
    if (window.interviewRoom) {
        await window.interviewRoom.askQuestion();
    }
}

async function submitAnswer() {
    if (window.interviewRoom) {
        await window.interviewRoom.submitAnswer();
    }
}

async function startInterview() {
    if (window.interviewRoom) {
        await window.interviewRoom.startInterview();
    }
}

async function endInterview() {
    if (window.interviewRoom) {
        await window.interviewRoom.endInterview();
    }
}

function saveSettings() {
    Utils.showToast('Success', 'Settings saved successfully!', 'success');
    const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
    modal.hide();
}

// Initialize interview room when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (typeof SESSION_ID !== 'undefined') {
        window.interviewRoom = new InterviewRoom(SESSION_ID);
    }
});