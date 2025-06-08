// Work item statuses
export const WORK_ITEM_STATUSES = {
    TODO: 'ToDo',
    IN_PROGRESS: 'InProgress',
    REVIEW: 'Review',
    DONE: 'Done',
    CANCELLED: 'Cancelled'
};

// Work item priorities
export const WORK_ITEM_PRIORITIES = {
    CRITICAL: 'Critical',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low'
};

// Project statuses
export const PROJECT_STATUSES = {
    ACTIVE: 'Active',
    CLOSED: 'Closed'
};

// User roles
export const USER_ROLES = {
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee',
    ADMIN: 'Admin'
};

// Default page sizes for pagination
export const PAGE_SIZES = [10, 25, 50, 100];

// Default page size
export const DEFAULT_PAGE_SIZE = 10;

// API endpoints
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/Account/login',
        REGISTER: '/api/Account/register',
        ME: '/api/Account/me',
        REFRESH: '/api/Account/refresh-token',
        LOGOUT: '/api/Account/logout'
    },
    PROJECTS: {
        BASE: '/api/projects',
        BY_ID: (id) => `/api/projects/${id}`,
        STATUS: (id) => `/api/projects/${id}/status`
    },
    WORK_ITEMS: {
        BASE: '/api/workitems',
        BY_ID: (id) => `/api/workitems/${id}`,
        STATUS: (id) => `/api/workitems/${id}/status`
    },
    PROFILES: {
        ME: '/api/profiles/me',
        EMPLOYEES: '/api/profiles/employees',
        EMPLOYEE_BY_ID: (id) => `/api/profiles/employees/${id}`,
        EMPLOYEE_WORK_ITEMS: (id) => `/api/profiles/employees/${id}/workitems`
    },
    DASHBOARD: {
        MANAGER: '/api/dashboard/manager',
        EMPLOYEE: '/api/dashboard/employee'
    }
};

// Local storage keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    TOKEN_EXPIRATION: 'token_expiration',
    USER: 'user',
    THEME: 'theme',
    PREFERENCES: 'preferences'
};

// Token refresh interval in milliseconds (25 minutes)
export const TOKEN_REFRESH_INTERVAL = 25 * 60 * 1000;

// Token expiration buffer in milliseconds (5 minutes)
export const TOKEN_EXPIRATION_BUFFER = 5 * 60 * 1000;

// Theme options
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
};

// Default theme
export const DEFAULT_THEME = THEMES.LIGHT;

// Date formats
export const DATE_FORMATS = {
    DATE: 'yyyy-MM-dd',
    DATE_TIME: 'yyyy-MM-dd HH:mm',
    DATE_TIME_SECONDS: 'yyyy-MM-dd HH:mm:ss',
    DISPLAY_DATE: 'MMM d, yyyy',
    DISPLAY_DATE_TIME: 'MMM d, yyyy h:mm a',
    DISPLAY_DAY_DATE: 'EEEE, MMM d, yyyy',
    DISPLAY_DAY_DATE_TIME: 'EEEE, MMM d, yyyy h:mm a',
    ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
};

// Validation messages
export const VALIDATION_MESSAGES = {
    REQUIRED: 'This field is required',
    EMAIL: 'Please enter a valid email address',
    MIN_LENGTH: (length) => `Must be at least ${length} characters`,
    MAX_LENGTH: (length) => `Must be no more than ${length} characters`,
    MATCH_FIELD: (fieldName) => `Must match ${fieldName}`,
    INVALID_DATE: 'Please enter a valid date',
    INVALID_NUMBER: 'Please enter a valid number',
    INVALID_URL: 'Please enter a valid URL',
    INVALID_PHONE: 'Please enter a valid phone number',
    INVALID_PASSWORD: 'Password must be at least 8 characters long and include uppercase, lowercase, number and special character',
    PASSWORDS_DONT_MATCH: 'Passwords do not match'
};

// Error messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    SERVER_ERROR: 'An error occurred on the server. Please try again later.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'You do not have permission to access this resource.',
    NOT_FOUND: 'The requested resource was not found.',
    TIMEOUT: 'The request timed out. Please try again.',
    UNKNOWN: 'An unknown error occurred. Please try again.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.'
};

// Success messages
export const SUCCESS_MESSAGES = {
    SAVED: 'Changes saved successfully.',
    CREATED: 'Created successfully.',
    UPDATED: 'Updated successfully.',
    DELETED: 'Deleted successfully.',
    UPLOADED: 'File uploaded successfully.',
    ACTION_COMPLETED: 'Action completed successfully.'
};

// Default avatar URL
export const DEFAULT_AVATAR = '/images/default-avatar.png';

// Default page titles
export const PAGE_TITLES = {
    HOME: 'Dashboard',
    PROJECTS: 'Projects',
    PROJECT_DETAIL: 'Project Details',
    WORK_ITEMS: 'Work Items',
    WORK_ITEM_DETAIL: 'Work Item Details',
    PROFILE: 'My Profile',
    SETTINGS: 'Settings',
    LOGIN: 'Login',
    REGISTER: 'Register',
    NOT_FOUND: 'Page Not Found',
    UNAUTHORIZED: 'Unauthorized',
    ERROR: 'Error'
};

// Default settings
export const DEFAULT_SETTINGS = {
    theme: THEMES.LIGHT,
    notifications: {
        email: true,
        push: true,
        sound: true
    },
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    itemsPerPage: DEFAULT_PAGE_SIZE
};
