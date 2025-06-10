/**
 * Handles API errors consistently across the application
 * @param {Error} error - The error object from the API call
 * @param {string} defaultMessage - Default error message if none is provided
 * @returns {string} User-friendly error message
 */
export function handleApiError(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    // Handle network errors
    if (error.message === 'Network Error') {
        return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    // Handle HTTP errors
    if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
            case 400:
                return data.message || 'Invalid request. Please check your input.';
            case 401:
                // Auto-logout if 401 Unauthorized response returned from API
                localStorage.removeItem('authToken');
                window.location.href = '/login';
                return 'Your session has expired. Please log in again.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return 'The requested resource was not found.';
            case 422:
                // Handle validation errors
                if (data.errors) {
                    return Object.values(data.errors).flat().join(' ');
                }
                return data.message || 'Validation failed. Please check your input.';
            case 500:
                return 'A server error occurred. Please try again later.';
            default:
                return data.message || defaultMessage;
        }
    }
    
    return defaultMessage;
}

/**
 * Wraps an async function with error handling
 * @param {Function} asyncFn - The async function to wrap
 * @param {Object} options - Options object
 * @param {Function} options.onSuccess - Callback for successful execution
 * @param {Function} options.onError - Callback for error handling
 * @param {boolean} options.showToast - Whether to show toast on error
 * @param {string} options.errorMessage - Custom error message
 */
export async function withErrorHandling(
    asyncFn, 
    { onSuccess, onError, showToast = true, errorMessage = 'An error occurred' } = {}
) {
    try {
        const result = await asyncFn();
        if (onSuccess) onSuccess(result);
        return result;
    } catch (error) {
        const message = handleApiError(error, errorMessage);
        
        if (showToast && window.showToast) {
            window.showToast(message, 'error');
        }
        
        if (onError) {
            onError(error, message);
        }
        
        // Re-throw the error for further handling if needed
        throw error;
    }
}

/**
 * Formats validation errors from the API into a single string
 * @param {Object} errors - Validation errors object from the API
 * @returns {string} Formatted error message
 */
export function formatValidationErrors(errors) {
    if (!errors) return '';
    
    return Object.entries(errors)
        .map(([field, messages]) => {
            const fieldName = field.replace(/([A-Z])/g, ' $1')
                                .replace(/^./, str => str.toUpperCase())
                                .replace(/\./g, ' ');
            return `${fieldName}: ${Array.isArray(messages) ? messages.join(' ') : messages}`;
        })
        .join('\n');
}

/**
 * Creates a debounced version of a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Creates a throttled version of a function
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Generates a unique ID
 * @returns {string} A unique ID
 */
export function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Deep clones an object
 * @param {Object} obj - The object to clone
 * @returns {Object} A deep clone of the object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    
    return cloned;
}

/**
 * Formats a number as a currency string
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Truncates text to a specified length and adds an ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - The maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
export function truncateText(text, maxLength = 100) {
    if (typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Converts a string to title case
 * @param {string} str - The string to convert
 * @returns {string} The string in title case
 */
export function toTitleCase(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/**
 * Safely parses a JSON string
 * @param {string} jsonString - The JSON string to parse
 * @param {*} defaultValue - The default value if parsing fails
 * @returns {*} The parsed object or the default value
 */
export function safeJsonParse(jsonString, defaultValue = {}) {
    try {
        return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return defaultValue;
    }
}

/**
 * Checks if the current user has the required role
 * @param {string|string[]} requiredRoles - The role(s) required
 * @param {string} userRole - The user's current role
 * @returns {boolean} True if the user has the required role
 */
export function hasRole(requiredRoles, userRole) {
    if (!userRole) return false;
    if (Array.isArray(requiredRoles)) {
        return requiredRoles.some(role => role === userRole);
    }
    return requiredRoles === userRole;
}
