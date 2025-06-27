import { api } from './api.js';

export class Auth {
    constructor() {
        this.currentUser = null;
        this.isInitializing = false;
        // Don't call init() in constructor to prevent issues during module loading
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const token = localStorage.getItem('authToken');
            const userData = localStorage.getItem('user');
            
            if (token && userData) {
                this.currentUser = JSON.parse(userData);
                console.log('Loaded user from storage:', this.currentUser);
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
            this.clearAuthData();
        }
    }

    async init() {
        // Prevent multiple simultaneous init calls
        if (this.isInitializing) {
            console.log('Auth init already in progress, skipping...');
            return;
        }

        try {
            this.isInitializing = true;
            console.log('Auth.init called');
            
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('No auth token found');
                return;
            }

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
                this.clearAuthData();
            }
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            // Clear auth data on initialization error
            this.clearAuthData();
        } finally {
            this.isInitializing = false;
        }
    }

    isAuthenticated() {
        // Check if we have a token and user data
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
            try {
                // Only update currentUser if we don't already have it
                if (!this.currentUser) {
                    this.currentUser = JSON.parse(userData);
                }
                return true;
            } catch (e) {
                console.error('Error parsing user data:', e);
                this.clearAuthData();
                return false;
            }
        }
        return false;
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
        this.clearAuthData();
    }

    clearAuthData() {
        this.currentUser = null;
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
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
            this.clearAuthData();
        }
    }

    isManager() {
        // Ensure we have current user data
        if (!this.currentUser && this.isAuthenticated()) {
            // This will load currentUser from storage if needed
        }
        return this.currentUser?.role === 'Manager';
    }

    isEmployee() {
        // Ensure we have current user data
        if (!this.currentUser && this.isAuthenticated()) {
            // This will load currentUser from storage if needed
        }
        return this.currentUser?.role === 'Employee';
    }

    getCurrentUser() {
        // Ensure we have current user data
        if (!this.currentUser && this.isAuthenticated()) {
            // This will load currentUser from storage if needed
        }
        return this.currentUser;
    }
}

// Create and export a singleton instance
export const auth = new Auth();