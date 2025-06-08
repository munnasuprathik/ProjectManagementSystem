import { apiClient } from '../api/apiClient.js';
import { PROJECT_STATUSES } from '../constants/appConstants.js';
import { Toast, LoadingOverlay } from '../utils/uiUtils.js';

class ProjectService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    }

    // Get all projects with optional filtering and pagination
    async getProjects(filters = {}, page = 1, pageSize = 10) {
        const cacheKey = this._generateCacheKey('projects', { ...filters, page, pageSize });
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading projects...');
            
            // Build query string from filters
            const queryParams = new URLSearchParams();
            
            // Add pagination
            queryParams.append('pageNumber', page);
            queryParams.append('pageSize', pageSize);
            
            // Add filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    queryParams.append(key, value);
                }
            });
            
            const queryString = queryParams.toString();
            const endpoint = `/api/projects${queryString ? `?${queryString}` : ''}`;
            
            const response = await apiClient.fetch(endpoint);
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching projects:', error);
            Toast.error('Failed to load projects. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get a single project by ID
    async getProjectById(id) {
        if (!id) {
            console.error('Project ID is required');
            return null;
        }

        const cacheKey = this._generateCacheKey('project', id);
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading project...');
            const project = await apiClient.getProject(id);
            
            if (project) {
                this._addToCache(cacheKey, project);
                return project;
            }
            
            return null;
        } catch (error) {
            console.error(`Error fetching project ${id}:`, error);
            Toast.error('Failed to load project. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Create a new project
    async createProject(projectData) {
        try {
            LoadingOverlay.show('Creating project...');
            
            // Validate required fields
            if (!projectData.name) {
                throw new Error('Project name is required');
            }
            
            // Set default values
            const newProject = {
                name: projectData.name,
                description: projectData.description || '',
                status: PROJECT_STATUSES.ACTIVE,
                startDate: projectData.startDate || new Date().toISOString(),
                endDate: projectData.endDate || null,
                tags: projectData.tags || [],
                ...projectData
            };
            
            const createdProject = await apiClient.createProject(newProject);
            
            if (createdProject) {
                // Invalidate relevant caches
                this._invalidateCache('projects');
                
                Toast.success('Project created successfully');
                return createdProject;
            }
            
            return null;
        } catch (error) {
            console.error('Error creating project:', error);
            Toast.error(error.message || 'Failed to create project. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Update an existing project
    async updateProject(id, updates) {
        if (!id) {
            throw new Error('Project ID is required');
        }

        try {
            LoadingOverlay.show('Updating project...');
            
            // Get current project to merge with updates
            const currentProject = await this.getProjectById(id);
            if (!currentProject) {
                throw new Error('Project not found');
            }
            
            // Merge updates with current project
            const updatedProject = {
                ...currentProject,
                ...updates,
                id // Ensure ID is not overwritten
            };
            
            const result = await apiClient.updateProject(id, updatedProject);
            
            if (result) {
                // Invalidate caches
                this._invalidateCache('projects');
                this._invalidateCache(`project_${id}`);
                
                Toast.success('Project updated successfully');
                return result;
            }
            
            return null;
        } catch (error) {
            console.error(`Error updating project ${id}:`, error);
            Toast.error(error.message || 'Failed to update project. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Update project status
    async updateProjectStatus(id, status) {
        if (!id || !status) {
            throw new Error('Project ID and status are required');
        }

        try {
            LoadingOverlay.show('Updating project status...');
            
            const result = await apiClient.updateProjectStatus(id, status);
            
            if (result) {
                // Invalidate caches
                this._invalidateCache('projects');
                this._invalidateCache(`project_${id}`);
                
                Toast.success(`Project status updated to ${status}`);
                return result;
            }
            
            return null;
        } catch (error) {
            console.error(`Error updating status for project ${id}:`, error);
            Toast.error(error.message || 'Failed to update project status. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Delete a project
    async deleteProject(id) {
        if (!id) {
            throw new Error('Project ID is required');
        }

        try {
            LoadingOverlay.show('Deleting project...');
            
            const result = await apiClient.deleteProject(id);
            
            if (result) {
                // Invalidate caches
                this._invalidateCache('projects');
                this._invalidateCache(`project_${id}`);
                
                Toast.success('Project deleted successfully');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Error deleting project ${id}:`, error);
            Toast.error('Failed to delete project. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get active projects
    async getActiveProjects() {
        return this.getProjects({ status: PROJECT_STATUSES.ACTIVE });
    }

    // Get closed projects
    async getClosedProjects() {
        return this.getProjects({ status: PROJECT_STATUSES.CLOSED });
    }

    // Get project statistics
    async getProjectStats() {
        const cacheKey = this._generateCacheKey('projectStats');
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading project statistics...');
            
            const response = await apiClient.fetch('/api/projects/stats');
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return {
                total: 0,
                active: 0,
                closed: 0,
                byStatus: {},
                byMonth: {}
            };
        } catch (error) {
            console.error('Error fetching project statistics:', error);
            Toast.error('Failed to load project statistics. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get project timeline (for Gantt chart, etc.)
    async getProjectTimeline(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        const cacheKey = this._generateCacheKey('projectTimeline', { projectId });
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading project timeline...');
            
            const response = await apiClient.fetch(`/api/projects/${projectId}/timeline`);
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return [];
        } catch (error) {
            console.error(`Error fetching timeline for project ${projectId}:`, error);
            Toast.error('Failed to load project timeline. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get project members
    async getProjectMembers(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        const cacheKey = this._generateCacheKey('projectMembers', { projectId });
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading project members...');
            
            const response = await apiClient.fetch(`/api/projects/${projectId}/members`);
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return [];
        } catch (error) {
            console.error(`Error fetching members for project ${projectId}:`, error);
            Toast.error('Failed to load project members. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Helper method to generate cache key
    _generateCacheKey(prefix, params = {}) {
        const paramString = Object.entries(params)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}:${value}`)
            .join('_');
            
        return `${prefix}_${paramString}`;
    }

    // Helper method to get data from cache
    _getFromCache(key) {
        const cached = this.cache.get(key);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }
        
        // Remove expired cache
        if (cached) {
            this.cache.delete(key);
        }
        
        return null;
    }

    // Helper method to add data to cache
    _addToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // Invalidate cache by prefix
    _invalidateCache(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
}

// Create a singleton instance
export const projectService = new ProjectService();

export default projectService;
