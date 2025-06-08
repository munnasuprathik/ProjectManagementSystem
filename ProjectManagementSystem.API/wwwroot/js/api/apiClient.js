import { API_ENDPOINTS } from '../constants/appConstants.js';

class ApiClient {
    constructor() {
        this.baseUrl = '/api';
        this.token = localStorage.getItem('authToken');
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    // Set the authentication token
    setToken(token) {
        if (!token) {
            console.warn('Setting empty token, clearing authentication');
            this.clearAuth();
            return;
        }
        
        console.log('Setting authentication token');
        this.token = token;
        localStorage.setItem('auth_token', token);
        
        // Also store in authToken for backward compatibility
        localStorage.setItem('authToken', token);
    }
    
    // Alias for setToken for backward compatibility
    setAuthToken(token) {
        console.warn('setAuthToken is deprecated, use setToken instead');
        this.setToken(token);
    }

    // Set the current user data
    setUser(userData) {
        this.user = userData;
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        } else {
            localStorage.removeItem('user');
        }
    }

    // Get the current user's token
    getToken() {
        // Check memory first, then localStorage
        if (!this.token) {
            // Try both storage keys for backward compatibility
            this.token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
        }
        
        // Validate token format if it exists
        if (this.token && this.token.split('.').length !== 3) {
            console.warn('Invalid token format detected');
            this.clearAuth();
            return null;
        }
        
        return this.token;
    }

    // Get current user data
    getCurrentUser() {
        return this.user || JSON.parse(localStorage.getItem('user') || 'null');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    }

    // Check if current user is a manager
    isManager() {
        const user = this.getCurrentUser();
        return user && user.role === 'Manager';
    }

    // Check if current user is an employee
    isEmployee() {
        const user = this.getCurrentUser();
        return user && user.role === 'Employee';
    }

    // Clear authentication
    clearAuth() {
        console.log('Clearing authentication');
        this.token = null;
        this.user = null;
        
        // Clear all auth-related data from storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('authToken'); // Clear both token keys
        localStorage.removeItem('user');
        
        // Clear any ongoing requests
        if (this.currentRequest) {
            this.currentRequest.abort();
            this.currentRequest = null;
        }
    }
    
    // Alias for clearAuth for backward compatibility
    clearAuthToken() {
        console.warn('clearAuthToken is deprecated, use clearAuth instead');
        this.clearAuth();
    }

    // Check if a JWT token is expired
    _isTokenExpired(token) {
        try {
            // JWT tokens consist of three parts: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.warn('Invalid token format');
                return true;
            }
            
            // Decode the payload (middle part)
            const payload = JSON.parse(atob(parts[1]));
            
            // Check if the token has an expiration claim
            if (!payload.exp) {
                console.warn('Token has no expiration date');
                return false;
            }
            
            // exp is in seconds, Date.now() is in milliseconds
            const expiration = payload.exp * 1000;
            const now = Date.now();
            
            // Add a 5-minute buffer to refresh the token before it actually expires
            const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
            
            return now >= (expiration - bufferTime);
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true; // Assume token is expired if we can't parse it
        }
    }
    
    // Refresh the authentication token
    async refreshToken() {
        try {
            const response = await this.fetch(API_ENDPOINTS.AUTH.REFRESH, {
                method: 'POST'
            });
            
            if (response && response.token) {
                return response.token;
            }
            
            return null;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            return null;
        }
    }
    
    // Helper method to handle fetch requests
    async fetch(resource, options = {}) {
        const headers = {
            ...this.defaultHeaders,
            ...options.headers
        };

        // Add auth token if available
        const token = this.getToken();
        if (token) {
            if (typeof token !== 'string') {
                console.error('Invalid token type:', typeof token);
                this.clearAuth();
                throw new Error('Invalid authentication token');
            }
            
            // Ensure token hasn't expired
            if (this._isTokenExpired(token)) {
                console.log('Token has expired, attempting refresh...');
                try {
                    const newToken = await this.refreshToken();
                    if (newToken) {
                        this.setToken(newToken);
                        headers['Authorization'] = `Bearer ${newToken}`;
                    } else {
                        throw new Error('Failed to refresh token');
                    }
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    this.clearAuth();
                    throw new Error('Session expired. Please log in again.');
                }
            } else {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        try {
            // Remove any duplicate /api from the resource path
            const cleanResource = resource.startsWith('/api/') ? resource.substring(4) : resource;
            const url = `${this.baseUrl}${cleanResource}`;
            
            console.log(`[API] ${options.method || 'GET'} ${url}`);
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include' // Ensure cookies are sent with the request
            });

            // Log response status and headers for debugging
            console.log(`[API] Response status: ${response.status} ${response.statusText}`);
            console.log('[API] Response headers:', Object.fromEntries(response.headers.entries()));

            // Handle 401 Unauthorized
            if (response.status === 401) {
                console.log('[API] Unauthorized - clearing auth');
                this.clearAuth();
                window.location.href = '/login.html';
                return null;
            }

            // Handle no content responses
            if (response.status === 204) {
                console.log('[API] No content response');
                return null;
            }

            // Get response text first for debugging
            const responseText = await response.text();
            console.log('[API] Raw response text:', responseText);
            
            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error('[API] Failed to parse JSON response:', e);
                throw new Error('Invalid response from server');
            }

            if (!response.ok) {
                console.error('[API] API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                });
                const error = new Error(data.message || 'Something went wrong');
                error.status = response.status;
                error.data = data;
                throw error;
            }

            console.log('[API] Response data:', data);
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ========== Auth API ==========
    async login(email, password) {
        console.log('API Client: Attempting login for:', email);
        
        try {
            // Use native fetch directly to avoid circular dependency
            const url = `/api/Account/login`; // Direct URL to avoid baseUrl issues
            console.log('API Client: Making login request to:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include' // Important for cookies/session
            });

            const responseData = await response.json();
            console.log('API Client: Login response data:', responseData);
            
            if (!response.ok) {
                const error = new Error(responseData.message || 'Login failed');
                error.response = response;
                error.data = responseData;
                throw error;
            }
            
            // Handle both PascalCase and camelCase properties
            const token = responseData.token || responseData.Token;
            const userId = responseData.userId || responseData.UserId;
            const userRole = (responseData.role || responseData.Role || 'Employee').toLowerCase();
            const userEmail = responseData.email || responseData.Email || email;
            const fullName = responseData.fullName || responseData.FullName || email.split('@')[0];
            const profileId = responseData.profileId || responseData.ProfileId || null;
            
            if (!token) {
                console.error('API Client: No token found in response. Full response:', 
                    JSON.stringify(responseData, null, 2));
                throw new Error('Authentication token not received in response');
            }

            console.log('API Client: Setting token and user data');
            
            // Set the token first
            this.setToken(token);
            
            const userData = {
                id: userId,
                email: userEmail,
                role: userRole,
                fullName: fullName,
                profileId: profileId
            };
            
            // Set user data
            this.setUser(userData);
            
            // Also store in localStorage for persistence
            localStorage.setItem('user', JSON.stringify(userData));
            
            console.log('API Client: User authenticated successfully:', userData);
            return { 
                ...responseData, 
                token, 
                user: userData 
            };
            
        } catch (error) {
            console.error('API Client: Login failed with error:', error);
            if (error.response) {
                console.error('API Client: Response error:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.data || {}
                });
            }
            throw error; // Re-throw to be handled by the caller
        }
    }

    async register(userData) {
        console.log('=== REGISTER METHOD START ===');
        console.log('Registering user with data:', JSON.stringify(userData, null, 2));
        
        try {
            console.log('[API] Sending registration request...');
            const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.AUTH.REGISTER}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            console.log('[API] Raw response status:', response.status);
            
            // Get response text first for debugging
            const responseText = await response.text();
            console.log('[API] Raw response text:', responseText);
            
            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error('[API] Failed to parse JSON response:', e);
                throw new Error('Invalid response from server');
            }
            
            console.log('[API] Parsed response data:', data);
            
            if (!response.ok) {
                console.error('[API] Registration failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                });
                
                // If we have a message from the server, use it
                const errorMsg = data.message || 
                                (response.status === 400 ? 'Invalid registration data' :
                                 response.status === 409 ? 'User already exists' :
                                 'Registration failed');
                
                const error = new Error(errorMsg);
                error.status = response.status;
                error.data = data;
                throw error;
            }
            
            // If we get here, registration was successful
            console.log('[API] Registration successful');
            
            // Return the parsed response data
            return data;
        } catch (error) {
            console.error('Registration failed in apiClient:', error);
            throw error; // Re-throw to be handled by the caller
        }
    }

    async logout() {
        try {
            await this.fetch(API_ENDPOINTS.AUTH.LOGOUT, { 
                method: 'POST' 
            });
        } catch (error) {
            console.warn('Logout API call failed, proceeding with local logout', error);
        } finally {
            this.clearAuth();
        }
    }

    async getCurrentUser() {
        try {
            return await this.fetch(API_ENDPOINTS.AUTH.ME);
        } catch (error) {
            console.error('Failed to fetch current user:', error);
            throw error;
        }
    }

    // ========== Projects API ==========
    async getProjects(status = '') {
        const url = status ? `/projects?status=${status}` : '/projects';
        return this.fetch(url);
    }

    async getProject(id) {
        return this.fetch(`/projects/${id}`);
    }

    async createProject(projectData) {
        return this.fetch('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    async updateProject(id, projectData) {
        return this.fetch(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    }

    async updateProjectStatus(id, status) {
        return this.fetch(`/projects/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    // ========== Work Items API ==========
    async getWorkItems(projectId = '') {
        const url = projectId ? `/workitems?projectId=${projectId}` : '/workitems';
        return this.fetch(url);
    }

    async getWorkItem(id) {
        return this.fetch(`/workitems/${id}`);
    }

    async getAssignedWorkItems(userId = '') {
        const url = userId ? `/workitems/assigned/${userId}` : '/workitems/assigned';
        return this.fetch(url);
    }

    async createWorkItem(workItemData) {
        return this.fetch('/workitems', {
            method: 'POST',
            body: JSON.stringify(workItemData)
        });
    }

    async updateWorkItem(id, workItemData) {
        return this.fetch(`/workitems/${id}`, {
            method: 'PUT',
            body: JSON.stringify(workItemData)
        });
    }

    async updateWorkItemStatus(id, status, notes = '') {
        return this.fetch(`/workitems/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, notes })
        });
    }

    // ========== User Profiles API ==========
    async getProfile(userId = '') {
        const url = userId ? `/profiles/${userId}` : '/profiles/me';
        return this.fetch(url);
    }

    async updateProfile(profileData) {
        return this.fetch('/profiles', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // Get all employees (for manager)
    async getEmployees() {
        return this.fetch('/profiles/employees');
    }

    // ========== Dashboard API ==========
    async getManagerDashboard() {
        return this.fetch('/dashboard/manager');
    }

    async getEmployeeDashboard() {
        return this.fetch('/dashboard/employee');
    }

    async register(userData) {
        const response = await this.fetch('/account/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (response && response.token) {
            this.setToken(response.token);
            localStorage.setItem('user', JSON.stringify({
                id: response.userId,
                email: response.email,
                role: response.role,
                fullName: response.fullName
            }));
        }
        return response;
    }

    async getCurrentUser() {
        return this.fetch('/account/me');
    }

    logout() {
        this.clearAuth();
        window.location.href = '/login.html';
    }

    // Projects API
    getProjects() {
        return this.fetch('/projects');
    }

    getProject(id) {
        return this.fetch(`/projects/${id}`);
    }

    createProject(projectData) {
        return this.fetch('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    updateProject(id, projectData) {
        return this.fetch(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    }

    updateProjectStatus(id, status) {
        return this.fetch(`/projects/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    // Work Items API
    getWorkItems() {
        return this.fetch('/workitems');
    }

    getWorkItem(id) {
        return this.fetch(`/workitems/${id}`);
    }

    createWorkItem(workItemData) {
        return this.fetch('/workitems', {
            method: 'POST',
            body: JSON.stringify(workItemData)
        });
    }

    updateWorkItemStatus(id, status, comments = '') {
        return this.fetch(`/workitems/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, comments })
        });
    }

    deleteWorkItem(id) {
        return this.fetch(`/workitems/${id}`, {
            method: 'DELETE'
        });
    }

    // Profiles API
    getMyProfile() {
        return this.fetch('/profiles/me');
    }

    updateMyProfile(profileData) {
        return this.fetch('/profiles/me', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // Admin only
    getEmployeeProfiles() {
        return this.fetch('/profiles/employees');
    }

    getEmployeeProfile(id) {
        return this.fetch(`/profiles/employees/${id}`);
    }

    getEmployeeWorkItems(employeeId) {
        return this.fetch(`/profiles/employees/${employeeId}/workitems`);
    }

    // Dashboard API
    getManagerDashboard() {
        return this.fetch('/dashboard/manager');
    }

    getEmployeeDashboard() {
        return this.fetch('/dashboard/employee');
    }
}

// Helper function to format dates
function formatDate(dateString, includeTime = true) {
    if (!dateString) return '';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Format date as YYYY-MM-DD for date inputs
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
};

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    if (!status) return 'bg-secondary';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('todo')) return 'bg-secondary';
    if (statusLower.includes('progress')) return 'bg-primary';
    if (statusLower.includes('review')) return 'bg-warning text-dark';
    if (statusLower.includes('done') || statusLower.includes('completed')) return 'bg-success';
    if (statusLower.includes('active')) return 'bg-success';
    if (statusLower.includes('closed')) return 'bg-secondary';
    if (statusLower.includes('cancelled')) return 'bg-danger';
    
    return 'bg-secondary';
};

// Helper function to get priority badge class
function getPriorityBadgeClass(priority) {
    if (!priority) return 'bg-secondary';
    
    const priorityLower = priority.toLowerCase();
    
    if (priorityLower.includes('critical')) return 'bg-danger';
    if (priorityLower.includes('high')) return 'bg-warning text-dark';
    if (priorityLower.includes('medium')) return 'bg-info';
    if (priorityLower.includes('low') || priorityLower.includes('minor')) return 'bg-secondary';
    
    return 'bg-secondary';
};

// Helper to get initials from name
function getUserInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Helper to get a consistent color based on a string
function getRandomColor(str) {
    if (!str) return '#6c757d';
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate pastel colors
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 80%)`;
}

// Create a singleton instance
const apiClient = new ApiClient();

// Export everything
export {
    apiClient,
    formatDate,
    formatDateForInput,
    getStatusBadgeClass,
    getPriorityBadgeClass,
    getUserInitials,
    getRandomColor
};
