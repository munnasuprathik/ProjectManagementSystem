import { Router } from './router.js';
import { auth } from './auth.js';
import { renderLoginView } from './views/auth.js';
import { renderEmployeeDashboard } from './views/dashboard.js';
import { renderManagerDashboard } from './views/dashboard.js';

// Initialize router
const router = new Router();

// Check auth status when app loads
document.addEventListener('DOMContentLoaded', async () => {
    // Check if app element exists
    const appElement = document.getElementById('app');
    if (!appElement) {
        console.error('App element not found in the DOM');
        return;
    }
    
    console.log('DOMContentLoaded event fired');
    console.log('Checking authentication status...');
    
    try {
        const isAuthenticated = auth.isAuthenticated();
        console.log('Is authenticated:', isAuthenticated);
        
        if (!isAuthenticated) {
            console.log('User not authenticated, redirecting to login');
            router.navigateTo('/login');
            return;
        }
        
        // Get user data from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('User from localStorage:', user);
        
        // If we don't have a role, try to refresh the user data
        if (!user.role) {
            console.log('No role found in user data, refreshing...');
            try {
                await auth.init();
                const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
                console.log('Updated user after init:', updatedUser);
                redirectBasedOnRole(updatedUser);
            } catch (error) {
                console.error('Error refreshing user data:', error);
                router.navigateTo('/login');
            }
        } else {
            redirectBasedOnRole(user);
        }
        
        // Hide loading spinner
        const loadingElement = document.getElementById('loading');
        console.log('Loading element:', loadingElement);
        if (loadingElement) {
            loadingElement.style.display = 'none';
            console.log('Loading spinner hidden');
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        // Fallback to login on error
        router.navigateTo('/login');
    }
});

// Define routes with exact match// Root route
router.addRoute('/', async () => {
    console.log('Root route handler called');
    try {
        // If not authenticated, redirect to login
        if (!auth.isAuthenticated()) {
            console.log('User not authenticated, redirecting to login');
            router.navigateTo('/login');
            return;
        }
        
        // Get the most up-to-date user data
        try {
            // Force refresh user data from the server
            console.log('Refreshing user data...');
            await auth.init();
            
            // Get the user from localStorage (should now be updated)
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('Refreshed user data:', user);
            
            // Ensure we have a valid role
            if (!user.role && !user.Role) {
                console.error('No role found in user data after refresh');
                throw new Error('No role found in user data');
            }
            
            // Redirect based on role
            redirectBasedOnRole(user);
            
        } catch (refreshError) {
            console.error('Error refreshing user data:', refreshError);
            // Fall back to existing localStorage data
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('Using existing user data:', user);
            redirectBasedOnRole(user);
        }
        
    } catch (error) {
        console.error('Error in root route handler:', error);
        // Clear potentially corrupted auth state
        auth.logout();
        router.navigateTo('/login');
    }
}, { exact: true });

// Helper function to handle role-based redirection
function redirectBasedOnRole(user) {
    console.log('=== redirectBasedOnRole called ===');
    console.log('Full user object:', JSON.stringify(user, null, 2));
    
    if (!user) {
        console.error('No user object provided to redirectBasedOnRole');
        router.navigateTo('/login');
        return;
    }

    // Normalize the user object to ensure consistent property names
    const normalizedUser = {
        ...user,
        // Handle both 'role' and 'Role' properties
        role: (user.role || user.Role || '').trim(),
        // Ensure we have the most complete user data by merging with localStorage
        ...(JSON.parse(localStorage.getItem('user') || '{}'))
    };

    console.log('Normalized user object:', JSON.stringify(normalizedUser, null, 2));
    
    // Get the role (case-insensitive)
    const userRole = normalizedUser.role.toLowerCase();
    console.log('User role:', userRole);
    
    if (!userRole) {
        console.error('No valid role found in user object');
        router.navigateTo('/login');
        return;
    }
    
    // Update the stored user data to ensure consistency
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    
    // Check for manager role (case-insensitive)
    if (userRole === 'manager') {
        console.log('Role identified as Manager - redirecting to manager dashboard');
        router.navigateTo('/dashboard/manager');
    } else {
        console.log(`Role '${userRole}' is not Manager - redirecting to employee dashboard`);
        router.navigateTo('/dashboard/employee');
    }
}

// Login route
router.addRoute('/login', async () => {
    console.log('Login route handler called');
    try {
        // If already authenticated, redirect to appropriate dashboard
        if (auth.isAuthenticated()) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('User in login route:', user);
            redirectBasedOnRole(user);
            return;
        }
        
        // Show login form
        await renderLoginView();
        
        // Hide loading spinner after login form is rendered
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    } catch (error) {
        console.error('Error rendering login view:', error);
    }
}, { exact: true });

// Dashboard routes
router.addRoute('/dashboard/employee', async () => {
    console.log('Employee dashboard route handler called');
    if (!auth.isAuthenticated()) {
        router.navigateTo('/login');
        return;
    }
    
    try {
        await renderEmployeeDashboard();
    } catch (error) {
        console.error('Error rendering employee dashboard:', error);
        router.navigateTo('/login');
    }
}, { exact: true });

router.addRoute('/dashboard/manager', async () => {
    console.log('Manager dashboard route handler called');
    if (!auth.isAuthenticated()) {
        router.navigateTo('/login');
        return;
    }
    
    try {
        await renderManagerDashboard();
    } catch (error) {
        console.error('Error rendering manager dashboard:', error);
        router.navigateTo('/login');
    }
}, { exact: true });

// Add other dashboard routes
router.addRoute('/dashboard', () => {
    // Redirect to appropriate dashboard based on role
    if (auth.isAuthenticated()) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'Manager') {
            router.navigateTo('/dashboard/manager');
        } else {
            router.navigateTo('/dashboard/employee');
        }
    } else {
        router.navigateTo('/login');
    }
});

// Add catch-all route for other dashboard paths
router.addRoute('/dashboard/*', () => {
    console.log('Catch-all dashboard route handler called');
    if (!auth.isAuthenticated()) {
        router.navigateTo('/login');
        return;
    }
    
    // Extract the remaining path after /dashboard/
    const path = window.location.pathname;
    const remainingPath = path.replace(/^\/dashboard\//, '');
    
    // If it's a known sub-route, navigate there, otherwise redirect to appropriate dashboard
    if (remainingPath && remainingPath !== '') {
        router.navigateTo(`/dashboard/${remainingPath}`);
    } else {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'Manager') {
            router.navigateTo('/dashboard/manager');
        } else {
            router.navigateTo('/dashboard/employee');
        }
    }
});

// Profile route
router.addRoute('/dashboard/profile', async () => {
    console.log('Profile route handler called');
    if (!auth.isAuthenticated()) {
        router.navigateTo('/login');
        return;
    }
    
    try {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container mt-4">
                <h2>User Profile</h2>
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-4">
                            <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                                 style="width: 60px; height: 60px; font-size: 24px;">
                                ${auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h4 class="mb-0">${auth.currentUser?.email || 'User'}</h4>
                                <p class="text-muted mb-0">${auth.isManager() ? 'Manager' : 'Employee'}</p>
                            </div>
                        </div>
                        <div class="mb-3">
                            <h5>Account Information</h5>
                            <p class="mb-1"><strong>Email:</strong> ${auth.currentUser?.email || 'N/A'}</p>
                            <p class="mb-1"><strong>Role:</strong> ${auth.isManager() ? 'Manager' : 'Employee'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error rendering profile page:', error);
        router.navigateTo('/dashboard');
    }
});

// Work Items route
router.addRoute('/dashboard/workitems', async () => {
    console.log('Work Items route handler called');
    if (!auth.isAuthenticated()) {
        router.navigateTo('/login');
        return;
    }
    
    try {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container mt-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2>My Work Items</h2>
                    <button class="btn btn-primary" id="createWorkItemBtn">
                        <i class="bi bi-plus-lg me-1"></i> New Work Item
                    </button>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Project</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Due Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="workItemsList">
                                    <tr>
                                        <td colspan="6" class="text-center">Loading work items...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Here you would typically load work items from the API
        // For now, we'll just show a message
        setTimeout(() => {
            const workItemsList = document.getElementById('workItemsList');
            if (workItemsList) {
                workItemsList.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">No work items found.</td>
                    </tr>
                `;
            }
        }, 500);
        
    } catch (error) {
        console.error('Error rendering work items page:', error);
        router.navigateTo('/dashboard');
    }
});

// Projects route (for managers)
router.addRoute('/dashboard/projects', async () => {
    console.log('Projects route handler called');
    if (!auth.isAuthenticated() || !auth.isManager()) {
        router.navigateTo('/dashboard');
        return;
    }
    
    try {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container mt-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2>Projects</h2>
                    <button class="btn btn-primary" id="createProjectBtn">
                        <i class="bi bi-plus-lg me-1"></i> New Project
                    </button>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Status</th>
                                        <th>Due Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="projectsList">
                                    <tr>
                                        <td colspan="5" class="text-center">Loading projects...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Here you would typically load projects from the API
        // For now, we'll just show a message
        setTimeout(() => {
            const projectsList = document.getElementById('projectsList');
            if (projectsList) {
                projectsList.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No projects found.</td>
                    </tr>
                `;
            }
        }, 500);
        
    } catch (error) {
        console.error('Error rendering projects page:', error);
        router.navigateTo('/dashboard');
    }
});

// Add a catch-all route for 404
router.addRoute('*', () => {
    console.log('No matching route found, redirecting to dashboard');
    router.navigateTo('/dashboard');
});

// Handle back/forward browser buttons
window.addEventListener('popstate', () => {
    router.handleRouteChange();
});

// Handle initial route
router.handleRouteChange();