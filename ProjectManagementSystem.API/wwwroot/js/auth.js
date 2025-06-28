
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
    // Helper function to decode JWT token and extract role
    decodeJWTToken(token) {
        try {
            // JWT tokens have 3 parts separated by dots
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error('Invalid JWT token format');
                return null;
            }
            // Decode the payload (second part)
            const payload = parts[1];
            // Add padding if needed for base64 decoding
            const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
            const decodedPayload = atob(paddedPayload);
            const tokenData = JSON.parse(decodedPayload);
            
            console.log('Decoded JWT token:', tokenData);
            
            // Extract role from various possible claim names
            const role = tokenData.role || 
                        tokenData.Role || 
                        tokenData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                        tokenData['role'] ||
                        null;
            
            console.log('Extracted role from JWT:', role);
            
            return {
                ...tokenData,
                extractedRole: role,
                userId: tokenData.sub || tokenData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
                email: Array.isArray(tokenData.email) ? tokenData.email[0] : tokenData.email
            };
        } catch (error) {
            console.error('Error decoding JWT token:', error);
            return null;
        }
    }
    async init() {
        // Prevent multiple simultaneous init calls
        if (this.isInitializing) {
            console.log('Auth init already in progress, skipping...');
            return this.isAuthenticated();
        }
        try {
            this.isInitializing = true;
            console.log('Auth.init called');
            
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('No auth token found');
                return false;
            }
            console.log('Found auth token, decoding...');
            
            // First, try to extract role from JWT token directly
            const tokenData = this.decodeJWTToken(token);
            if (tokenData && tokenData.extractedRole) {
                console.log('Successfully extracted role from JWT token:', tokenData.extractedRole);
                
                // Create user object from JWT token data
                this.currentUser = {
                    userId: tokenData.userId,
                    email: tokenData.email,
                    role: tokenData.extractedRole,
                    fullName: tokenData.fullName || tokenData.name || 'User'
                };
                
                console.log('User data from JWT token:', this.currentUser);
                
                // Store the user data
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                return true;
            }
            // Fallback: try to fetch user data from API
            console.log('JWT decode failed, fetching current user from API...');
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
                
                console.log('Fetched and normalized user data from API:', JSON.stringify(this.currentUser, null, 2));
                
                // Store the normalized user data in localStorage
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                return true;
            } else {
                console.warn('No user data received from getCurrentUser()');
                this.clearAuthData();
                return false;
            }
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            // Clear auth data on initialization error
            this.clearAuthData();
            return false;
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
            
            // Store the token first
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                console.log('Token stored in localStorage');
                
                // Try to extract role from the JWT token
                const tokenData = this.decodeJWTToken(data.token);
                if (tokenData && tokenData.extractedRole) {
                    console.log('Role extracted from JWT token:', tokenData.extractedRole);
                    
                    // Create user object from JWT token data
                    this.currentUser = {
                        userId: tokenData.userId,
                        email: tokenData.email || email,
                        role: tokenData.extractedRole,
                        fullName: tokenData.fullName || tokenData.name || email?.split('@')[0] || 'User'
                    };
                    
                    console.log('Final user object from JWT:', JSON.stringify(this.currentUser, null, 2));
                    
                    // Store user data in localStorage for persistence
                    localStorage.setItem('user', JSON.stringify(this.currentUser));
                    
                    return { 
                        success: true, 
                        token: data.token,
                        ...this.currentUser
                    };
                }
            }
            
            // Fallback: Extract user data from response (handling different response formats)
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
            console.log('Final user object after login (fallback):', JSON.stringify(this.currentUser, null, 2));
            
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
