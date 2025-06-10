// Shared UI utility functions

// Show toast notification
export function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;
    
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
    toast.role = 'alert';
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.id = toastId;
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Format performance value with color coding
export function formatPerformance(performance) {
    if (performance >= 80) return `<span class="text-success fw-bold">${performance}%</span>`;
    if (performance >= 50) return `<span class="text-warning fw-bold">${performance}%</span>`;
    return `<span class="text-danger fw-bold">${performance}%</span>`;
}

// Format workload value with color coding
export function formatWorkload(workload) {
    if (workload >= 80) return `<span class="text-danger fw-bold">${workload}%</span>`;
    if (workload >= 50) return `<span class="text-warning fw-bold">${workload}%</span>`;
    return `<span class="text-success fw-bold">${workload}%</span>`;
}

// Format status badge
export function formatStatusBadge(status) {
    const statusClasses = {
        'ToDo': 'bg-secondary',
        'InProgress': 'bg-primary',
        'Review': 'bg-info text-dark',
        'Done': 'bg-success',
        'Cancelled': 'bg-danger',
        'Active': 'bg-success',
        'OnHold': 'bg-warning text-dark',
        'Closed': 'bg-secondary'
    };
    
    const className = statusClasses[status] || 'bg-secondary';
    return `<span class="badge ${className}">${status}</span>`;
}

// Format priority badge
export function formatPriorityBadge(priority) {
    const priorityClasses = {
        'High': 'bg-danger',
        'Medium': 'bg-warning text-dark',
        'Low': 'bg-info text-dark'
    };
    
    const className = priorityClasses[priority] || 'bg-secondary';
    return `<span class="badge ${className}">${priority || 'N/A'}</span>`;
}

// Show/hide loading state
export function showLoading(show) {
    const loadingElement = document.getElementById('loadingSpinner');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}
