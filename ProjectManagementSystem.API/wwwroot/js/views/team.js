import { api } from '../api.js';
/**
 * Team Management View
 * Handles the display and interaction with team members
 */

import { showToast } from '../utils/uiUtils.js';

/**
 * Get the appropriate badge class for a given role
 * @param {string} role - The role to get badge class for
 * @returns {string} The appropriate badge class
 */
const getRoleBadgeClass = (role) => {
    if (!role) return 'bg-secondary';
    const roleLower = role.toLowerCase();
    switch (roleLower) {
        case 'manager': return 'bg-primary';
        case 'developer': return 'bg-info text-dark';
        case 'designer': return 'bg-warning text-dark';
        case 'qa': return 'bg-success';
        default: return 'bg-secondary';
    }
};

/**
 * Renders the team management view
 * @returns {Promise<void>}
 */
export async function renderTeamView() {
    const app = document.getElementById('app');
    
    // Show loading state
    app.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="height: 300px;">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span class="ms-3">Loading team members...</span>
        </div>`;
    
    try {
        // Fetch team members from API
        const teamMembers = await api.getTeamMembers();
        
        // Sort members by name
        teamMembers.sort((a, b) => {
            const nameA = `${a.firstName} ${a.lastName}`.toUpperCase();
            const nameB = `${b.firstName} ${b.lastName}`.toUpperCase();
            return nameA.localeCompare(nameB);
        });
        
        // Calculate stats
        const stats = {
            totalMembers: teamMembers.length,
            activeMembers: teamMembers.filter(m => m.isActive).length,
            avgWorkload: teamMembers.length > 0 ? 
                Math.round(teamMembers.reduce((sum, m) => sum + (m.workload || 0), 0) / teamMembers.length) : 0,
            avgPerformance: teamMembers.length > 0 ? 
                Math.round(teamMembers.reduce((sum, m) => sum + (m.performance || 0), 0) / teamMembers.length) : 0
        };
        
        // Render the team view
        app.innerHTML = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1 class="h3 mb-0">Team Management</h1>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addTeamMemberModal">
                        <i class="bi bi-plus-lg me-1"></i> Add Team Member
                    </button>
                </div>
                
                <!-- Team Stats -->
                <div class="row mb-4">
                    ${renderStatCard('Total Members', stats.totalMembers, 'bi-people-fill', 'primary')}
                    ${renderStatCard('Active Members', stats.activeMembers, 'bi-person-check-fill', 'success')}
                    ${renderStatCard('Avg Workload', `${stats.avgWorkload}%`, 'bi-speedometer2', 'info')}
                    ${renderStatCard('Avg Performance', `${stats.avgPerformance}%`, 'bi-graph-up', 'warning')}
                </div>
                
                <!-- Team Members Table -->
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Team Members</h5>
                        <div class="input-group" style="max-width: 300px;">
                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                            <input type="text" id="teamSearch" class="form-control" placeholder="Search...">
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Email</th>
                                    <th>Workload</th>
                                    <th>Performance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="teamMembersTable">
                                ${teamMembers.map(member => renderTeamMemberRow(member)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Modals -->
            ${renderAddTeamMemberModal()}
            ${renderEditTeamMemberModal()}
            ${renderViewMemberModal()}
            ${renderConfirmationModal()}
        `;
        
        // Initialize event listeners
        setupTeamEventListeners();
        
    } catch (error) {
        console.error('Error loading team data:', error);
        const errorMessage = error.response?.data?.message || 'Failed to load team data. Please try again.';
        
        // Show error message in the UI
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        <div>
                            <h5 class="alert-heading">Error Loading Team Data</h5>
                            <p class="mb-0">${errorMessage}</p>
                            <button class="btn btn-sm btn-outline-danger mt-2" onclick="window.location.reload()">
                                <i class="bi bi-arrow-clockwise me-1"></i> Try Again
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Fallback if app element is not found
            showToast(errorMessage, 'error');
        }
    }
}

// Component rendering functions
function renderStatCard(title, value, icon, color) {
    return `
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card border-start border-${color} border-4 h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <div class="text-muted small">${title}</div>
                            <div class="h4 mb-0">${value}</div>
                        </div>
                        <div class="bg-${color} bg-opacity-10 p-3 rounded">
                            <i class="bi ${icon} text-${color} fs-4"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderTeamMemberRow(member) {
    // Calculate member initials
    const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown User';
    const initials = fullName.split(' ')
        .map(part => part.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
        
    // Calculate workload and performance percentages
    const workloadPercentage = Math.round((member.currentWorkload || 0) * 10) * 10; // Convert 0-1 to 0-100%
    const performancePercentage = Math.round(member.performance || 0);
    
    // Determine colors based on values
    const workloadColor = workloadPercentage > 80 ? 'danger' : 
                         workloadPercentage > 50 ? 'warning' : 'success';
    const performanceColor = performancePercentage > 80 ? 'success' : 
                           performancePercentage > 50 ? 'warning' : 'danger';
    
    return `
        <tr data-member-id="${member.userId}">
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar avatar-sm me-3">
                        <span class="avatar-text bg-primary text-white">
                            ${initials}
                        </span>
                    </div>
                    <div>
                        <div class="fw-bold">${fullName}</div>
                        <div class="text-muted small">${member.position || 'No position'}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge ${getRoleBadgeClass(member.role)}">${member.role || 'N/A'}</span>
            </td>
            <td>${member.email || 'N/A'}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="progress w-100 me-2" style="height: 6px;">
                        <div class="progress-bar bg-${workloadColor}" 
                             role="progressbar" 
                             style="width: ${workloadPercentage}%" 
                             aria-valuenow="${workloadPercentage}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                    <span class="small">${workloadPercentage}%</span>
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="progress w-100 me-2" style="height: 6px;">
                        <div class="progress-bar bg-${performanceColor}" 
                             role="progressbar" 
                             style="width: ${performancePercentage}%" 
                             aria-valuenow="${performancePercentage}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                    <span class="small">${performancePercentage}%</span>
                </div>
            </td>
            <td>
                <span class="badge ${member.isActive ? 'bg-success' : 'bg-secondary'}">
                    ${member.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="dropdown">
                    <button class="btn btn-sm btn-icon btn-light-primary" type="button" 
                            data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <a class="dropdown-item view-member" href="#" data-id="${member.userId}">
                                <i class="bi bi-eye me-2"></i>View
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item edit-member" href="#" data-id="${member.userId}">
                                <i class="bi bi-pencil me-2"></i>Edit
                            </a>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item ${member.isActive ? 'text-warning' : 'text-success'} toggle-status" 
                               href="#" data-id="${member.userId}">
                                <i class="bi ${member.isActive ? 'bi-person-dash' : 'bi-person-check'} me-2"></i>
                                ${member.isActive ? 'Deactivate' : 'Activate'}
                            </a>
                        </li>
                        <li><a class="dropdown-item text-danger delete-member" href="#" data-id="${member.userId}">Delete</a></li>
                    </ul>
                </div>
            </td>
        </tr>
    `;
}

function renderAddTeamMemberModal() {
    return `
        <div class="modal fade" id="addTeamMemberModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Team Member</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="addTeamMemberForm">
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">First Name <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" name="firstName" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Last Name <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" name="lastName" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email <span class="text-danger">*</span></label>
                                <input type="email" class="form-control" name="email" required>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Role <span class="text-danger">*</span></label>
                                    <select class="form-select" name="role" required>
                                        <option value="">Select Role</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Developer">Developer</option>
                                        <option value="Designer">Designer</option>
                                        <option value="QA">QA Tester</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Position</label>
                                    <input type="text" class="form-control" name="position">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Skills (comma separated)</label>
                                <input type="text" class="form-control" name="skills" placeholder="e.g., JavaScript, React, Node.js">
                            </div>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" name="isActive" id="isActive" checked>
                                <label class="form-check-label" for="isActive">Active Member</label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                <span class="spinner-border spinner-border-sm d-none" id="addMemberSpinner"></span>
                                Add Member
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function renderEditTeamMemberModal() {
    return `
        <div class="modal fade" id="editTeamMemberModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit Team Member</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="editTeamMemberForm">
                        <input type="hidden" name="userId" id="editUserId">
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">First Name <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" name="firstName" id="editFirstName" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Last Name <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" name="lastName" id="editLastName" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email <span class="text-danger">*</span></label>
                                <input type="email" class="form-control" name="email" id="editEmail" required>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Role <span class="text-danger">*</span></label>
                                    <select class="form-select" name="role" id="editRole" required>
                                        <option value="">Select Role</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Developer">Developer</option>
                                        <option value="Designer">Designer</option>
                                        <option value="QA">QA Tester</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Position</label>
                                    <input type="text" class="form-control" name="position" id="editPosition">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Skills (comma separated)</label>
                                <input type="text" class="form-control" name="skills" id="editSkills" placeholder="e.g., JavaScript, React, Node.js">
                            </div>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" name="isActive" id="editIsActive">
                                <label class="form-check-label" for="editIsActive">Active Member</label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                <span class="spinner-border spinner-border-sm d-none" id="editMemberSpinner"></span>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function renderViewMemberModal() {
    return `
        <div class="modal fade" id="viewMemberModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Member Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="memberDetails">
                        <!-- Content loaded dynamically -->
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderConfirmationModal() {
    return `
        <div class="modal fade" id="confirmationModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirm Action</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="confirmationMessage">
                        Are you sure you want to perform this action?
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirmAction">Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to load member details
async function loadMemberDetails(memberId) {
    try {
        // In a real app: const member = await api.getTeamMember(memberId);
        // Mock data for demonstration
        const mockMember = {
            userId: memberId,
        };

        // Render team view
        const teamViewHtml = `
            <div class="row">
                <div class="col-md-6">
                    <h4 class="mb-3">Team Members (${stats.total})</h4>
                    <table class="table table-striped table-bordered">
                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>Role</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="teamMembersTableBody">
                            ${teamMembers.map(member => `
                                <tr>
                                    <td>
                                        <h6>${member.fullName}</h6>
                                        <small class="text-muted">${member.position}</small>
                                    </td>
                                    <td>
                                        <span class="badge ${getRoleBadgeClass(member.role)}">
                                            ${member.role}
                                        </span>
                                    </td>
                                    <td>${member.email}</td>
                                    <td>
                                        <span class="badge ${member.isActive ? 'bg-success' : 'bg-danger'}">
                                            ${member.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary dropdown-toggle" 
                                                data-bs-toggle="dropdown">
                                            <i class="bi bi-three-dots-vertical"></i>
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end">
                                            <li><a class="dropdown-item view-member" href="#" data-id="${member.userId}">View</a></li>
                                            <li><a class="dropdown-item edit-member" href="#" data-id="${member.userId}">Edit</a></li>
                                            <li><a class="dropdown-item ${member.isActive ? 'text-warning' : 'text-success'} toggle-status" 
                                                   href="#" data-id="${member.userId}">
                                                ${member.isActive ? 'Deactivate' : 'Activate'}
                                            </a></li>
                                            <li><hr class="dropdown-divider"></li>
                                            <li><a class="dropdown-item text-danger delete-member" href="#" data-id="${member.userId}">Delete</a></li>
                                        </ul>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="col-md-6">
                    <h4 class="mb-3">Team Stats</h4>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6 class="card-title text-muted mb-3">Total Members</h6>
                                    <h2 class="mb-0">${stats.total}</h2>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6 class="card-title text-muted mb-3">Active Members</h6>
                                    <h2 class="mb-0">${stats.active}</h2>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6 class="card-title text-muted mb-3">Inactive Members</h6>
                                    <h2 class="mb-0">${stats.inactive}</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Update main content
        if (mainContent) mainContent.innerHTML = teamViewHtml;
        
    } catch (error) {
        console.error('Error rendering team view:', error);
        showToast('Failed to load team members', 'error');
    }
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Event Handlers
function setupTeamEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('teamSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('#teamMembersTable tr').forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }, 300));
    }
    
    // Add debounce helper function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Add team member form
    const addForm = document.getElementById('addTeamMemberForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addForm);
            const submitBtn = addForm.querySelector('button[type="submit"]');
            const spinner = addForm.querySelector('#addMemberSpinner');
            
            try {
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                // Prepare member data
                const memberData = {
                    email: formData.get('email'),
                    password: 'TemporaryPassword123!', // In a real app, generate or require a password
                    role: formData.get('role'),
                    fullName: `${formData.get('firstName')} ${formData.get('lastName')}`.trim(),
                    position: formData.get('position') || '',
                    skills: formData.get('skills') ? formData.get('skills').split(',').map(s => s.trim()) : [],
                    isActive: formData.get('isActive') === 'on'
                };
                
                // Call API to register new user
                await api.register(memberData);
                
                showToast('Team member added successfully!', 'success');
                
                // Close modal and refresh team view
                const modal = bootstrap.Modal.getInstance(document.getElementById('addTeamMemberModal'));
                if (modal) modal.hide();
                
                // Reset form
                addForm.reset();
                
                // Refresh team view
                await renderTeamView();
                
            } catch (error) {
                console.error('Error adding team member:', error);
                const errorMessage = error.response?.data?.message || 'Failed to add team member';
                showToast(errorMessage, 'error');
            } finally {
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }
    
    // View member details
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.view-member')) {
            e.preventDefault();
            const memberId = e.target.closest('[data-id]').getAttribute('data-id');
            const memberRow = e.target.closest('tr');
            const memberName = memberRow.querySelector('.fw-bold').textContent;
            const memberRole = memberRow.querySelector('td:nth-child(2) .badge').textContent;
            const memberEmail = memberRow.cells[2].textContent;
            
            // Show loading state
            const detailsElement = document.getElementById('memberDetails');
            detailsElement.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 mb-0">Loading member details...</p>
                </div>
            `;
            
            const modal = new bootstrap.Modal(document.getElementById('viewMemberModal'));
            modal.show();
            
            try {
                const member = await api.getTeamMember(memberId);
                const workItems = await api.getTeamMemberWorkItems(memberId);
                
                // Format skills
                const skillsList = member.skills && member.skills.length > 0 
                    ? member.skills.map(skill => `<span class="badge bg-light text-dark me-1">${skill}</span>`).join('')
                    : 'No skills specified';
                
                // Format work items
                const workItemsList = workItems && workItems.length > 0
                    ? workItems.map(item => `
                        <div class="mb-2">
                            <div class="d-flex justify-content-between">
                                <strong>${item.workItemName}</strong>
                                <span class="badge ${getStatusBadgeClass(item.status)}">${item.status}</span>
                            </div>
                            <div class="small text-muted">${item.projectName || 'No project'}</div>
                        </div>
                    `).join('')
                    : 'No active work items';
                
                // Render member details
                detailsElement.innerHTML = `
                    <div class="text-center mb-4">
                        <div class="avatar avatar-xxl mb-3">
                            <span class="avatar-text bg-primary text-white fs-1">
                                ${member.fullName?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <h4>${member.fullName || 'Unknown User'}</h4>
                        <span class="badge ${getRoleBadgeClass(member.role)}">${member.role || 'N/A'}</span>
                    </div>
                    <div class="mb-4">
                        <h5 class="mb-3">Contact Information</h5>
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi bi-envelope me-2"></i>
                            <span>${member.email || 'N/A'}</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <i class="bi bi-briefcase me-2"></i>
                            <span>${member.position || 'No position'}</span>
                        </div>
                    </div>
                    <div class="mb-4">
                        <h5 class="mb-3">Skills</h5>
                        <div>${skillsList}</div>
                    </div>
                    <div class="mb-4">
                        <h5 class="mb-3">Current Work Items</h5>
                        <div>${workItemsList}</div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="small text-muted">Performance</div>
                            <div class="progress" style="height: 6px; width: 100px;">
                                <div class="progress-bar ${member.performance > 70 ? 'bg-success' : member.performance > 40 ? 'bg-warning' : 'bg-danger'}" 
                                     role="progressbar" 
                                     style="width: ${member.performance || 0}%"
                                     aria-valuenow="${member.performance || 0}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                </div>
                            </div>
                            <small>${member.performance || 0}%</small>
                        </div>
                        <div>
                            <div class="small text-muted">Workload</div>
                            <div class="progress" style="height: 6px; width: 100px;">
                                <div class="progress-bar ${member.currentWorkload > 70 ? 'bg-danger' : member.currentWorkload > 40 ? 'bg-warning' : 'bg-success'}" 
                                     role="progressbar" 
                                     style="width: ${(member.currentWorkload || 0) * 100}%"
                                     aria-valuenow="${(member.currentWorkload || 0) * 100}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                </div>
                            </div>
                            <small>${Math.round((member.currentWorkload || 0) * 100)}%</small>
                        </div>
                    </div>
                `;
                
            } catch (error) {
                console.error('Error loading member details:', error);
                detailsElement.innerHTML = `
                    <div class="alert alert-danger">
                        Failed to load member details. Please try again.
                    </div>
                `;
            }
        }
        
        // Edit member
        else if (e.target.closest('.edit-member')) {
            e.preventDefault();
            const memberId = e.target.closest('[data-id]').getAttribute('data-id');
            const editModal = new bootstrap.Modal(document.getElementById('editTeamMemberModal'));
            
            try {
                // Show loading state
                document.getElementById('editMemberSpinner').classList.remove('d-none');
                
                // Fetch member details
                const member = await api.getTeamMember(memberId);
                
                // Populate form
                const [firstName, ...lastNameParts] = member.fullName.split(' ');
                const lastName = lastNameParts.join(' ');
                
                document.getElementById('editUserId').value = member.userId;
                document.getElementById('editFirstName').value = firstName;
                document.getElementById('editLastName').value = lastName;
                document.getElementById('editEmail').value = member.email;
                document.getElementById('editRole').value = member.role;
                document.getElementById('editPosition').value = member.position || '';
                document.getElementById('editSkills').value = Array.isArray(member.skills) 
                    ? member.skills.join(', ') 
                    : (member.skills || '');
                document.getElementById('editIsActive').checked = member.isActive !== false;
                
                // Show modal
                editModal.show();
                
            } catch (error) {
                console.error('Error loading member for edit:', error);
                showToast('Failed to load member details for editing', 'error');
            } finally {
                document.getElementById('editMemberSpinner').classList.add('d-none');
            }
        }
        
        // Toggle member status
        else if (e.target.closest('.toggle-status')) {
            e.preventDefault();
            const button = e.target.closest('.toggle-status');
            const memberId = button.getAttribute('data-id');
            const isCurrentlyActive = button.textContent.trim().toLowerCase().includes('deactivate');
            
            try {
                // Show loading state
                const originalText = button.innerHTML;
                button.disabled = true;
                button.innerHTML = `
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ${isCurrentlyActive ? 'Deactivating...' : 'Activating...'}
                `;
                
                // Update status via API
                await api.updateTeamMemberStatus(memberId, !isCurrentlyActive);
                
                // Show success message
                showToast(`Member ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully`, 'success');
                
                // Refresh the team view
                await renderTeamView();
                
            } catch (error) {
                console.error('Error updating member status:', error);
                const errorMessage = error.response?.data?.message || 'Failed to update member status';
                showToast(errorMessage, 'error');
            }
        }
        
        // Delete member
        else if (e.target.closest('.delete-member')) {
            e.preventDefault();
            const memberId = e.target.closest('[data-id]').getAttribute('data-id');
            const memberName = e.target.closest('tr').querySelector('.fw-bold').textContent;
            
            // Show confirmation dialog
            const confirmModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
            const confirmBtn = document.getElementById('confirmAction');
            const confirmMessage = document.getElementById('confirmationMessage');
            
            confirmMessage.textContent = `Are you sure you want to delete ${memberName}? This action cannot be undone.`;
            
            // Remove previous event listeners
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            // Add new event listener
            newConfirmBtn.onclick = async () => {
                try {
                    newConfirmBtn.disabled = true;
                    newConfirmBtn.innerHTML = `
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Deleting...
                    `;
                    
                    // Call API to delete user
                    // Note: This assumes you have a delete endpoint in your API
                    await api.delete(`/api/profiles/employees/${memberId}`);
                    
                    showToast('Member deleted successfully', 'success');
                    confirmModal.hide();
                    
                    // Refresh the team view
                    await renderTeamView();
                    
                } catch (error) {
                    console.error('Error deleting member:', error);
                    const errorMessage = error.response?.data?.message || 'Failed to delete member';
                    showToast(errorMessage, 'error');
                    newConfirmBtn.disabled = false;
                    newConfirmBtn.textContent = 'Confirm';
                }
            };
            
            confirmModal.show();
        }
    });
    
    // Edit member form submission
    const editForm = document.getElementById('editTeamMemberForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(editForm);
            const submitBtn = editForm.querySelector('button[type="submit"]');
            const spinner = editForm.querySelector('#editMemberSpinner');
            
            try {
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                // Prepare update data
                const updateData = {
                    fullName: `${formData.get('firstName')} ${formData.get('lastName')}`.trim(),
                    email: formData.get('email'),
                    role: formData.get('role'),
                    position: formData.get('position') || null,
                    skills: formData.get('skills') 
                        ? formData.get('skills').split(',').map(s => s.trim()).filter(Boolean)
                        : [],
                    isActive: formData.get('isActive') === 'on'
                };
                
                // Call API to update user
                const userId = formData.get('userId');
                await api.updateTeamMember(userId, updateData);
                
                showToast('Team member updated successfully!', 'success');
                
                // Close modal and refresh team view
                const modal = bootstrap.Modal.getInstance(document.getElementById('editTeamMemberModal'));
                if (modal) modal.hide();
                
                // Refresh team view
                await renderTeamView();
                
            } catch (error) {
                console.error('Error updating team member:', error);
                const errorMessage = error.response?.data?.message || 'Failed to update team member';
                showToast(errorMessage, 'error');
            } finally {
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }
    
    // View member details
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.view-member')) {
            e.preventDefault();
            const memberId = e.target.closest('[data-id]').getAttribute('data-id');
            const memberRow = e.target.closest('tr');
            const memberName = memberRow.querySelector('.fw-bold').textContent;
            const memberRole = memberRow.querySelector('td:nth-child(2) .badge').textContent;
            const memberEmail = memberRow.cells[2].textContent;
            
            // Show loading state
            const detailsElement = document.getElementById('memberDetails');
            detailsElement.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 mb-0">Loading member details...</p>
                </div>
            `;
            
            const modal = new bootstrap.Modal(document.getElementById('viewMemberModal'));
            modal.show();
            
            try {
                const member = await api.getTeamMember(memberId);
                const workItems = await api.getTeamMemberWorkItems(memberId);
                
                // Format skills
                const skillsList = member.skills && member.skills.length > 0 
                    ? member.skills.map(skill => `<span class="badge bg-light text-dark me-1">${skill}</span>`).join('')
                    : 'No skills specified';
                
                // Format work items
                const workItemsList = workItems && workItems.length > 0
                    ? workItems.map(item => `
                        <div class="mb-2">
                            <div class="d-flex justify-content-between">
                                <strong>${item.workItemName}</strong>
                                <span class="badge ${getStatusBadgeClass(item.status)}">${item.status}</span>
                            </div>
                            <div class="small text-muted">${item.projectName || 'No project'}</div>
                        </div>
                    `).join('')
                    : 'No active work items';
                
                // Render member details
                detailsElement.innerHTML = `
                    <div class="text-center mb-4">
                        <div class="avatar avatar-xxl mb-3">
                            <span class="avatar-text bg-primary text-white fs-1">
                                ${member.fullName?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <h4>${member.fullName || 'Unknown User'}</h4>
                        <span class="badge ${getRoleBadgeClass(member.role)}">${member.role || 'N/A'}</span>
                    </div>
                    <div class="mb-4">
                        <h5 class="mb-3">Contact Information</h5>
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi bi-envelope me-2"></i>
                            <span>${member.email || 'N/A'}</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <i class="bi bi-briefcase me-2"></i>
                            <span>${member.position || 'No position'}</span>
                        </div>
                    </div>
                    <div class="mb-4">
                        <h5 class="mb-3">Skills</h5>
                        <div>${skillsList}</div>
                    </div>
                    <div class="mb-4">
                        <h5 class="mb-3">Current Work Items</h5>
                        <div>${workItemsList}</div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="small text-muted">Performance</div>
                            <div class="progress" style="height: 6px; width: 100px;">
                                <div class="progress-bar ${member.performance > 70 ? 'bg-success' : member.performance > 40 ? 'bg-warning' : 'bg-danger'}" 
                                     role="progressbar" 
                                     style="width: ${member.performance || 0}%"
                                     aria-valuenow="${member.performance || 0}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                </div>
                            </div>
                            <small>${member.performance || 0}%</small>
                        </div>
                        <div>
                            <div class="small text-muted">Workload</div>
                            <div class="progress" style="height: 6px; width: 100px;">
                                <div class="progress-bar ${member.currentWorkload > 70 ? 'bg-danger' : member.currentWorkload > 40 ? 'bg-warning' : 'bg-success'}" 
                                     role="progressbar" 
                                     style="width: ${(member.currentWorkload || 0) * 100}%"
                                     aria-valuenow="${(member.currentWorkload || 0) * 100}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                </div>
                            </div>
                            <small>${Math.round((member.currentWorkload || 0) * 100)}%</small>
                        </div>
                    </div>
                `;
                
            } catch (error) {
                console.error('Error loading member details:', error);
                detailsElement.innerHTML = `
                    <div class="alert alert-danger">
                        Failed to load member details. Please try again.
                    </div>
                `;
            }
        }
        
        // Edit member
        else if (e.target.closest('.edit-member')) {
            e.preventDefault();
            const memberId = e.target.closest('[data-id]').getAttribute('data-id');
            const editModal = new bootstrap.Modal(document.getElementById('editTeamMemberModal'));
            
            try {
                // Show loading state
                document.getElementById('editMemberSpinner').classList.remove('d-none');
                
                // Fetch member details
                const member = await api.getTeamMember(memberId);
                
                // Populate form
                const [firstName, ...lastNameParts] = member.fullName.split(' ');
                const lastName = lastNameParts.join(' ');
                
                document.getElementById('editUserId').value = member.userId;
                document.getElementById('editFirstName').value = firstName;
                document.getElementById('editLastName').value = lastName;
                document.getElementById('editEmail').value = member.email;
                document.getElementById('editRole').value = member.role;
                document.getElementById('editPosition').value = member.position || '';
                document.getElementById('editSkills').value = Array.isArray(member.skills) 
                    ? member.skills.join(', ') 
                    : (member.skills || '');
                document.getElementById('editIsActive').checked = member.isActive !== false;
                
                // Show modal
                editModal.show();
                
            } catch (error) {
                console.error('Error loading member for edit:', error);
                showToast('Failed to load member details for editing', 'error');
            } finally {
                document.getElementById('editMemberSpinner').classList.add('d-none');
            }
        }
        
        // Toggle member status
        else if (e.target.closest('.toggle-status')) {
            e.preventDefault();
            const button = e.target.closest('.toggle-status');
            const memberId = button.getAttribute('data-id');
            const isCurrentlyActive = button.textContent.trim().toLowerCase().includes('deactivate');
            
            try {
                // Show loading state
                const originalText = button.innerHTML;
                button.disabled = true;
                button.innerHTML = `
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ${isCurrentlyActive ? 'Deactivating...' : 'Activating...'}
                `;
                
                // Update status via API
                await api.updateTeamMemberStatus(memberId, !isCurrentlyActive);
                
                // Show success message
                showToast(`Member ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully`, 'success');
                
                // Refresh the team view
                await renderTeamView();
                
            } catch (error) {
                console.error('Error updating member status:', error);
                const errorMessage = error.response?.data?.message || 'Failed to update member status';
                showToast(errorMessage, 'error');
                
                // Restore button state
                button.disabled = false;
                button.innerHTML = originalText;
            }
        }
        
        // Delete member
        else if (e.target.closest('.delete-member')) {
            e.preventDefault();
            const memberId = e.target.closest('[data-id]').getAttribute('data-id');
            const memberName = e.target.closest('tr').querySelector('.fw-bold').textContent;
            
            // Show confirmation dialog
            const confirmModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
            const confirmBtn = document.getElementById('confirmAction');
            const confirmMessage = document.getElementById('confirmationMessage');
            
            confirmMessage.textContent = `Are you sure you want to delete ${memberName}? This action cannot be undone.`;
            
            // Remove previous event listeners
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            // Add new event listener
            newConfirmBtn.onclick = async () => {
                try {
                    newConfirmBtn.disabled = true;
                    newConfirmBtn.innerHTML = `
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Deleting...
                    `;
                    
                    // Call API to delete user
                    await api.delete(`/api/profiles/employees/${memberId}`);
                    
                    showToast('Member deleted successfully', 'success');
                    confirmModal.hide();
                    
                    // Refresh the team view
                    await renderTeamView();
                    
                } catch (error) {
                    console.error('Error deleting member:', error);
                    const errorMessage = error.response?.data?.message || 'Failed to delete member';
                    showToast(errorMessage, 'error');
                    newConfirmBtn.disabled = false;
                    newConfirmBtn.textContent = 'Confirm';
                }
            };
            
            confirmModal.show();
        }
        
        // Handle project clicks for navigation
        else if (e.target.closest('[data-link]')) {
            e.preventDefault();
            const link = e.target.closest('[data-link]');
            const href = link.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        }
    });

    // Initialize any tooltips in the modal
    try {
        const tooltipTriggerList = [].slice.call(detailsElement.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
        
        // Add action buttons
        const buttonsHtml = `
            <div class="d-flex justify-content-end gap-2 mt-4">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                    Close
                </button>
                <button type="button" class="btn btn-primary edit-member" data-id="${memberId}">
                    <i class="bi bi-pencil me-1"></i> Edit Profile
                </button>
            </div>
        `;
        detailsElement.insertAdjacentHTML('beforeend', buttonsHtml);
    } catch (error) {
        console.error('Error loading member details:', error);
        detailsElement.innerHTML = `
            <div class="alert alert-danger">
                Failed to load member details. Please try again later.
            </div>
            <div class="text-center mt-3">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    Close
                </button>
            </div>
        `;
    }
    
    // Delete member
    document.addEventListener('click', (e) => {
        if (e.target.closest('.delete-member')) {
            e.preventDefault();
            const memberId = e.target.closest('[data-id]').getAttribute('data-id');
            const memberName = e.target.closest('tr').querySelector('h6').textContent;
            
            document.getElementById('confirmationMessage').innerHTML = `
                Are you sure you want to remove <strong>${memberName}</strong> from the team?
                <div class="text-muted small mt-2">This action cannot be undone.</div>
            `;
            
            const confirmBtn = document.getElementById('confirmAction');
            const handler = async () => {
                try {
                    // In a real app: await api.deleteTeamMember(memberId);
                    await new Promise(resolve => setTimeout(resolve, 800));
                    showToast('Team member removed', 'success');
                    // In a real app: await renderTeamView();
                } catch (error) {
                    console.error('Error deleting member:', error);
                    showToast('Failed to remove team member', 'error');
                }
                confirmBtn.removeEventListener('click', handler);
                bootstrap.Modal.getInstance(document.getElementById('confirmationModal'))?.hide();
            };
            
            confirmBtn.addEventListener('click', handler, { once: true });
            
            const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
            modal.show();
        }
    });
    
    // Toggle member status
document.addEventListener('click', async (e) => {
    const toggleBtn = e.target.closest('.toggle-status');
    if (!toggleBtn) return;
    
    e.preventDefault();
    const memberId = toggleBtn.closest('[data-id]')?.getAttribute('data-id');
    const isActive = toggleBtn.textContent.trim() === 'Deactivate';
    
    // Store original button text before making changes
    const originalText = toggleBtn.innerHTML;
    
    try {
        // Show loading state
        toggleBtn.disabled = true;
        toggleBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ${isActive ? 'Deactivating...' : 'Activating...'}
        `;
        
        // Update member status via API
        await api.updateTeamMemberStatus(memberId, !isActive);
        
        // Show success message and refresh view
        showToast(`Member ${isActive ? 'deactivated' : 'activated'} successfully`, 'success');
        await renderTeamView();
        
    } catch (error) {
        console.error('Error updating member status:', error);
        const errorMessage = error.response?.data?.message || 'Failed to update member status';
        showToast(errorMessage, 'error');
    } finally {
        // Reset button state
        toggleBtn.disabled = false;
        toggleBtn.innerHTML = originalText;
    }
});
    
// Edit member
document.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-member');
    if (!editBtn) return;
    
    e.preventDefault();
    const memberId = editBtn.closest('[data-id]')?.getAttribute('data-id');
    
    try {
        // Show loading state
        const originalHtml = editBtn.innerHTML;
        editBtn.disabled = true;
        editBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Loading...
        `;
        
        // Get member details from API
        const member = await api.getTeamMember(memberId);
        
        // Safely handle member data
        const firstName = member.firstName || '';
        const lastName = member.lastName || '';
        
        // Populate form with member data
        document.getElementById('editUserId').value = member.userId || '';
        document.getElementById('editFirstName').value = firstName;
        document.getElementById('editLastName').value = lastName;
        document.getElementById('editEmail').value = member.email || '';
        document.getElementById('editRole').value = member.role || '';
        document.getElementById('editPosition').value = member.position || '';
        document.getElementById('editSkills').value = Array.isArray(member.skills) 
            ? member.skills.join(', ') 
            : (member.skills || '');
        document.getElementById('editIsActive').checked = member.isActive !== false;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('editTeamMemberModal'));
        modal.show();

    } catch (error) {
        console.error('Error loading member for edit:', error);
        const errorMessage = error.response?.data?.message || 'Failed to load member details';
        showToast(errorMessage, 'error');
    } finally {
        if (editBtn) {
            editBtn.disabled = false;
            editBtn.innerHTML = originalHtml;
        }
    }
});


}