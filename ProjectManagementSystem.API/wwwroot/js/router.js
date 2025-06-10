import { auth } from './auth.js';

class Router {
    constructor() {
        this.routes = [];
        this.currentRoute = null;
        this.authRequired = [];
        this.managerOnly = [];
        this.initEventListeners();
    }

    static getInstance() {
        if (!Router.instance) {
            Router.instance = new Router();
        }
        return Router.instance;
    }

    initEventListeners() {
        // Handle browser back/forward
        window.addEventListener('popstate', () => this.handleRouteChange());
        
        // Handle link clicks
        document.addEventListener('click', (e) => {
            // Handle data-link attributes
            if (e.target.matches('[data-link]')) {
                e.preventDefault();
                const path = e.target.getAttribute('href');
                this.navigateTo(path);
                return;
            }
            
            // Handle parent elements with data-link
            const linkElement = e.target.closest('[data-link]');
            if (linkElement) {
                e.preventDefault();
                const path = linkElement.getAttribute('href');
                this.navigateTo(path);
            }
        });
    }

    addRoute(path, component, options = {}) {
        const route = {
            path,
            component,
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
        const path = window.location.pathname;
        console.log('Handling route change to:', path);
        
        try {
            console.log('All registered routes:', this.routes);
            const appElement = document.getElementById('app');
            if (!appElement) {
                console.error('App element not found in the DOM');
                return;
            }
            const route = this.findMatchingRoute(path);

            // Store the current path for potential redirects
            const currentPath = window.location.pathname;

            // Check authentication
            if (route?.authRequired && !auth.isAuthenticated()) {
                console.log('Route requires authentication, redirecting to login...');
                // Store the intended URL for redirect after login
                if (currentPath !== '/login') {
                    sessionStorage.setItem('redirectAfterLogin', currentPath);
                }
                window.location.href = '/login';
                return;
            }

            // Check authorization for manager-only routes
            if (route?.managerOnly && !auth.isManager()) {
                window.location.href = '/unauthorized';
                return;
            }

            // Update document title
            document.title = route?.title || 'Project Management System';

            // Call the component function to render the view
            if (route?.component) {
                try {
                    await route.component();
                    this.currentRoute = route;
                } catch (error) {
                    console.error('Error rendering route:', error);
                    window.location.href = '/error';
                }
            } else {
                window.location.href = '/not-found';
            }
        } catch (error) {
            console.error('Error in handleRouteChange:', error);
            window.location.href = '/error';
        }
    }

    findMatchingRoute(path) {
        console.log('Finding matching route for path:', path);
        
        // First try to find an exact match
        for (const route of this.routes) {
            if (route.path === path) {
                console.log('Found exact route match:', route.path);
                return route;
            }
        }
        
        // If no exact match, try to find a prefix match (for nested routes)
        for (const route of this.routes) {
            if (!route.exact && path.startsWith(route.path)) {
                console.log('Found prefix route match:', route.path);
                return route;
            }
        }
        
        console.log('No matching route found for path:', path);
        return null;
    }

    navigateTo(path, data = {}) {
        console.log('Navigating to:', path, 'with data:', data);
        if (path === window.location.pathname) {
            console.log('Already at path:', path);
            return;
        }

        try {
            // Ensure path starts with a slash
            const normalizedPath = path.startsWith('/') ? path : `/${path}`;
            
            // Store any data needed for the route
            if (Object.keys(data).length > 0) {
                sessionStorage.setItem('routeData', JSON.stringify(data));
            }

            console.log('Updating browser history to:', normalizedPath);
            window.history.pushState({}, '', normalizedPath);
            
            console.log('Handling route change...');
            this.handleRouteChange();
        } catch (error) {
            console.error('Error during navigation:', error);
            // Fallback to direct URL change if pushState fails
            window.location.href = path;
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
