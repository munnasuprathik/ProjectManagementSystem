class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
        this.token = localStorage.getItem('authToken');
        this.initInterceptors();
    }

    static getInstance() {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient();
        }
        return ApiClient.instance;
    }

    initInterceptors() {
        axios.interceptors.request.use(config => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
        }, error => {
            return Promise.reject(error);
        });

        axios.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response?.status === 401) {
                this.handleUnauthorized();
            }
            return Promise.reject(error);
        });
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    handleUnauthorized() {
        this.setToken(null);
        window.location.href = '/login';
    }

    // Dashboard endpoints
    async getManagerDashboard() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/dashboard/manager`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch manager dashboard:', error);
            throw error;
        }
    }

    async getEmployeeDashboard() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/dashboard/employee`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch employee dashboard:', error);
            throw error;
        }
    }

    // Projects endpoints
    async getProjects() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/projects`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            throw error;
        }
    }

    // Work Items endpoints
    async getWorkItems(params = {}) {
        try {
            // Log the parameters being sent
            console.group('API.getWorkItems');
            console.log('Params:', params);
            
            // Convert params object to query string
            const queryString = Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
                
            const url = `${this.baseUrl}/api/workitems${queryString ? `?${queryString}` : ''}`;
            console.log('Request URL:', url);
            
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                }
            });
            
            console.log('Response data:', response.data);
            console.groupEnd();
            
            return response.data;
        } catch (error) {
            console.error('Failed to fetch work items:', error);
            if (error.response) {
                // Attach response data to the error for better error handling
                error.responseData = error.response.data;
            }
            throw error;
        }
    }

    async createWorkItem(workItemData) {
        try {
            const response = await axios.post(`${this.baseUrl}/api/workitems`, workItemData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to create work item:', error);
            if (error.response) {
                // Attach response data to the error for better error handling
                error.responseData = error.response.data;
            }
            throw error;
        }
    }

    // Get current authenticated user
    async getCurrentUser() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/account/me`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.data) {
                return {
                    email: response.data.email,
                    role: response.data.role,
                    fullName: response.data.fullName,
                    userId: response.data.userId,
                    ...response.data
                };
            }
            return null;
        } catch (error) {
            console.error('Failed to get current user:', error);
            if (error.response?.status === 401) {
                this.handleUnauthorized();
            }
            return null;
        }
    }

    // Auth endpoints
    async login(email, password) {
        try {
            console.log('Sending login request to:', `${this.baseUrl}/api/account/login`);
            const response = await axios({
                method: 'post',
                url: `${this.baseUrl}/api/account/login`,
                data: { email, password },
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log('Login response:', response.data);
            
            if (response.data && response.data.token) {
                this.setToken(response.data.token);
                
                // Return user data in a consistent format
                return {
                    success: true,
                    token: response.data.token,
                    user: {
                        email: response.data.email,
                        role: response.data.role,
                        fullName: response.data.fullName,
                        userId: response.data.userId
                    },
                    ...response.data // Include all response data for backward compatibility
                };
            }
            
            // If we get here but no token, treat as error
            return {
                success: false,
                error: 'Invalid response from server',
                response: response.data
            };
            
        } catch (error) {
            console.error('Login API error:', error);
            
            // Format the error response consistently
            const errorResponse = {
                success: false,
                message: 'Login failed',
                error: error.message || 'Unknown error during login'
            };
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const { status, data } = error.response;
                console.error('Login error response:', { status, data });
                
                errorResponse.status = status;
                errorResponse.responseData = data;
                
                if (data) {
                    if (data.message) {
                        errorResponse.message = data.message;
                    } else if (data.title) {
                        errorResponse.message = data.title;
                    }
                    
                    if (data.errors) {
                        errorResponse.errors = data.errors;
                    }
                }
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received from server:', error.request);
                errorResponse.message = 'No response from server. Please check your connection.';
            }
            
            // Re-throw the error to be caught by the caller
            error.responseData = errorResponse;
            throw errorResponse;
        }
    }

    async register(userData) {
        try {
            console.log('Sending registration request to:', `${this.baseUrl}/api/account/register`);
            console.log('Registration data:', userData);
            
            const response = await axios({
                method: 'post',
                url: `${this.baseUrl}/api/account/register`,
                data: userData,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log('Registration successful:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('Registration API error:', error);
            
            // Format the error response consistently
            const errorResponse = {
                message: 'Registration failed',
                errors: {}
            };
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const { status, data } = error.response;
                console.error('Registration error response:', { status, data });
                
                if (data) {
                    if (data.errors) {
                        // Handle validation errors from the server
                        errorResponse.message = 'Validation failed';
                        errorResponse.errors = data.errors;
                    } else if (data.title) {
                        // Handle problem details format
                        errorResponse.message = data.title;
                        if (data.errors) {
                            errorResponse.errors = data.errors;
                        }
                    } else if (data.message) {
                        errorResponse.message = data.message;
                    }
                }
                
                errorResponse.status = status;
                errorResponse.responseData = data;
                
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received:', error.request);
                errorResponse.message = 'No response from server. Please check your connection.';
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Request setup error:', error.message);
                errorResponse.message = error.message || 'Error setting up registration request';
            }
            
            // Log the full error for debugging
            console.error('Registration error details:', errorResponse);
            
            // Reject with the formatted error
            return Promise.reject(errorResponse);
        }
    }

    async getCurrentUser() {
        const response = await axios.get(`${this.baseUrl}/api/account/me`);
        return response.data;
    }
    
    // Dashboard endpoints
    async getManagerDashboard() {
        try {
            console.log('Fetching manager dashboard data...');
            const response = await axios.get(`${this.baseUrl}/api/dashboard/manager`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            console.log('Manager dashboard data:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching manager dashboard:', error);
            if (error.response?.status === 401) {
                this.handleUnauthorized();
            }
            throw error;
        }
    }
    
    async getEmployeeDashboard() {
        try {
            console.log('Fetching employee dashboard data...');
            const response = await axios.get(`${this.baseUrl}/api/dashboard/employee`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            console.log('Employee dashboard data:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching employee dashboard:', error);
            if (error.response?.status === 401) {
                this.handleUnauthorized();
            }
            throw error;
        }
    }

    // Projects endpoints
    async getProjects() {
        const response = await axios.get(`${this.baseUrl}/api/projects`);
        return response.data;
    }
    
    async createProject(projectData) {
        try {
            console.log('Sending project creation request:', projectData);
            const response = await axios.post(`${this.baseUrl}/api/projects`, projectData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                withCredentials: true
            });
            console.log('Project creation successful:', response.data);
            return { success: true, ...response.data };
        } catch (error) {
            console.error('Error creating project:', error);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Error response data:', error.response.data);
                console.error('Error status:', error.response.status);
                
                // Handle 401 Unauthorized
                if (error.response.status === 401) {
                    this.handleUnauthorized();
                }
                
                throw {
                    success: false,
                    message: error.response.data?.title || 'Failed to create project',
                    status: error.response.status,
                    errors: error.response.data?.errors || [error.response.data?.message || 'Unknown error']
                };
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received:', error.request);
                throw {
                    success: false,
                    message: 'No response from server. Please check your connection.'
                };
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error setting up request:', error.message);
                throw {
                    success: false,
                    message: error.message || 'Error setting up request'
                };
            }
        }
    }

    async getProject(id) {
        const response = await axios.get(`${this.baseUrl}/api/projects/${id}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            withCredentials: true
        });
        return response.data;
    }

    async updateProject(id, projectData) {
        const response = await axios.put(`${this.baseUrl}/api/projects/${id}`, projectData);
        return response.data;
    }

    // WorkItems endpoints
    async getWorkItems(params = {}) {
        const response = await axios.get(`${this.baseUrl}/api/workitems`, { params });
        return response.data;
    }

    async getWorkItem(id) {
        const response = await axios.get(`${this.baseUrl}/api/workitems/${id}`);
        return response.data;
    }

    async createWorkItem(workItemData) {
        const response = await axios.post(`${this.baseUrl}/api/workitems`, workItemData);
        return response.data;
    }

    async updateWorkItemStatus(id, status) {
        const response = await axios.patch(`${this.baseUrl}/api/workitems/${id}/status`, { status });
        return response.data;
    }

    // Profile endpoints
    async getUserProfile() {
        const response = await axios.get(`${this.baseUrl}/api/profiles/me`);
        return response.data;
    }

    async updateUserProfile(profileData) {
        const response = await axios.put(`${this.baseUrl}/api/profiles/me`, profileData);
        return response.data;
    }

    // Dashboard endpoints
    async getManagerDashboard() {
        try {
            console.log('Fetching manager dashboard data...');
            const timestamp = new Date().getTime();
            
            // First, get the dashboard data
            const [dashboardResponse, projectsResponse] = await Promise.all([
                axios.get(`${this.baseUrl}/api/dashboard/manager?t=${timestamp}`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    withCredentials: true
                }),
                // Also fetch projects in parallel
                this.getProjects()
            ]);
            
            console.log('Dashboard API response:', dashboardResponse.data);
            console.log('Projects API response:', projectsResponse);
            
            // Combine the dashboard data with projects
            const dashboardData = {
                ...dashboardResponse.data,
                Projects: projectsResponse || []
            };
            
            return dashboardData;
            
        } catch (error) {
            console.error('Error fetching manager dashboard:', error);
            
            if (error.response) {
                console.error('Error response data:', error.response.data);
                console.error('Status:', error.response.status);
                
                // If unauthorized, redirect to login
                if (error.response.status === 401) {
                    console.log('Unauthorized - redirecting to login');
                    this.handleUnauthorized();
                    throw { success: false, message: 'Session expired. Please log in again.' };
                }
                
                // For other errors, return empty data structure
                console.warn('Non-401 error response from dashboard API');
            } else {
                console.error('No response received from dashboard API');
            }
            
            // Return empty dashboard data structure on error
            return {
                TotalProjects: 0,
                ActiveProjects: 0,
                CompletedProjects: 0,
                TotalWorkItems: 0,
                WorkItemsByStatus: [],
                ActiveMembers: 0,
                TotalTeamMembers: 0,
                OverdueWorkItems: 0,
                DueSoonWorkItems: 0,
                CompletionRate: 0,
                RecentActivities: [],
                UpcomingDeadlines: [],
                LastUpdated: new Date().toISOString()
            };
        }
    }

    async getEmployeeDashboard() {
        const response = await axios.get(`${this.baseUrl}/api/dashboard/employee`);
        return response.data;
    }

    // Team Management endpoints
    async getTeamMembers() {
        try {
            console.log('Fetching team members from:', `${this.baseUrl}/api/profiles/employees`);
            const response = await axios.get(`${this.baseUrl}/api/profiles/employees`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Team members response status:', response.status);
            console.log('Team members response data:', response.data);
            
            if (!response.data) {
                console.error('No data in team members response');
                throw new Error('No data received from server');
            }
            
            // Transform the data to match our expected format
            const teamMembers = Array.isArray(response.data) 
                ? response.data.map(member => {
                    // Debug log the raw member data
                    console.log('Raw member data:', member);
                    
                    const fullName = member.FullName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'User';
                    const firstName = member.firstName || fullName.split(' ')[0] || 'User';
                    const lastName = member.lastName || fullName.split(' ').slice(1).join(' ') || '';
                    
                    return {
                        userId: member.UserId || member.userId || member.id || '',
                        firstName: firstName,
                        lastName: lastName,
                        fullName: fullName,
                        email: member.Email || member.email || '',
                        role: member.Role || member.role || 'Employee',
                        performance: member.Performance || member.performance || member.performanceScore || 0,
                        workload: member.CurrentWorkload || member.workload || member.currentWorkload || 0,
                        skills: member.Skills || member.skills || '',
                        profileImage: member.ProfileImage || member.profileImage || ''
                    };
                })
                : [];
                
            console.log('Processed team members:', teamMembers);
            return teamMembers;
            
        } catch (error) {
            console.error('Error fetching team members:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers
                }
            });
            
            // Return mock data for development
            console.warn('Using mock team members data due to error');
            return [
                {
                    userId: '1',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    role: 'Developer',
                    performance: 85,
                    workload: 65,
                    skills: 'C#, JavaScript, SQL',
                    profileImage: ''
                },
                {
                    userId: '2',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane.smith@example.com',
                    role: 'Designer',
                    performance: 92,
                    workload: 45,
                    skills: 'UI/UX, Figma, CSS',
                    profileImage: ''
                }
            ];
        }
    }

    async getTeamMember(userId) {
        const response = await axios.get(`${this.baseUrl}/api/profiles/employees/${userId}`);
        return response.data;
    }

    async updateTeamMember(userId, memberData) {
        const response = await axios.put(`${this.baseUrl}/api/profiles/employees/${userId}`, memberData);
        return response.data;
    }

    async updateTeamMemberStatus(userId, isActive) {
        const response = await axios.patch(
            `${this.baseUrl}/api/profiles/employees/${userId}/status`,
            { isActive }
        );
        return response.data;
    }

    async getTeamMemberWorkItems(userId) {
        const response = await axios.get(`${this.baseUrl}/api/profiles/employees/${userId}/workitems`);
        return response.data;
    }
}

// Create a singleton instance
const api = new ApiClient();

// Export for use in other modules
export { api, ApiClient };
