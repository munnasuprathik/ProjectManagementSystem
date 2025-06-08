import { authService } from './services/authService.js';
import { profileService } from './services/profileService.js';
import { Toast, LoadingOverlay } from './utils/uiUtils.js';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerLink = document.getElementById('registerLink');
const registerBtn = document.getElementById('registerBtn');
const managerLoginBtn = document.getElementById('managerLogin');
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));

// Check if running in development mode
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Pre-fill credentials in development for easier testing
if (isDevelopment) {
    document.addEventListener('DOMContentLoaded', () => {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (emailInput && passwordInput) {
            // Pre-fill with test user credentials in development
            emailInput.value = 'test@example.com';
            passwordInput.value = 'Test123!';
        }
    });
}

// Initialize the application
function init() {
    // Check if user is already logged in
    if (authService.isAuthenticated) {
        redirectToDashboard();
        return;
    }

    // Debug: Log button states
    console.log('Login Form:', loginForm);
    console.log('Register Link:', registerLink);
    console.log('Register Button:', registerBtn);
    console.log('Manager Login Button:', managerLoginBtn);
    
    // Add event listeners with error handling
    try {
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
            console.log('Login form event listener added');
        } else {
            console.error('Login form not found');
        }

        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (registerModal) {
                    registerModal.show();
                    console.log('Registration modal shown');
                } else {
                    console.error('Register modal not found');
                }
            });
            console.log('Register link event listener added');
        } else {
            console.error('Register link not found');
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', handleRegister);
            console.log('Register button event listener added');
        } else {
            console.error('Register button not found');
        }

        if (managerLoginBtn) {
            managerLoginBtn.addEventListener('click', handleManagerLogin);
            console.log('Manager login button event listener added');
        } else {
            console.error('Manager login button not found');
        }
    } catch (error) {
        console.error('Error initializing event listeners:', error);
    }

    // Check for success/error messages in URL
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const messageType = urlParams.get('type');
    
    if (message) {
        new Toast({
            message,
            type: messageType || 'info',
            duration: 5000
        });
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    
    // Basic validation
    if (!email || !password) {
        Toast.error('Please enter both email and password');
        return;
    }
    
    try {
        LoadingOverlay.show('Signing in...');
        
        // Attempt login
        await authService.login(email, password);
        
        // Get user profile to determine role
        const userProfile = await profileService.getUserProfile();
        
        // Store user data in auth service
        authService.setUserProfile(userProfile);
        
        // Redirect to appropriate dashboard
        redirectToDashboard();
        
    } catch (error) {
        console.error('Login failed:', error);
        let errorMessage = 'Login failed. Please check your credentials and try again.';
        
        // More specific error messages based on status code
        if (error.status === 401) {
            errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.status === 403) {
            errorMessage = 'Your account is not yet approved. Please contact your manager.';
        } else if (!navigator.onLine) {
            errorMessage = 'Network error. Please check your internet connection.';
        }
        
        Toast.error(errorMessage);
    } finally {
        LoadingOverlay.hide();
    }
}

// Handle manager login
async function handleManagerLogin() {
    try {
        LoadingOverlay.show('Signing in as manager...');
        
        // In a real app, this would be a proper admin login flow
        // For demo purposes, we'll just show a message
        Toast.info('Please use your manager credentials to log in.');
        
        // Focus the email field for convenience
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.focus();
        }
    } catch (error) {
        console.error('Manager login failed:', error);
        Toast.error('Manager login is not available in this demo.');
    } finally {
        LoadingOverlay.hide();
    }
}

// Handle registration
async function handleRegister() {
    const fullName = document.getElementById('regFullName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim().toLowerCase();
    const password = document.getElementById('regPassword')?.value;
    const confirmPassword = document.getElementById('regConfirmPassword')?.value;
    
    // Basic validation
    if (!fullName || !email || !password || !confirmPassword) {
        Toast.error('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        Toast.error('Passwords do not match');
        return;
    }
    
    if (password.length < 8) {
        Toast.error('Password must be at least 8 characters long');
        return;
    }
    
    // Password complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
    if (!passwordRegex.test(password)) {
        Toast.error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        Toast.error('Please enter a valid email address');
        return;
    }
    
    try {
        console.log('Starting registration process...');
        LoadingOverlay.show('Creating your account...');
        
        console.log('Attempting to register user:', { email, fullName });
        
        // Register the user
        const response = await authService.register({
            fullName,
            email,
            password,
            confirmPassword,
            role: 'Employee' // Default role for new registrations
        });
        
        console.log('Registration response received:', response);
        
        if (!response) {
            throw new Error('No response received from server');
        }
        
        console.log('Registration successful, hiding modal and cleaning up...');
        
        // Hide the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        if (modal) {
            modal.hide();
        }
        
        // Clear the form
        const form = document.getElementById('registerForm');
        if (form) {
            form.reset();
        }
        
        // Show success message
        Toast.success('Registration successful! Redirecting...', 3000);
        
        // Small delay to show the success message
        setTimeout(() => {
            // Check if user is authenticated
            if (authService.isAuthenticated) {
                console.log('User is authenticated, checking role...');
                console.log('User role:', authService.currentUser?.role);
                
                // Redirect based on role
                if (authService.isManager()) {
                    console.log('Redirecting to manager dashboard');
                    window.location.href = '/manager-dashboard.html';
                } else {
                    console.log('Redirecting to employee dashboard');
                    window.location.href = '/employee-dashboard.html';
                }
            } else {
                console.error('User is not authenticated after registration');
                // If not logged in, redirect to login page with email pre-filled
                window.location.href = `/login.html?email=${encodeURIComponent(email)}`;
            }
        }, 1000);
        
    } catch (error) {
        console.error('Registration failed:', error);
        
        let errorMessage = 'Registration failed. Please try again.';
        
        // More specific error messages based on status code or error message
        if (error.status === 400) {
            errorMessage = error.message || 'Invalid registration data. Please check your inputs.';
        } else if (error.status === 409 || (error.message && error.message.toLowerCase().includes('already exists'))) {
            errorMessage = 'An account with this email already exists.';
        } else if (!navigator.onLine) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message) {
            // Use the error message from the server if available
            errorMessage = error.message;
            
            // Clean up common error messages
            if (errorMessage.includes('Password')) {
                errorMessage = errorMessage.replace('Validation failed: ', '');
            }
        }
        
        console.error('Registration error details:', {
            message: error.message,
            status: error.status,
            stack: error.stack
        });
        
        Toast.error(errorMessage, 10000);
    } finally {
        LoadingOverlay.hide();
    }
}

// Redirect to appropriate dashboard based on user role
function redirectToDashboard() {
    try {
        const userProfile = authService.currentUser;
        
        if (!userProfile) {
            console.warn('No user profile found, redirecting to login');
            window.location.href = '/';
            return;
        }
        
        // Determine the dashboard based on user role
        let dashboardUrl = '/';
        
        if (userProfile.role === 'Manager' || userProfile.role === 'Admin') {
            dashboardUrl = '/manager-dashboard.html';
        } else if (userProfile.role === 'Employee') {
            dashboardUrl = '/employee-dashboard.html';
        } else {
            console.warn('Unknown user role, redirecting to login');
            authService.logout();
            window.location.href = '/';
            return;
        }
        
        // Add a small delay to ensure any pending operations complete
        setTimeout(() => {
            window.location.href = dashboardUrl;
        }, 100);
        
    } catch (error) {
        console.error('Error during dashboard redirection:', error);
        // If there's an error, log out and redirect to login
        authService.logout();
        window.location.href = '/';
    }
}

// Helper function to handle API errors
function handleApiError(error) {
    console.error('API Error:', error);
    
    let message = 'An unexpected error occurred. Please try again.';
    
    if (error.response) {
        // Server responded with an error status code
        const { status, data } = error.response;
        
        if (status === 401) {
            message = 'Your session has expired. Please log in again.';
            authService.logout();
            setTimeout(() => window.location.href = '/', 1000);
        } else if (status === 403) {
            message = 'You do not have permission to perform this action.';
        } else if (status === 404) {
            message = 'The requested resource was not found.';
        } else if (status === 422) {
            // Handle validation errors
            const validationErrors = data?.errors;
            if (validationErrors) {
                message = Object.values(validationErrors)
                    .flat()
                    .join('\n');
            }
        } else if (status >= 500) {
            message = 'A server error occurred. Please try again later.';
        } else if (data?.message) {
            message = data.message;
        }
    } else if (error.request) {
        // Request was made but no response received
        message = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.message) {
        // Something happened in setting up the request
        message = error.message;
    }
    
    return message;
}

// Initialize the app when the DOM is fully loaded
console.log('Script loaded, initializing...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing app...');
    init();
});

// Also try to initialize immediately in case DOM is already loaded
setTimeout(init, 100);
