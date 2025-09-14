/**
 * Authentication management for AI Interview Platform
 */

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.init();
    }

    init() {
        // Check authentication status on page load
        this.updateAuthUI();
        
        // Set up form handlers
        this.setupEventListeners();
        
        // Auto-refresh token if needed
        if (this.token) {
            this.validateToken();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Register form
        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Role selection handler
        document.getElementById('registerRole')?.addEventListener('change', (e) => {
            this.toggleRoleFields(e.target.value);
        });
    }

    toggleRoleFields(role) {
        const companyField = document.getElementById('companyField');
        const positionField = document.getElementById('positionField');
        
        if (role === 'hr') {
            companyField.style.display = 'block';
            positionField.style.display = 'none';
            document.getElementById('registerCompany').required = true;
            document.getElementById('registerPosition').required = false;
        } else if (role === 'candidate') {
            companyField.style.display = 'none';
            positionField.style.display = 'block';
            document.getElementById('registerCompany').required = false;
            document.getElementById('registerPosition').required = true;
        } else {
            companyField.style.display = 'none';
            positionField.style.display = 'none';
            document.getElementById('registerCompany').required = false;
            document.getElementById('registerPosition').required = false;
        }
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await fetch('/api/auth/token', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.setAuthData(data.access_token, data.user);
                this.showSuccess('Login successful!');
                
                // Close modal and redirect based on role
                const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                modal.hide();
                
                this.redirectBasedOnRole(data.user.role);
            } else {
                this.showError(data.detail || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        }
    }

    async register() {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const fullName = document.getElementById('registerFullName').value;
        const role = document.getElementById('registerRole').value;
        const company = document.getElementById('registerCompany').value;
        const position = document.getElementById('registerPosition').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    full_name: fullName,
                    role,
                    company: role === 'hr' ? company : null,
                    position: role === 'candidate' ? position : null
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('Registration successful! Please login.');
                
                // Close register modal and open login modal
                const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                
                registerModal.hide();
                loginModal.show();
                
                // Pre-fill login email
                document.getElementById('loginEmail').value = email;
            } else {
                this.showError(data.detail || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Network error. Please try again.');
        }
    }

    setAuthData(token, user) {
        this.token = token;
        this.user = user;
        
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        this.updateAuthUI();
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');

        if (this.token && this.user) {
            // User is logged in
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            userInfo.style.display = 'block';
            userName.textContent = `${this.user.full_name} (${this.user.role.toUpperCase()})`;
        } else {
            // User is not logged in
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            userInfo.style.display = 'none';
        }
    }

    redirectBasedOnRole(role) {
        setTimeout(() => {
            if (role === 'hr') {
                window.location.href = '/hr';
            } else if (role === 'candidate') {
                window.location.href = '/candidate';
            }
        }, 1000);
    }

    async validateToken() {
        if (!this.token) return false;

        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.user = userData;
                localStorage.setItem('user', JSON.stringify(userData));
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Token validation error:', error);
            this.logout();
            return false;
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        this.updateAuthUI();
        
        // Redirect to home page
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
        
        this.showSuccess('Logged out successfully');
    }

    getAuthHeaders() {
        return this.token ? {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const headers = this.getAuthHeaders();
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        });

        if (response.status === 401) {
            this.logout();
            throw new Error('Authentication required');
        }

        return response;
    }

    requireAuth(allowedRoles = []) {
        if (!this.token || !this.user) {
            this.showError('Please login to access this page');
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
            return false;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(this.user.role)) {
            this.showError('You do not have permission to access this page');
            return false;
        }

        return true;
    }

    showSuccess(message) {
        this.showToast('Success', message, 'success');
    }

    showError(message) {
        this.showToast('Error', message, 'danger');
    }

    showToast(title, message, type = 'info') {
        const toastElement = document.getElementById('alertToast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toastElement && toastTitle && toastMessage) {
            toastTitle.textContent = title;
            toastMessage.textContent = message;
            
            // Update toast styling based on type
            toastElement.className = `toast text-bg-${type}`;
            
            const toast = new bootstrap.Toast(toastElement);
            toast.show();
        } else {
            // Fallback to alert if toast elements not found
            alert(`${title}: ${message}`);
        }
    }

    isLoggedIn() {
        return this.token && this.user;
    }

    getUser() {
        return this.user;
    }

    getUserRole() {
        return this.user?.role;
    }
}

// Global auth manager instance
window.authManager = new AuthManager();

// Global functions for convenience
function logout() {
    window.authManager.logout();
}

function showRegisterModal() {
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    
    if (loginModal) loginModal.hide();
    registerModal.show();
}

function showLoginModal() {
    const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    
    if (registerModal) registerModal.hide();
    loginModal.show();
}