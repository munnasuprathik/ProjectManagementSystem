import { apiClient } from '../api/apiClient.js';
import { WORK_ITEM_STATUSES, WORK_ITEM_PRIORITIES } from '/js/constants/appConstants.js';
import { Toast, LoadingOverlay } from '../utils/uiUtils.js';

class WorkItemService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    }

    // Get all work items with optional filtering and pagination
    async getWorkItems(filters = {}, page = 1, pageSize = 10) {
        const cacheKey = this._generateCacheKey('workItems', { ...filters, page, pageSize });
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading work items...');
            
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
            const endpoint = `/api/workitems${queryString ? `?${queryString}` : ''}`;
            
            const response = await apiClient.fetch(endpoint);
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching work items:', error);
            Toast.error('Failed to load work items. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get a single work item by ID
    async getWorkItemById(id) {
        if (!id) {
            console.error('WorkItem ID is required');
            return null;
        }

        const cacheKey = this._generateCacheKey('workItem', id);
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading work item...');
            const workItem = await apiClient.getWorkItem(id);
            
            if (workItem) {
                this._addToCache(cacheKey, workItem);
                return workItem;
            }
            
            return null;
        } catch (error) {
            console.error(`Error fetching work item ${id}:`, error);
            Toast.error('Failed to load work item. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Create a new work item
    async createWorkItem(workItemData) {
        try {
            LoadingOverlay.show('Creating work item...');
            
            // Validate required fields
            if (!workItemData.title || !workItemData.projectId) {
                throw new Error('Title and project are required');
            }
            
            // Set default values
            const newWorkItem = {
                title: workItemData.title,
                description: workItemData.description || '',
                projectId: workItemData.projectId,
                status: WORK_ITEM_STATUSES.TODO,
                priority: workItemData.priority || WORK_ITEM_PRIORITIES.MEDIUM,
                dueDate: workItemData.dueDate || null,
                assignedTo: workItemData.assignedTo || null,
                estimatedHours: workItemData.estimatedHours || 0,
                actualHours: 0,
                tags: workItemData.tags || [],
                ...workItemData
            };
            
            const createdWorkItem = await apiClient.createWorkItem(newWorkItem);
            
            if (createdWorkItem) {
                // Invalidate relevant caches
                this._invalidateCache('workItems');
                
                Toast.success('Work item created successfully');
                return createdWorkItem;
            }
            
            return null;
        } catch (error) {
            console.error('Error creating work item:', error);
            Toast.error(error.message || 'Failed to create work item. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Update an existing work item
    async updateWorkItem(id, updates) {
        if (!id) {
            throw new Error('WorkItem ID is required');
        }

        try {
            LoadingOverlay.show('Updating work item...');
            
            // Get current work item to merge with updates
            const currentWorkItem = await this.getWorkItemById(id);
            if (!currentWorkItem) {
                throw new Error('Work item not found');
            }
            
            // Merge updates with current work item
            const updatedWorkItem = {
                ...currentWorkItem,
                ...updates,
                id // Ensure ID is not overwritten
            };
            
            const result = await apiClient.updateWorkItem(id, updatedWorkItem);
            
            if (result) {
                // Invalidate caches
                this._invalidateCache('workItems');
                this._invalidateCache(`workItem_${id}`);
                
                Toast.success('Work item updated successfully');
                return result;
            }
            
            return null;
        } catch (error) {
            console.error(`Error updating work item ${id}:`, error);
            Toast.error(error.message || 'Failed to update work item. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Update work item status
    async updateWorkItemStatus(id, status, comments = '') {
        if (!id || !status) {
            throw new Error('WorkItem ID and status are required');
        }

        try {
            LoadingOverlay.show('Updating status...');
            
            const result = await apiClient.updateWorkItemStatus(id, status, comments);
            
            if (result) {
                // Invalidate caches
                this._invalidateCache('workItems');
                this._invalidateCache(`workItem_${id}`);
                
                Toast.success(`Status updated to ${status}`);
                return result;
            }
            
            return null;
        } catch (error) {
            console.error(`Error updating status for work item ${id}:`, error);
            Toast.error(error.message || 'Failed to update status. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Delete a work item
    async deleteWorkItem(id) {
        if (!id) {
            throw new Error('WorkItem ID is required');
        }

        try {
            LoadingOverlay.show('Deleting work item...');
            
            const result = await apiClient.deleteWorkItem(id);
            
            if (result) {
                // Invalidate caches
                this._invalidateCache('workItems');
                this._invalidateCache(`workItem_${id}`);
                
                Toast.success('Work item deleted successfully');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Error deleting work item ${id}:`, error);
            Toast.error('Failed to delete work item. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get work items by project ID
    async getWorkItemsByProject(projectId, status = '') {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        const cacheKey = this._generateCacheKey('projectWorkItems', { projectId, status });
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading project work items...');
            
            let endpoint = `/api/workitems?projectId=${projectId}`;
            if (status) {
                endpoint += `&status=${status}`;
            }
            
            const response = await apiClient.fetch(endpoint);
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return [];
        } catch (error) {
            console.error(`Error fetching work items for project ${projectId}:`, error);
            Toast.error('Failed to load project work items. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get work items assigned to current user
    async getMyWorkItems(status = '') {
        const cacheKey = this._generateCacheKey('myWorkItems', { status });
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading your work items...');
            
            let endpoint = '/api/workitems/me';
            if (status) {
                endpoint += `?status=${status}`;
            }
            
            const response = await apiClient.fetch(endpoint);
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching your work items:', error);
            Toast.error('Failed to load your work items. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get work items by status
    async getWorkItemsByStatus(status) {
        if (!status) {
            throw new Error('Status is required');
        }

        const cacheKey = this._generateCacheKey('workItemsByStatus', { status });
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show(`Loading ${status} work items...`);
            
            const response = await apiClient.fetch(`/api/workitems?status=${status}`);
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return [];
        } catch (error) {
            console.error(`Error fetching ${status} work items:`, error);
            Toast.error(`Failed to load ${status} work items. Please try again.`);
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get work item statistics (count by status, priority, etc.)
    async getWorkItemStats() {
        const cacheKey = this._generateCacheKey('workItemStats');
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading work item statistics...');
            
            const response = await apiClient.fetch('/api/workitems/stats');
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return {
                total: 0,
                byStatus: {},
                byPriority: {},
                byProject: {},
                byAssignee: {}
            };
        } catch (error) {
            console.error('Error fetching work item statistics:', error);
            Toast.error('Failed to load work item statistics. Please try again.');
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
export const workItemService = new WorkItemService();

export default workItemService;
