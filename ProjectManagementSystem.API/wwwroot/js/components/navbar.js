import { auth } from '../auth.js';
import { router } from '../router.js';
import { renderLoginView } from '../views/auth.js';

export function renderNavbar() {
    const user = auth.currentUser || {};
    const isManager = auth.isManager();
    
    const navbarHtml = `
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
            <div class="container-fluid">
                <a class="navbar-brand" href="/" data-link>
                    <i class="bi bi-kanban me-2"></i>
                    Project Manager
                </a>
                
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                        aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto">
                        ${isManager ? `
                            <li class="nav-item">
                                <a class="nav-link" href="/dashboard/manager" data-link>
                                    <i class="bi bi-speedometer2 me-1"></i> Manager Dashboard
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/dashboard/projects" data-link>
                                    <i class="bi bi-folder me-1"></i> Projects
                                </a>
                            </li>
                        ` : ''}
                        <li class="nav-item">
                            <a class="nav-link" href="/workitems" data-link>
                                <i class="bi bi-list-task me-1"></i> My Work Items
                            </a>
                        </li>
                    </ul>
                    
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="userDropdown" 
                               role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <div class="avatar bg-light text-primary rounded-circle d-flex align-items-center justify-content-center me-2" 
                                     style="width: 32px; height: 32px;">
                                    ${user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                                </div>
                                ${user.email || 'User'}
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                                <li>
                                    <a class="dropdown-item" href="/profile" data-link>
                                        <i class="bi bi-person me-2"></i> Profile
                                    </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item" href="#" id="logoutBtn">
                                        <i class="bi bi-box-arrow-right me-2"></i> Logout
                                    </a>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
        
        <div class="offcanvas offcanvas-start" tabindex="-1" id="sidebar">
            <div class="offcanvas-header">
                <h5 class="offcanvas-title">Menu</h5>
                <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <div class="list-group list-group-flush">
                    ${isManager ? `
                        <a href="/dashboard/manager" class="list-group-item list-group-item-action" data-link>
                            <i class="bi bi-speedometer2 me-2"></i> Manager Dashboard
                        </a>
                        <a href="/dashboard/projects" class="list-group-item list-group-item-action" data-link>
                            <i class="bi bi-folder me-2"></i> Projects
                        </a>
                    ` : ''}
                    <a href="/dashboard/workitems" class="list-group-item list-group-item-action" data-link>
                        <i class="bi bi-list-task me-2"></i> My Work Items
                    </a>
                    <a href="/dashboard/profile" class="list-group-item list-group-item-action" data-link>
                        <i class="bi bi-person me-2"></i> Profile
                    </a>
                    <a href="#" class="list-group-item list-group-item-action text-danger" id="sidebarLogoutBtn">
                        <i class="bi bi-box-arrow-right me-2"></i> Logout
                    </a>
                </div>
            </div>
        </div>
    `;

    // Insert navbar at the beginning of the body
    document.body.insertAdjacentHTML('afterbegin', navbarHtml);

    // Add event listeners after the navbar is rendered
    const setupEventListeners = () => {
        // Logout functionality
        const logout = async () => {
            try {
                await auth.logout();
                router.navigateTo('/login');
            } catch (error) {
                console.error('Error during logout:', error);
                router.navigateTo('/login');
            }
        };

        // Logout button in dropdown
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                logout();
            });
        }

        // Sidebar logout button
        const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
        if (sidebarLogoutBtn) {
            sidebarLogoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                logout();
            });
        }
    };

    // Setup event listeners after a small delay to ensure DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
        setupEventListeners();
    }
}

export function updateNavbar() {
    const navbar = document.querySelector('nav.navbar');
    if (navbar) {
        navbar.remove();
    }
    renderNavbar();
}
