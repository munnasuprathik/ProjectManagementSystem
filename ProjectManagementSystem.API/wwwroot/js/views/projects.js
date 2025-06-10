import { api } from '../api.js';
import { showToast } from '../utils/uiUtils.js';

// Helper function to escape HTML to prevent XSS
const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

export async function renderProjectsList() {
    try {
        const projects = await api.getProjects();
        
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1 class="h3 mb-0">Projects</h1>
                    <div>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createProjectModal">
                            <i class="bi bi-plus-lg me-1"></i> New Project
                        </button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-body p-0">
                        ${projects.length > 0 ? `
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Status</th>
                                            <th>Priority</th>
                                            <th>Start Date</th>
                                            <th>Deadline</th>
                                            <th>Work Items</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${projects.map(project => `
                                            <tr>
                                                <td>
                                                    <a href="/projects/${project.projectId}" class="fw-bold" data-link>
                                                        ${project.projectName}
                                                    </a>
                                                    <div class="small text-muted">${project.description || 'No description'}</div>
                                                </td>
                                                <td><span class="badge bg-${getStatusBadgeClass(project.status)}">${project.status}</span></td>
                                                <td><span class="badge bg-${getPriorityBadgeClass(project.priority)}">${project.priority}</span></td>
                                                <td>${formatDate(project.startDate)}</td>
                                                <td>${formatDate(project.deadline)}</td>
                                                <td>${project.workItemsCount || 0}</td>
                                                <td>
                                                    <div class="dropdown">
                                                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="dropdownMenuButton${project.projectId}" data-bs-toggle="dropdown" aria-expanded="false">
                                                            <i class="bi bi-three-dots-vertical"></i>
                                                        </button>
                                                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton${project.projectId}">
                                                            <li><a class="dropdown-item" href="/projects/${project.projectId}" data-link><i class="bi bi-eye me-2"></i>View</a></li>
                                                            <li><a class="dropdown-item" href="#" onclick="editProject(${project.projectId}, '${project.projectName}', '${project.description}', '${project.status}', '${project.priority}', '${project.startDate}', '${project.deadline}')"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                                            <li><a class="dropdown-item text-danger" href="#" onclick="confirmDeleteProject(${project.projectId}, '${project.projectName}')"><i class="bi bi-trash me-2"></i>Delete</a></li>
                                                        </ul>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div class="text-center p-5">
                                <i class="bi bi-folder-x display-4 text-muted mb-3"></i>
                                <h5>No projects found</h5>
                                <p class="text-muted">Get started by creating a new project</p>
                                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createProjectModal">
                                    <i class="bi bi-plus-lg me-1"></i> Create Project
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Create Project Modal -->
            <div class="modal fade" id="createProjectModal" tabindex="-1" aria-labelledby="createProjectModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="createProjectModalLabel">Create New Project</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="createProjectForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="projectName" class="form-label">Project Name <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="projectName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="projectDescription" class="form-label">Description</label>
                                    <textarea class="form-control" id="projectDescription" rows="3"></textarea>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="startDate" class="form-label">Start Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="startDate" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="deadline" class="form-label">Deadline <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="deadline" required>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="requirements" class="form-label">Requirements</label>
                                    <textarea class="form-control" id="requirements" rows="3"></textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="priority" class="form-label">Priority <span class="text-danger">*</span></label>
                                    <select class="form-select" id="priority" required>
                                        <option value="">Select priority</option>
                                        <option value="Critical">Critical</option>
                                        <option value="High">High</option>
                                        <option value="Medium" selected>Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    <span id="createProjectSpinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Edit Project Modal -->
            <div class="modal fade" id="editProjectModal" tabindex="-1" aria-labelledby="editProjectModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editProjectModalLabel">Edit Project</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="editProjectForm">
                            <input type="hidden" id="editProjectId">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="editProjectName" class="form-label">Project Name <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="editProjectName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editProjectDescription" class="form-label">Description</label>
                                    <textarea class="form-control" id="editProjectDescription" rows="3"></textarea>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="editStartDate" class="form-label">Start Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="editStartDate" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="editDeadline" class="form-label">Deadline <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="editDeadline" required>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="editRequirements" class="form-label">Requirements</label>
                                    <textarea class="form-control" id="editRequirements" rows="3"></textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="editPriority" class="form-label">Priority <span class="text-danger">*</span></label>
                                    <select class="form-select" id="editPriority" required>
                                        <option value="Critical">Critical</option>
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="editStatus" class="form-label">Status <span class="text-danger">*</span></label>
                                    <select class="form-select" id="editStatus" required>
                                        <option value="NotStarted">Not Started</option>
                                        <option value="InProgress">In Progress</option>
                                        <option value="OnHold">On Hold</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    <span id="updateProjectSpinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Delete Confirmation Modal -->
            <div class="modal fade" id="deleteProjectModal" tabindex="-1" aria-labelledby="deleteProjectModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="deleteProjectModalLabel">Confirm Delete</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to delete the project "<span id="projectToDeleteName"></span>"? This action cannot be undone.</p>
                            <p class="text-danger">All work items in this project will also be deleted.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteProject">
                                <span id="deleteProjectSpinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                Delete Project
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app').innerHTML = html;

        // Initialize event listeners
        setupProjectForms();
        
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('app').innerHTML = `
            <div class="alert alert-danger" role="alert">
                Failed to load projects. Please try again later.
            </div>
        `;
    }
}

// Initialize the form handlers when the script loads
document.addEventListener('DOMContentLoaded', function() {
    setupProjectForms();
});

function setupProjectForms() {
    // Create project form
    const createForm = document.getElementById('createProjectForm');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = createForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('createProjectSpinner');
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                const projectData = {
                    projectName: document.getElementById('projectName').value.trim(),
                    description: document.getElementById('projectDescription').value.trim(),
                    startDate: document.getElementById('startDate').value,
                    deadline: document.getElementById('deadline').value,
                    requirements: document.getElementById('requirements').value.trim(),
                    priority: document.getElementById('priority').value
                };
                
                // Validate required fields
                const errors = [];
                
                if (!projectData.projectName?.trim()) {
                    errors.push('Project name is required');
                }
                
                if (!projectData.description?.trim()) {
                    errors.push('Description is required');
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
                    throw new Error(errors.join('\n'));
                }
                
                console.log('Submitting project data:', projectData);
                
                // Call API to create project
                const response = await api.createProject(projectData);
                console.log('API response:', response);
                
                if (response && response.success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('createProjectModal'));
                    if (modal) {
                        modal.hide();
                    }
                    
                    // Reset form
                    createForm.reset();
                    
                    // Show success message
                    showToast('Project created successfully!', 'success');
                    
                    // Refresh the projects list if we're on the projects page
                    if (window.location.pathname.includes('/projects')) {
                        await renderProjectsList();
                    } else {
                        // If we're on the dashboard, refresh the page to show the new project
                        window.location.reload();
                    }
                }
                
            } catch (error) {
                console.error('Error creating project:', error);
                
                // Show detailed error message
                if (error.message) {
                    // If we have multiple validation errors, show them in a list
                    if (error.message.includes('\n')) {
                        const errorList = error.message.split('\n').map(e => `• ${e}`).join('<br>');
                        showToast(`<div><strong>Validation Errors:</strong><br>${errorList}</div>`, 'error', 10000);
                    } else {
                        showToast(error.message, 'error');
                    }
                } else if (error.errors) {
                    // Handle server-side validation errors
                    const errorList = Object.values(error.errors).flat().map(e => `• ${e}`).join('<br>');
                    showToast(`<div><strong>Validation Errors:</strong><br>${errorList}</div>`, 'error', 10000);
                } else {
                    showToast('Failed to create project. Please try again.', 'error');
                }
            } finally {
                // Reset form and loading state
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }

    // Edit project form
    const editForm = document.getElementById('editProjectForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = editForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('updateProjectSpinner');
            const projectId = document.getElementById('editProjectId').value;
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                const projectData = {
                    projectName: document.getElementById('editProjectName').value,
                    description: document.getElementById('editProjectDescription').value,
                    startDate: document.getElementById('editStartDate').value,
                    deadline: document.getElementById('editDeadline').value,
                    requirements: document.getElementById('editRequirements').value,
                    priority: document.getElementById('editPriority').value,
                    status: document.getElementById('editStatus').value
                };
                
                // Call API to update project
                await api.updateProject(projectId, projectData);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editProjectModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Show success message
                showToast('Project updated successfully!', 'success');
                
                // Refresh the projects list
                renderProjectsList();
                
            } catch (error) {
                console.error('Error updating project:', error);
                showToast('Failed to update project. Please try again.', 'error');
            } finally {
                // Reset loading state
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }

    // Delete project confirmation
    const confirmDeleteBtn = document.getElementById('confirmDeleteProject');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            const projectId = confirmDeleteBtn.dataset.projectId;
            const spinner = document.getElementById('deleteProjectSpinner');
            const modalElement = document.getElementById('deleteProjectModal');
            
            if (!projectId) {
                showToast('Error: Invalid project ID', 'error');
                return;
            }
            
            try {
                // Show loading state
                confirmDeleteBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                // Call API to delete project
                await api.deleteProject(projectId);
                
                // Close modal using vanilla JS to avoid Bootstrap instance issues
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                } else {
                    // Fallback in case modal instance can't be retrieved
                    const bsModal = new bootstrap.Modal(modalElement);
                    bsModal.hide();
                }
                
                // Show success message
                showToast('Project deleted successfully!', 'success');
                
                // Refresh the projects list
                renderProjectsList();
                
            } catch (error) {
                console.error('Error deleting project:', error);
                showToast('Failed to delete project. Please try again.', 'error');
            } finally {
                // Reset button state
                if (confirmDeleteBtn) confirmDeleteBtn.disabled = false;
                if (spinner) spinner.classList.add('d-none');
            }
        });
    }
}

// Global functions for inline event handlers
window.editProject = function(id, name, description, status, priority, startDate, deadline) {
    const modal = new bootstrap.Modal(document.getElementById('editProjectModal'));
    
    // Set form values
    document.getElementById('editProjectId').value = id;
    document.getElementById('editProjectName').value = name;
    document.getElementById('editProjectDescription').value = description || '';
    document.getElementById('editStatus').value = status || 'NotStarted';
    document.getElementById('editPriority').value = priority || 'Medium';
    document.getElementById('editStartDate').value = startDate || '';
    document.getElementById('editDeadline').value = deadline || '';
    
    // Show modal
    modal.show();
};

window.confirmDeleteProject = function(id, name) {
    const modal = new bootstrap.Modal(document.getElementById('deleteProjectModal'));
    
    // Set project info
    document.getElementById('projectToDeleteName').textContent = name;
    document.getElementById('confirmDeleteProject').dataset.projectId = id;
    
    // Show modal
    modal.show();
};

// Helper functions
function getStatusBadgeClass(status) {
    switch(status?.toLowerCase()) {
        case 'inprogress':
            return 'warning';
        case 'completed':
            return 'success';
        case 'onhold':
            return 'info';
        case 'cancelled':
            return 'danger';
        default: // NotStarted
            return 'secondary';
    }
}

function getPriorityBadgeClass(priority) {
    switch(priority?.toLowerCase()) {
        case 'critical':
            return 'danger';
        case 'high':
            return 'warning';
        case 'low':
            return 'info';
        default: // Medium
            return 'primary';
    }
}

export async function renderProjectDetails(projectId) {
    if (!projectId) {
        showToast('Invalid project ID', 'error');
        window.location.href = '/projects';
        return;
    }

    try {
        const [project, workItems] = await Promise.all([
            api.getProject(projectId).catch(error => {
                console.error('Error fetching project:', error);
                throw new Error('Failed to load project details');
            }),
            api.getWorkItems({ projectId }).catch(error => {
                console.error('Error fetching work items:', error);
                return []; // Return empty array if work items fail to load
            })
        ]);

        if (!project) {
            throw new Error('Project not found');
        }
        
        // Format dates safely
        const formatDateSafe = (dateString) => {
            try {
                if (!dateString) return 'N/A';
                const date = new Date(dateString);
                return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (error) {
                console.error('Error formatting date:', error);
                return 'N/A';
            }
        };
        
        const safeProject = {
            ...project,
            projectName: escapeHtml(project.projectName),
            description: project.description ? escapeHtml(project.description) : 'No description',
            status: escapeHtml(project.status || 'Not Started'),
            priority: escapeHtml(project.priority || 'Medium'),
            createdBy: escapeHtml(project.createdBy || 'Unknown')
        };

        const editOnClick = `editProject(
            ${project.projectId},
            '${escapeHtml(project.projectName).replace(/'/g, "\\'")}',
            '${escapeHtml(project.description || '').replace(/'/g, "\\'")}',
            '${escapeHtml(project.status || 'Not Started')}',
            '${escapeHtml(project.priority || 'Medium')}',
            '${escapeHtml(project.startDate || '')}',
            '${escapeHtml(project.deadline || '')}'
        )`;

        const html = `
            <div class="container-fluid py-4">
                <nav aria-label="breadcrumb" class="mb-4">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item"><a href="/projects" data-link>Projects</a></li>
                        <li class="breadcrumb-item active" aria-current="page">${safeProject.projectName}</li>
                    </ol>
                </nav>
                
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 class="h3 mb-1">${safeProject.projectName}</h1>
                        <p class="text-muted mb-0">${safeProject.description}</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-secondary" onclick="${editOnClick}">
                            <i class="bi bi-pencil me-1"></i> Edit Project
                        </button>
                        <a href="/projects/${projectId}/workitems/new" class="btn btn-primary" data-link>
                            <i class="bi bi-plus-lg me-1"></i> Add Work Item
                        </a>
                    </div>
                </div>
                
                <div class="row">
                    <!-- Project Details Card -->
                    <div class="col-lg-4">
                        <div class="card mb-4">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Project Details</h5>
                                <span class="badge bg-${getStatusBadgeClass(project.status)}">
                                    ${safeProject.status}
                                </span>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-1">Priority</h6>
                                    <span class="badge bg-${getPriorityBadgeClass(project.priority)}">
                                        ${safeProject.priority}
                                    </span>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-1">Start Date</h6>
                                    <p class="mb-0">${formatDateSafe(project.startDate)}</p>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-1">Deadline</h6>
                                    <p class="mb-0">${formatDateSafe(project.deadline)}</p>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-1">Created By</h6>
                                    <p class="mb-0">${safeProject.createdBy}</p>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-1">Created On</h6>
                                    <p class="mb-0">${formatDateSafe(project.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Requirements Card -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">Requirements</h5>
                            </div>
                            <div class="card-body">
                                ${project.requirements 
                                    ? `<div class="p-3 bg-light rounded">${escapeHtml(project.requirements)}</div>`
                                    : '<p class="text-muted mb-0">No requirements specified.</p>'
                                }
                            </div>
                        </div>
                    </div>
                    
                    <!-- Work Items Section -->
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Work Items</h5>
                                <div class="d-flex gap-2">
                                    <div class="input-group input-group-sm" style="width: 250px;">
                                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                                        <input type="text" class="form-control" id="workItemSearch" 
                                               placeholder="Search work items..." aria-label="Search work items"
                                               onkeyup="filterWorkItems(this.value)">
                                    </div>
                                    <div class="btn-group" role="group">
                                        <button type="button" class="btn btn-sm btn-outline-secondary" id="filterAll">All</button>
                                        <button type="button" class="btn btn-sm btn-outline-secondary" data-status="ToDo">To Do</button>
                                        <button type="button" class="btn btn-sm btn-outline-secondary" data-status="InProgress">In Progress</button>
                                        <button type="button" class="btn btn-sm btn-outline-secondary" data-status="Review">Review</button>
                                        <button type="button" class="btn btn-sm btn-outline-secondary" data-status="Done">Done</button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                ${workItems.length > 0 ? `
                                    <div class="table-responsive">
                                        <table class="table table-hover align-middle mb-0">
                                            <thead class="table-light">
                                                <tr>
                                                    <th>Title</th>
                                                    <th>Status</th>
                                                    <th>Priority</th>
                                                    <th>Assigned To</th>
                                                    <th>Due Date</th>
                                                    <th class="text-end">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody id="workItemsTableBody">
                                                ${workItems.map(item => {
                                                    const safeItem = {
                                                        ...item,
                                                        workItemName: escapeHtml(item.workItemName || 'Unnamed Work Item'),
                                                        description: item.description ? escapeHtml(item.description) : 'No description',
                                                        status: escapeHtml(item.status || 'ToDo'),
                                                        priority: escapeHtml(item.priority || 'Medium'),
                                                        assignedToName: escapeHtml(item.assignedToName || 'Unassigned')
                                                    };
                                                    
                                                    const shortDescription = safeItem.description.length > 50 
                                                        ? safeItem.description.substring(0, 47) + '...' 
                                                        : safeItem.description;
                                                        
                                                    return `
                                                    <tr data-status="${escapeHtml(item.status || '').toLowerCase()}"
                                                        data-search="${escapeHtml(item.workItemName + ' ' + item.description).toLowerCase()}">
                                                        <td>
                                                            <div class="fw-semibold">
                                                                <a href="/workitems/${item.workItemId}" class="text-decoration-none" data-link>
                                                                    ${safeItem.workItemName}
                                                                </a>
                                                            </div>
                                                            <div class="small text-muted">
                                                                ${shortDescription}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span class="badge bg-${getStatusBadgeClass(item.status)} w-75">
                                                                ${safeItem.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span class="badge bg-${getPriorityBadgeClass(item.priority)} w-75">
                                                                ${safeItem.priority}
                                                            </span>
                                                        </td>
                                                        <td>${safeItem.assignedToName}</td>
                                                        <td>${formatDateSafe(item.deadline)}</td>
                                                        <td class="text-end">
                                                            <div class="btn-group btn-group-sm" role="group">
                                                                <a href="/workitems/${item.workItemId}" class="btn btn-outline-primary" data-link
                                                                   title="View" data-bs-toggle="tooltip">
                                                                    <i class="bi bi-eye"></i>
                                                                </a>
                                                                <a href="/workitems/${item.workItemId}/edit" class="btn btn-outline-secondary" data-link
                                                                   title="Edit" data-bs-toggle="tooltip">
                                                                    <i class="bi bi-pencil"></i>
                                                                </a>
                                                                <button type="button" class="btn btn-outline-danger" 
                                                                        onclick="event.stopPropagation(); if(confirm('Are you sure you want to delete this work item?')) deleteWorkItem(${item.workItemId})"
                                                                        title="Delete" data-bs-toggle="tooltip">
                                                                    <i class="bi bi-trash"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>`;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                ` : `
                                    <div class="text-center p-5">
                                        <div class="mb-3">
                                            <i class="bi bi-inbox display-4 text-muted"></i>
                                        </div>
                                        <h5>No work items found</h5>
                                        <p class="text-muted mb-4">Get started by creating a new work item</p>
                                        <a href="/projects/${projectId}/workitems/new" class="btn btn-primary" data-link>
                                            <i class="bi bi-plus-lg me-1"></i> Add Work Item
                                        </a>
                                    </div>
                                `}
                            </div>
                            ${workItems.length > 0 ? `
                                <div class="card-footer bg-transparent border-top-0">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="text-muted small">
                                            Showing <span class="fw-semibold">${workItems.length}</span> work items
                                        </div>
                                        <div>
                                            <button class="btn btn-sm btn-outline-secondary me-2" id="exportCsv">
                                                <i class="bi bi-download me-1"></i> Export CSV
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <!-- Project Details -->
                    <div class="col-lg-4">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">Project Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-1">Status</h6>
                                    <p class="mb-0">
                                        <span class="badge bg-${getStatusBadgeClass(project.status)}">
                                            ${project.status}
                                        </span>
                                    </p>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-1">Priority</h6>
                                    <p class="mb-0">
                                        <span class="badge bg-${getPriorityBadgeClass(project.priority)}">
                                            ${project.priority}
                                        </span>
                                    </p>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-1">Start Date</h6>
                                    <p class="mb-0">${formatDate(project.startDate)}</p>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-1">Deadline</h6>
                                    <p class="mb-0">${formatDate(project.deadline)}</p>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-1">Created By</h6>
                                    <p class="mb-0">${project.createdBy}</p>
                                </div>
                                <div>
                                    <h6 class="text-muted small mb-1">Created On</h6>
                                    <p class="mb-0">${formatDate(project.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Requirements</h5>
                            </div>
                            <div class="card-body">
                                ${project.requirements ? 
                                    `<div class="p-3 bg-light rounded">${project.requirements}</div>` : 
                                    '<p class="text-muted mb-0">No requirements specified.</p>'
                                }
                            </div>
                        </div>
                    </div>
                    
                    <!-- Work Items -->
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Work Items</h5>
                                <div>
                                    <div class="input-group input-group-sm" style="width: 200px;">
                                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                                        <input type="text" class="form-control" placeholder="Search work items..." id="searchWorkItems">
                                    </div>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                ${workItems.length > 0 ? `
                                    <div class="table-responsive">
                                        <table class="table table-hover mb-0">
                                            <thead>
                                                <tr>
                                                    <th>Work Item</th>
                                                    <th>Status</th>
                                                    <th>Priority</th>
                                                    <th>Assigned To</th>
                                                    <th>Due Date</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${workItems.map(item => {
                                                    const safeItem = {
                                                        ...item,
                                                        workItemName: escapeHtml(item.workItemName || 'Unnamed Work Item'),
                                                        description: item.description ? escapeHtml(item.description) : 'No description',
                                                        status: escapeHtml(item.status || 'Not Started'),
                                                        priority: escapeHtml(item.priority || 'Medium'),
                                                        assignedToName: escapeHtml(item.assignedToName || 'Unassigned')
                                                    };
                                                    
                                                    const shortDescription = safeItem.description.length > 50 
                                                        ? safeItem.description.substring(0, 47) + '...' 
                                                        : safeItem.description;
                                                        
                                                    return `
                                                    <tr>
                                                        <td>
                                                            <a href="/workitems/${item.workItemId}" class="fw-bold" data-link>
                                                                ${safeItem.workItemName}
                                                            </a>
                                                            <div class="small text-muted">
                                                                ${shortDescription}
                                                            </div>
                                                        </td>
                                                        <td><span class="badge bg-${getStatusBadgeClass(item.status)}">${safeItem.status}</span></td>
                                                        <td><span class="badge bg-${getPriorityBadgeClass(item.priority)}">${safeItem.priority}</span></td>
                                                        <td>${safeItem.assignedToName}</td>
                                                        <td>${formatDateSafe(item.deadline)}</td>
                                                        <td>
                                                            <div class="dropdown">
                                                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" 
                                                                    id="dropdownMenuButton${item.workItemId}" 
                                                                    data-bs-toggle="dropdown" 
                                                                    aria-expanded="false"
                                                                    aria-label="Actions">
                                                                    <i class="bi bi-three-dots-vertical"></i>
                                                                </button>
                                                                <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton${item.workItemId}">
                                                                    <li><a class="dropdown-item" href="/workitems/${item.workItemId}" data-link><i class="bi bi-eye me-2"></i>View</a></li>
                                                                    <li><a class="dropdown-item" href="/workitems/${item.workItemId}/edit" data-link><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                                                    <li><a class="dropdown-item text-danger" href="#" 
                                                                        onclick="event.preventDefault(); if(confirm('Are you sure you want to delete this work item?')) { deleteWorkItem(${item.workItemId}); }">
                                                                            <i class="bi bi-trash me-2"></i>Delete
                                                                    </a></li>
                                                                </ul>
                                                            </div>
                                                        </td>
                                                    </tr>`;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                ` : `
                                    <div class="text-center p-5">
                                        <i class="bi bi-inbox display-4 text-muted mb-3"></i>
                                        <h5>No work items found</h5>
                                        <p class="text-muted">Get started by creating a new work item</p>
                                        <a href="/projects/${projectId}/workitems/new" class="btn btn-primary" data-link>
                                            <i class="bi bi-plus-lg me-1"></i> Add Work Item
                                        </a>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('app').innerHTML = html;
        
        // Initialize search functionality
        const searchInput = document.getElementById('searchWorkItems');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('tbody tr');
                
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            });
        }
        
    } catch (error) {
        console.error('Error loading project details:', error);
        document.getElementById('app').innerHTML = `
            <div class="alert alert-danger" role="alert">
                Failed to load project details. Please try again later.
            </div>
        `;
    }
}

// Work Items Filtering and Export Functions
function filterWorkItems(searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const rows = document.querySelectorAll('#workItemsTableBody tr');
    
    rows.forEach(row => {
        const searchableText = row.getAttribute('data-search') || '';
        const matchesSearch = searchableText.includes(searchLower);
        const currentStatus = row.getAttribute('data-status');
        const activeFilter = document.querySelector('.btn-group .btn.active')?.dataset.status;
        
        const shouldShow = matchesSearch && 
                         (!activeFilter || currentStatus === activeFilter.toLowerCase());
        
        row.style.display = shouldShow ? '' : 'none';
    });
}

function exportWorkItemsToCsv(workItems, projectName) {
    try {
        // Filter out any work items that might be filtered out in the UI
        const visibleWorkItems = workItems.filter(item => {
            const row = document.querySelector(`tr[data-workitem-id="${item.workItemId}"]`);
            return !row || window.getComputedStyle(row).display !== 'none';
        });

        // Define CSV headers
        const headers = [
            'ID',
            'Title',
            'Description',
            'Status',
            'Priority',
            'Assigned To',
            'Due Date',
            'Created At',
            'Last Updated'
        ];

        // Map work items to CSV rows
        const csvRows = visibleWorkItems.map(item => {
            return [
                `"${item.workItemId}"`,
                `"${escapeCsvField(item.workItemName || '')}"`,
                `"${escapeCsvField(item.description || '')}"`,
                `"${item.status || ''}"`,
                `"${item.priority || ''}"`,
                `"${escapeCsvField(item.assignedToName || '')}"`,
                `"${formatDateSafe(item.deadline, 'yyyy-MM-dd')}"`,
                `"${formatDateSafe(item.createdAt, 'yyyy-MM-dd')}"`,
                `"${formatDateSafe(item.updatedAt, 'yyyy-MM-dd')}"`
            ].join(',');
        });

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...csvRows
        ].join('\r\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileName = `workitems_${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error exporting work items:', error);
        showToast('Failed to export work items. Please try again.', 'error');
    }
}

function escapeCsvField(field) {
    if (!field) return '';
    // Escape double quotes by doubling them
    const escaped = String(field).replace(/"/g, '""');
    // If the field contains commas, newlines, or double quotes, wrap it in quotes
    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return escaped;
    }
    return escaped;
}

// Initialize event listeners for work items filtering
document.addEventListener('DOMContentLoaded', function() {
    // Status filter buttons
    const filterButtons = document.querySelectorAll('.btn-group .btn[data-status]');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const status = this.getAttribute('data-status');
            const rows = document.querySelectorAll('#workItemsTableBody tr');
            const searchTerm = document.getElementById('workItemSearch')?.value.toLowerCase() || '';
            
            rows.forEach(row => {
                const rowStatus = row.getAttribute('data-status');
                const searchableText = row.getAttribute('data-search') || '';
                const matchesSearch = searchableText.includes(searchTerm);
                const matchesStatus = !status || rowStatus === status.toLowerCase();
                
                row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
            });
        });
    });
    
    // All filter button
    const allFilterBtn = document.getElementById('filterAll');
    if (allFilterBtn) {
        allFilterBtn.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const rows = document.querySelectorAll('#workItemsTableBody tr');
            const searchTerm = document.getElementById('workItemSearch')?.value.toLowerCase() || '';
            
            rows.forEach(row => {
                const searchableText = row.getAttribute('data-search') || '';
                row.style.display = searchableText.includes(searchTerm) ? '' : 'none';
            });
        });
    }
    
    // Export CSV button
    const exportCsvBtn = document.getElementById('exportCsv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', function() {
            // Get project name from the page
            const projectName = document.querySelector('.h3')?.textContent.trim() || 'project';
            // Get work items data from the table
            const workItems = Array.from(document.querySelectorAll('#workItemsTableBody tr')).map(row => {
                return {
                    workItemId: row.getAttribute('data-workitem-id'),
                    workItemName: row.querySelector('td:first-child .fw-semibold')?.textContent.trim(),
                    description: row.querySelector('td:first-child .text-muted')?.textContent.trim(),
                    status: row.querySelector('td:nth-child(2) .badge')?.textContent.trim(),
                    priority: row.querySelector('td:nth-child(3) .badge')?.textContent.trim(),
                    assignedToName: row.querySelector('td:nth-child(4)')?.textContent.trim(),
                    deadline: row.querySelector('td:nth-child(5)')?.textContent.trim(),
                    // These would need to be included in your data attributes if needed
                    createdAt: '',
                    updatedAt: ''
                };
            });
            
            exportWorkItemsToCsv(workItems, projectName);
        });
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Add deleteWorkItem function to global scope
window.deleteWorkItem = async function(workItemId) {
    if (!confirm('Are you sure you want to delete this work item?')) {
        return false;
    }
    
    try {
        await api.deleteWorkItem(workItemId);
        showToast('Work item deleted successfully!', 'success');
        
        // Refresh the current view
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/projects/')) {
            const projectId = currentPath.split('/')[2];
            renderProjectDetails(projectId);
        } else {
            // If not on a project details page, go to work items list
            window.location.href = '/workitems';
        }
    } catch (error) {
        console.error('Error deleting work item:', error);
        showToast('Failed to delete work item. Please try again.', 'error');
    }
    
    return false;
};
