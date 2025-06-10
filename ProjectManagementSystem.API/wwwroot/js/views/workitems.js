import { api } from '../api.js';
import { formatDate } from '../utils/dateUtils.js';
import { showToast } from '../utils/uiUtils.js';

// Status and priority options for filters and forms
const statusOptions = [
    { value: 'ToDo', label: 'To Do' },
    { value: 'InProgress', label: 'In Progress' },
    { value: 'InReview', label: 'In Review' },
    { value: 'Done', label: 'Done' },
    { value: 'Rejected', label: 'Rejected' }
];

const priorityOptions = [
    { value: 'Critical', label: 'Critical' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' }
];

// Helper functions for work item status and priority
function getStatusBadgeClass(status) {
    if (!status) return 'secondary';
    switch(status.toLowerCase()) {
        case 'inprogress':
            return 'warning';
        case 'inreview':
            return 'info';
        case 'done':
            return 'success';
        case 'rejected':
            return 'danger';
        default: // ToDo
            return 'secondary';
    }
}

function getPriorityBadgeClass(priority) {
    if (!priority) return 'primary';
    switch(priority.toLowerCase()) {
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

// Setup filter form submission
function setupWorkItemFilters() {
    const form = document.getElementById('workItemFilters');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const params = new URLSearchParams();
        const status = document.getElementById('statusFilter').value;
        const priority = document.getElementById('priorityFilter').value;
        const projectId = document.getElementById('projectFilter').value;
        const assigneeId = document.getElementById('assigneeFilter')?.value;
        
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (projectId) params.append('projectId', projectId);
        if (assigneeId) params.append('assignedToId', assigneeId);
        
        // Update URL with filters
        const queryString = params.toString();
        const newUrl = queryString ? `/workitems?${queryString}` : '/workitems';
        window.history.pushState({}, '', newUrl);
        
        // Reload work items with filters
        renderWorkItemsList(Object.fromEntries(params));
    });
    
    // Reset filters
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            window.location.href = '/workitems';
        });
    }
}

// Setup work item form submission
function setupWorkItemForm(workItemId = null) {
    const form = document.getElementById('workItemForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const spinner = form.querySelector('.spinner-border');
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            spinner?.classList.remove('d-none');
            
            const formData = {
                workItemName: document.getElementById('workItemName').value,
                description: document.getElementById('description').value,
                projectId: document.getElementById('projectId').value || null,
                assignedToId: document.getElementById('assignedToId').value || null,
                status: document.getElementById('status').value,
                priority: document.getElementById('priority').value,
                deadline: document.getElementById('deadline').value || null
            };
            
            // Call API to create or update work item
            let result;
            if (workItemId) {
                result = await api.updateWorkItem(workItemId, formData);
            } else {
                result = await api.createWorkItem(formData);
            }
            
            // Show success message
            showToast(`Work item ${workItemId ? 'updated' : 'created'} successfully!`, 'success');
            
            // Redirect to work item detail view
            window.location.href = `/workitems/${result.workItemId}`;
            
        } catch (error) {
            console.error(`Error ${workItemId ? 'updating' : 'creating'} work item:`, error);
            showToast(`Failed to ${workItemId ? 'update' : 'create'} work item. Please try again.`, 'error');
        } finally {
            // Reset form and loading state
            submitBtn.disabled = false;
            spinner?.classList.add('d-none');
        }
    });
    
    // Handle delete button if it exists
    const deleteBtn = document.getElementById('deleteWorkItem');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!confirm('Are you sure you want to delete this work item? This action cannot be undone.')) {
                return;
            }
            
            try {
                await api.deleteWorkItem(workItemId);
                showToast('Work item deleted successfully!', 'success');
                window.location.href = '/workitems';
            } catch (error) {
                console.error('Error deleting work item:', error);
                showToast('Failed to delete work item. Please try again.', 'error');
            }
        });
    }
}

// Render work item detail view
async function renderWorkItemDetail(workItemId) {
    try {
        // Show loading state
        document.getElementById('app').innerHTML = `
            <div class="d-flex justify-content-center my-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>`;

        // Fetch work item details
        const workItem = await api.getWorkItem(workItemId);
        const comments = await api.getWorkItemComments(workItemId);

        // Format dates
        const createdDate = formatDateTime(workItem.createdAt);
        const updatedDate = workItem.updatedAt ? formatDateTime(workItem.updatedAt) : 'Never';
        const deadlineDate = workItem.deadline ? formatDate(workItem.deadline) : 'Not set';

        // Generate HTML
        document.getElementById('app').innerHTML = `
            <div class="container mt-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1>${workItem.workItemName}</h1>
                    <div>
                        <a href="/workitems" class="btn btn-outline-secondary me-2">
                            <i class="bi bi-arrow-left"></i> Back to List
                        </a>
                        <a href="/workitems/${workItemId}/edit" class="btn btn-primary">
                            <i class="bi bi-pencil"></i> Edit
                        </a>
                    </div>
                </div>


                <div class="row">
                    <div class="col-md-8">
                        <div class="card mb-4">
                            <div class="card-body">
                                <h5 class="card-title">Description</h5>
                                <p class="card-text">${workItem.description || 'No description provided.'}</p>
                                
                                <h5 class="mt-4">Comments</h5>
                                ${comments.length > 0 ? 
                                    `<div class="list-group mt-3">
                                        ${comments.map(comment => `
                                            <div class="list-group-item">
                                                <div class="d-flex justify-content-between">
                                                    <strong>${comment.createdBy}</strong>
                                                    <small class="text-muted">${formatDateTime(comment.createdAt)}</small>
                                                </div>
                                                <p class="mt-2 mb-0">${comment.content}</p>
                                            </div>
                                        `).join('')}
                                    </div>` : 
                                    '<p class="text-muted">No comments yet.</p>'
                                }
                                
                                <button class="btn btn-outline-primary mt-3" data-bs-toggle="modal" data-bs-target="#addCommentModal">
                                    <i class="bi bi-plus-circle"></i> Add Comment
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card mb-4">
                            <div class="card-body">
                                <h5 class="card-title">Details</h5>
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>Status:</span>
                                        <span class="badge bg-${getStatusBadgeClass(workItem.status)}">${workItem.status}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>Priority:</span>
                                        <span class="badge bg-${getPriorityBadgeClass(workItem.priority)}">${workItem.priority}</span>
                                    </li>
                                    <li class="list-group-item">
                                        <div>Assigned To: ${workItem.assignedToName || 'Unassigned'}</div>
                                    </li>
                                    <li class="list-group-item">
                                        <div>Project: ${workItem.projectName ? 
                                            `<a href="/projects/${workItem.projectId}">${workItem.projectName}</a>` : 
                                            'No project'}
                                        </div>
                                    </li>
                                    <li class="list-group-item">
                                        <div>Created: ${createdDate}</div>
                                        <div>Last Updated: ${updatedDate}</div>
                                        <div>Deadline: ${deadlineDate}</div>
                                    </li>
                                </ul>
                                
                                <div class="mt-3 d-grid gap-2">
                                    <button class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#changeStatusModal">
                                        <i class="bi bi-arrow-repeat"></i> Change Status
                                    </button>
                                    <button id="deleteWorkItemBtn" class="btn btn-outline-danger">
                                        <i class="bi bi-trash"></i> Delete Work Item
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add Comment Modal -->
            <div class="modal fade" id="addCommentModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add Comment</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="addCommentForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="commentText" class="form-label">Comment</label>
                                    <textarea class="form-control" id="commentText" rows="3" required></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    <span class="spinner-border spinner-border-sm d-none" id="commentSpinner" role="status" aria-hidden="true"></span>
                                    Post Comment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Change Status Modal -->
            <div class="modal fade" id="changeStatusModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Change Status</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="changeStatusForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="newStatus" class="form-label">New Status</label>
                                    <select class="form-select" id="newStatus" required>
                                        ${statusOptions.map(option => 
                                            `<option value="${option.value}" ${option.value === workItem.status ? 'selected' : ''}>
                                                ${option.label}
                                            </option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="statusComment" class="form-label">Comment (Optional)</label>
                                    <textarea class="form-control" id="statusComment" rows="3"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    <span class="spinner-border spinner-border-sm d-none" id="statusSpinner" role="status" aria-hidden="true"></span>
                                    Update Status
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Delete Confirmation Modal -->
            <div class="modal fade" id="deleteConfirmationModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Confirm Deletion</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to delete this work item? This action cannot be undone.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirmDelete">
                                <span class="spinner-border spinner-border-sm d-none" id="deleteSpinner" role="status" aria-hidden="true"></span>
                                Delete Work Item
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;

        // Initialize event listeners
        setupWorkItemDetailEvents(workItemId);
        
    } catch (error) {
        console.error('Error loading work item:', error);
        document.getElementById('app').innerHTML = `
            <div class="alert alert-danger" role="alert">
                Failed to load work item. Please try again later.
            </div>
            <a href="/workitems" class="btn btn-primary mt-3">Back to Work Items</a>`;
    }
}

// Setup event listeners for work item detail page
function setupWorkItemDetailEvents(workItemId) {
    // Add comment form
    const addCommentForm = document.getElementById('addCommentForm');
    if (addCommentForm) {
        addCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = addCommentForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('commentSpinner');
            const commentText = document.getElementById('commentText').value;
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                // Call API to add comment
                await api.addWorkItemComment(workItemId, { content: commentText });
                
                // Close modal and refresh comments
                const modal = bootstrap.Modal.getInstance(document.getElementById('addCommentModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Show success message and refresh the page
                showToast('Comment added successfully!', 'success');
                renderWorkItemDetail(workItemId);
                
            } catch (error) {
                console.error('Error adding comment:', error);
                showToast('Failed to add comment. Please try again.', 'error');
            } finally {
                // Reset form and loading state
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
                addCommentForm.reset();
            }
        });
    }
    
    // Change status form
    const changeStatusForm = document.getElementById('changeStatusForm');
    if (changeStatusForm) {
        changeStatusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = changeStatusForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('statusSpinner');
            const newStatus = document.getElementById('newStatus').value;
            const comment = document.getElementById('statusComment').value;
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                // Call API to update status
                await api.updateWorkItemStatus(workItemId, { 
                    status: newStatus,
                    comment: comment || undefined
                });
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('changeStatusModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Show success message and refresh the page
                showToast('Status updated successfully!', 'success');
                renderWorkItemDetail(workItemId);
                
            } catch (error) {
                console.error('Error updating status:', error);
                showToast('Failed to update status. Please try again.', 'error');
            } finally {
                // Reset loading state
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }
    
    // Delete button
    const deleteBtn = document.getElementById('deleteWorkItemBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
            modal.show();
        });
    }
    
    // Confirm delete button
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            const spinner = document.getElementById('deleteSpinner');
            
            try {
                // Show loading state
                confirmDeleteBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                // Call API to delete work item
                await api.deleteWorkItem(workItemId);
                
                // Show success message and redirect to work items list
                showToast('Work item deleted successfully!', 'success');
                window.location.href = '/workitems';
                
            } catch (error) {
                console.error('Error deleting work item:', error);
                showToast('Failed to delete work item. Please try again.', 'error');
                
                // Reset button state
                confirmDeleteBtn.disabled = false;
                spinner.classList.add('d-none');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmationModal'));
                if (modal) {
                    modal.hide();
                }
            }
        });
    }
}

// Render work items list view
async function renderWorkItemsList(filters = {}) {
    try {
        // Show loading state
        document.getElementById('app').innerHTML = `
            <div class="d-flex justify-content-center my-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>`;

        // Fetch work items with filters
        const workItems = await api.getWorkItems(filters);
        
        // Generate filter form
        const filterForm = `
            <div class="card mb-4">
                <div class="card-header">
                    <h5 class="mb-0">Filters</h5>
                </div>
                <div class="card-body">
                    <form id="workItemFilters">
                        <div class="row g-3">
                            <div class="col-md-3">
                                <label for="statusFilter" class="form-label">Status</label>
                                <select class="form-select" id="statusFilter">
                                    <option value="">All Statuses</option>
                                    ${statusOptions.map(option => 
                                        `<option value="${option.value}" ${filters.status === option.value ? 'selected' : ''}>
                                            ${option.label}
                                        </option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="priorityFilter" class="form-label">Priority</label>
                                <select class="form-select" id="priorityFilter">
                                    <option value="">All Priorities</option>
                                    ${priorityOptions.map(option => 
                                        `<option value="${option.value}" ${filters.priority === option.value ? 'selected' : ''}>
                                            ${option.label}
                                        </option>`
                                    ).join('')}
                                </select>
                            </div>
                            <!-- Add more filter fields as needed -->
                            <div class="col-md-3 d-flex align-items-end">
                                <button type="submit" class="btn btn-primary me-2">Apply Filters</button>
                                <button type="button" id="resetFilters" class="btn btn-outline-secondary">Reset</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>`;

        // Generate work items list
        const workItemsList = workItems.length > 0 ? 
            `<div class="list-group">
                ${workItems.map(item => `
                    <a href="/workitems/${item.workItemId}" class="list-group-item list-group-item-action">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1">${item.workItemName}</h5>
                            <div>
                                <span class="badge ${getStatusBadgeClass(item.status)} me-1">${item.status}</span>
                                <span class="badge ${getPriorityBadgeClass(item.priority)}">${item.priority}</span>
                            </div>
                        </div>
                        <p class="mb-1">${item.description ? item.description.substring(0, 150) + (item.description.length > 150 ? '...' : '') : 'No description'}</p>
                        <small class="text-muted">
                            ${item.projectName ? `Project: ${item.projectName} • ` : ''}
                            Assigned to: ${item.assignedToName || 'Unassigned'}
                        </small>
                    </a>
                `).join('')}
            </div>` : 
            '<div class="alert alert-info">No work items found matching your criteria.</div>';

        // Render the page
        document.getElementById('app').innerHTML = `
            <div class="container mt-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1>My Work Items</h1>
                    <a href="/workitems/new" class="btn btn-primary">
                        <i class="bi bi-plus-lg"></i> New Work Item
                    </a>
                </div>
                ${filterForm}
                ${workItemsList}
            </div>`;

        // Initialize filter form
        setupWorkItemFilters();
        
    } catch (error) {
        console.error('Error loading work items:', error);
        document.getElementById('app').innerHTML = `
            <div class="alert alert-danger" role="alert">
                Failed to load work items. Please try again later.
            </div>`;
    }
}

// Render work item form (create/edit)
async function renderWorkItemForm(workItemId = null) {
    try {
        let workItem = null;
        let pageTitle = 'Create New Work Item';
        
        if (workItemId) {
            // Edit mode - fetch work item details
            workItem = await api.getWorkItem(workItemId);
            pageTitle = 'Edit Work Item';
        }
        
        // Fetch projects for the project dropdown
        const projects = await api.getProjects();
        
        // Fetch users for the assignee dropdown
        const users = await api.getUsers();
        
        // Generate form HTML
        const formHtml = `
            <div class="container mt-4">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header">
                                <h2 class="h4 mb-0">${pageTitle}</h2>
                            </div>
                            <div class="card-body">
                                <form id="workItemForm">
                                    <div class="mb-3">
                                        <label for="workItemName" class="form-label">Title</label>
                                        <input type="text" class="form-control" id="workItemName" 
                                            value="${workItem?.workItemName || ''}" required>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="description" class="form-label">Description</label>
                                        <textarea class="form-control" id="description" rows="3">${workItem?.description || ''}</textarea>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="projectId" class="form-label">Project</label>
                                            <select class="form-select" id="projectId">
                                                <option value="">Select a project (optional)</option>
                                                ${projects.map(project => 
                                                    `<option value="${project.projectId}" ${workItem?.projectId === project.projectId ? 'selected' : ''}>
                                                        ${project.projectName}
                                                    </option>`
                                                ).join('')}
                                            </select>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="assignedToId" class="form-label">Assign To</label>
                                            <select class="form-select" id="assignedToId">
                                                <option value="">Unassigned</option>
                                                ${users.filter(user => user.role === 'Employee').map(user => 
                                                    `<option value="${user.userId}" ${workItem?.assignedToId === user.userId ? 'selected' : ''}>
                                                        ${user.fullName || user.email}
                                                    </option>`
                                                ).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="status" class="form-label">Status</label>
                                            <select class="form-select" id="status" ${!workItemId ? 'disabled' : ''}>
                                                ${statusOptions.map(option => 
                                                    `<option value="${option.value}" ${workItem?.status === option.value ? 'selected' : ''}>
                                                        ${option.label}
                                                    </option>`
                                                ).join('')}
                                            </select>
                                            ${!workItemId ? '<div class="form-text">Status will be set to "To Do" for new items.</div>' : ''}
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label for="priority" class="form-label">Priority</label>
                                            <select class="form-select" id="priority" required>
                                                ${priorityOptions.map(option => 
                                                    `<option value="${option.value}" ${workItem?.priority === option.value ? 'selected' : ''}>
                                                        ${option.label}
                                                    </option>`
                                                ).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="deadline" class="form-label">Deadline (optional)</label>
                                        <input type="date" class="form-control" id="deadline" 
                                            value="${workItem?.deadline ? workItem.deadline.split('T')[0] : ''}">
                                    </div>
                                    
                                    <div class="d-flex justify-content-between">
                                        <a href="${workItemId ? `/workitems/${workItemId}` : '/workitems'}" class="btn btn-outline-secondary">
                                            Cancel
                                        </a>
                                        <div>
                                            ${workItemId ? `
                                                <button type="button" id="deleteWorkItem" class="btn btn-outline-danger me-2">
                                                    <i class="bi bi-trash"></i> Delete
                                                </button>
                                            ` : ''}
                                            <button type="submit" class="btn btn-primary">
                                                <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                                ${workItemId ? 'Update' : 'Create'} Work Item
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        // Render the form
        document.getElementById('app').innerHTML = formHtml;
        
        // Initialize form handlers
        setupWorkItemForm(workItemId);
        
    } catch (error) {
        console.error('Error loading work item form:', error);
        document.getElementById('app').innerHTML = `
            <div class="alert alert-danger" role="alert">
                Failed to load work item form. Please try again later.
            </div>
            <a href="/workitems" class="btn btn-primary mt-3">Back to Work Items</a>`;
    }
}

// Move exports to the end of the file after all functions are defined
const exports = {
    renderWorkItemsList,
    renderWorkItemForm,
    renderWorkItemDetail
};

export default exports;
