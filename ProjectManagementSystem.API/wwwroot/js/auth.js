import { api } from './api.js';

export class Auth {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            console.log('Auth.init called');
            const token = localStorage.getItem('authToken');
            if (token) {
                console.log('Found auth token, fetching current user...');
                const userData = await api.getCurrentUser();
                
                if (userData) {
                    // Normalize user data with consistent role handling
                    this.currentUser = {
                        ...userData,
                        role: userData.role || userData.Role || 'Employee',
                        email: userData.email || userData.Email || '',
                        fullName: userData.fullName || userData.FullName || '',
                        userId: userData.userId || userData.UserId || userData.id || ''
                    };
                    
                    console.log('Fetched and normalized user data:', JSON.stringify(this.currentUser, null, 2));
                    
                    // Store the normalized user data in localStorage
                    localStorage.setItem('user', JSON.stringify(this.currentUser));
                } else {
                    console.warn('No user data received from getCurrentUser()');
                }
            }
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            this.logout();
        }
    }

    isAuthenticated() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        return !!(token && user);
    }

    async login(email, password) {
        try {
            console.log('Auth.login called with:', { email });
            const data = await api.login(email, password);
            console.log('Login response data:', data);
            
            // Extract user data from response (handling different response formats)
            const userData = data.user || data;
            
            // Create user object with consistent role handling
            this.currentUser = {
                ...userData,
                email: userData.email || email,
                role: userData.role || userData.Role || 'Employee', // Check both case variations
                fullName: userData.fullName || userData.FullName || userData.email?.split('@')[0] || 'User',
                userId: userData.userId || userData.UserId || userData.id || ''
            };
            
            // Log the final user object
            console.log('Final user object after login:', JSON.stringify(this.currentUser, null, 2));
            
            // Store user data in localStorage for persistence
            localStorage.setItem('user', JSON.stringify(this.currentUser));
            
            return { 
                success: true, 
                token: data.token,
                ...this.currentUser
            };
        } catch (error) {
            console.error('Login failed:', error);
            return { 
                success: false, 
                error: error.response?.data?.message || 'Login failed. Please check your credentials.',
                status: error.response?.status
            };
        }
    }

    async register(userData) {
        try {
            const data = await api.register(userData);
            return { success: true, data };
        } catch (error) {
            console.error('Registration failed:', error);
            return { 
                success: false, 
                error: error.response?.data?.message || 'Registration failed. Please try again.' 
            };
        }
    }

    logout() {
        console.log('Logging out user...');
        try {
            // Clear all local storage related to authentication
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('auth') || key.startsWith('user') || key.startsWith('currentUser'))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Clear API token and current user
            api.setToken(null);
            this.currentUser = null;
            
            // Clear any session storage that might be used
            sessionStorage.clear();
            
            console.log('User logged out successfully - redirecting to login');
            
            // Force a full page reload with a timestamp to prevent caching
            const timestamp = new Date().getTime();
            const loginUrl = `${window.location.origin}/index.html?logout=${timestamp}`;
            
            // Replace the current history entry to prevent back button issues
            window.history.replaceState(null, null, loginUrl);
            
            // Force a hard redirect to break out of the SPA
            window.location.href = loginUrl;
            
            // Force a reload to ensure clean state
            window.location.reload(true);
            
            return { success: true };
        } catch (error) {
            console.error('Error during logout:', error);
            // Last resort - redirect to root
            window.location.href = '/';
            return { success: false, error: error.message };
        }
    }

    isAuthenticated() {
        // Check if we have a token and user data
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                return true;
            } catch (e) {
                console.error('Error parsing user data:', e);
                return false;
            }
        }
        return false;
    }
    
    setAuthenticated(isAuthenticated, isManager = false) {
        if (isAuthenticated) {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            this.currentUser = {
                ...userData,
                role: isManager ? 'Manager' : 'Employee'
            };
            localStorage.setItem('user', JSON.stringify(this.currentUser));
        } else {
            this.currentUser = null;
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
        }
    }

    isManager() {
        return this.currentUser?.role === 'Manager';
    }

    isEmployee() {
        return this.currentUser?.role === 'Employee';
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Create and export a singleton instance
export const auth = new Auth();
