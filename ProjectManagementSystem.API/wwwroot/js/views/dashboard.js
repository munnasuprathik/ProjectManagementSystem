import { api } from '../api.js';
import auth from '../authState.js';
import { formatDate, formatDaysRemaining } from '../utils/dateUtils.js';

// Alias for backward compatibility
const Auth = { getInstance: () => auth };
import { createPieChart, createBarChart, createLineChart } from '../utils/uiComponents.js';
import { 
    showToast, 
    
    formatWorkload, 
    formatStatusBadge, 
    formatPriorityBadge,
    showLoading 
} from '../utils/uiUtils.js';


// Initialize dashboard based on user role
async function initializeDashboard() {
    try {
        const isAuthenticated = await auth.init();
        
        // If we're on login page, don't proceed with dashboard initialization
        if (window.location.pathname === '/login' || window.location.pathname === '/login.html') {
            return;
        }

        if (!isAuthenticated) {
            // Store current URL for redirecting back after login
            if (window.location.pathname !== '/login' && window.location.pathname !== '/login.html') {
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            }
            window.location.replace('/login');
            return;
        }
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('User not found after authentication');
        }
        
        if (currentUser.role === 'Manager') {
            await renderManagerDashboard();
        } else {
            await renderEmployeeDashboard();
        }
        
        // Add event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showToast('Failed to load dashboard. Please try again.', 'error');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('login')) {
            window.location.replace('/login');
        }
    }
}

// Export functions that might be used by other files
function ensureDashboardElements() {
    const app = document.getElementById('app');
    if (!app) return false;
    
    // Create dashboard container if it doesn't exist
    if (!document.getElementById('dashboardContent')) {
        app.innerHTML = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1 id="dashboardTitle" class="h3 mb-0">Dashboard</h1>
                    <div class="d-flex align-items-center">
                        <div id="welcomeMessage" class="me-3"></div>
                        
                    </div>
                </div>
                
                <!-- Project Stats -->
                <div id="projectStats" class="row mb-4"></div>
                
                <!-- Projects Table -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="card-title mb-0">Projects</h5>
                    </div>
                    <div class="card-body">
                        <div id="projectsContainer">
                            <div class="d-flex justify-content-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading projects...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                

                
                <!-- Upcoming Deadlines -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="card-title mb-0">Upcoming Deadlines</h5>
                    </div>
                    <div class="card-body">
                        <div id="upcomingDeadlines"></div>
                    </div>
                </div>
            </div>
        `;
    }
    return true;
}

export async function renderManagerDashboard() {
    try {
        console.log('Rendering manager dashboard...');
        showLoading(true);
        
        // Ensure all required DOM elements exist
        if (!ensureDashboardElements()) {
            throw new Error('Failed to initialize dashboard elements');
        }
        
        // Fetch dashboard data
        console.log('Fetching dashboard data...');
        const dashboardData = await api.getManagerDashboard();
        console.log('Dashboard data received:', dashboardData);
        
        // Update dashboard header
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            // Fetch team members for the dropdown
            let teamMembers = [];
            try {
                teamMembers = await api.getTeamMembers();
                console.log('Fetched team members:', teamMembers);
                
                // Debug: Log the first member's details
                if (teamMembers.length > 0) {
                    console.log('First team member details:', {
                        id: teamMembers[0].userId,
                        name: `${teamMembers[0].firstName} ${teamMembers[0].lastName}`.trim(),
                        email: teamMembers[0].email,
                        role: teamMembers[0].role,
                        performance: teamMembers[0].performance,
                        workload: teamMembers[0].workload,
                        skills: teamMembers[0].skills
                    });
                }
            } catch (error) {
                console.error('Error fetching team members:', error);
                showToast('Failed to load team members. Using sample data.', 'warning');
                // Fallback to sample data
                teamMembers = [{
                    userId: '1',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    role: 'Developer',
                    performance: 85,
                    workload: 65,
                    skills: 'C#, JavaScript, SQL'
                }];
            }

            // Function to get initials from name
            const getInitials = (name = '') => {
                if (!name) return 'U';
                return name.split(' ')
                    .map(part => part.charAt(0))
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
            };

            // Function to get performance color class
            const getPerformanceColor = (performance) => {
                const score = parseFloat(performance) || 0;
                if (score >= 80) return 'success';
                if (score >= 50) return 'warning';
                return 'danger';
            };

            // Function to get workload color class
            const getWorkloadColor = (workload) => {
                const load = parseFloat(workload) || 0;
                if (load >= 80) return 'danger';
                if (load >= 50) return 'warning';
                return 'success';
            };

            // Function to format performance/load value
            const formatValue = (value) => {
                const num = parseFloat(value) || 0;
                return Math.min(100, Math.max(0, num)).toFixed(1);
            };

            welcomeMessage.innerHTML = `
                <div class="d-flex justify-content-between align-items-center w-100">
                    <div class="d-flex align-items-center">
                        <span class="badge bg-primary me-2">Active Projects: ${dashboardData.ActiveProjects || 0}</span>
                        <div class="dropdown d-inline-block me-2">
                            <button class="btn btn-sm btn-outline-success dropdown-toggle" type="button" id="teamMembersDropdown" 
                                    data-bs-toggle="dropdown" aria-expanded="false">
                                Team: ${dashboardData.TotalEmployees || 0} Members
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="teamMembersDropdown" style="width: 300px; max-height: 400px; overflow-y: auto;">
                                ${teamMembers.length > 0 
                                    ? teamMembers.map(member => {
                                        const fullName = member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'User';
                                        const email = member.email || 'No email';
                                        const performance = member.performance || 0;
                                        const workload = member.workload || member.currentWorkload || 0;
                                        const skills = member.skills || '';
                                        
                                        return `
                                        <li>
                                            <a class="dropdown-item d-flex align-items-center py-2" href="#" data-user-id="${member.userId || member.id || ''}">
                                                <div class="avatar-sm me-2">
                                                    <div class="avatar-title bg-light text-dark rounded-circle">
                                                        ${getInitials(fullName)}
                                                    </div>
                                                </div>
                                                <div class="flex-grow-1">
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <span class="fw-semibold text-truncate" style="max-width: 120px;">${fullName}</span>
                                                        <span class="badge bg-${getPerformanceColor(performance)} bg-opacity-10 text-${getPerformanceColor(performance)} ms-2">
                                                            ${formatValue(performance)}%
                                                        </span>
                                                    </div>
                                                    <div class="d-flex justify-content-between align-items-center mt-1">
                                                        <small class="text-muted text-truncate" style="max-width: 120px;">${email}</small>
                                                        <div class="progress flex-grow-1 ms-2" style="height: 4px;">
                                                            <div class="progress-bar bg-${getWorkloadColor(workload)}" 
                                                                 role="progressbar" 
                                                                 style="width: ${formatValue(workload)}%" 
                                                                 aria-valuenow="${formatValue(workload)}" 
                                                                 aria-valuemin="0" 
                                                                 aria-valuemax="100">
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>
                                        </li>`;
                                    }).join('')
                                    : '<li><span class="dropdown-item text-muted">No team members found</span></li>'
                                }
                            </ul>
                        </div>
                        <span class="badge bg-info text-dark">Work Items: ${dashboardData.TotalWorkItems || 0}</span>
                    </div>
                    <button id="createProjectBtn" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createProjectModal">
                        <i class="bi bi-plus-lg me-1"></i> Create Project
                    </button>
                </div>
                
                <!-- Team Members Table -->
                <div class="card mt-4">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Team Members</h5>
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#teamMembersTable">
                            <i class="bi bi-chevron-down"></i>
                        </button>
                    </div>
                    <div class="collapse show" id="teamMembersTable">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th style="width: 40px;"></th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Workload</th>
                                        <th>Skills</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${teamMembers.length > 0 
                                        ? teamMembers.map(member => {
                                            const fullName = member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'User';
                                            const email = member.email || 'No email';
                                            const role = member.role || 'Employee';
                                            const performance = member.performance || 0;
                                            const workload = member.workload || member.currentWorkload || 0;
                                            const skills = member.skills || '';
                                            
                                            return `
                                            <tr>
                                                <td>
                                                    <div class="avatar-xs">
                                                        <span class="avatar-title rounded-circle bg-light text-dark">
                                                            ${getInitials(fullName)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <h6 class="mb-0">${fullName}</h6>
                                                    <small class="text-muted">${role}</small>
                                                </td>
                                                <td>${email}</td>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <div class="progress flex-grow-1 me-2" style="height: 6px;">
                                                            <div class="progress-bar bg-${getWorkloadColor(workload)}" 
                                                                 role="progressbar" 
                                                                 style="width: ${formatValue(workload)}%" 
                                                                 aria-valuenow="${formatValue(workload)}" 
                                                                 aria-valuemin="0" 
                                                                 aria-valuemax="100">
                                                            </div>
                                                        </div>
                                                        <span class="text-nowrap">${formatValue(workload)}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-wrap gap-1">
                                                        ${skills.split(',').filter(skill => skill.trim()).map(skill => `
                                                            <span class="badge bg-light text-dark border">${skill.trim()}</span>
                                                        `).join('') || '-'}
                                                    </div>
                                                </td>
                                            </tr>`;
                                        }).join('')
                                        : `
                                            <tr>
                                                <td colspan="6" class="text-center py-4">
                                                <td colspan="7" class="text-center py-4">
                                                    <div class="text-muted">No team members found</div>
                                                </td>
                                            </tr>
                                        `
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            // Initialize Bootstrap dropdowns after adding them to the DOM
            setTimeout(() => {
                const dropdownElementList = document.querySelectorAll('.dropdown-toggle');
                dropdownElementList.forEach(function (dropdownToggleEl) {
                    // Dispose of any existing dropdown instances
                    const existingDropdown = bootstrap.Dropdown.getInstance(dropdownToggleEl);
                    if (existingDropdown) {
                        existingDropdown.dispose();
                    }
                    // Initialize new dropdown
                    new bootstrap.Dropdown(dropdownToggleEl, {
                        boundary: 'clippingParents',
                        offset: [0, 2]
                    });
                    
                    // Add click handler for dropdown items
                    const dropdownMenu = dropdownToggleEl.nextElementSibling;
                    if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
                        dropdownMenu.addEventListener('click', (e) => {
                            e.stopPropagation();
                        });
                    }
                });
                
                console.log('Dropdowns initialized:', dropdownElementList.length);
            }, 0);
        }
        
        try {
            // Debug: Log the entire dashboard data structure
            console.log('Dashboard data structure:', Object.keys(dashboardData));
            
            // Check if Projects exists and log its type and content
            console.log('Projects data:', {
                exists: 'Projects' in dashboardData,
                type: typeof dashboardData.Projects,
                isArray: Array.isArray(dashboardData.Projects),
                length: dashboardData.Projects?.length,
                firstItem: dashboardData.Projects?.[0]
            });
            
            // Render project stats
            console.log('Rendering project stats...');
            renderProjectStats(dashboardData);
            
            // Initialize charts
            console.log('Initializing charts...');
            initManagerCharts(dashboardData);
            
            // Render projects table
            if (dashboardData.Projects?.length > 0) {
                console.log('Rendering projects table...');
                renderProjectsTable(dashboardData.Projects, 'projectsContainer');
            } else {
                console.log('No projects to display');
                const container = document.getElementById('projectsContainer');
                if (container) container.innerHTML = '<div class="alert alert-info">No projects found. Create your first project to get started.</div>';
            }
            
            // Render recent work items
            if (dashboardData.RecentWorkItems?.length > 0) {
                console.log('Rendering recent work items...');
                renderWorkItemsTable(dashboardData.RecentWorkItems, 'recentWorkItemsContainer');
            } else {
                console.log('No recent work items to display');
                const container = document.getElementById('recentWorkItemsContainer');
                if (container) container.innerHTML = '<div class="alert alert-info">No recent work items found.</div>';
            }
            
            // Render upcoming deadlines
            if (dashboardData.UpcomingDeadlines?.length > 0) {
                console.log('Rendering upcoming deadlines...');
                renderUpcomingDeadlines(dashboardData.UpcomingDeadlines, 'upcomingDeadlines');
            } else {
                console.log('No upcoming deadlines to display');
                const container = document.getElementById('upcomingDeadlines');
                if (container) container.innerHTML = '<p>No upcoming deadlines.</p>';
            }
        } catch (renderError) {
            console.error('Error rendering dashboard components:', renderError);
            showToast('Error displaying dashboard data', 'error');
        }
        
        // Show dashboard content
        const dashboardContent = document.getElementById('dashboardContent');
        if (dashboardContent) {
            dashboardContent.classList.remove('d-none');
            console.log('Dashboard content displayed');
        }
    } catch (error) {
        console.error('Error loading manager dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

// Render project stats for manager dashboard
function renderProjectStats(dashboardData) {
    console.log('Rendering project stats with data:', dashboardData);
    const statsContainer = document.getElementById('projectStats');
    if (!statsContainer) {
        console.error('Project stats container not found');
        return;
    }
    
    statsContainer.innerHTML = `
        <div class="row g-4 mb-4">
            <div class="col-md-4">
                <div class="card h-100 border-start border-4 border-primary">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-uppercase text-muted mb-0">Total Projects</h6>
                                <h2 class="mb-0">${dashboardData.TotalProjects || 0}</h2>
                            </div>
                            <div class="icon-shape bg-primary bg-opacity-10 text-primary rounded-3">
                                <i class="bi bi-folder"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 border-start border-4 border-success">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-uppercase text-muted mb-0">Active Projects</h6>
                                <h2 class="mb-0">${dashboardData.ActiveProjects || 0}</h2>
                            </div>
                            <div class="icon-shape bg-success bg-opacity-10 text-success rounded-3">
                                <i class="bi bi-lightning-charge"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 border-start border-4 border-info">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-uppercase text-muted mb-0">Team Members</h6>
                                <h2 class="mb-0">${dashboardData.TotalEmployees || 0}</h2>
                            </div>
                            <div class="icon-shape bg-info bg-opacity-10 text-info rounded-3">
                                <i class="bi bi-people"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Charts have been removed as per user request -->
    `;
}

// Render work items by status for employee dashboard
function renderWorkItemsByStatus(workItemsByStatus, containerId) {
    console.log('=== renderWorkItemsByStatus called ===');
    console.log('Container ID:', containerId);
    console.log('Work items data type:', typeof workItemsByStatus);
    console.log('Work items is array?:', Array.isArray(workItemsByStatus));
    console.log('Work items length:', workItemsByStatus?.length || 0);
    
    // Log the first item's structure if available
    if (workItemsByStatus && workItemsByStatus.length > 0) {
        console.log('First work item structure:', JSON.parse(JSON.stringify(workItemsByStatus[0])));
    }
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }
    
    if (!workItemsByStatus || workItemsByStatus.length === 0) {
        const message = 'No work items data available';
        console.log(message);
        container.innerHTML = `<p class="text-muted">${message}</p>`;
        return;
    }
    
    try {
        // Handle different data formats and ensure we have an array
        const items = Array.isArray(workItemsByStatus) ? workItemsByStatus : [workItemsByStatus];
        
        // Process each status item
        const statusItems = items.map(item => ({
            status: item.Status || item.status || 'Unknown',
            count: item.Count || item.count || 0
        }));
        
        console.log('Processed status items:', statusItems);
        
        container.innerHTML = `
            <div class="row g-4">
                ${statusItems.map(item => {
                    const status = item.status || 'Unknown';
                    const count = item.count || 0;
                    const statusColor = getStatusColor(status);
                    
                    return `
                    <div class="col-md-3">
                        <div class="card h-100 border-start border-4 border-${statusColor}">
                            <div class="card-body text-center">
                                <h2 class="mb-1">${count}</h2>
                                <p class="text-muted mb-0">${status}</p>
                            </div>
                            <!-- View All button removed -->
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
        
        console.log('Successfully rendered work items by status');
    } catch (error) {
        console.error('Error rendering work items by status:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                Error displaying work items. Please try refreshing the page.
                ${process.env.NODE_ENV === 'development' ? `<br><small>${error.message}</small>` : ''}
            </div>`;
    }
}

// Helper function to get color for status
function getStatusColor(status) {
    const statusColors = {
        'ToDo': 'secondary',
        'InProgress': 'primary',
        'Review': 'info',
        'Done': 'success',
        'Cancelled': 'danger',
        'Active': 'success',
        'OnHold': 'warning',
        'Closed': 'secondary'
    };
    return statusColors[status] || 'secondary';
}

// Chart creation functions are imported from uiComponents.js

// Render projects table
function renderProjectsTable(projects, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }

    if (!Array.isArray(projects) || projects.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No projects found.</div>';
        return;
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const getStatusBadge = (status) => {
        const statuses = {
            'notstarted': 'secondary',
            'inprogress': 'primary',
            'onhold': 'warning',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return `<span class="badge bg-${statuses[status?.toLowerCase()] || 'secondary'}">
            ${status?.replace(/([A-Z])/g, ' $1').trim() || 'Not Started'}
        </span>`;
    };

    const getPriorityBadge = (priority) => {
        const priorities = {
            'low': 'info',
            'medium': 'primary',
            'high': 'warning',
            'critical': 'danger'
        };
        return `<span class="badge bg-${priorities[priority?.toLowerCase()] || 'secondary'}">
            ${priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Medium'}
        </span>`;
    };

    // Build table header
    const tableHeader = [
        '<div class="table-responsive">',
        '  <table class="table table-hover align-middle">',
        '    <thead class="table-light">',
        '      <tr>',
        '        <th>Project Name</th>',
        '        <th>Status</th>',
        '        <th>Priority</th>',
        '        <th>Start Date</th>',
        '        <th>Deadline</th>',
        '        <th>Actions</th>',
        '      </tr>',
        '    </thead>',
        '    <tbody>'
    ].join('\n');

    // Build table rows
    const tableRows = projects.map(project => {
        const statusBadge = getStatusBadge(project.Status);
        const priorityBadge = getPriorityBadge(project.Priority);
        const startDate = formatDate(project.StartDate);
        const deadline = formatDate(project.Deadline);
        
        return [
            '<tr data-project-id="' + project.ProjectId + '">',
            '  <td>' + escapeHtml(project.ProjectName) + '</td>',
            '  <td>' + statusBadge + '</td>',
            '  <td>' + priorityBadge + '</td>',
            '  <td>' + startDate + '</td>',
            '  <td>' + deadline + '</td>',
            '  <td>',
            '    <div class="btn-group btn-group-sm" role="group">',
            '      <button class="btn btn-outline-primary view-work-items-btn"',
            '              data-project-id="' + project.ProjectId + '"',
            '              data-project-name="' + escapeHtml(project.ProjectName || 'Project') + '"',
            '              title="View all work items">',
            '        <i class="bi bi-list-task"></i> View Work Items',
            '      </button>',
            '      <button class="btn btn-outline-success add-work-item-btn"',
            '              data-project-id="' + project.ProjectId + '"',
            '              data-project-name="' + escapeHtml(project.ProjectName || 'Project') + '"',
            '              title="Add new work item">',
            '        <i class="bi bi-plus-lg"></i> Add',
            '      </button>',
            '      <button class="btn btn-outline-warning view-review-tasks-btn"',
            '              data-project-id="' + project.ProjectId + '"',
            '              data-project-name="' + escapeHtml(project.ProjectName || 'Project') + '"',
            '              title="View tasks set for review">',
            '        <i class="bi bi-eye"></i> Review',
            '      </button>' +
            (project.Status?.toLowerCase() === 'active' ? 
            '      <button class="btn btn-outline-danger close-project-btn"' +
            '              data-project-id="' + project.ProjectId + '"' +
            '              data-project-name="' + escapeHtml(project.ProjectName || 'Project') + '"' +
            '              title="Close Project">' +
            '        <i class="bi bi-x-circle"></i> Close' +
            '      </button>' : '') +
            '    </div>',
            '  </td>',
            '</tr>'
        ].join('');
    }).join('');

    // Combine all parts
    const tableHtml = tableHeader + tableRows + [
        '    </tbody>',
        '  </table>',
        '</div>'
    ].join('\n');

    container.innerHTML = tableHtml;
    
    // Add event listeners for Close Project buttons
    document.querySelectorAll('.close-project-btn').forEach(button => {
        button.addEventListener('click', handleCloseProject);
    });
}

// Handle Close Project button click
async function handleCloseProject(event) {
    const button = event.currentTarget;
    const projectId = button.getAttribute('data-project-id');
    const projectName = button.getAttribute('data-project-name');
    
    if (!projectId) {
        console.error('Project ID not found');
        showToast('Error: Project ID not found', 'error');
        return;
    }
    
    // Confirm before closing
    if (!confirm(`Are you sure you want to close the project "${projectName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        // Show loading state
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Closing...';
        
        // Call API to update project status
        await api.patch(`/api/Projects/${projectId}/status`, { status: 'Closed' });
        
        // Show success message
        showToast(`Project "${projectName}" has been closed successfully.`, 'success');
        
        // Immediately remove the project row from the table
        const projectRow = button.closest('tr');
        
        if (projectRow) {
            // Remove the row immediately
            projectRow.remove();
            
            // Check if the table is now empty and show appropriate message
            const tbody = document.querySelector('#projectsTable tbody');
            if (tbody && tbody.children.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `
                    <td colspan="7" class="text-center py-4">
                        No active projects found.
                    </td>
                `;
                tbody.appendChild(emptyRow);
            }
        }
        
    } catch (error) {
        console.error('Error closing project:', error);
        const errorMessage = error.response?.data?.message || 'Failed to close project. Please try again.';
        showToast(errorMessage, 'error');
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Render work items table
function renderWorkItemsTable(workItems, containerId, showProject = true) {
    console.log('Rendering work items table with data:', workItems);
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }
    
    if (!workItems || workItems.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No work items found.</div>';
        console.log('No work items to display');
        return;
    }

    // Ensure we have valid work items data
    const validWorkItems = workItems.filter(item => item && item.WorkItemId);
    
    if (validWorkItems.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No valid work items found.</div>';
        console.log('No valid work items to display');
        return;
    }

    // Build table header
    const tableHeader = [
        '<div class="table-responsive">',
        '  <table class="table table-hover align-middle">',
        '    <thead class="table-light">',
        '      <tr>',
        '        <th>Name</th>',
        (showProject ? '        <th>Project</th>' : ''),
        '        <th>Status</th>',
        '        <th>Priority</th>',
        '        <th>Deadline</th>',
        '        <th>Updated</th>',
        '        <th>Actions</th>',
        '      </tr>',
        '    </thead>',
        '    <tbody>'
    ].join('\n');

    // Build table rows
    const tableRows = validWorkItems.map(item => {
        console.log('Work item data:', item); // Debug log
        const statusBadge = formatStatusBadge(item.Status);
        const priorityBadge = formatPriorityBadge(item.Priority);
        const updatedDate = formatDate(item.UpdatedAt || item.CreatedAt);
        
        // Format deadline - handle various date formats and field names
        let deadlineDate = 'No deadline';
        try {
            // First, check all possible date fields in order of likelihood
            const dateFields = [
                'deadline', 'Deadline', 
                'dueDate', 'DueDate', 
                'endDate', 'EndDate',
                'targetDate', 'TargetDate',
                'completionDate', 'CompletionDate'
            ];
            
            // Find the first valid date field
            for (const field of dateFields) {
                if (item[field]) {
                    const dateValue = item[field];
                    // Handle both string dates and ISO date strings
                    const date = new Date(dateValue);
                    if (!isNaN(date.getTime())) {
                        deadlineDate = formatDate(date);
                        break;
                    }
                }
            }
            
            // If no date found, log a warning
            if (deadlineDate === 'No deadline') {
                console.warn('No valid deadline found in work item. Available fields:', 
                    Object.keys(item).filter(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('deadline'))
                );
            }
        } catch (error) {
            console.error('Error formatting deadline:', error, 'Work item:', item);
        }
        
        const projectCell = showProject ? '<td>' + escapeHtml(item.ProjectName || 'N/A') + '</td>' : '';
        
        // Build action buttons based on status
        let actionButtons = '';
        if (item.Status !== 'Done' && item.Status !== 'Cancelled') {
            actionButtons = [
                '<div class="btn-group btn-group-sm">'
            ];

            if (item.Status === 'ToDo') {
                actionButtons.push(
                    '<button class="btn btn-outline-success btn-sm update-status-btn"',
                    '        data-workitem-id="' + item.WorkItemId + '"',
                    '        data-new-status="InProgress">',
                    '  Start',
                    '</button>'
                );
            } else if (item.Status === 'InProgress') {
                actionButtons.push(
                    '<button class="btn btn-outline-info btn-sm update-status-btn"',
                    '        data-workitem-id="' + item.WorkItemId + '"',
                    '        data-new-status="Review">',
                    '  Submit for Review',
                    '</button>'
                );
            }
            actionButtons.push('</div>');
            actionButtons = actionButtons.join('\n');
        } else {
            actionButtons = [
                '<div class="btn-group btn-group-sm">',
                '</div>'
            ].join('\n');
        }

        // Build the row HTML
        const row = [
            '<tr>',
            '  <td>' + escapeHtml(item.WorkItemName || 'Unnamed') + '</td>',
            projectCell,
            '  <td>' + statusBadge + '</td>',
            '  <td>' + priorityBadge + '</td>',
            '  <td>' + deadlineDate + '</td>',
            '  <td>' + updatedDate + '</td>',
            '  <td>' + actionButtons + '</td>',
            '</tr>'
        ].join('\n');
        
        return row;
    }).join('\n');

    // Build the complete table HTML
    const tableHtml = [
        tableHeader,
        tableRows,
        '    </tbody>',
        '  </table>',
        '</div>'
    ].join('\n');

    container.innerHTML = tableHtml;
}

// Render upcoming deadlines list
function renderUpcomingDeadlines(deadlines, containerId) {
    console.log('Rendering upcoming deadlines with data:', deadlines);
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }
    
    if (!deadlines || deadlines.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No upcoming deadlines.</div>';
        console.log('No upcoming deadlines to display');
        return;
    }

    // Filter out invalid deadline items
    const validDeadlines = deadlines.filter(deadline => deadline && deadline.WorkItemId);
    
    if (validDeadlines.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No valid deadline items found.</div>';
        console.log('No valid deadline items to display');
        return;
    }

    const listHtml = `
        <div class="list-group">
            ${validDeadlines.map(deadline => {
                const daysRemaining = deadline.DaysRemaining || 0;
                const dueDate = deadline.Deadline || deadline.DueDate;
                
                // Format days remaining text
                let daysText;
                if (daysRemaining === 0) daysText = 'Today';
                else if (daysRemaining === 1) daysText = 'Tomorrow';
                else if (daysRemaining === -1) daysText = 'Yesterday';
                else if (daysRemaining > 0) daysText = `in ${daysRemaining} days`;
                else daysText = `${Math.abs(daysRemaining)} days ago`;
                
                return `
                <a href="#" class="list-group-item list-group-item-action" 
                   data-bs-toggle="modal" data-bs-target="#workItemDetailsModal" 
                   data-id="${deadline.WorkItemId}">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${deadline.WorkItemName || 'Unnamed Work Item'}</h6>
                        <small class="text-${daysRemaining < 0 ? 'danger' : daysRemaining < 3 ? 'warning' : 'muted'}">
                            ${daysText}
                        </small>
                    </div>
                    <p class="mb-1 small text-truncate">${deadline.ProjectName || 'Unassigned Project'}</p>
                    <small>Due: ${formatDate(dueDate)}</small>
                </a>`;
            }).join('')}
        </div>
    `;

    container.innerHTML = listHtml;
}

// Initialize charts for manager dashboard
function initManagerCharts(dashboardData) {
    console.log('=== DEBUG: Dashboard Data Structure ===');
    console.log('All dashboard data keys:', Object.keys(dashboardData));
    
    // Charts have been removed as per user request
    // - Removed Work Items by Status chart
    // - Removed Team Workload Distribution chart
    
    // The following chart initialization code has been removed:
    // - Work Items by Status Pie Chart
    // - Employees by Workload Bar Chart
    
    console.log('Charts have been removed from the dashboard as per user request');
}

// Update work item status
async function updateWorkItemStatus(workItemId, newStatus) {
    if (!workItemId || !newStatus) {
        throw new Error('Missing work item ID or status');
    }

    try {
        const response = await api.updateWorkItemStatus(workItemId, newStatus);
        return response;
    } catch (error) {
        console.error('Error updating work item status:', error);
        throw error;
    }
}

// Load team members for the assignee dropdown
async function loadTeamMembers() {
    try {
        const teamMembers = await api.getTeamMembers();
        const assigneeSelect = document.getElementById('assignedTo');
        
        if (!assigneeSelect) {
            console.error('Assignee select element not found');
            return;
        }
        
        // Clear existing options except the first one
        while (assigneeSelect.options.length > 1) {
            assigneeSelect.remove(1);
        }
        
        // Add team members to the dropdown
        teamMembers.forEach(member => {
            if (member.role === 'Employee') { // Only show employees, not other managers
                const option = document.createElement('option');
                option.value = member.userId;
                option.textContent = `${member.fullName} (${member.email})`;
                assigneeSelect.appendChild(option);
            }
        });
        
    } catch (error) {
        console.error('Error loading team members:', error);
        showToast('error', 'Failed to load team members');
    }
}

// Handle Add Work Item form submission
document.getElementById('addWorkItemForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const spinner = document.getElementById('addWorkItemSpinner');
    const submitBtn = document.getElementById('addWorkItemBtnText');
    const submitBtnOriginalText = submitBtn.textContent;
    
    try {
        // Show loading state
        spinner.classList.remove('d-none');
        submitBtn.textContent = 'Adding...';
        
        // Get form data
        const formData = new FormData(this);
        const workItemData = {
            projectId: parseInt(formData.get('projectId')),
            assignedToId: formData.get('assignedToId'),
            workItemName: formData.get('workItemName'),
            description: formData.get('description') || '',
            priority: formData.get('priority'),
            deadline: formData.get('deadline')
        };
        
        console.log('Creating work item with data:', workItemData);
        
        // Call API to create work item
        const createdWorkItem = await api.createWorkItem(workItemData);
        
        // Show success message
        showToast('success', 'Work item created successfully!');
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addWorkItemModal'));
        modal.hide();
        
        // Refresh the dashboard to show the new work item
        await renderManagerDashboard();
        
    } catch (error) {
        console.error('Error creating work item:', error);
        const errorMessage = error.response?.data?.message || 'Failed to create work item';
        showToast('error', errorMessage);
    } finally {
        // Reset form and button state
        spinner.classList.add('d-none');
        submitBtn.textContent = submitBtnOriginalText;
    }
});

// Event delegation for all click events
document.addEventListener('click', async function(event) {
    // Handle View Work Items button click
    const viewWorkItemsBtn = event.target.closest('.view-work-items-btn');
    if (viewWorkItemsBtn) {
        event.preventDefault();
        
        const projectId = viewWorkItemsBtn.dataset.projectId;
        const projectName = viewWorkItemsBtn.dataset.projectName;
        
        if (!projectId) {
            console.error('Project ID is missing');
            showToast('error', 'Error: Project ID is missing');
            return;
        }
        
        try {
            // Show loading state
            document.getElementById('workItemsLoading').classList.remove('d-none');
            document.getElementById('workItemsContainer').classList.add('d-none');
            document.getElementById('noWorkItems').classList.add('d-none');
            
            // Update modal title
            document.getElementById('viewWorkItemsModalLabel').textContent = `Work Items - ${projectName || 'Project'}`;
            
            // Get the modal element
            const modalElement = document.getElementById('viewWorkItemsModal');
            const modal = new bootstrap.Modal(modalElement);
            
            // Initialize dropdowns when the modal is shown
            const onModalShown = () => {
                console.log('Modal shown, initializing dropdowns...');
                // Small delay to ensure DOM is ready
                setTimeout(initDropdowns, 100);
                
                // Remove the event listener after first use
                modalElement.removeEventListener('shown.bs.modal', onModalShown);
            };
            
            // Add event listener for when the modal is shown
            modalElement.addEventListener('shown.bs.modal', onModalShown);
            
            // Show the modal
            modal.show();
            
            // Fetch work items for the project
            console.log('Fetching work items for project:', projectId);
            const response = await api.getWorkItems({ projectId });
            const workItems = Array.isArray(response) ? response : (response.items || []);
            
            // Enhanced debug logging for work items
            console.group('Work Items Debug Info');
            console.log('Raw API response:', JSON.stringify(response, null, 2));
            
            if (workItems.length > 0) {
                // Log the first work item with all its properties
                const firstItem = workItems[0];
                console.log('First work item (raw):', JSON.parse(JSON.stringify(firstItem)));
                
                // Log all date-related fields
                console.log('Date fields in work item:');
                Object.entries(firstItem).forEach(([key, value]) => {
                    if (typeof value === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('deadline'))) {
                        console.log(`- ${key}:`, value, `(type: ${typeof value})`);
                    }
                });
                
                // Log the exact structure of the deadline field
                console.log('Deadline field analysis:', {
                    'hasDeadline': 'Deadline' in firstItem,
                    'deadlineValue': firstItem.Deadline,
                    'deadlineType': typeof firstItem.Deadline,
                    'hasDeadlineLower': 'deadline' in firstItem,
                    'deadlineLowerValue': firstItem.deadline,
                    'deadlineLowerType': typeof firstItem.deadline
                });
            } else {
                console.log('No work items found for this project');
            }
            console.groupEnd();
            
            // Hide loading, show container
            const loadingEl = document.getElementById('workItemsLoading');
            const containerEl = document.getElementById('workItemsContainer');
            const noItemsEl = document.getElementById('noWorkItems');
            
            if (loadingEl) loadingEl.classList.add('d-none');
            
            if (workItems && workItems.length > 0) {
                // Render work items
                renderWorkItemsList(workItems);
                if (containerEl) containerEl.classList.remove('d-none');
                if (noItemsEl) noItemsEl.classList.add('d-none');
            } else {
                // Show empty state
                if (containerEl) containerEl.classList.add('d-none');
                if (noItemsEl) noItemsEl.classList.remove('d-none');
            }
            
        } catch (error) {
            console.error('Error loading work items:', error);
            showToast('error', 'Failed to load work items');
            // Close the modal on error
            const modal = bootstrap.Modal.getInstance(document.getElementById('viewWorkItemsModal'));
            if (modal) modal.hide();
        }
        return; // Exit the event handler
    }
    
    // Handle View Review Tasks button click
    const viewReviewTasksBtn = event.target.closest('.view-review-tasks-btn');
    if (viewReviewTasksBtn) {
        event.preventDefault();
        
        const projectId = viewReviewTasksBtn.dataset.projectId;
        const projectName = viewReviewTasksBtn.dataset.projectName;
        
        if (!projectId) {
            console.error('Project ID is missing');
            showToast('error', 'Error: Project ID is missing');
            return;
        }
        
        try {
            // Show loading state
            document.getElementById('workItemsLoading').classList.remove('d-none');
            document.getElementById('workItemsContainer').classList.add('d-none');
            document.getElementById('noWorkItems').classList.add('d-none');
            
            // Update modal title
            document.getElementById('viewWorkItemsModalLabel').textContent = `Tasks Set for Review - ${projectName || 'Project'}`;
            
            // Get the modal element
            const modalElement = document.getElementById('viewWorkItemsModal');
            const modal = new bootstrap.Modal(modalElement);
            
            // Initialize dropdowns when the modal is shown
            const onModalShown = () => {
                console.log('Review tasks modal shown, initializing dropdowns...');
                // Small delay to ensure DOM is ready
                setTimeout(initDropdowns, 100);
                
                // Remove the event listener after first use
                modalElement.removeEventListener('shown.bs.modal', onModalShown);
            };
            
            // Add event listener for when the modal is shown
            modalElement.addEventListener('shown.bs.modal', onModalShown);
            
            // Show the modal
            modal.show();
            
            // Fetch work items for the project
            console.log('Fetching work items for project:', projectId);
            const response = await api.getWorkItems({ projectId });
            let workItems = Array.isArray(response) ? response : (response.items || []);
            
            // Filter work items to only show those with 'Review' status
            workItems = workItems.filter(item => item.Status && item.Status.toLowerCase() === 'review');
            
            // Hide loading, show container
            const loadingEl = document.getElementById('workItemsLoading');
            const containerEl = document.getElementById('workItemsContainer');
            const noItemsEl = document.getElementById('noWorkItems');
            
            if (loadingEl) loadingEl.classList.add('d-none');
            
            if (workItems && workItems.length > 0) {
                // Render work items
                renderWorkItemsList(workItems);
                if (containerEl) containerEl.classList.remove('d-none');
                if (noItemsEl) noItemsEl.classList.add('d-none');
            } else {
                // Show empty state
                if (containerEl) containerEl.classList.add('d-none');
                if (noItemsEl) {
                    noItemsEl.textContent = 'No tasks are currently set for review.';
                    noItemsEl.classList.remove('d-none');
                }
            }
            
        } catch (error) {
            console.error('Error loading review tasks:', error);
            showToast('error', 'Failed to load review tasks');
            // Close the modal on error
            const modal = bootstrap.Modal.getInstance(document.getElementById('viewWorkItemsModal'));
            if (modal) modal.hide();
        }
        return; // Exit the event handler
    }
    
    // Handle Add Work Item from empty state
    const addFromEmptyBtn = event.target.closest('.add-work-item-from-empty');
    if (addFromEmptyBtn) {
        const projectId = document.querySelector('.view-work-items-btn[data-project-id]')?.dataset.projectId;
        const projectName = document.querySelector('.view-work-items-btn[data-project-id]')?.dataset.projectName;
        
        if (projectId) {
            // Trigger the add work item flow
            const btn = document.createElement('button');
            btn.classList.add('add-work-item-btn');
            btn.dataset.projectId = projectId;
            btn.dataset.projectName = projectName;
            btn.click();
        }
        return;
    }

    // Handle Add Work Item button click
    const addWorkItemBtn = event.target.closest('.add-work-item-btn');
    if (addWorkItemBtn) {
        const projectId = addWorkItemBtn.dataset.projectId;
        const projectName = addWorkItemBtn.dataset.projectName;
        
        if (!projectId) {
            console.error('Project ID is missing');
            showToast('error', 'Error: Project ID is missing');
            return;
        }
        
        try {
            // Set the project ID in the form
            document.getElementById('workItemProjectId').value = projectId;
            
            // Update modal title with project name
            document.getElementById('addWorkItemModalLabel').textContent = `Add Work Item to ${projectName || 'Project'}`;
            
            // Set default deadline to 7 days from now
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            document.getElementById('deadline').value = nextWeek.toISOString().split('T')[0];
            
            // Load team members for the assignee dropdown
            await loadTeamMembers();
            
            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('addWorkItemModal'));
            
            // Initialize dropdowns when the modal is shown
            modal._element.addEventListener('shown.bs.modal', function () {
                setTimeout(initDropdowns, 100); // Small delay to ensure DOM is ready
            });
            
            modal.show();
            
        } catch (error) {
            console.error('Error preparing work item form:', error);
            showToast('error', 'Error preparing work item form');
        }
        return; // Exit the event handler
    }
    
    // Handle status update button click
    const updateBtn = event.target.closest('.update-status-btn');
    if (!updateBtn) return;
    
    // Prevent any default form submission or link behavior
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // If already processing, do nothing
    if (updateBtn.disabled) return;
    
    const workItemId = updateBtn.dataset.workitemId;
    const newStatus = updateBtn.dataset.newStatus;
    
    if (!workItemId || !newStatus) {
        console.error('Missing work item ID or status');
        return;
    }
    
    // Disable the button to prevent multiple clicks
    const originalText = updateBtn.innerHTML;
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
    
    try {
        await updateWorkItemStatus(workItemId, newStatus);
        showToast('Work item status updated successfully!', 'success');
        
        // Refresh the dashboard
        const auth = await Auth.getInstance();
        if (auth.currentUser.role === 'Manager') {
            await renderManagerDashboard();
        } else {
            await renderEmployeeDashboard();
        }
    } catch (error) {
        console.error('Error updating work item status:', error);
        showToast('Failed to update work item status', 'error');
    } finally {
        // Re-enable the button
        if (updateBtn) {
            updateBtn.disabled = false;
            updateBtn.innerHTML = originalText;
        }
    }
});

// Initialize Bootstrap dropdowns
function initDropdowns() {
    const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
    dropdownElementList.forEach(function (dropdownToggleEl) {
        // Only initialize if not already initialized
        if (!dropdownToggleEl._dropdown) {
            dropdownToggleEl._dropdown = new bootstrap.Dropdown(dropdownToggleEl);
        }
    });
}

// Render work items list in the modal
function renderWorkItemsList(workItems) {
    console.log('Rendering work items:', workItems);
    const container = document.getElementById('workItemsList');
    if (!container) {
        console.error('Work items container not found');
        return;
    }
    
    try {
        if (!Array.isArray(workItems)) {
            console.error('Expected workItems to be an array, got:', typeof workItems);
            container.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error: Invalid work items data</td></tr>';
            return;
        }
        
        if (workItems.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No work items found</td></tr>';
            return;
        }
        
        // Store the current scroll position
        const scrollPosition = container.scrollTop;
        
        // Update the container content
        container.innerHTML = workItems.map(item => {
            if (!item) return '';
            
            const status = item.Status || 'ToDo';
            const priority = item.Priority || 'Medium';
            const statusColor = getStatusColor(status).replace('bg-', '');
            let priorityClass = 'bg-primary';
            
            // Determine priority badge class
            switch (priority.toLowerCase()) {
                case 'high': 
                    priorityClass = 'bg-warning text-dark'; 
                    break;
                case 'critical': 
                    priorityClass = 'bg-danger'; 
                    break;
                case 'low': 
                    priorityClass = 'bg-info'; 
                    break;
                default: 
                    priorityClass = 'bg-primary';
            }
            
            // Format description with proper escaping
            let description = 'No description';
            if (item.Description) {
                description = item.Description.length > 50 
                    ? item.Description.substring(0, 50) + '...' 
                    : item.Description;
            }
            
            // Format deadline
            const deadline = item.Deadline ? formatDate(item.Deadline) : 'No deadline';
            
            // Check if current user is a manager and item is in review
            const isManager = window.auth && window.auth.currentUser && window.auth.currentUser.role === 'Manager';
            const isInReview = status.toLowerCase() === 'review';
            
            // Create status dropdown for managers when item is in review
            let statusControl = '';
            if (isManager && isInReview) {
                const dropdownId = 'statusDropdown' + (item.WorkItemId || Date.now());
                statusControl = [
                    '<div class="dropdown">',
                    '  <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button"',
                    '          id="' + dropdownId + '" data-bs-toggle="dropdown" aria-expanded="false">',
                    '    <span class="me-1">' + escapeHtml(status) + '</span>',
                    '  </button>',
                    '  <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="' + dropdownId + '">',
                    '    <li><button type="button" class="dropdown-item update-status-btn" data-workitem-id="' + item.WorkItemId + '" data-new-status="Done">',
                    '      <i class="bi bi-check-circle-fill text-success me-1"></i> Approve (Mark as Done)',
                    '    </button></li>',
                    '    <li><button type="button" class="dropdown-item update-status-btn" data-workitem-id="' + item.WorkItemId + '" data-new-status="InProgress">',
                    '      <i class="bi bi-arrow-counterclockwise text-warning me-1"></i> Reject (Send Back for Changes)',
                    '    </button></li>',
                    '  </ul>',
                    '</div>'
                ].join('');
            } else {
                statusControl = '<span class="badge ' + statusColor + ' text-black">' + escapeHtml(status) + '</span>';
            }
            
            // Create the row HTML using string concatenation instead of template literals in array
            return [
                '<tr>',
                '  <td>',
                '    <div class="d-flex align-items-center">',
                '      <div class="me-2">',
                '        <i class="bi bi-card-checklist text-primary"></i>',
                '      </div>',
                '      <div>',
                '        <h6 class="mb-0">' + escapeHtml(item.WorkItemName || 'Unnamed Work Item') + '</h6>',
                '        <small class="text-muted">' + escapeHtml(description) + '</small>',
                '      </div>',
                '    </div>',
                '  </td>',
                '  <td>' + statusControl + '</td>',
                '  <td><span class="badge ' + priorityClass + '">' + escapeHtml(priority) + '</span></td>',
                '  <td>' + escapeHtml(item.AssignedToName || item.AssignedTo || 'Unassigned') + '</td>',
                '  <td>' + deadline + '</td>',

                '</tr>'
            ].join('');
        }).join('');
        
        // Initialize dropdowns after content is rendered
        initDropdowns();
        
        // Restore scroll position
        container.scrollTop = scrollPosition;
        
    } catch (error) {
        console.error('Error rendering work items:', error);
        container.innerHTML = [
            '<tr>',
            '  <td colspan="5" class="text-center text-danger">',
            '    Error displaying work items. Please check console for details.',
            '  </td>',
            '</tr>'
        ].join('\n');
    }
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Initialize project creation form
function initProjectCreationForm() {
    console.log('Initializing project creation form...');
    const form = document.getElementById('createProjectForm');
    if (!form) {
        console.error('Create project form not found!');
        return;
    }

    // Ensure toast container exists
    if (!document.querySelector('.toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1090';
        document.body.appendChild(toastContainer);
    }
    
    // Add click handler to the submit button instead of form submit
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleFormSubmit);
        console.log('Added click handler to submit button');
    } else {
        console.error('Submit button not found in the form!');
    }
    
    // Handle form submission
    async function handleFormSubmit(e) {
        console.log('Form submission started...');
        e.preventDefault();
        e.stopPropagation();
        
        try {
            const formData = new FormData(form);
            const projectData = {
                projectName: formData.get('projectName'),
                description: formData.get('projectDescription'),
                startDate: formData.get('startDate'),
                deadline: formData.get('deadline'),
                requirements: formData.get('requirements'),
                priority: formData.get('priority')
            };
            
            console.log('Form data collected:', projectData);
            
            // Validate required fields
            const errors = [];
            
            if (!projectData.projectName?.trim()) {
                errors.push('Project name is required');
            }
            
            if (!projectData.requirements?.trim()) {
                errors.push('Requirements are required');
            }
            
            if (!projectData.priority) {
                errors.push('Priority is required');
            }
            
            // Set default start date to today if not provided
            if (!projectData.startDate) {
                projectData.startDate = new Date().toISOString().split('T')[0];
            }
            
            // Set default deadline to 30 days from now if not provided
            if (!projectData.deadline) {
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + 30);
                projectData.deadline = deadline.toISOString().split('T')[0];
            }
            
            if (errors.length > 0) {
                console.error('Validation errors:', errors);
                showToast(errors.join('<br>'), 'error');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const spinner = document.getElementById('createProjectSpinner');
            const btnText = document.getElementById('createProjectBtnText');
            
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                if (spinner) spinner.classList.remove('d-none');
                if (btnText) btnText.textContent = 'Creating...';
            }
            
            console.log('Sending project creation request...');
            const result = await api.createProject(projectData);
            console.log('Project creation response:', result);
            
            if (result && result.success) {
                showToast('Project created successfully!', 'success');
                console.log('Project created successfully');
                
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createProjectModal'));
                if (modal) {
                    modal.hide();
                    console.log('Modal closed');
                }
                
                // Reset form
                form.reset();
                console.log('Form reset');
                
                // Refresh the dashboard
                await renderManagerDashboard();
                console.log('Dashboard refreshed');
            } else {
                const errorMsg = result?.message || 'Failed to create project. Please try again.';
                console.error('Project creation failed:', errorMsg);
                showToast(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Error in form submission:', error);
            let errorMessage = 'Failed to create project. Please try again.';
            
            if (error.response) {
                console.error('Error response data:', error.response.data);
                console.error('Error status:', error.response.status);
                errorMessage = error.response.data?.message || errorMessage;
            } else if (error.request) {
                console.error('No response received:', error.request);
                errorMessage = 'No response from server. Please check your connection.';
            }
            
            showToast(errorMessage, 'error');
        } finally {
            // Reset button state
            const submitBtn = form.querySelector('button[type="submit"]');
            const spinner = document.getElementById('createProjectSpinner');
            const btnText = document.getElementById('createProjectBtnText');
            
            if (submitBtn) {
                submitBtn.disabled = false;
                if (spinner) spinner.classList.add('d-none');
                if (btnText) btnText.textContent = 'Create Project';
                console.log('Submit button state reset');
            }
        }
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM fully loaded, initializing dashboard...');
        
        // Create toast container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '1090';
            document.body.appendChild(toastContainer);
            console.log('Toast container created');
        }

        // Initialize Bootstrap dropdowns
        const initDropdowns = () => {
            const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
            dropdownElementList.map(function (dropdownToggleEl) {
                return new bootstrap.Dropdown(dropdownToggleEl);
            });
        };
        
        // Initialize project creation form
        initProjectCreationForm();
        console.log('Project creation form initialized');

        // Check authentication
        const auth = await Auth.getInstance();
        if (!auth.currentUser) {
            window.location.href = '/login';
            return;
        }

        // Store auth in window for easy access in other functions
        window.auth = auth;

        // Load the appropriate dashboard based on user role
        if (auth.currentUser.role === 'Manager') {
            await renderManagerDashboard();
        } else {
            await renderEmployeeDashboard();
        }
        
        // Initialize dropdowns after content is loaded
        initDropdowns();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showToast('Failed to initialize dashboard', 'error');
    }
});

// Export functions that might be used by other files
export async function renderEmployeeDashboard() {
    try {
        showLoading(true);
        
        // Ensure we have a container to render into
        const appContainer = document.getElementById('app');
        if (!appContainer) {
            throw new Error('App container not found');
        }

        // Clear any existing content and show loading state
        appContainer.innerHTML = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center mb-4">
                    <h1 id="dashboardTitle" class="h2 mb-0">My Dashboard</h1>
                    <div id="welcomeMessage"></div>
                </div>
                
                <!-- Work Items by Status -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Work Items by Status</h5>
                    </div>
                    <div class="card-body">
                        <div id="workItemsByStatusChart" class="row g-4"></div>
                    </div>
                </div>
                
                <!-- Upcoming Deadlines - Full Width -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Upcoming Deadlines</h5>
                    </div>
                    <div class="card-body">
                        <div id="upcomingDeadlinesList"></div>
                    </div>
                </div>
                
                <!-- All Work Items -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div id="allWorkItemsContainer"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Load dashboard data
        const dashboardData = await api.getEmployeeDashboard();
        console.log('Dashboard API Response:', dashboardData);
        
        // Update dashboard header
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3">
                        <span class="badge bg-primary fs-5 p-2">Workload: ${formatWorkload(dashboardData.Workload || 0)}</span>
                    </div>
                </div>`;
        }

        // Debug: Log the dashboard data structure
        console.log('=== Employee Dashboard Data ===');
        console.log('Dashboard data keys:', Object.keys(dashboardData));
        console.log('WorkItemsByStatus:', dashboardData.WorkItemsByStatus);
        
        // Create or update the container for work items status
        const statusContainerId = 'workItemsStatusContainer';
        let statusContainer = document.getElementById(statusContainerId);
        
        if (!statusContainer) {
            // Create the container if it doesn't exist
            const chartContainer = document.getElementById('workItemsByStatusChart');
            if (chartContainer) {
                // Create a new container for the status cards
                chartContainer.insertAdjacentHTML('afterend', `
                    <div id="${statusContainerId}" class="row g-4 mb-4"></div>
                `);
                statusContainer = document.getElementById(statusContainerId);
            }
        }
        
        // Render work items by status
        if (dashboardData.WorkItemsByStatus?.length > 0) {
            renderWorkItemsByStatus(dashboardData.WorkItemsByStatus, statusContainerId);
        } else if (statusContainer) {
            statusContainer.innerHTML = '<div class="col-12"><p class="text-muted">No work items found.</p></div>';
        }
        
        // Render recent work items
        if (dashboardData.RecentWorkItems?.length > 0) {
            renderWorkItemsTable(dashboardData.RecentWorkItems, 'recentWorkItemsTable');
        } else {
            const container = document.getElementById('recentWorkItemsTable');
            if (container) container.innerHTML = '<p class="text-muted">No recent work items found.</p>';
        }
        
        // Render upcoming deadlines
        if (dashboardData.UpcomingDeadlines?.length > 0) {
            renderUpcomingDeadlines(dashboardData.UpcomingDeadlines, 'upcomingDeadlinesList');
        } else {
            const container = document.getElementById('upcomingDeadlinesList');
            if (container) container.innerHTML = '<p class="text-muted">No upcoming deadlines.</p>';
        }
        
        // Load all work items
        await loadEmployeeWorkItems();
        
        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
        
        // Initialize project creation form
        initProjectCreationForm();
        
    } catch (error) {
        console.error('Error loading employee dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
        
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="alert alert-danger">
                    <h4 class="alert-heading">Error Loading Dashboard</h4>
                    <p>There was an error loading the dashboard. Please try again later.</p>
                    <hr>
                    <p class="mb-0">${error.message || 'Unknown error occurred'}</p>
                </div>`;
        }
    } finally {
        showLoading(false);
    }
    
    // Function to load employee work items
    async function loadEmployeeWorkItems() {
        try {
            const container = document.getElementById('allWorkItemsContainer');
            if (!container) return;
            
            // Show loading state
            container.innerHTML = `
                <div class="d-flex justify-content-center my-4">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>`;
            
            const workItems = await api.getWorkItems({ assignedTo: 'me' });
            console.log('Fetched work items:', workItems);
            
            // Update the container with work items
            container.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h3>My Work Items</h3>
                    <button class="btn btn-primary btn-sm" id="refreshWorkItems">
                        <i class="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
                <div id="allWorkItemsTable" class="table-responsive"></div>
            `;
            
            // Render the work items table
            const tableContainer = document.getElementById('allWorkItemsTable');
            if (workItems?.length > 0) {
                renderWorkItemsTable(workItems, 'allWorkItemsTable');
            } else {
                tableContainer.innerHTML = '<div class="alert alert-info">No work items assigned to you.</div>';
            }
            
            // Add refresh button event listener
            document.getElementById('refreshWorkItems').addEventListener('click', async () => {
                try {
                    const refreshedItems = await api.getWorkItems({ assignedTo: 'me' });
                    if (refreshedItems?.length > 0) {
                        renderWorkItemsTable(refreshedItems, 'allWorkItemsTable');
                        showToast('Work items refreshed successfully', 'success');
                    } else {
                        tableContainer.innerHTML = '<div class="alert alert-info">No work items assigned to you.</div>';
                    }
                } catch (error) {
                    console.error('Error refreshing work items:', error);
                    showToast('Failed to refresh work items', 'error');
                }
            });
            
        } catch (error) {
            console.error('Error in loadEmployeeWorkItems:', error);
            const container = document.getElementById('allWorkItemsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <h4 class="alert-heading">Error Loading Work Items</h4>
                        <p>There was an error loading your work items. Please try again later.</p>
                        <hr>
                        <p class="mb-0">${error.message || 'Unknown error occurred'}</p>
                    </div>`;
            }
        }
    }
}
