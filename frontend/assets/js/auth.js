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
                if (data.token) {
                    localStorage.setItem('aavahan_token', data.token);
                    sessionStorage.setItem('aavahan_token', data.token);
                }
                if (data.user) {
                    localStorage.setItem('aavahan_user', JSON.stringify(data.user));
                    sessionStorage.setItem('aavahan_user', JSON.stringify(data.user));
                }
                sessionStorage.setItem('aavahan_logged_in', 'true');
                if (typeof showToast === 'function') {
                    showToast('Account created! Redirecting...', 'success');
                } else {
                    alert('Account created! Redirecting...');
                }
                const urlParams = new URLSearchParams(window.location.search);
                const redirectUrl = urlParams.get('redirect') || (data.user?.role === 'admin' ? 'admin.html' : '../index.html');
                setTimeout(() => { window.location.href = redirectUrl; }, 800);
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
                if (data.token) {
                    localStorage.setItem('aavahan_token', data.token);
                    sessionStorage.setItem('aavahan_token', data.token);
                }
                if (data.user) {
                    localStorage.setItem('aavahan_user', JSON.stringify(data.user));
                    sessionStorage.setItem('aavahan_user', JSON.stringify(data.user));
                }
                sessionStorage.setItem('aavahan_logged_in', 'true');
                if (typeof showToast === 'function') {
                    showToast('Welcome back! Redirecting...', 'success');
                } else {
                    alert('Welcome back! Redirecting...');
                }
                const urlParams = new URLSearchParams(window.location.search);
                const redirectUrl = urlParams.get('redirect') || (data.user?.role === 'admin' ? 'admin.html' : '../index.html');
                setTimeout(() => { window.location.href = redirectUrl; }, 800);
            } else {
                alert(data.message || 'Login failed. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Log in';
            }
        } catch (error) {
            console.warn('Backend unavailable, activating offline demo session:', error);
            const isSubfolder = window.location.pathname.includes('/pages/');
            const defaultRedirect = isSubfolder ? 'dashboard.html' : 'pages/dashboard.html';
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect') || defaultRedirect;

            const isAdmin = email.toLowerCase().includes('admin');
            const demoUser = {
                id: isAdmin ? 99 : 1,
                name: isAdmin ? 'Admin Organizer' : (email.split('@')[0].replace(/[._]/g, ' ') || 'Demo Organizer'),
                email: email,
                role: isAdmin ? 'admin' : 'user'
            };

            localStorage.setItem('aavahan_token', isAdmin ? 'demo-admin-token' : 'demo-user-token');
            localStorage.setItem('aavahan_user', JSON.stringify(demoUser));
            sessionStorage.setItem('aavahan_token', isAdmin ? 'demo-admin-token' : 'demo-user-token');
            sessionStorage.setItem('aavahan_user', JSON.stringify(demoUser));
            sessionStorage.setItem('aavahan_logged_in', 'true');

            if (typeof showToast === 'function') {
                showToast('Logged in (Offline Demo Session)', 'info');
            }
            setTimeout(() => { window.location.href = redirectUrl; }, 600);
        }
    });
}
