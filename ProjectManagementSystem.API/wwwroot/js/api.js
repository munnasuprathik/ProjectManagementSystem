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
        // Only redirect if not already on login page to prevent loops
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
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
        try {
            console.log('Fetching employee dashboard from:', `${this.baseUrl}/api/dashboard/employee`);
            console.log('Current auth token:', this.token ? 'Token exists' : 'No token');
            
            const response = await axios.get(`${this.baseUrl}/api/dashboard/employee`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                },
                validateStatus: function (status) {
                    return status < 500; // Reject only if the status code is greater than or equal to 500
                }
            });
            
            console.log('Dashboard API response status:', response.status);
            console.log('Dashboard API response headers:', response.headers);
            
            if (response.status === 200) {
                console.log('Dashboard data received:', response.data);
                return response.data;
            } else {
                console.error('Dashboard API error:', response.status, response.statusText, response.data);
                throw new Error(`Failed to fetch dashboard: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Failed to fetch employee dashboard:', error);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Error response data:', error.response.data);
                console.error('Error response status:', error.response.status);
                console.error('Error response headers:', error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received:', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error message:', error.message);
            }
            throw error;
        }
    }

    // Projects endpoints
    async get(url, config = {}) {
        try {
            const response = await axios.get(`${this.baseUrl}${url}`, config);
            return response.data;
        } catch (error) {
            console.error(`GET ${url} failed:`, error);
            throw error;
        }
    }

    async patch(url, data = {}, config = {}) {
        try {
            const response = await axios.patch(`${this.baseUrl}${url}`, data, {
                ...config,
                headers: {
                    'Content-Type': 'application/json',
                    ...(config.headers || {})
                }
            });
            return response.data;
        } catch (error) {
            console.error(`PATCH ${url} failed:`, error);
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
            // Ensure required fields are present and properly formatted
            if (!workItemData.workItemName) {
                throw new Error('Work item name is required');
            }
            if (!workItemData.assignedToId) {
                throw new Error('Assigned user is required');
            }
            if (!workItemData.priority) {
                throw new Error('Priority is required');
            }
            if (!workItemData.projectId) {
                throw new Error('Project is required');
            }

            // Format the payload to match the backend DTO
            const payload = {
                ProjectId: parseInt(workItemData.projectId, 10),
                AssignedToId: workItemData.assignedToId,
                WorkItemName: workItemData.workItemName.trim(),
                Description: workItemData.description?.trim() || '',
                Priority: workItemData.priority,
                Deadline: workItemData.deadline ? new Date(workItemData.deadline).toISOString() : undefined
            };

            console.log('Sending work item creation request:', JSON.stringify(payload, null, 2));
            
            const response = await axios.post(`${this.baseUrl}/api/workitems`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                withCredentials: true
            });
            
            console.log('Work item created successfully:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('Error creating work item:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    data: error.config?.data
                }
            });
            
            // If we have a response with error details, use that
            if (error.response && error.response.data) {
                const serverError = new Error(error.response.data.title || 'Failed to create work item');
                serverError.response = error.response.data;
                throw serverError;
            }
            
            // Re-throw the original error if we can't extract more details
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

    // Projects endpoints
    async getProjects() {
        const response = await axios.get(`${this.baseUrl}/api/projects`);
        return response.data;
    }
    
    async createProject(projectData) {
        try {
            console.log('=== Project Creation Debug ===');
            console.log('API Base URL:', this.baseUrl);
            console.log('Current token:', this.token ? 'Token exists' : 'No token found!');
            console.log('Project data being sent:', JSON.stringify(projectData, null, 2));
            
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                withCredentials: true
            };
            
            // Only add Authorization header if token exists
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            } else {
                console.warn('No auth token found, making unauthenticated request');
            }
            
            console.log('Sending request to:', `${this.baseUrl}/api/projects`);
            console.log('Request config:', config);
            
            const response = await axios.post(`${this.baseUrl}/api/projects`, projectData, config);
            
            console.log('Project creation successful. Response:', response);
            console.log('Response data:', response.data);
            
            return { success: true, ...response.data };
        } catch (error) {
            console.error('=== Error creating project ===');
            console.error('Error details:', error);
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Error response status:', error.response.status);
                console.error('Error response headers:', error.response.headers);
                console.error('Error response data:', error.response.data);
                
                // Handle 401 Unauthorized
                if (error.response.status === 401) {
                    console.warn('Authentication failed, handling unauthorized access');
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

    async getWorkItem(id) {
        const response = await axios.get(`${this.baseUrl}/api/workitems/${id}`);
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
}

// Create a singleton instance
const api = new ApiClient();

// Export for use in other modules
export { api, ApiClient };