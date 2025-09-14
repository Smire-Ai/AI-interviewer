/**
 * Main JavaScript functionality for AI Interview Platform
 */

// Global utilities and helpers
class Utils {
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static showLoading(element, text = 'Loading...') {
        if (element) {
            element.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="text-muted mt-2">${text}</p>
                </div>
            `;
        }
    }

    static showError(element, message = 'An error occurred') {
        if (element) {
            element.innerHTML = `
                <div class="text-center py-4">
                    <div class="text-danger mb-3">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                    </div>
                    <p class="text-muted">${message}</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="location.reload()">
                        <i class="fas fa-refresh me-1"></i>Retry
                    </button>
                </div>
            `;
        }
    }

    static showEmpty(element, message = 'No data available') {
        if (element) {
            element.innerHTML = `
                <div class="text-center py-5">
                    <div class="text-muted mb-3">
                        <i class="fas fa-inbox fa-3x"></i>
                    </div>
                    <p class="text-muted">${message}</p>
                </div>
            `;
        }
    }

    static copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Success', 'Copied to clipboard', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            this.showToast('Error', 'Failed to copy to clipboard', 'danger');
        });
    }

    static showToast(title, message, type = 'info') {
        // Use the auth manager's toast function if available
        if (window.authManager) {
            window.authManager.showToast(title, message, type);
        } else {
            alert(`${title}: ${message}`);
        }
    }

    static getStatusBadgeClass(status) {
        const statusClasses = {
            'scheduled': 'bg-primary',
            'in_progress': 'bg-warning text-dark', 
            'completed': 'bg-success',
            'cancelled': 'bg-danger'
        };
        return statusClasses[status] || 'bg-secondary';
    }

    static getStatusText(status) {
        const statusTexts = {
            'scheduled': 'Scheduled',
            'in_progress': 'In Progress',
            'completed': 'Completed', 
            'cancelled': 'Cancelled'
        };
        return statusTexts[status] || status;
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static generateSessionId() {
        return Math.random().toString(36).substr(2, 9);
    }

    static async downloadFile(url, filename) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            this.showToast('Error', 'Failed to download file', 'danger');
        }
    }
}

// WebSocket connection manager
class WebSocketManager {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 1000;
        this.listeners = new Map();
    }

    connect(sessionId) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/interview/ws/${sessionId}`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            
            // Authenticate the connection
            if (window.authManager && window.authManager.getUser()) {
                this.send('authenticate', {
                    user_id: window.authManager.getUser().id
                });
            }
            
            this.emit('connected');
        };
        
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.emit(data.type, data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
        
        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            this.emit('disconnected');
            this.attemptReconnect(sessionId);
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        };
    }

    attemptReconnect(sessionId) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
                this.reconnectAttempts++;
                this.connect(sessionId);
            }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts));
        }
    }

    send(type, data = {}) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, ...data }));
        } else {
            console.warn('WebSocket not connected, cannot send message');
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.listeners.clear();
    }
}

// Camera and microphone utilities
class MediaUtils {
    static async getMediaDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return {
                cameras: devices.filter(device => device.kind === 'videoinput'),
                microphones: devices.filter(device => device.kind === 'audioinput')
            };
        } catch (error) {
            console.error('Error getting media devices:', error);
            return { cameras: [], microphones: [] };
        }
    }

    static async getUserMedia(constraints = { video: true, audio: true }) {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }

    static async testCamera(videoElement) {
        try {
            const stream = await this.getUserMedia({ video: true, audio: false });
            if (videoElement) {
                videoElement.srcObject = stream;
            }
            return stream;
        } catch (error) {
            console.error('Camera test failed:', error);
            throw error;
        }
    }

    static async testMicrophone(callback) {
        try {
            const stream = await this.getUserMedia({ video: false, audio: true });
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            
            microphone.connect(analyser);
            analyser.fftSize = 256;
            
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            const checkLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                const level = (average / 255) * 100;
                
                if (callback) callback(level);
                
                if (stream.active) {
                    requestAnimationFrame(checkLevel);
                }
            };
            
            checkLevel();
            return stream;
        } catch (error) {
            console.error('Microphone test failed:', error);
            throw error;
        }
    }

    static stopMediaStream(stream) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }
}

// Global instances
window.Utils = Utils;
window.WebSocketManager = WebSocketManager;
window.MediaUtils = MediaUtils;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.classList.add('fade');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    });
});

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    
    // Only show user-friendly messages for certain errors
    if (event.error.name === 'NetworkError' || event.error.message.includes('fetch')) {
        Utils.showToast('Connection Error', 'Please check your internet connection', 'warning');
    }
});

// Service worker registration (if available)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/static/sw.js')
        .then(function(registration) {
            console.log('ServiceWorker registration successful');
        })
        .catch(function(err) {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}