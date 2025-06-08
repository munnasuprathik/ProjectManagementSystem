import { apiClient } from '../api/apiClient.js';
import { STORAGE_KEYS, USER_ROLES, TOKEN_REFRESH_INTERVAL } from '../constants/appConstants.js';
import { Toast } from '../utils/uiUtils.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.listeners = [];
        this.tokenRefreshTimer = null;
        
        // Initialize from localStorage if available
        this._loadUserFromStorage();
        
        // Set up token refresh if user is already authenticated
        if (this.isAuthenticated) {
            this._scheduleTokenRefresh();
        }
    }
    
    // Load user from localStorage
    _loadUserFromStorage() {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                this.isAuthenticated = true;
            } catch (e) {
                console.error('Failed to parse stored user', e);
                this._clearAuth();
            }
        }
    }
    
    // Save user to localStorage
    _saveUserToStorage(user) {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }
    
    // Clear authentication data
    _clearAuth() {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        this.currentUser = null;
        this.isAuthenticated = false;
        this._clearTokenRefresh();
        this._notifyListeners();
    }
    
    // Clear all auth state (for logout)
    clearAuth() {
        this._clearAuth();
    }
    
    // Notify all listeners about auth state change
    _notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.currentUser, this.isAuthenticated);
            } catch (e) {
                console.error('Error in auth listener', e);
            }
        });
    }
    
    // Add auth state change listener
    addAuthListener(listener) {
        if (typeof listener !== 'function') return;
        this.listeners.push(listener);
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    
    // Check if current user has required role(s)
    hasRole(requiredRoles) {
        if (!this.currentUser || !this.currentUser.role) return false;
        if (Array.isArray(requiredRoles)) {
            return requiredRoles.some(role => this.currentUser.role === role);
        }
        return this.currentUser.role === requiredRoles;
    }
    
    // Check if current user has any of the required permissions
    hasAnyPermission(requiredPermissions) {
        if (!this.currentUser || !this.currentUser.permissions) return false;
        return requiredPermissions.some(perm => this.currentUser.permissions.includes(perm));
    }
    
    // Check if current user is a manager or admin
    isManager() {
        return this.hasRole(['Manager', 'Admin']);
    }
    
    // Check if current user is an employee
    isEmployee() {
        return this.hasRole('Employee');
    }
    
    // Check if current user is an admin
    isAdmin() {
        return this.hasRole('Admin');
    }
    
    // Set user profile data
    setUserProfile(userProfile) {
        if (!userProfile) {
            console.error('AuthService: Cannot set null or undefined user profile');
            return null;
        }
        
        console.log('AuthService: Setting user profile with data:', userProfile);
        
        // Normalize user data
        const normalizedUser = {
            id: userProfile.userId || userProfile.id || userProfile.UserId || '',
            email: userProfile.email || userProfile.Email || '',
            role: (userProfile.role || 'Employee').toLowerCase(),
            fullName: userProfile.fullName || userProfile.FullName || 
                     (userProfile.email ? userProfile.email.split('@')[0] : 'User'),
            profileId: userProfile.profileId || userProfile.ProfileId || null,
            // Include any additional properties
            ...userProfile
        };
        
        console.log('AuthService: Normalized user data:', normalizedUser);
        
        // Set current user and update state
        this.currentUser = normalizedUser;
        this.isAuthenticated = true;
        
        // Save to storage and notify listeners
        this._saveUserToStorage(this.currentUser);
        this._notifyListeners();
        
        // Schedule token refresh
        this._scheduleTokenRefresh();
        
        console.log('AuthService: User profile set successfully');
        return this.currentUser;
    }
    
    // Login with email and password
    async login(email, password) {
        try {
            console.log('AuthService: Attempting login for:', email);
            
            // Make the login request
            console.log('AuthService: Sending login request...');
            const response = await apiClient.login(email, password);
            
            console.log('AuthService: Login response received:', response);
            
            // Check if response exists
            if (!response) {
                console.error('AuthService: Empty response from server');
                throw new Error('No response received from server');
            }
            
            // Extract token - handle both direct token and nested in data property
            const token = response.token || response.Token;
            
            if (!token) {
                console.error('AuthService: No token found in response. Response was:', 
                    JSON.stringify(response, null, 2));
                throw new Error('Authentication token not received. Please try again.');
            }
            
            console.log('AuthService: Token received, length:', token.length);
            
            // Store the token
            apiClient.setToken(token);
            
            // Extract user data from response or get it from the user property
            let userData = response.user || response;
            
            // If we don't have a user object, create one from the response
            if (!userData || (!userData.id && !userData.userId)) {
                userData = {
                    id: response.userId || '',
                    email: response.email || email,
                    role: (response.role || 'Employee').toLowerCase(),
                    fullName: response.fullName || email.split('@')[0] || 'User',
                    profileId: response.profileId || null
                };
            }
            
            console.log('AuthService: Setting user profile with data:', userData);
            
            // Set user profile and schedule token refresh
            this.setUserProfile(userData);
            this._scheduleTokenRefresh();
            
            console.log('AuthService: Login successful');
            return this.currentUser;
            
        } catch (error) {
            console.error('AuthService: Login failed:', error);
            this.clearAuth();
            Toast.error(error.message || 'Login failed. Please try again.');
            throw error;
        }
    }
    
    // Register a new user
    async register(userData) {
        try {
            console.log('AuthService: Attempting registration for:', userData.email);
            const response = await apiClient.register(userData);
            
            if (response && response.token) {
                // Auto-login after successful registration
                return this.login(userData.email, userData.password);
            }
            
            throw new Error('Registration failed. Please try again.');
            
            console.log('AuthService: Registration successful for user:', user.email);
            return { success: true, user, token };
            
            // Ensure required fields are set
            if (!user.id || !user.email) {
                console.error('AuthService: Incomplete user data. User object:', user, 'Response:', response);
                const error = new Error('Incomplete user data received from server');
                error.status = 500;
                throw error;
            }
            
            console.log('AuthService: Setting user profile...');
            this.setUserProfile(user);
            console.log('AuthService: User profile set after registration. Current user:', this.currentUser);
            
            // Return the response with user data
            const result = {
                ...response,
                user: user,
                token: token // Ensure token is included in the response
            };
            
            console.log('AuthService: Registration successful. Returning:', result);
            return result;
            
        } catch (error) {
            console.error('AuthService: Registration failed:', error);
            
            // Clean up auth state if registration failed
            if (this.isAuthenticated) {
                console.log('AuthService: Cleaning up auth state after failed registration');
                this.clearAuth();
            }
            
            // Enhance error message if needed
            if (!error.status) {
                error.status = 500;
            }
            
            // Handle specific error cases
            if (error.message && error.message.includes('already exists')) {
                error.status = 409;
                error.message = 'An account with this email already exists.';
            }
            
            throw error;
        }
    }

    // Logout the current user
    async logout() {
        try {
            // Clear any pending token refresh
            this._clearTokenRefresh();
            
            // Call the logout API if we have a token
            if (this.isAuthenticated) {
                try {
                    await apiClient.logout();
                } catch (error) {
                    console.warn('Logout API call failed, proceeding with local logout', error);
                    // Continue with local logout even if API call fails
                }
            }
            
            // Clear auth state
            this._clearAuth();
            
            // Clear any stored tokens
            apiClient.clearAuth();
            
            return true;
        } catch (error) {
            console.error('Error during logout:', error);
            throw error;
        }
    }

    // Get current user's profile
    async getCurrentUser() {
        if (!this.isAuthenticated) return null;
        
        try {
            const userProfile = await apiClient.getCurrentUser();
            
            if (userProfile) {
                this.currentUser = {
                    ...this.currentUser,
                    ...userProfile
                };
                this._saveUserToStorage(this.currentUser);
                this._notifyListeners();
            }
            
            return this.currentUser;
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            
            // If unauthorized, log the user out
            if (error.response && error.response.status === 401) {
                this.logout();
            }
            
            throw error;
        }
    }
    
    // Update current user's profile
    async updateProfile(profileData) {
        try {
            if (!this.isAuthenticated) return false;
            
            const updatedProfile = await apiClient.updateMyProfile(profileData);
            
            if (updatedProfile) {
                this.currentUser = {
                    ...this.currentUser,
                    ...updatedProfile
                };
                this._saveUserToStorage(this.currentUser);
                this._notifyListeners();
                
                Toast.success('Profile updated successfully');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to update profile:', error);
            Toast.error(error.message || 'Failed to update profile');
            return false;
        }
    }

    // Check if user is authenticated
    checkAuth() {
        return this.isAuthenticated;
    }

    // Get auth headers for API requests
    getAuthHeaders() {
        const token = apiClient.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // Schedule token refresh
    _scheduleTokenRefresh() {
        // Clear any existing timer
        this._clearTokenRefresh();
        
        // Default to 55 minutes if TOKEN_REFRESH_INTERVAL is not set
        const refreshInterval = TOKEN_REFRESH_INTERVAL || (55 * 60 * 1000);
        
        console.log(`AuthService: Scheduling token refresh in ${refreshInterval / 60000} minutes`);
        
        this.tokenRefreshTimer = setTimeout(async () => {
            try {
                console.log('AuthService: Attempting token refresh...');
                const newToken = await apiClient.refreshToken();
                
                if (newToken) {
                    console.log('AuthService: Token refresh successful');
                    apiClient.setToken(newToken);
                    this._scheduleTokenRefresh(); // Schedule next refresh
                } else {
                    console.warn('AuthService: Token refresh failed - no new token received');
                    this.logout();
                }
            } catch (error) {
                console.error('AuthService: Error during token refresh:', error);
                this.logout();
            }
        }, refreshInterval);
    }
    
    // Clear the token refresh timer
    _clearTokenRefresh() {
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }
}

// Create a singleton instance
export const authService = new AuthService();

// Initialize auth service when the module is loaded
if (authService.checkAuth()) {
    // Verify the token is still valid
    authService.getCurrentUser().catch(() => {
        // If token is invalid, log out
        authService.logout();
    });
}

export default authService;
