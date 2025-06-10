import auth from '../authState.js';
import { router } from '../router.js';

// Login View
export async function renderLoginView() {
    console.log('renderLoginView called');
    const app = document.getElementById('app');
    
    if (!app) {
        console.error('App element not found in renderLoginView');
        return;
    }
    
    console.log('Rendering login form...');
    const loginHtml = `
        <div class="container">
            <div class="row justify-content-center mt-5">
                <div class="col-md-6 col-lg-4">
                    <div class="card shadow">
                        <div class="card-body p-4">
                            <div class="text-center mb-4">
                                <h2 class="h4">Welcome Back</h2>
                                <p class="text-muted">Sign in to your account</p>
                            </div>
                            
                            <form id="loginForm">
                                <div class="mb-3">
                                    <label for="email" class="form-label">Email address</label>
                                    <input type="email" class="form-control" id="email" autocomplete="username" required>
                                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="password" autocomplete="current-password" required>
                                </div>
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary">
                                        <span id="loginSpinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                        Sign In
                                    </button>
                                </div>
                            </form>
                            
                            <div class="text-center mt-3">
                                <p class="mb-0">Don't have an account? <a href="/register" data-link>Sign up</a></p>
                            </div>
                            
                            <div id="loginError" class="alert alert-danger mt-3 d-none" role="alert"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    app.innerHTML = loginHtml;
    
    try {
        // Add form submission handler
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log('Adding submit event listener to login form');
            loginForm.addEventListener('submit', handleLogin);
        } else {
            console.error('Login form element not found');
        }
        
        // Hide loading spinner
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        console.log('Login view rendered successfully');
    } catch (error) {
        console.error('Error in renderLoginView:', error);
        throw error; // Re-throw to be caught by the router
    }
}

// Register View
export async function renderRegisterView() {
    const app = document.getElementById('app');
    
    const registerHtml = `
        <div class="container">
            <div class="row justify-content-center mt-5">
                <div class="col-md-8 col-lg-6">
                    <div class="card shadow">
                        <div class="card-body p-4">
                            <div class="text-center mb-4">
                                <h2 class="h4">Create an Account</h2>
                                <p class="text-muted">Join our project management platform</p>
                            </div>
                            
                            <form id="registerForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="fullName" class="form-label">Full Name</label>
                                        <input type="text" class="form-control" id="fullName" name="fullName" autocomplete="name" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="email" class="form-label">Email address</label>
                                        <input type="email" class="form-control" id="email" name="email" autocomplete="email" required>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="password" class="form-label">Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="password" name="password" autocomplete="new-password" required>
                                            <button class="btn btn-outline-secondary toggle-password" type="button" data-target="password">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                        </div>
                                        <div class="form-text">At least 8 characters, 1 uppercase, 1 number</div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="confirmPassword" class="form-label">Confirm Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="confirmPassword" name="confirmPassword" autocomplete="new-password" required>
                                            <button class="btn btn-outline-secondary toggle-password" type="button" data-target="confirmPassword">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-8 mb-3">
                                        <label for="skills" class="form-label">Skills (comma separated)</label>
                                        <input type="text" class="form-control" id="skills" name="skills" placeholder="e.g., C#, JavaScript, Project Management" required>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="experience" class="form-label">Experience (years)</label>
                                        <input type="number" class="form-control" id="experience" name="experience" min="0" max="50" value="0" required>
                                    </div>
                                </div>
                                
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary">
                                        <span id="registerSpinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                        Create Account
                                    </button>
                                </div>
                            </form>
                            
                            <div class="text-center mt-3">
                                <p class="mb-0">Already have an account? <a href="/login" data-link>Sign in</a></p>
                            </div>
                            
                            <div id="registerError" class="alert alert-danger mt-3 d-none" role="alert"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    app.innerHTML = registerHtml;
    
    // Add form submission handler and setup password toggles
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        setupPasswordToggles();
    }
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email')?.value?.trim() || '';
    const password = document.getElementById('password')?.value || '';
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');
    const spinner = document.getElementById('loginSpinner');
    const errorDiv = document.getElementById('loginError');
    
    // Clear previous errors and show loading state
    errorDiv.classList.add('d-none');
    loginBtn.disabled = true;
    spinner.classList.remove('d-none');
    
    // Basic validation
    if (!email || !password) {
        errorDiv.textContent = 'Please enter both email and password';
        errorDiv.classList.remove('d-none');
        loginBtn.disabled = false;
        spinner.classList.add('d-none');
        return;
    }
    
    try {
        console.log('Attempting login with email:', email);
        const result = await auth.login(email, password);
        console.log('Login result:', result);
        
        if (result && result.success && result.token) {
            // Store the token in localStorage if not already done by auth.login
            if (!localStorage.getItem('authToken')) {
                localStorage.setItem('authToken', result.token);
            }
            
            // Store user data in localStorage if not already done
            if (result.email) {
                const userData = {
                    email: result.email,
                    role: result.role,
                    fullName: result.fullName,
                    userId: result.userId
                };
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Update auth state
                auth.setAuthenticated(true, result.role === 'Manager');
            }
            
            // Redirect to dashboard or previously intended page
            const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
            sessionStorage.removeItem('redirectAfterLogin');
            
            console.log('Login successful, redirecting to:', redirectPath);
            window.location.href = redirectPath;
            return; // Exit early to prevent further execution
        } else {
            // Show error message from the server or a default one
            const errorMessage = result?.error || 'Login failed. Please check your credentials and try again.';
            console.error('Login failed:', errorMessage);
            errorDiv.textContent = errorMessage;
            errorDiv.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message || 'An error occurred during login. Please try again.';
        errorDiv.classList.remove('d-none');
    } finally {
        // Reset loading state
        if (loginBtn) loginBtn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
    }
}

// Toggle password visibility
function setupPasswordToggles() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.toggle-password')) {
            const button = e.target.closest('.toggle-password');
            const targetId = button.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = button.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        }
    });
}

// Register Handler
async function handleRegister(e) {
    e.preventDefault();
    
    // Get form elements
    const email = document.getElementById('email')?.value.trim() || '';
    const password = document.getElementById('password')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const fullName = document.getElementById('fullName')?.value.trim() || '';
    const skills = document.getElementById('skills')?.value.trim() || '';
    const experience = document.getElementById('experience')?.value || '0';
    
    const registerBtn = document.querySelector('#registerForm button[type="submit"]');
    const spinner = document.getElementById('registerSpinner');
    const errorDiv = document.getElementById('registerError');
    
    // Clear previous errors and show loading state
    errorDiv.classList.add('d-none');
    registerBtn.disabled = true;
    spinner.classList.remove('d-none');
    
    try {
        // Client-side validation
        if (!email || !password || !confirmPassword || !fullName || !experience) {
            throw new Error('All fields are required');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        if (!/(?=.*[A-Z])(?=.*\d)/.test(password)) {
            throw new Error('Password must contain at least one uppercase letter and one number');
        }

        // Prepare user data for registration
        const userData = {
            email,
            password,
            confirmPassword,
            fullName,
            skills,
            experience: parseInt(experience, 10) || 0
        };
        
        console.log('Attempting registration with data:', userData);
        
        // Call the registration API
        const result = await auth.register(userData);
        console.log('Registration response:', result);
        
        // If we get here, registration was successful
        if (result && result.token) {
            // Auto-login after successful registration
            try {
                const loginResult = await auth.login(email, password);
                
                if (loginResult && loginResult.token) {
                    // Store user data in localStorage
                    localStorage.setItem('user', JSON.stringify({
                        email: loginResult.email,
                        role: loginResult.role,
                        fullName: loginResult.fullName,
                        userId: loginResult.userId
                    }));
                    
                    // Update auth state
                    auth.setAuthenticated(true, loginResult.role === 'Manager');
                    
                    // Redirect to dashboard on successful registration and login
                    const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
                    sessionStorage.removeItem('redirectAfterLogin');
                    
                    console.log('Registration and login successful, redirecting to:', redirectPath);
                    window.location.href = redirectPath;
                    return;
                } else {
                    console.warn('Auto-login after registration failed, redirecting to login page');
                    // If auto-login fails, redirect to login page
                    window.location.href = '/login';
                    return;
                }
            } catch (loginError) {
                console.error('Error during auto-login after registration:', loginError);
                // If auto-login fails, redirect to login page
                window.location.href = '/login';
                return;
            }
        } else {
            throw new Error(result?.message || 'Registration successful but no token received. Please log in.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'An error occurred during registration. Please try again.';
        
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const { data } = error.response;
            console.error('Registration error response:', data);
            
            if (data && data.errors) {
                // Handle validation errors
                const errorMessages = [];
                for (const [field, messages] of Object.entries(data.errors)) {
                    if (Array.isArray(messages)) {
                        errorMessages.push(...messages);
                    } else {
                        errorMessages.push(messages);
                    }
                }
                errorMessage = errorMessages.join(' ');
            } else if (data && data.message) {
                errorMessage = data.message;
            } else if (error.response.status === 400) {
                errorMessage = 'Invalid registration data. Please check your input.';
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received from server');
            errorMessage = 'Unable to connect to the server. Please check your connection.';
        } else if (error.message) {
            // Client-side validation error
            errorMessage = error.message;
        }
        
        errorDiv.textContent = errorMessage;
        errorDiv.classList.remove('d-none');
    } finally {
        // Reset loading state
        if (registerBtn) registerBtn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
    }
}
