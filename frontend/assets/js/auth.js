import { setAuth } from './authService.js';
import { registerUser, loginUser } from './api.js';

// Sign Up Form Handler
const signupForm = document.getElementById('signupForm');

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        try {
            const data = await registerUser(name, email, password);

            if (data.success) {
                setAuth(data.token, data.user);
                const urlParams = new URLSearchParams(window.location.search);
                const redirectUrl = urlParams.get('redirect') || (data.user?.role === 'admin' ? 'admin.html' : '../index.html');
                window.location.href = redirectUrl;
            } else {
                alert(data.message || 'Registration failed. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign up';
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Something went wrong. Please check your connection.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign up';
        }
    });
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const submitBtn = document.getElementById('btnLoginSubmit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            const data = await loginUser(email, password);

            if (data.success) {
                setAuth(data.token, data.user);
                const urlParams = new URLSearchParams(window.location.search);
                const redirectUrl = urlParams.get('redirect') || (data.user?.role === 'admin' ? 'admin.html' : '../index.html');
                window.location.href = redirectUrl;
            } else {
                alert(data.message || 'Login failed. Please check your email and password.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Log in';
            }
        } catch (error) {
            console.error('Authentication error:', error);
            alert('Unable to connect to the authentication service. Please check your network and verify the server is running.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Log in';
        }
    });
}
