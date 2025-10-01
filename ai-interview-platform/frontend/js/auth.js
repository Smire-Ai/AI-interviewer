// Auth logic
const API_URL = 'http://127.0.0.1:8000'; // IMPORTANT: Change this to your Vercel backend URL after deployment

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const authError = document.getElementById('auth-error');

// Prevent access to dashboards if not logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    const path = window.location.pathname;

    if (token && (path.includes('index.html') || path === '/')) {
        const user = JSON.parse(localStorage.getItem('userInfo'));
        if (user.role === 'interviewer') {
            window.location.href = 'interviewer_dashboard.html';
        } else {
            window.location.href = 'candidate_dashboard.html';
        }
    } else if (!token && !path.includes('index.html') && path !== '/') {
        window.location.href = 'index.html';
    }
});


showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
});

loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    authError.textContent = '';

    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
        const response = await fetch(`${API_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });

        if (!response.ok) throw new Error('Login failed. Please check your credentials.');

        const data = await response.json();
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('userInfo', JSON.stringify(data.user_info));

        if (data.user_info.role === 'interviewer') {
            window.location.href = 'interviewer_dashboard.html';
        } else {
            window.location.href = 'candidate_dashboard.html';
        }
    } catch (error) {
        authError.textContent = error.message;
    }
});

registerBtn.addEventListener('click', async () => {
    const fullName = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    authError.textContent = '';

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                password: password,
                role: role,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Registration failed.');
        }

        alert('Registration successful! Please log in.');
        showLogin.click(); // Switch to login form

    } catch (error) {
        authError.textContent = error.message;
    }
});

// Universal logout button functionality
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userInfo');
        window.location.href = 'index.html';
    });
}