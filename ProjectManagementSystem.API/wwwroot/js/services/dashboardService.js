import { apiClient } from '../api/apiClient.js';
import { WORK_ITEM_STATUSES, PROJECT_STATUSES, USER_ROLES } from '../constants/appConstants.js';
import { Toast, LoadingOverlay } from '../utils/uiUtils.js';
import { workItemService } from './workItemService.js';
import { projectService } from './projectService.js';
import { authService } from './authService.js';

class DashboardService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 2 * 60 * 1000; // 2 minutes cache for dashboard data
    }

    // Get dashboard data based on user role
    async getDashboardData() {
        const isManager = authService.isManager();
        return isManager ? this.getManagerDashboard() : this.getEmployeeDashboard();
    }

    // Get manager dashboard data
    async getManagerDashboard() {
        const cacheKey = 'managerDashboard';
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading dashboard...');
            
            // Fetch all data in parallel
            const [
                projectsData,
                workItemsData,
                statsData,
                recentActivity,
                upcomingDeadlines
            ] = await Promise.all([
                projectService.getProjects({}, 1, 5), // Get first 5 projects
                workItemService.getWorkItems({}, 1, 10), // Get first 10 work items
                this._getManagerStats(),
                this._getRecentActivity(),
                this._getUpcomingDeadlines()
            ]);

            const dashboardData = {
                stats: statsData,
                recentProjects: projectsData.items || [],
                recentWorkItems: workItemsData.items || [],
                recentActivity,
                upcomingDeadlines,
                lastUpdated: new Date().toISOString()
            };

            this._addToCache(cacheKey, dashboardData);
            return dashboardData;
        } catch (error) {
            console.error('Error loading manager dashboard:', error);
            Toast.error('Failed to load dashboard data. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get employee dashboard data
    async getEmployeeDashboard() {
        const cacheKey = 'employeeDashboard';
        const cached = this._getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        try {
            LoadingOverlay.show('Loading your dashboard...');
            
            // Fetch all data in parallel
            const [
                myWorkItems,
                myProjects,
                statsData,
                recentActivity,
                upcomingDeadlines
            ] = await Promise.all([
                workItemService.getMyWorkItems(),
                this._getMyProjects(),
                this._getEmployeeStats(),
                this._getRecentActivity(),
                this._getUpcomingDeadlines()
            ]);

            const dashboardData = {
                stats: statsData,
                myWorkItems: myWorkItems.items || myWorkItems || [],
                myProjects: myProjects.items || myProjects || [],
                recentActivity,
                upcomingDeadlines,
                lastUpdated: new Date().toISOString()
            };

            this._addToCache(cacheKey, dashboardData);
            return dashboardData;
        } catch (error) {
            console.error('Error loading employee dashboard:', error);
            Toast.error('Failed to load your dashboard. Please try again.');
            throw error;
        } finally {
            LoadingOverlay.hide();
        }
    }

    // Get manager-specific statistics
    async _getManagerStats() {
        try {
            const [
                projectsData,
                workItemsData,
                teamData
            ] = await Promise.all([
                projectService.getProjectStats(),
                workItemService.getWorkItemStats(),
                this._getTeamStats()
            ]);

            return {
                totalProjects: projectsData.total || 0,
                activeProjects: projectsData.active || 0,
                closedProjects: projectsData.closed || 0,
                totalWorkItems: workItemsData.total || 0,
                completedWorkItems: workItemsData.byStatus?.[WORK_ITEM_STATUSES.DONE] || 0,
                inProgressWorkItems: workItemsData.byStatus?.[WORK_ITEM_STATUSES.IN_PROGRESS] || 0,
                teamMembers: teamData.totalMembers || 0,
                activeTeamMembers: teamData.activeMembers || 0,
                projectsByStatus: projectsData.byStatus || {},
                workItemsByStatus: workItemsData.byStatus || {},
                workItemsByPriority: workItemsData.byPriority || {},
                workItemsByProject: workItemsData.byProject || {},
                workItemsByAssignee: workItemsData.byAssignee || {}
            };
        } catch (error) {
            console.error('Error loading manager stats:', error);
            return this._getDefaultManagerStats();
        }
    }

    // Get employee-specific statistics
    async _getEmployeeStats() {
        try {
            const [
                myWorkItems,
                completedThisWeek,
                performanceData
            ] = await Promise.all([
                workItemService.getMyWorkItems(),
                this._getCompletedWorkItemsThisWeek(),
                this._getMyPerformanceData()
            ]);

            const totalWorkItems = myWorkItems.length || 0;
            const completedWorkItems = myWorkItems.filter(item => 
                item.status === WORK_ITEM_STATUSES.DONE
            ).length || 0;
            const inProgressWorkItems = myWorkItems.filter(item => 
                item.status === WORK_ITEM_STATUSES.IN_PROGRESS || 
                item.status === WORK_ITEM_STATUSES.REVIEW
            ).length || 0;

            return {
                totalWorkItems,
                completedWorkItems,
                inProgressWorkItems,
                completedThisWeek: completedThisWeek.length || 0,
                performanceScore: performanceData.score || 100,
                performanceTrend: performanceData.trend || 'neutral',
                workloadPercentage: performanceData.workload || 0,
                onTrack: performanceData.onTrack || true
            };
        } catch (error) {
            console.error('Error loading employee stats:', error);
            return this._getDefaultEmployeeStats();
        }
    }

    // Get team statistics (for manager dashboard)
    async _getTeamStats() {
        try {
            const response = await apiClient.fetch('/api/dashboard/team-stats');
            return response || { totalMembers: 0, activeMembers: 0 };
        } catch (error) {
            console.error('Error loading team stats:', error);
            return { totalMembers: 0, activeMembers: 0 };
        }
    }

    // Get completed work items for current week (employee dashboard)
    async _getCompletedWorkItemsThisWeek() {
        try {
            const response = await apiClient.fetch('/api/workitems/completed-this-week');
            return response || [];
        } catch (error) {
            console.error('Error loading completed work items:', error);
            return [];
        }
    }

    // Get performance data for employee
    async _getMyPerformanceData() {
        try {
            const response = await apiClient.fetch('/api/dashboard/my-performance');
            return response || { score: 100, trend: 'neutral', workload: 0, onTrack: true };
        } catch (error) {
            console.error('Error loading performance data:', error);
            return { score: 100, trend: 'neutral', workload: 0, onTrack: true };
        }
    }

    // Get recent activity for dashboard
    async _getRecentActivity(limit = 10) {
        try {
            const response = await apiClient.fetch(`/api/activity/recent?limit=${limit}`);
            return response || [];
        } catch (error) {
            console.error('Error loading recent activity:', error);
            return [];
        }
    }

    // Get upcoming deadlines
    async _getUpcomingDeadlines(days = 7) {
        try {
            const response = await apiClient.fetch(`/api/workitems/upcoming-deadlines?days=${days}`);
            return response || [];
        } catch (error) {
            console.error('Error loading upcoming deadlines:', error);
            return [];
        }
    }

    // Get projects for current user
    async _getMyProjects() {
        try {
            const response = await apiClient.fetch('/api/projects/my-projects');
            return response || [];
        } catch (error) {
            console.error('Error loading my projects:', error);
            return [];
        }
    }

    // Default manager stats (fallback)
    _getDefaultManagerStats() {
        return {
            totalProjects: 0,
            activeProjects: 0,
            closedProjects: 0,
            totalWorkItems: 0,
            completedWorkItems: 0,
            inProgressWorkItems: 0,
            teamMembers: 0,
            activeTeamMembers: 0,
            projectsByStatus: {},
            workItemsByStatus: {},
            workItemsByPriority: {},
            workItemsByProject: {},
            workItemsByAssignee: {}
        };
    }

    // Default employee stats (fallback)
    _getDefaultEmployeeStats() {
        return {
            totalWorkItems: 0,
            completedWorkItems: 0,
            inProgressWorkItems: 0,
            completedThisWeek: 0,
            performanceScore: 100,
            performanceTrend: 'neutral',
            workloadPercentage: 0,
            onTrack: true
        };
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

    // Invalidate dashboard cache
    refreshDashboard() {
        this.cache.clear();
        return this.getDashboardData();
    }
}

// Create a singleton instance
export const dashboardService = new DashboardService();

export default dashboardService;
