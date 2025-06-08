import { authService } from './services/authService.js';
import { dashboardService } from './services/dashboardService.js';
import { workItemService } from './services/workItemService.js';
import { projectService } from './services/projectService.js';
import { profileService } from './services/profileService.js';
import { Toast, LoadingOverlay } from './utils/uiUtils.js';
import { WORK_ITEM_STATUSES, PROJECT_STATUSES, USER_ROLES } from '/js/constants/appConstants.js';

// DOM Elements
const userNameEl = document.getElementById('userName');
const userInitialsEl = document.getElementById('userInitials');
const logoutLink = document.getElementById('logoutLink');
const profileLink = document.getElementById('profileLink');

// Stats Elements
const activeProjectsCountEl = document.getElementById('activeProjectsCount');
const teamMembersCountEl = document.getElementById('teamMembersCount');
const totalWorkItemsCountEl = document.getElementById('totalWorkItemsCount');
const avgPerformanceEl = document.getElementById('avgPerformance');

// Navigation Elements
const dashboardLink = document.getElementById('dashboardLink');
const projectsLink = document.getElementById('projectsLink');
const workItemsLink = document.getElementById('workItemsLink');
const teamLink = document.getElementById('teamLink');
const reportsLink = document.getElementById('reportsLink');

// Quick Action Buttons
const createProjectBtn = document.getElementById('createProjectBtn');
const createWorkItemBtn = document.getElementById('createWorkItemBtn');
const addTeamMemberBtn = document.getElementById('addTeamMemberBtn');

// Count Elements
const allWorkItemsCountEl = document.getElementById('allWorkItemsCount');
const myWorkItemsCountEl = document.getElementById('myWorkItemsCount');
const overdueItemsCountEl = document.getElementById('overdueItemsCount');
const dueSoonItemsCountEl = document.getElementById('dueSoonItemsCount');

// Chart Containers
const projectProgressChartEl = document.getElementById('projectProgressChart');
const workItemsByStatusChartEl = document.getElementById('workItemsByStatusChart');

// Lists
const recentActivityList = document.getElementById('recentActivityList');
const upcomingDeadlinesList = document.getElementById('upcomingDeadlinesList');

// Charts
let projectProgressChart;
let workItemsByStatusChart;

// Initialize the dashboard
async function initDashboard() {
    try {
        // Show loading state
        LoadingOverlay.show('Loading dashboard...');
        
        // Check authentication and role
        if (!authService.isAuthenticated || !authService.isManager()) {
            window.location.href = '/';
            return;
        }
        
        // Set up UI with user data
        updateUserInfo();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load data
        await Promise.all([
            loadDashboardStats(),
            loadProjectProgress(),
            loadWorkItemsByStatus(),
            loadRecentActivity(),
            loadUpcomingDeadlines()
        ]);
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        new Toast({
            message: 'Failed to load dashboard data. Please try again.',
            type: 'error',
            duration: 5000
        });
    } finally {
        LoadingOverlay.hide();
    }
}

// Update user information in the UI
function updateUserInfo() {
    if (authService.currentUser) {
        const { fullName, email } = authService.currentUser;
        
        // Set user name
        if (userNameEl) userNameEl.textContent = fullName || email.split('@')[0];
        
        // Set user initials
        if (userInitialsEl) {
            const initials = fullName 
                ? fullName.split(' ').map(n => n[0]).join('').toUpperCase()
                : email[0].toUpperCase();
            userInitialsEl.textContent = initials.substring(0, 2);
        }
    }
}

// Set up event listeners
function setupEventListeners() {
    // Logout link
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    
    // Profile link
    if (profileLink) {
        profileLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                // Navigate to profile page
                window.location.href = '/profile.html';
            } catch (error) {
                console.error('Error navigating to profile:', error);
                Toast.error('Failed to navigate to profile page');
            }
        });
    }
    
    // Quick action buttons
    if (createProjectBtn) {
        createProjectBtn.addEventListener('click', () => {
            // Show create project modal
            window.location.href = '/project-form.html';
        });
    }
    
    if (createWorkItemBtn) {
        createWorkItemBtn.addEventListener('click', () => {
            // Show create work item modal
            window.location.href = '/workitem-form.html';
        });
    }
    
    if (addTeamMemberBtn) {
        addTeamMemberBtn.addEventListener('click', () => {
            // Show add team member modal
            window.location.href = '/team-invite.html';
        });
    }
    
    // Navigation links
    const navLinks = [dashboardLink, projectsLink, workItemsLink, teamLink, reportsLink];
    navLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                // Navigate to the corresponding page
                window.location.href = `/${page}.html`;
            });
        }
    });
}

// Handle logout
async function handleLogout(e) {
    e.preventDefault();
    
    try {
        LoadingOverlay.show('Logging out...');
        
        // Call the API to invalidate the token
        await authService.logout();
        
        // Clear auth data
        authService.clearAuth();
        
        // Show logout message
        Toast.success('You have been logged out successfully');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    } catch (error) {
        console.error('Error during logout:', error);
        // Even if logout API fails, we still want to clear local auth state
        authService.clearAuth();
        window.location.href = '/';
    } finally {
        LoadingOverlay.hide();
    }    
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const dashboardData = await dashboardService.getDashboardData();
        const { stats } = dashboardData;

        // Update UI with real data
        if (activeProjectsCountEl) activeProjectsCountEl.textContent = stats.activeProjects || 0;
        if (teamMembersCountEl) teamMembersCountEl.textContent = stats.teamMembers || 0;
        if (totalWorkItemsCountEl) totalWorkItemsCountEl.textContent = stats.totalWorkItems || 0;
        if (avgPerformanceEl) {
            const avgPerf = stats.avgPerformance || 0;
            avgPerformanceEl.textContent = `${avgPerf}%`;
            
            // Add color coding based on performance
            avgPerformanceEl.className = '';
            if (avgPerf >= 90) avgPerformanceEl.classList.add('text-success');
            else if (avgPerf >= 70) avgPerformanceEl.classList.add('text-warning');
            else avgPerformanceEl.classList.add('text-danger');
        }

        // Update counts in the work items section
        if (allWorkItemsCountEl) allWorkItemsCountEl.textContent = stats.totalWorkItems || 0;
        if (myWorkItemsCountEl) myWorkItemsCountEl.textContent = stats.myWorkItems || 0;
        if (overdueItemsCountEl) overdueItemsCountEl.textContent = stats.overdueItems || 0;
        if (dueSoonItemsCountEl) dueSoonItemsCountEl.textContent = stats.dueSoonItems || 0;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        Toast.error('Failed to load dashboard statistics. Please try again.');
        throw error;
    }
}

// Load project progress data and render chart
async function loadProjectProgress() {
    try {
        const { recentProjects = [] } = await dashboardService.getDashboardData();
        
        // Map to the format expected by the chart
        const projects = recentProjects.map(project => ({
            id: project.projectId,
            name: project.name,
            progress: project.progress || 0,
            status: project.status,
            dueDate: project.dueDate
        }));

        // Render chart
        renderProjectProgressChart(projects);

    } catch (error) {
        console.error('Error loading project progress:', error);
        Toast.error('Failed to load project progress data.');
        throw error;
    }
}

// Render project progress chart
function renderProjectProgressChart(projects) {
    if (!projectProgressChartEl) return;
    
    // Clear loading state
    projectProgressChartEl.innerHTML = '<canvas></canvas>';
    
    const ctx = projectProgressChartEl.querySelector('canvas').getContext('2d');
    
    // Prepare data
    const labels = projects.map(p => p.name);
    const progressData = projects.map(p => p.progress);
    const backgroundColors = projects.map(p => {
        if (p.status === 'Completed') return '#28a745'; // Green for completed
        if (p.progress < 30) return '#dc3545'; // Red for less than 30%
        if (p.progress < 70) return '#ffc107'; // Yellow for 30-70%
        return '#17a2b8'; // Cyan for 70%+
    });
    
    // Create chart
    projectProgressChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Progress %',
                data: progressData,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Progress: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Progress %'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Load work items by status and render chart
async function loadWorkItemsByStatus() {
    try {
        const { stats = {} } = await dashboardService.getDashboardData();
        
        // Get status counts from stats
        const statusCounts = {
            'To Do': stats.toDoCount || 0,
            'In Progress': stats.inProgressCount || 0,
            'In Review': stats.inReviewCount || 0,
            'Done': stats.doneCount || 0
        };

        // Render chart
        renderWorkItemsByStatusChart(statusCounts);

    } catch (error) {
        console.error('Error loading work items by status:', error);
        Toast.error('Failed to load work items status data.');
        throw error;
    }
}

// Render work items by status chart
function renderWorkItemsByStatusChart(statusCounts) {
    if (!workItemsByStatusChartEl) return;
    
    // Clear loading state
    workItemsByStatusChartEl.innerHTML = '<canvas></canvas>';
    
    const ctx = workItemsByStatusChartEl.querySelector('canvas').getContext('2d');
    
    // Prepare data
    const labels = Object.keys(statusCounts).map(key => 
        key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()
    );
    const data = Object.values(statusCounts);
    const backgroundColors = [
        '#6c757d', // To Do - Gray
        '#17a2b8', // In Progress - Cyan
        '#ffc107', // In Review - Yellow
        '#28a745', // Done - Green
    ];
    
    // Create chart
    workItemsByStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const { recentActivity = [] } = await dashboardService.getDashboardData();
        
        if (!recentActivity || recentActivity.length === 0) {
            recentActivityList.innerHTML = `
                <div class="text-muted text-center p-3">
                    No recent activity found
                </div>`;
            return;
        }
        
        // Render activities
        renderRecentActivities(recentActivity);

    } catch (error) {
        console.error('Error loading recent activity:', error);
        Toast.error('Failed to load recent activity.');
        throw error;
    }
}

// Render recent activities
function renderRecentActivities(activities) {
    if (!recentActivityList) return;
    
    // Clear loading state
    recentActivityList.innerHTML = '';
    
    if (!activities || activities.length === 0) {
        recentActivityList.innerHTML = `
            <div class="text-center text-muted py-4">
                No recent activities found.
            </div>
        `;
        return;
    }
    
    // Render each activity
    activities.forEach(activity => {
        const activityEl = document.createElement('div');
        activityEl.className = 'activity-item mb-3';
        
        // Get icon based on activity type
        let iconClass = 'bi-question-circle';
        if (activity.type === 'workitem') iconClass = 'bi-card-checklist';
        else if (activity.type === 'project') iconClass = 'bi-folder';
        else if (activity.type === 'comment') iconClass = 'bi-chat-left-text';
        
        // Format the action text
        let actionText = `${activity.action} ${activity.type}`;
        if (activity.action.endsWith('e')) {
            actionText = `${activity.action}d ${activity.type}`;
        } else if (activity.action.endsWith('y')) {
            actionText = `${activity.action.slice(0, -1)}ied ${activity.type}`;
        } else {
            actionText = `${activity.action}ed ${activity.type}`;
        }
        
        activityEl.innerHTML = `
            <div class="d-flex">
                <div class="flex-shrink-0 me-3">
                    <div class="bg-light rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                        <i class="bi ${iconClass} text-primary"></i>
                    </div>
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between">
                        <h6 class="mb-1">${activity.title}</h6>
                        <small class="text-muted">${activity.time}</small>
                    </div>
                    <p class="mb-1 small">
                        <span class="text-muted">${activity.user}</span> ${actionText} in 
                        <a href="#" class="text-primary">${activity.project}</a>
                    </p>
                </div>
            </div>
        `;
        
        recentActivityList.appendChild(activityEl);
    });
}

// Load upcoming deadlines
async function loadUpcomingDeadlines() {
    try {
        const { upcomingDeadlines = [] } = await dashboardService.getDashboardData();
        
        if (!upcomingDeadlines || upcomingDeadlines.length === 0) {
            upcomingDeadlinesList.innerHTML = `
                <div class="text-muted text-center p-3">
                    No upcoming deadlines
                </div>`;
            return;
        }
        
        // Sort by due date (nearest first)
        const sortedDeadlines = [...upcomingDeadlines].sort((a, b) => 
            new Date(a.dueDate) - new Date(b.dueDate)
        );
        
        // Render deadlines
        renderUpcomingDeadlines(sortedDeadlines);

    } catch (error) {
        console.error('Error loading upcoming deadlines:', error);
        Toast.error('Failed to load upcoming deadlines.');
        throw error;
    }
}

// Render upcoming deadlines
function renderUpcomingDeadlines(deadlines) {
    if (!upcomingDeadlinesList) return;
    
    // Clear loading state
    upcomingDeadlinesList.innerHTML = '';
    
    if (!deadlines || deadlines.length === 0) {
        upcomingDeadlinesList.innerHTML = `
            <div class="text-center text-muted py-4">
                No upcoming deadlines found.
            </div>
        `;
        return;
    }
    
    // Sort by due date
    deadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Render each deadline
    deadlines.forEach(deadline => {
        const deadlineEl = document.createElement('div');
        deadlineEl.className = 'list-group-item';
        
        // Format due date
        const dueDate = new Date(deadline.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dueText = '';
        let badgeClass = 'bg-secondary';
        
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            dueText = 'Today';
            badgeClass = 'bg-danger';
        } else if (diffDays === 1) {
            dueText = 'Tomorrow';
            badgeClass = 'bg-warning text-dark';
        } else if (diffDays < 0) {
            dueText = `${Math.abs(diffDays)} days overdue`;
            badgeClass = 'bg-danger';
        } else if (diffDays <= 7) {
            dueText = `In ${diffDays} days`;
            badgeClass = 'bg-info';
        } else {
            dueText = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        // Get priority badge class
        let priorityBadgeClass = 'bg-secondary';
        if (deadline.priority === 'High') priorityBadgeClass = 'bg-danger';
        else if (deadline.priority === 'Medium') priorityBadgeClass = 'bg-warning text-dark';
        else if (deadline.priority === 'Low') priorityBadgeClass = 'bg-info';
        
        deadlineEl.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${deadline.title}</h6>
                    <p class="mb-0 small text-muted">
                        Project: ${deadline.project}
                        <span class="badge ${priorityBadgeClass} ms-2">${deadline.priority}</span>
                    </p>
                </div>
                <div class="text-end">
                    <span class="badge ${badgeClass} mb-1">${dueText}</span>
                    <div class="mt-1">
                        <button class="btn btn-sm btn-outline-primary view-work-item" data-id="${deadline.id}">
                            View
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        upcomingDeadlinesList.appendChild(deadlineEl);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-work-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const workItemId = e.target.closest('button').dataset.id;
            // TODO: Navigate to work item details
            new Toast({
                message: `Viewing work item #${workItemId}`,
                type: 'info'
            });
        });
    });
}

// Initialize the dashboard when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// Export for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initDashboard,
        updateUserInfo,
        loadDashboardStats,
        loadProjectProgress,
        loadWorkItemsByStatus,
        loadRecentActivity,
        loadUpcomingDeadlines,
        renderProjectProgressChart,
        renderWorkItemsByStatusChart,
        renderRecentActivities,
        renderUpcomingDeadlines
    };
}
