
import { Router } from './router.js';
import { auth } from './auth.js';
import { renderLoginView } from './views/auth.js';
import { renderEmployeeDashboard } from './views/dashboard.js';
import { renderManagerDashboard } from './views/dashboard.js';
// Initialize router
const router = new Router();
// Flag to prevent multiple initializations
let isInitializing = false;
// Check auth status when app loads
document.addEventListener('DOMContentLoaded', async () => {
    // Prevent multiple initializations
    if (isInitializing) {
        console.log('App already initializing, skipping...');
        return;
    }
    
    isInitializing = true;
    
    // Check if app element exists
    const appElement = document.getElementById('app');
    if (!appElement) {
        console.error('App element not found in the DOM');
        isInitializing = false;
        return;
    }
    
    console.log('DOMContentLoaded event fired');
    console.log('Checking authentication status...');
    
    try {
        const isAuthenticated = auth.isAuthenticated();
        console.log('Is authenticated:', isAuthenticated);
        
        if (!isAuthenticated) {
            console.log('User not authenticated, will redirect to login via router');
            
        } else {
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
                } catch (error) {
                    console.error('Error refreshing user data:', error);
                    // Clear auth and let router handle redirect
                    auth.clearAuthData();
                }
            }
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
        // Clear potentially corrupted auth state
        auth.clearAuthData();
    } finally {
        isInitializing = false;
        // Let the router handle the initial route - this should be the ONLY navigation call
        router.handleRouteChange();
    }
});
// Root route
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
            // Get current user data from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('User data for redirection:', user);
            
            // If we have a valid role, redirect immediately
            if (user.role || user.Role) {
                console.log('Using existing user data for redirection');
                redirectBasedOnRole(user);
                return;
            }
            
            // If we get here, we need to refresh user data
            console.log('Refreshing user data...');
            await auth.init();
            
            // Get the updated user data
            const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('Updated user data:', updatedUser);
            
            // Ensure we have a valid role
            if (!updatedUser.role && !updatedUser.Role) {
                console.error('No role found in user data after refresh');
                throw new Error('No role found in user data');
            }
            
            // Redirect based on role
            redirectBasedOnRole(updatedUser);
            
        } catch (refreshError) {
            console.error('Error refreshing user data:', refreshError);
            // Clear auth and redirect to login
            auth.clearAuthData();
            router.navigateTo('/login');
        }
        
    } catch (error) {
        console.error('Error in root route handler:', error);
        // Clear potentially corrupted auth state
        auth.clearAuthData();
        router.navigateTo('/login');
    }
}, { exact: true });
// Helper function to handle role-based redirection
function redirectBasedOnRole(user) {
    console.log('=== redirectBasedOnRole called ===');
    console.log('Full user object:', JSON.stringify(user, null, 2));
    
    if (!user) {
        console.error('No user object provided to redirectBasedOnRole');
        window.location.href = '/login';
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
        window.location.href = '/login';
        return;
    }
    
    // Update the stored user data to ensure consistency
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    
    // Check for manager role (case-insensitive)
    const targetPath = userRole === 'manager' 
        ? '/dashboard/manager' 
        : '/dashboard/employee';
    
    console.log(`Redirecting to: ${targetPath}`);
    
    // Use direct navigation as fallback
    if (window.location.pathname !== targetPath) {
        window.location.href = targetPath;
    }
}
// Register route
router.addRoute('/register', async () => {
    console.log('Register route handler called');
    
    // If already authenticated, redirect to appropriate dashboard
    if (auth.isAuthenticated()) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        redirectBasedOnRole(user);
        return;
    }
    
    // Render the register view
    try {
        const { renderRegisterView } = await import('./views/auth.js');
        await renderRegisterView();
    } catch (error) {
        console.error('Error loading register view:', error);
        // Fallback to login if there's an error
        router.navigateTo('/login');
    }
}, { exact: true });

// Login route
router.addRoute('/login', async () => {
    console.log('Login route handler called');
    
    // If already authenticated, redirect to appropriate dashboard
    if (auth.isAuthenticated()) {
        console.log('User already authenticated, redirecting to dashboard');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        redirectBasedOnRole(user);
        return;
    }
    
    try {
        // Clear any existing content
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = '';
        }
        
        // Show login form
        await renderLoginView();
        
        // Ensure loading spinner is hidden
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    } catch (error) {
        console.error('Error rendering login view:', error);
        // Show error in the app element
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = '<div class="alert alert-danger">Error loading login page. Please try refreshing.</div>';
        }
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
// Main dashboard route - handles redirection to appropriate dashboard
router.addRoute('/dashboard', async () => {
    console.log('Dashboard route handler called');
    if (!auth.isAuthenticated()) {
        router.navigateTo('/login');
        return;
    }
    
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'Manager') {
            router.navigateTo('/dashboard/manager');
        } else {
            router.navigateTo('/dashboard/employee');
        }
    } catch (error) {
        console.error('Error in dashboard route:', error);
        router.navigateTo('/login');
    }
}, { exact: true });
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
// Catch-all dashboard routes
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
// Handle back/forward browser buttons
window.addEventListener('popstate', () => {
    // Add a small delay to prevent conflicts with other navigation
    setTimeout(() => {
        router.handleRouteChange();
    }, 10);
});

