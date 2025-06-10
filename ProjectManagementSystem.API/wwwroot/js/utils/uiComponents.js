import { formatDate } from './dateUtils.js';

// Chart.js is loaded via CDN in index.html
const { Chart } = window;

/**
 * Creates a pie chart
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} data - Chart data
 * @param {Array<string>} data.labels - Labels for each segment
 * @param {Array<number>} data.data - Data values
 * @param {Array<string>} data.backgroundColor - Background colors for each segment
 * @param {string} data.label - Chart label
 * @returns {Chart} The Chart.js instance
 */
export function createPieChart(ctx, { labels, data, backgroundColor, label }) {
    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor,
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
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Creates a bar chart
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} data - Chart data
 * @param {Array<string>} data.labels - Labels for each bar
 * @param {Array<number>} data.data - Data values
 * @param {string} data.label - Chart label
 * @param {string} data.backgroundColor - Background color for bars
 * @param {string} data.borderColor - Border color for bars
 * @returns {Chart} The Chart.js instance
 */
export function createBarChart(ctx, { labels, data, label, backgroundColor = 'rgba(54, 162, 235, 0.5)', borderColor = 'rgba(54, 162, 235, 1)' }) {
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor,
                borderColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `${context.parsed.y} ${label.toLowerCase()}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Creates a line chart
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} data - Chart data
 * @param {Array<string>} data.labels - Labels for each point
 * @param {Array<number>} data.data - Data values
 * @param {string} data.label - Chart label
 * @param {string} data.borderColor - Line color
 * @param {string} data.backgroundColor - Background color under the line
 * @returns {Chart} The Chart.js instance
 */
export function createLineChart(ctx, { labels, data, label, borderColor = 'rgba(75, 192, 192, 1)', backgroundColor = 'rgba(75, 192, 192, 0.1)' }) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label,
                data,
                fill: true,
                backgroundColor,
                borderColor,
                tension: 0.3,
                borderWidth: 2,
                pointBackgroundColor: borderColor,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `${label}: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Shows a loading spinner
 * @param {HTMLElement} element - The element to show the spinner in
 * @param {string} size - Size of the spinner (sm, md, lg)
 * @returns {HTMLElement} The spinner element
 */
export function showSpinner(element, size = 'md') {
    const sizes = {
        sm: 'spinner-border-sm',
        md: '',
        lg: 'spinner-border-lg'
    };

    const spinner = document.createElement('div');
    spinner.className = `spinner-border ${sizes[size] || ''} text-primary`;
    spinner.role = 'status';
    
    const srOnly = document.createElement('span');
    srOnly.className = 'visually-hidden';
    srOnly.textContent = 'Loading...';
    
    spinner.appendChild(srOnly);
    
    // Clear the element and append the spinner
    element.innerHTML = '';
    element.appendChild(spinner);
    
    return spinner;
}

/**
 * Creates a modal dialog
 * @param {Object} options - Modal options
 * @param {string} options.title - Modal title
 * @param {string|HTMLElement} options.content - Modal content
 * @param {string} options.size - Modal size (sm, md, lg, xl, fullscreen)
 * @param {boolean} options.backdrop - Whether to show backdrop
 * @param {boolean} options.keyboard - Whether to close on ESC key
 * @param {Function} options.onShow - Callback when modal is shown
 * @param {Function} options.onHide - Callback when modal is hidden
 * @returns {bootstrap.Modal} The Bootstrap Modal instance
 */
export function createModal({
    title = '',
    content = '',
    size = 'md',
    backdrop = true,
    keyboard = true,
    onShow = null,
    onHide = null
} = {}) {
    // Generate a unique ID for the modal
    const modalId = `modal-${Date.now()}`;
    
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = modalId;
    modal.tabIndex = '-1';
    modal.setAttribute('aria-hidden', 'true');
    
    // Create modal dialog with appropriate size class
    const sizeClass = size === 'md' ? '' : `modal-${size}`;
    
    modal.innerHTML = `
        <div class="modal-dialog ${sizeClass} modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the body
    document.body.appendChild(modal);
    
    // Initialize Bootstrap modal
    const modalInstance = new bootstrap.Modal(modal, {
        backdrop: backdrop ? true : 'static',
        keyboard: keyboard
    });
    
    // Set up event listeners
    if (onShow) {
        modal.addEventListener('show.bs.modal', onShow);
    }
    
    if (onHide) {
        modal.addEventListener('hidden.bs.modal', () => {
            onHide();
            // Clean up the modal from the DOM after it's hidden
            modal.remove();
        });
    } else {
        // Clean up the modal from the DOM after it's hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }
    
    return modalInstance;
}

/**
 * Creates a confirmation dialog
 * @param {Object} options - Confirmation options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Confirmation message
 * @param {string} options.confirmText - Confirm button text
 * @param {string} options.cancelText - Cancel button text
 * @param {string} options.confirmVariant - Confirm button variant (e.g., 'danger', 'primary')
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 */
export function confirmDialog({
    title = 'Confirm Action',
    message = 'Are you sure you want to perform this action?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'primary'
} = {}) {
    return new Promise((resolve) => {
        const modalId = `confirm-${Date.now()}`;
        
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = modalId;
        modal.tabIndex = '-1';
        
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelText}</button>
                        <button type="button" class="btn btn-${confirmVariant}" id="confirmButton">${confirmText}</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const modalInstance = new bootstrap.Modal(modal, {
            backdrop: 'static',
            keyboard: false
        });
        
        // Handle confirm button click
        const confirmButton = modal.querySelector('#confirmButton');
        confirmButton.addEventListener('click', () => {
            modalInstance.hide();
            resolve(true);
        });
        
        // Handle cancel/close
        modal.addEventListener('hidden.bs.modal', () => {
            resolve(false);
            modal.remove();
        });
        
        // Show the modal
        modalInstance.show();
    });
}

/**
 * Creates a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {number} delay - Time in milliseconds before auto-hide (0 to disable)
 * @returns {bootstrap.Toast} The Toast instance
 */
export function showToast(message, type = 'info', delay = 5000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '1100';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
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
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Initialize and show toast
    const toastInstance = new bootstrap.Toast(toast, {
        delay: delay,
        autohide: delay > 0
    });
    
    toastInstance.show();
    
    // Remove from DOM after hiding
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
        
        // Remove container if no more toasts
        if (toastContainer.children.length === 0) {
            toastContainer.remove();
        }
    });
    
    return toastInstance;
}

/**
 * Creates a pagination component
 * @param {Object} options - Pagination options
 * @param {number} options.currentPage - Current page number (1-based)
 * @param {number} options.totalPages - Total number of pages
 * @param {number} options.maxVisible - Maximum number of visible page buttons
 * @param {Function} options.onPageChange - Callback when page changes
 * @returns {HTMLElement} The pagination element
 */
export function createPagination({
    currentPage = 1,
    totalPages = 1,
    maxVisible = 5,
    onPageChange = null
} = {}) {
    const pagination = document.createElement('nav');
    pagination.setAttribute('aria-label', 'Page navigation');
    
    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Previous" data-page="${currentPage - 1}">
            <span aria-hidden="true">&laquo;</span>
        </a>
    `;
    ul.appendChild(prevLi);
    
    // Calculate range of pages to show
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    // First page
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link" href="#" data-page="1">1</a>`;
        ul.appendChild(firstLi);
        
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = '<span class="page-link">...</span>';
            ul.appendChild(ellipsisLi);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        ul.appendChild(li);
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = '<span class="page-link">...</span>';
            ul.appendChild(ellipsisLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>`;
        ul.appendChild(lastLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Next" data-page="${currentPage + 1}">
            <span aria-hidden="true">&raquo;</span>
        </a>
    `;
    ul.appendChild(nextLi);
    
    // Add click handler for page links
    ul.addEventListener('click', (e) => {
        e.preventDefault();
        
        const target = e.target.closest('a.page-link');
        if (!target) return;
        
        const page = parseInt(target.getAttribute('data-page'));
        if (!isNaN(page) && page >= 1 && page <= totalPages && page !== currentPage) {
            if (onPageChange) {
                onPageChange(page);
            }
        }
    });
    
    pagination.appendChild(ul);
    return pagination;
}

/**
 * Creates a status badge
 * @param {string} status - The status text
 * @param {string} type - The badge type (success, danger, warning, info, secondary, etc.)
 * @returns {HTMLElement} The badge element
 */
export function createStatusBadge(status, type = 'secondary') {
    const badge = document.createElement('span');
    badge.className = `badge bg-${type}`;
    badge.textContent = status;
    return badge;
}

/**
 * Creates a progress bar
 * @param {number} value - Current progress value (0-100)
 * @param {string} type - Progress bar type (primary, success, info, warning, danger)
 * @param {boolean} showLabel - Whether to show the percentage label
 * @param {string} height - Height of the progress bar (e.g., '5px')
 * @returns {HTMLElement} The progress bar element
 */
export function createProgressBar(value, type = 'primary', showLabel = true, height = '20px') {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress';
    progressContainer.style.height = height;
    
    const progressBar = document.createElement('div');
    progressBar.className = `progress-bar bg-${type}`;
    progressBar.role = 'progressbar';
    progressBar.style.width = `${Math.min(100, Math.max(0, value))}%`;
    progressBar.setAttribute('aria-valuenow', value);
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    
    if (showLabel) {
        progressBar.textContent = `${Math.round(value)}%`;
    }
    
    progressContainer.appendChild(progressBar);
    return progressContainer;
}

/**
 * Creates a tooltip for an element
 * @param {HTMLElement} element - The element to attach the tooltip to
 * @param {string} title - The tooltip text
 * @param {string} placement - Tooltip placement (top, right, bottom, left)
 * @returns {bootstrap.Tooltip} The Bootstrap Tooltip instance
 */
export function createTooltip(element, title, placement = 'top') {
    element.setAttribute('data-bs-toggle', 'tooltip');
    element.setAttribute('data-bs-placement', placement);
    element.setAttribute('title', title);
    
    return new bootstrap.Tooltip(element);
}

/**
 * Creates a popover for an element
 * @param {HTMLElement} element - The element to attach the popover to
 * @param {string} title - The popover title
 * @param {string} content - The popover content
 * @param {string} placement - Popover placement (top, right, bottom, left)
 * @returns {bootstrap.Popover} The Bootstrap Popover instance
 */
export function createPopover(element, title, content, placement = 'top') {
    element.setAttribute('data-bs-toggle', 'popover');
    element.setAttribute('data-bs-placement', placement);
    element.setAttribute('data-bs-title', title);
    element.setAttribute('data-bs-content', content);
    element.setAttribute('data-bs-trigger', 'hover focus');
    
    return new bootstrap.Popover(element);
}
