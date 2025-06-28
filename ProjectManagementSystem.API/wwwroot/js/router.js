
import { auth } from './auth.js';
class Router {
    constructor() {
        this.routes = [];
        this.currentPath = '';
        this.isNavigating = false;
        this.authRequired = [];
        this.managerOnly = [];
        this.listen();
    }
    static getInstance() {
        if (!Router.instance) {
            Router.instance = new Router();
        }
        return Router.instance;
    }
    listen() {
        window.addEventListener('popstate', () => this.handleRouteChange());
    }
    addRoute(path, handler, options = {}) {
        const route = {
            path,
            handler,
            exact: options.exact || false,
            authRequired: options.authRequired || false,
            managerOnly: options.managerOnly || false,
            title: options.title || 'Project Management System'
        };
        this.routes.push(route);
        if (route.authRequired) {
            this.authRequired.push(path);
        }
        if (route.managerOnly) {
            this.managerOnly.push(path);
        }
        return this;
    }
    async handleRouteChange() {
        if (this.isNavigating) return;
        
        const path = window.location.pathname;
        const route = this.findMatchingRoute(path);
        
        try {
            this.isNavigating = true;
            
            if (route) {
                await route.handler();
            } else {
                console.error('No route found for path:', path);
                // Only redirect to login if not already there to prevent loops
                if (path !== '/login') {
                    this.replace('/login');
                }
            }
        } catch (error) {
            console.error('Error in route handler:', error);
            // Redirect to login on auth errors, but not if already on login page
            if (error.message === 'Unauthorized' && window.location.pathname !== '/login') {
                this.replace('/login');
            }
        } finally {
            this.isNavigating = false;
        }
    }
    findMatchingRoute(path) {
        console.log('Finding matching route for path:', path);
        
        // First try to find an exact match
        for (const route of this.routes) {
            if (route.exact && route.path === path) {
                console.log('Found exact route match:', route.path);
                return route;
            }
        }
        
        // Then try non-exact matches
        for (const route of this.routes) {
            if (!route.exact) {
                // Handle wildcard routes
                if (route.path.endsWith('/*')) {
                    const basePath = route.path.slice(0, -2);
                    if (path.startsWith(basePath)) {
                        console.log('Found wildcard route match:', route.path);
                        return route;
                    }
                }
                // Handle exact path match for non-exact routes
                else if (route.path === path) {
                    console.log('Found non-exact route match:', route.path);
                    return route;
                }
                // Handle prefix match for non-exact routes
                else if (path.startsWith(route.path) && path !== route.path) {
                    console.log('Found prefix route match:', route.path);
                    return route;
                }
            }
        }
        
        console.log('No matching route found for path:', path);
        return null;
    }
    async navigateTo(path, data = {}) {
        // Skip if already navigating or already at the target path
        if (this.isNavigating || window.location.pathname === path) {
            return;
        }
        // Ensure path starts with a slash
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        
        // Store any data needed for the route
        if (Object.keys(data).length > 0) {
            sessionStorage.setItem('routeData', JSON.stringify(data));
        }
        try {
            this.isNavigating = true;
            console.log('Updating browser history to:', normalizedPath);
            window.history.pushState({}, '', normalizedPath);
            
            console.log('Handling route change...');
            await this.handleRouteChange();
        } catch (error) {
            console.error('Error during navigation:', error);
            // Fallback to direct URL change if pushState fails
            window.location.href = normalizedPath;
        } finally {
            this.isNavigating = false;
        }
    }
    
    async replace(path, data = {}) {
        // Skip if already navigating or already at the target path
        if (this.isNavigating || window.location.pathname === path) {
            return;
        }
        // Ensure path starts with a slash
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        
        // Store any data needed for the route
        if (Object.keys(data).length > 0) {
            sessionStorage.setItem('routeData', JSON.stringify(data));
        }
        try {
            this.isNavigating = true;
            console.log('Replacing browser history with:', normalizedPath);
            window.history.replaceState({}, '', normalizedPath);
            
            console.log('Handling route change...');
            await this.handleRouteChange();
        } catch (error) {
            console.error('Error during navigation:', error);
            // Fallback to direct URL change if replaceState fails
            window.location.replace(normalizedPath);
        } finally {
            this.isNavigating = false;
        }
    }
    getRouteData() {
        const data = sessionStorage.getItem('routeData');
        if (data) {
            sessionStorage.removeItem('routeData');
            return JSON.parse(data);
        }
        return null;
    }
    start() {
        this.handleRouteChange();
    }
}
// Create a singleton instance
const router = new Router();
// Export for use in other modules
export { router, Router };
