import { authService } from './services/authService.js';
import { dashboardService } from './services/dashboardService.js';
import { workItemService } from './services/workItemService.js';
import { profileService } from './services/profileService.js';
import { Toast, LoadingOverlay } from './utils/uiUtils.js';
import { WORK_ITEM_STATUSES, WORK_ITEM_PRIORITIES } from './constants/appConstants.js';

// DOM Elements
const profileNameEl = document.getElementById('profileName');
const profileEmailEl = document.getElementById('profileEmail');
const profileInitialsEl = document.getElementById('profileInitials');
const userNameEl = document.getElementById('userName');
const userInitialsEl = document.getElementById('userInitials');
const logoutLink = document.getElementById('logoutLink');
const profileLink = document.getElementById('profileLink');
const updateProfileBtn = document.getElementById('updateProfileBtn');

// Performance Elements
const performanceValueEl = document.getElementById('performanceValue');
const performanceBar = document.getElementById('performanceBar');
const workloadValueEl = document.getElementById('workloadValue');
const workloadBar = document.getElementById('workloadBar');

// Work Items Table
const workItemsTableBody = document.getElementById('workItemsTableBody');
const showingItemsEl = document.getElementById('showingItems');
const totalItemsEl = document.getElementById('totalItems');

// Filter Buttons
const filterButtons = document.querySelectorAll('[data-filter]');

// Initialize the dashboard
async function initDashboard() {
    try {
        // Show loading state
        LoadingOverlay.show('Loading dashboard...');
        
        // Check authentication
        if (!authService.isAuthenticated) {
            window.location.href = '/';
            return;
        }
        
        // Set up UI with user data
        updateUserInfo();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load data
        await Promise.all([
            loadPerformanceStats(),
            loadWorkItems(),
            loadPerformanceHistory()
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
        
        // Set profile info
        if (profileNameEl) profileNameEl.textContent = fullName || 'User';
        if (profileEmailEl) profileEmailEl.textContent = email || '';
        
        // Set user name in navbar
        if (userNameEl) userNameEl.textContent = fullName || email.split('@')[0];
        
        // Set user initials
        const initials = fullName 
            ? fullName.split(' ').map(n => n[0]).join('').toUpperCase()
            : (email ? email[0].toUpperCase() : 'U');
            
        if (profileInitialsEl) profileInitialsEl.textContent = initials.substring(0, 2);
        if (userInitialsEl) userInitialsEl.textContent = initials.substring(0, 2);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Navigation
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    
    // Profile link
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/profile.html';
        });
    }
    
    // Update profile button
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', () => {
            window.location.href = '/profile-edit.html';
        });
    }
    
    // Filter buttons
    if (filterButtons && filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const status = button.getAttribute('data-filter');
                filterWorkItems(status);
                
                // Update active state
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    }
    
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // TODO: Implement navigation
            new Toast({
                message: 'Navigation coming soon!',
                type: 'info'
            });
        });
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

// Load performance statistics
async function loadPerformanceStats() {
    try {
        const dashboardData = await dashboardService.getDashboardData();
        const { stats } = dashboardData;
        
        if (!stats) {
            throw new Error('No performance data available');
        }
        
        // Update performance meter
        if (performanceValueEl) {
            const performance = stats.performance || 0;
            performanceValueEl.textContent = `${performance}%`;
            performanceBar.style.width = `${performance}%`;
            
            // Set color based on performance
            performanceBar.className = 'progress-bar';
            if (performance >= 90) {
                performanceBar.classList.add('bg-success');
            } else if (performance >= 70) {
                performanceBar.classList.add('bg-warning');
            } else {
                performanceBar.classList.add('bg-danger');
            }
        }
        
        // Update workload meter
        if (workloadValueEl) {
            const workload = stats.workload || 0;
            workloadValueEl.textContent = `${workload}%`;
            workloadBar.style.width = `${workload}%`;
            
            // Set color based on workload
            workloadBar.className = 'progress-bar';
            if (workload < 70) {
                workloadBar.classList.add('bg-success');
            } else if (workload < 90) {
                workloadBar.classList.add('bg-warning');
            } else {
                workloadBar.classList.add('bg-danger');
            }
        }
        
        return stats;
        
    } catch (error) {
        console.error('Error loading performance stats:', error);
        Toast.error('Failed to load performance statistics');
        throw error;
    }
}

// Load work items
async function loadWorkItems() {
    try {
        // Get work items assigned to the current user
        const { myWorkItems = [] } = await dashboardService.getDashboardData();
        
        if (!myWorkItems || myWorkItems.length === 0) {
            workItemsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="text-muted">No work items assigned to you</div>
                        <button class="btn btn-primary btn-sm mt-2" id="browseWorkItemsBtn">
                            Browse Available Work Items
                        </button>
                    </td>
                </tr>`;
            
            // Add event listener to the browse button
            const browseBtn = document.getElementById('browseWorkItemsBtn');
            if (browseBtn) {
                browseBtn.addEventListener('click', () => {
                    window.location.href = '/workitems.html';
                });
            }
            
            updateWorkItemCounts([]);
            return [];
        }
        
        // Transform data to match expected format
        const formattedWorkItems = myWorkItems.map(item => ({
            id: item.workItemId,
            title: item.title,
            project: item.projectName,
            projectId: item.projectId,
            dueDate: item.dueDate,
            status: item.status,
            priority: item.priority || 'Medium',
            description: item.description
        }));
        
        // Render work items
        renderWorkItems(formattedWorkItems);
        
        // Update counts
        updateWorkItemCounts(formattedWorkItems);
        
        return formattedWorkItems;
        
    } catch (error) {
        console.error('Error loading work items:', error);
        Toast.error('Failed to load work items. Please try again.');
        throw error;
    }
}

// Render work items in the table
function renderWorkItems(workItems) {
    if (!workItemsTableBody) return;
    
    // Clear the table body
    workItemsTableBody.innerHTML = '';
    
    if (!workItems || workItems.length === 0) {
        workItemsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    No work items found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by due date (earliest first)
    const sortedItems = [...workItems].sort((a, b) => {
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    // Render each work item
    sortedItems.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'work-item';
        row.dataset.status = item.status.toLowerCase();
        
        // Format due date
        const dueDate = new Date(item.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dueText = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        let dueClass = '';
        
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            dueText = `${Math.abs(diffDays)} days overdue`;
            dueClass = 'text-danger';
        } else if (diffDays === 0) {
            dueText = 'Today';
            dueClass = 'text-warning';
        } else if (diffDays === 1) {
            dueText = 'Tomorrow';
            dueClass = 'text-warning';
        } else if (diffDays <= 7) {
            dueText = `In ${diffDays} days`;
            dueClass = 'text-info';
        }
        
        // Get status badge class
        let statusBadgeClass = 'bg-secondary';
        if (item.status === WORK_ITEM_STATUSES.IN_PROGRESS) statusBadgeClass = 'bg-primary';
        else if (item.status === WORK_ITEM_STATUSES.REVIEW) statusBadgeClass = 'bg-warning text-dark';
        else if (item.status === WORK_ITEM_STATUSES.DONE) statusBadgeClass = 'bg-success';
        else if (item.status === WORK_ITEM_STATUSES.CANCELLED) statusBadgeClass = 'bg-danger';
        
        // Get priority badge class
        let priorityBadgeClass = 'bg-secondary';
        if (item.priority === WORK_ITEM_PRIORITIES.HIGH) priorityBadgeClass = 'bg-danger';
        else if (item.priority === WORK_ITEM_PRIORITIES.MEDIUM) priorityBadgeClass = 'bg-warning text-dark';
        
        row.innerHTML = `
            <td>
                <a href="#" class="text-decoration-none text-dark fw-bold view-work-item" data-id="${item.id}">
                    ${item.title}
                </a>
            </td>
            <td>
                <a href="#" class="text-decoration-none text-primary" data-project-id="${item.projectId}">
                    ${item.project}
                </a>
            </td>
            <td>
                <span class="badge ${priorityBadgeClass}">${item.priority}</span>
            </td>
            <td>
                <span class="badge ${statusBadgeClass}">${item.status}</span>
            </td>
            <td class="${dueClass}">
                ${dueText}
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-primary view-work-item" data-id="${item.id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary update-status" data-id="${item.id}">
                        <i class="bi bi-arrow-repeat"></i>
                    </button>
                </div>
            </td>
        `;
        
        workItemsTableBody.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.view-work-item').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const workItemId = e.target.closest('.view-work-item').dataset.id;
            // TODO: Show work item details
            new Toast({
                message: `Viewing work item #${workItemId}`,
                type: 'info'
            });
        });
    });
    
    document.querySelectorAll('.update-status').forEach(button => {
        button.addEventListener('click', (e) => {
            const workItemId = e.target.closest('.update-status').dataset.id;
            // TODO: Show update status modal
            new Toast({
                message: `Updating status for work item #${workItemId}`,
                type: 'info'
            });
        });
    });
    
    // Project links
    document.querySelectorAll('[data-project-id]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const projectId = e.target.closest('[data-project-id]').dataset.projectId;
            // TODO: Navigate to project
            new Toast({
                message: `Viewing project #${projectId}`,
                type: 'info'
            });
        });
    });
}

// Filter work items by status
function filterWorkItems(status) {
    if (!window.workItems) return;
    
    let filteredItems = [...window.workItems];
    
    if (status && status.toLowerCase() !== 'all') {
        filteredItems = filteredItems.filter(item => 
            item.status.toLowerCase() === status.toLowerCase()
        );
    }
    
    renderWorkItems(filteredItems);
    updateWorkItemCounts(filteredItems);
}

// Update work item counts
function updateWorkItemCounts(workItems) {
    if (!workItems) return;
    
    const totalItems = workItems.length;
    const todoItems = workItems.filter(item => item.status === WORK_ITEM_STATUSES.TODO).length;
    const inProgressItems = workItems.filter(item => item.status === WORK_ITEM_STATUSES.IN_PROGRESS).length;
    const inReviewItems = workItems.filter(item => item.status === WORK_ITEM_STATUSES.REVIEW).length;
    const doneItems = workItems.filter(item => item.status === WORK_ITEM_STATUSES.DONE).length;
    
    // Update counts in the UI
    if (showingItemsEl) showingItemsEl.textContent = totalItems;
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    
    // Update filter badges if they exist
    const filterBadges = {
        'all': totalItems,
        'todo': todoItems,
        'inprogress': inProgressItems,
        'review': inReviewItems,
        'done': doneItems
    };
    
    Object.entries(filterBadges).forEach(([filter, count]) => {
        const badge = document.querySelector(`.filter-badge[data-filter="${filter}"]`);
        if (badge) {
            badge.textContent = count;
        }
    });
}

// Load performance history
async function loadPerformanceHistory() {
    try {
        const { performanceHistory } = await dashboardService.getDashboardData();
        
        if (!performanceHistory || performanceHistory.length === 0) {
            // If no history, show a message
            const chartContainer = document.getElementById('performanceChartContainer');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="text-center p-4">
                        <div class="text-muted mb-2">No performance history available yet</div>
                        <small class="text-muted">Your performance data will appear here as you complete work items</small>
                    </div>`;
            }
            return;
        }
        
        // Transform data for the chart
        const months = [];
        const performanceData = [];
        
        // Get last 6 months of data (or all if less than 6)
        const recentHistory = performanceHistory
            .sort((a, b) => new Date(a.month) - new Date(b.month))
            .slice(-6);
        
        recentHistory.forEach(entry => {
            const date = new Date(entry.month);
            months.push(date.toLocaleString('default', { month: 'short' }));
            performanceData.push(entry.performance || 0);
        });
        
        // Render chart
        renderPerformanceChart({ months, performance: performanceData });
        
    } catch (error) {
        console.error('Error loading performance history:', error);
        Toast.error('Failed to load performance history');
        throw error;
    }
}

// Render performance chart
function renderPerformanceChart(history) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    // Clear loading state
    ctx.innerHTML = '<canvas></canvas>';
    
    const canvas = ctx.querySelector('canvas');
    if (!canvas) return;
    
    const chartCtx = canvas.getContext('2d');
    
    // Create gradient
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(23, 162, 184, 0.3)');
    gradient.addColorStop(1, 'rgba(23, 162, 184, 0.1)');
    
    // Create chart
    new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: history.labels,
            datasets: [{
                label: 'Performance',
                data: history.data,
                backgroundColor: gradient,
                borderColor: '#17a2b8',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#17a2b8',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Performance: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6c757d'
                    }
                },
                y: {
                    min: 50,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#6c757d',
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
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
        loadPerformanceStats,
        loadWorkItems,
        loadPerformanceHistory,
        renderWorkItems,
        filterWorkItems,
        updateWorkItemCounts,
        renderPerformanceChart
    };
}
