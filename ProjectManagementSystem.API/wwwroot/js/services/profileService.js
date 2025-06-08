import { apiClient } from '../api/apiClient.js';
import { STORAGE_KEYS, USER_ROLES } from '/js/constants/appConstants.js';
import { Toast, LoadingOverlay } from '../utils/uiUtils.js';
import { authService } from './authService.js';

class ProfileService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes cache for profile data
    }

    // Get current user's profile
    async getMyProfile(forceRefresh = false) {
        const cacheKey = 'myProfile';
        
        // Return cached data if available and not forcing refresh
        if (!forceRefresh) {
            const cached = this._getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
        }

        try {
            LoadingOverlay.show('Loading your profile...');
            const profile = await apiClient.getMyProfile();
            
            if (profile) {
                this._addToCache(cacheKey, profile);
                return profile;
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching profile:', error);
            
            // If unauthorized, log out the user
            if (error.status === 401) {
                authService.logout();
            } else {
                Toast.error('Failed to load your profile. Please try again.');
            }
            
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Update current user's profile
    async updateMyProfile(profileData) {
        try {
            LoadingOverlay.show('Updating your profile...');
            
            // Validate required fields
            if (!profileData.fullName) {
                throw new Error('Full name is required');
            }
            
            const updatedProfile = await apiClient.updateMyProfile(profileData);
            
            if (updatedProfile) {
                // Update cache
                this._addToCache('myProfile', updatedProfile);
                
                // Update auth service with new user data
                authService.currentUser = {
                    ...authService.currentUser,
                    ...updatedProfile
                };
                
                // Update localStorage
                authService._saveUserToStorage(authService.currentUser);
                
                Toast.success('Profile updated successfully');
                return updatedProfile;
            }
            
            return null;
        } catch (error) {
            console.error('Error updating profile:', error);
            Toast.error(error.message || 'Failed to update profile. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Update user's password
    async updatePassword(currentPassword, newPassword, confirmPassword) {
        try {
            LoadingOverlay.show('Updating password...');
            
            // Validate inputs
            if (!currentPassword || !newPassword || !confirmPassword) {
                throw new Error('All password fields are required');
            }
            
            if (newPassword !== confirmPassword) {
                throw new Error('New password and confirmation do not match');
            }
            
            if (newPassword.length < 8) {
                throw new Error('Password must be at least 8 characters long');
            }
            
            const response = await apiClient.updatePassword({
                currentPassword,
                newPassword
            });
            
            if (response && response.success) {
                Toast.success('Password updated successfully');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error updating password:', error);
            Toast.error(error.message || 'Failed to update password. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Upload profile picture
    async uploadProfilePicture(file) {
        try {
            if (!file) {
                throw new Error('Please select a file to upload');
            }
            
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                throw new Error('Only JPG, PNG, and GIF images are allowed');
            }
            
            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                throw new Error('Image size must be less than 5MB');
            }
            
            LoadingOverlay.show('Uploading profile picture...');
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await apiClient.uploadProfilePicture(formData);
            
            if (response && response.photoUrl) {
                // Update cache
                const cachedProfile = this._getFromCache('myProfile') || {};
                this._addToCache('myProfile', {
                    ...cachedProfile,
                    photoUrl: response.photoUrl
                });
                
                // Update auth service
                if (authService.currentUser) {
                    authService.currentUser.photoUrl = response.photoUrl;
                    authService._saveUserToStorage(authService.currentUser);
                }
                
                Toast.success('Profile picture updated successfully');
                return response.photoUrl;
            }
            
            return null;
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            Toast.error(error.message || 'Failed to upload profile picture. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get user preferences
    async getUserPreferences() {
        try {
            const response = await apiClient.getUserPreferences();
            return response || {};
        } catch (error) {
            console.error('Error fetching user preferences:', error);
            return {};
        }
    }

    // Update user preferences
    async updateUserPreferences(preferences) {
        try {
            LoadingOverlay.show('Updating preferences...');
            
            const response = await apiClient.updateUserPreferences(preferences);
            
            if (response) {
                Toast.success('Preferences updated successfully');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error updating preferences:', error);
            Toast.error('Failed to update preferences. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get employee list (for managers)
    async getEmployees() {
        if (!authService.isManager()) {
            throw new Error('Unauthorized: Only managers can view employee list');
        }

        const cacheKey = 'employeeList';
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading employees...');
            
            const response = await apiClient.getEmployeeProfiles();
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching employees:', error);
            
            if (error.status === 403) {
                authService.logout();
            }
            
            Toast.error('Failed to load employees. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get employee details by ID (for managers)
    async getEmployeeById(employeeId) {
        if (!authService.isManager()) {
            throw new Error('Unauthorized: Only managers can view employee details');
        }

        if (!employeeId) {
            throw new Error('Employee ID is required');
        }

        const cacheKey = `employee_${employeeId}`;
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading employee details...');
            
            const response = await apiClient.getEmployeeProfile(employeeId);
            
            if (response) {
                this._addToCache(cacheKey, response);
                return response;
            }
            
            return null;
        } catch (error) {
            console.error(`Error fetching employee ${employeeId}:`, error);
            
            if (error.status === 403) {
                authService.logout();
            }
            
            Toast.error('Failed to load employee details. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get employee's work items (for managers)
    async getEmployeeWorkItems(employeeId, status = '') {
        if (!authService.isManager()) {
            throw new Error('Unauthorized: Only managers can view employee work items');
        }

        if (!employeeId) {
            throw new Error('Employee ID is required');
        }

        const cacheKey = `employee_${employeeId}_workitems_${status || 'all'}`;
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading employee work items...');
            
            let endpoint = `/api/profiles/employees/${employeeId}/workitems`;
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
            console.error(`Error fetching work items for employee ${employeeId}:`, error);
            
            if (error.status === 403) {
                authService.logout();
            }
            
            Toast.error('Failed to load employee work items. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Clear profile cache
    clearCache() {
        this.cache.clear();
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
}

// Create a singleton instance
export const profileService = new ProfileService();

export default profileService;
