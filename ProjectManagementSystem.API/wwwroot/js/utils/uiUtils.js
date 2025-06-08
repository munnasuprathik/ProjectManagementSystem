// Toast notification system
class Toast {
    static show(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toast-container') || (() => {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
            return container;
        })();

        const toast = document.createElement('div');
        toast.className = `toast show align-items-center text-white bg-${type} border-0`;
        toast.role = 'alert';
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        const toastBody = document.createElement('div');
        toastBody.className = 'd-flex';
        
        const toastMessage = document.createElement('div');
        toastMessage.className = 'toast-body';
        toastMessage.textContent = message;
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close btn-close-white me-2 m-auto';
        closeButton.setAttribute('data-bs-dismiss', 'toast');
        closeButton.setAttribute('aria-label', 'Close');
        
        closeButton.addEventListener('click', () => {
            toast.remove();
        });
        
        toastBody.appendChild(toastMessage);
        toastBody.appendChild(closeButton);
        toast.appendChild(toastBody);
        toastContainer.appendChild(toast);
        
        // Auto-remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static success(message, duration = 5000) {
        this.show(message, 'success', duration);
    }

    static error(message, duration = 5000) {
        this.show(message, 'danger', duration);
    }

    static warning(message, duration = 5000) {
        this.show(message, 'warning', duration);
    }

    static info(message, duration = 5000) {
        this.show(message, 'info', duration);
    }
}

// Loading overlay
class LoadingOverlay {
    static show(message = 'Loading...') {
        let overlay = document.getElementById('loading-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '9998';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner-border text-light';
            spinner.role = 'status';
            
            const text = document.createElement('span');
            text.className = 'visually-hidden';
            text.textContent = message;
            
            const container = document.createElement('div');
            container.className = 'text-center';
            container.style.color = 'white';
            
            container.appendChild(spinner);
            container.appendChild(document.createElement('br'));
            container.appendChild(text);
            
            overlay.appendChild(container);
            document.body.appendChild(overlay);
        } else {
            overlay.style.display = 'flex';
            overlay.querySelector('.visually-hidden').textContent = message;
        }
        
        document.body.style.overflow = 'hidden';
    }
    
    static hide() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
}

// Form validation
const validateForm = (formId, rules) => {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    let isValid = true;
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        const fieldName = input.name || input.id;
        const value = input.value.trim();
        const fieldRules = rules[fieldName];
        
        if (!fieldRules) return;
        
        // Clear previous error messages
        const errorElement = document.getElementById(`${fieldName}-error`);
        if (errorElement) {
            errorElement.remove();
        }
        
        // Required validation
        if (fieldRules.required && !value) {
            showFieldError(input, 'This field is required');
            isValid = false;
            return;
        }
        
        // Min length validation
        if (fieldRules.minLength && value.length < fieldRules.minLength) {
            showFieldError(input, `Must be at least ${fieldRules.minLength} characters`);
            isValid = false;
            return;
        }
        
        // Max length validation
        if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
            showFieldError(input, `Must be no more than ${fieldRules.maxLength} characters`);
            isValid = false;
            return;
        }
        
        // Email validation
        if (fieldRules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            showFieldError(input, 'Please enter a valid email address');
            isValid = false;
            return;
        }
        
        // Match field validation
        if (fieldRules.matches) {
            const matchField = form.querySelector(`[name="${fieldRules.matches}"]`);
            if (matchField && value !== matchField.value.trim()) {
                showFieldError(input, 'Fields do not match');
                isValid = false;
                return;
            }
        }
        
        // Custom validation function
        if (fieldRules.validate && typeof fieldRules.validate === 'function') {
            const customError = fieldRules.validate(value);
            if (customError) {
                showFieldError(input, customError);
                isValid = false;
                return;
            }
        }
    });
    
    return isValid;
};

const showFieldError = (input, message) => {
    const formGroup = input.closest('.mb-3') || input.parentNode;
    const errorId = `${input.name || input.id}-error`;
    
    // Remove existing error if any
    const existingError = document.getElementById(errorId);
    if (existingError) {
        existingError.remove();
    }
    
    // Add error message
    const errorElement = document.createElement('div');
    errorElement.id = errorId;
    errorElement.className = 'invalid-feedback d-block';
    errorElement.textContent = message;
    
    // Add error class to input
    input.classList.add('is-invalid');
    
    // Insert error message after input
    formGroup.appendChild(errorElement);
    
    // Focus on the first invalid field
    if (document.querySelectorAll('.is-invalid').length === 1) {
        input.focus();
    }
};

// Debounce function for search inputs
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Format date to relative time (e.g., "2 hours ago")
const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }
    
    return 'just now';
};

// Truncate text with ellipsis
const truncate = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
};

// Format date to YYYY-MM-DD for date inputs
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
};

// Format date to readable string
const formatDateReadable = (dateString, includeTime = false) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString(undefined, options);
};

// Export all utilities
export {
    Toast,
    LoadingOverlay,
    validateForm,
    debounce,
    timeAgo,
    truncate,
    formatDateForInput,
    formatDateReadable
};
