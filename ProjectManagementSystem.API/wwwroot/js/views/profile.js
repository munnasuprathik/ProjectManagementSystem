import api from '../api.js';
import { formatDate } from '../utils/dateUtils.js';
import { showToast } from '../utils/uiUtils.js';

export async function renderProfile() {
    try {
        // Get current user profile
        const profile = await api.getUserProfile();
        
        // Format dates
        const formatDateString = (dateString) => {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };
        
        const html = `
            <div class="container-fluid py-4">
                <div class="row">
                    <div class="col-lg-4">
                        <!-- Profile Card -->
                        <div class="card mb-4">
                            <div class="card-body text-center">
                                <!-- Profile Picture -->
                                <div class="position-relative d-inline-block mb-3">
                                    <div class="avatar-xxl">
                                        <span class="avatar-text bg-primary text-white display-4">
                                            ${profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                                        </span>
                                    </div>
                                    <button class="btn btn-sm btn-primary rounded-circle position-absolute bottom-0 end-0" 
                                            data-bs-toggle="modal" data-bs-target="#changeAvatarModal">
                                        <i class="bi bi-camera"></i>
                                    </button>
                                </div>
                                
                                <!-- User Info -->
                                <div class="d-flex justify-content-center align-items-center">
                                    <h4 class="mb-1 me-2">${profile.fullName || 'User'}</h4>
                                    <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#editProfileModal">
                                        <i class="bi bi-pencil"></i> Edit Profile
                                    </button>
                                </div>
                                <p class="text-muted mb-3">${profile.role || 'User'}</p>
                                
                                <!-- Performance -->
                                <div class="mb-4">
                                    <h6 class="text-muted small mb-2">Performance</h6>
                                    <div class="progress" style="height: 10px;">
                                        <div class="progress-bar bg-success" role="progressbar" 
                                             style="width: ${profile.performance || 0}%" 
                                             aria-valuenow="${profile.performance || 0}" 
                                             aria-valuemin="0" 
                                             aria-valuemax="100">
                                        </div>
                                    </div>
                                    <small class="text-muted">${profile.performance || 0}% Success Rate</small>
                                </div>
                                
                                <!-- Workload -->
                                <div class="mb-3">
                                    <h6 class="text-muted small mb-2">Current Workload</h6>
                                    <div class="progress" style="height: 10px;">
                                        <div class="progress-bar ${profile.currentWorkload > 80 ? 'bg-danger' : profile.currentWorkload > 60 ? 'bg-warning' : 'bg-primary'}" 
                                             role="progressbar" 
                                             style="width: ${profile.currentWorkload || 0}%" 
                                             aria-valuenow="${profile.currentWorkload || 0}" 
                                             aria-valuemin="0" 
                                             aria-valuemax="100">
                                        </div>
                                    </div>
                                    <small class="text-muted">${profile.currentWorkload || 0}% of capacity</small>
                                </div>
                                
                                <!-- Member Since -->
                                <div class="text-muted small">
                                    <i class="bi bi-calendar-event me-1"></i>
                                    Member since ${formatDateString(profile.createdAt)}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Skills -->
                        <div class="card mb-4">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Skills</h5>
                                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#editSkillsModal">
                                    <i class="bi bi-pencil"></i>
                                </button>
                            </div>
                            <div class="card-body">
                                ${profile.skills ? 
                                    `<div class="d-flex flex-wrap gap-2">
                                        ${profile.skills.split(',').map(skill => 
                                            `<span class="badge bg-light text-dark">${skill.trim()}</span>`
                                        ).join('')}
                                    </div>` : 
                                    '<p class="text-muted mb-0">No skills added yet.</p>'
                                }
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-lg-8">
                        <!-- Profile Details -->
                        <div class="card mb-4">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Profile Information</h5>
                                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#editProfileModal">
                                    <i class="bi bi-pencil me-1"></i> Edit
                                </button>
                            </div>
                            <div class="card-body">
                                <form id="profileForm">
                                    <div class="row mb-3">
                                        <label class="col-sm-3 col-form-label">Full Name</label>
                                        <div class="col-sm-9">
                                            <input type="text" class="form-control" value="${profile.fullName || ''}" disabled>
                                        </div>
                                    </div>
                                    <div class="row mb-3">
                                        <label class="col-sm-3 col-form-label">Email</label>
                                        <div class="col-sm-9">
                                            <input type="email" class="form-control" value="${profile.email || ''}" disabled>
                                        </div>
                                    </div>
                                    <div class="row mb-3">
                                        <label class="col-sm-3 col-form-label">Role</label>
                                        <div class="col-sm-9">
                                            <input type="text" class="form-control" value="${profile.role || ''}" disabled>
                                        </div>
                                    </div>
                                    <div class="row mb-3">
                                        <label class="col-sm-3 col-form-label">Experience</label>
                                        <div class="col-sm-9">
                                            <textarea class="form-control" rows="3" disabled>${profile.experience || ''}</textarea>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                        
                        <!-- Recent Activity -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">Recent Activity</h5>
                            </div>
                            <div class="card-body p-0">
                                ${profile.recentActivity && profile.recentActivity.length > 0 ? `
                                    <div class="list-group list-group-flush">
                                        ${profile.recentActivity.map(activity => `
                                            <div class="list-group-item border-0 py-3">
                                                <div class="d-flex">
                                                    <div class="flex-shrink-0 me-3">
                                                        <div class="avatar bg-light text-primary rounded-circle">
                                                            <i class="bi bi-${getActivityIcon(activity.type)}"></i>
                                                        </div>
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <div class="d-flex justify-content-between">
                                                            <h6 class="mb-1">${activity.title}</h6>
                                                            <small class="text-muted">${formatDateString(activity.timestamp)}</small>
                                                        </div>
                                                        <p class="mb-0 small">${activity.description}</p>
                                                        ${activity.link ? `
                                                            <a href="${activity.link}" class="small" data-link>View details</a>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="text-center p-4 text-muted">
                                        <i class="bi bi-activity display-5 d-block mb-2"></i>
                                        <p class="mb-0">No recent activity</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Edit Profile Modal -->
            <div class="modal fade" id="editProfileModal" tabindex="-1" aria-labelledby="editProfileModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editProfileModalLabel">Edit Profile</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="updateProfileForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="fullName" class="form-label">Full Name</label>
                                    <input type="text" class="form-control" id="fullName" value="${profile.fullName || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="experience" class="form-label">Experience</label>
                                    <textarea class="form-control" id="experience" rows="3">${profile.experience || ''}</textarea>
                                    <div class="form-text">Briefly describe your experience and background.</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    <span id="profileSpinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Edit Skills Modal -->
            <div class="modal fade" id="editSkillsModal" tabindex="-1" aria-labelledby="editSkillsModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editSkillsModalLabel">Edit Skills</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="updateSkillsForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="skills" class="form-label">Skills</label>
                                    <input type="text" class="form-control" id="skills" value="${profile.skills || ''}">
                                    <div class="form-text">Separate skills with commas (e.g., JavaScript, Project Management, UI/UX)</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    <span id="skillsSpinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                    Save Skills
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Change Password Modal -->
            <div class="modal fade" id="changePasswordModal" tabindex="-1" aria-labelledby="changePasswordModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="changePasswordModalLabel">Change Password</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="changePasswordForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="currentPassword" class="form-label">Current Password</label>
                                    <input type="password" class="form-control" id="currentPassword" required>
                                </div>
                                <div class="mb-3">
                                    <label for="newPassword" class="form-label">New Password</label>
                                    <input type="password" class="form-control" id="newPassword" required>
                                    <div class="form-text">Password must be at least 8 characters long</div>
                                </div>
                                <div class="mb-3">
                                    <label for="confirmPassword" class="form-label">Confirm New Password</label>
                                    <input type="password" class="form-control" id="confirmPassword" required>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    <span id="passwordSpinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                    Change Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Change Avatar Modal -->
            <div class="modal fade" id="changeAvatarModal" tabindex="-1" aria-labelledby="changeAvatarModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="changeAvatarModalLabel">Change Profile Picture</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="changeAvatarForm">
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <div class="position-relative d-inline-block">
                                        <img id="avatarPreview" src="${profile.avatarUrl || '#'}" 
                                             class="rounded-circle border" 
                                             style="width: 150px; height: 150px; object-fit: cover;"
                                             onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_182b6c3f3f6%20text%20%7B%20fill%3A%23ffffff%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20sans-serif%2C%20monospace%3Bfont-size%3A10pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_182b6c3f3f6%22%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%2335395b%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2272.5" 
                                             alt="Profile">
                                        <div class="avatar-upload-preview">
                                            <div class="avatar-preview bg-light rounded-circle" 
                                                 style="width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                                <span class="display-4 text-primary">
                                                    ${profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="avatarUpload" class="form-label">Upload New Image</label>
                                    <input class="form-control" type="file" id="avatarUpload" accept="image/*">
                                    <div class="form-text">JPG, GIF or PNG. Max size 2MB</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    <span id="avatarSpinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('app').innerHTML = html;
        
        // Initialize event listeners
        setupProfileEventListeners();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('app').innerHTML = `
            <div class="alert alert-danger" role="alert">
                Failed to load profile. Please try again later.
            </div>
        `;
    }
}

// Helper function to get activity icon
function getActivityIcon(activityType) {
    switch(activityType) {
        case 'workitem_created':
            return 'plus-circle';
        case 'workitem_updated':
            return 'pencil';
        case 'workitem_completed':
            return 'check-circle';
        case 'comment_added':
            return 'chat-left-text';
        case 'status_changed':
            return 'arrow-repeat';
        default:
            return 'activity';
    }
}

// Setup event listeners for profile page
function setupProfileEventListeners() {
    // Update profile form
    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = updateProfileForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('profileSpinner');
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                const profileData = {
                    fullName: document.getElementById('fullName').value,
                    experience: document.getElementById('experience').value
                };
                
                // Call API to update profile
                await api.updateUserProfile(profileData);
                
                // Close modal and refresh profile
                const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Show success message and refresh the page
                showToast('Profile updated successfully!', 'success');
                renderProfile();
                
            } catch (error) {
                console.error('Error updating profile:', error);
                showToast('Failed to update profile. Please try again.', 'error');
            } finally {
                // Reset form and loading state
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }
    
    // Update skills form
    const updateSkillsForm = document.getElementById('updateSkillsForm');
    if (updateSkillsForm) {
        updateSkillsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = updateSkillsForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('skillsSpinner');
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                const skills = document.getElementById('skills').value;
                
                // Call API to update skills
                await api.updateUserProfile({ skills });
                
                // Close modal and refresh profile
                const modal = bootstrap.Modal.getInstance(document.getElementById('editSkillsModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Show success message and refresh the page
                showToast('Skills updated successfully!', 'success');
                renderProfile();
                
            } catch (error) {
                console.error('Error updating skills:', error);
                showToast('Failed to update skills. Please try again.', 'error');
            } finally {
                // Reset loading state
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }
    
    // Change password form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('passwordSpinner');
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validate passwords
            if (newPassword !== confirmPassword) {
                showToast('New passwords do not match.', 'error');
                return;
            }
            
            if (newPassword.length < 8) {
                showToast('Password must be at least 8 characters long.', 'error');
                return;
            }
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                // Call API to change password
                await api.changePassword({
                    currentPassword,
                    newPassword
                });
                
                // Close modal and reset form
                const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                if (modal) {
                    modal.hide();
                }
                changePasswordForm.reset();
                
                // Show success message
                showToast('Password changed successfully!', 'success');
                
            } catch (error) {
                console.error('Error changing password:', error);
                const errorMessage = error.response?.data?.message || 'Failed to change password. Please try again.';
                showToast(errorMessage, 'error');
            } finally {
                // Reset loading state
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }
    
    // Change avatar form
    const changeAvatarForm = document.getElementById('changeAvatarForm');
    if (changeAvatarForm) {
        // Preview uploaded image
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const preview = document.getElementById('avatarPreview');
                        if (preview) {
                            preview.src = event.target.result;
                            preview.style.display = 'block';
                            
                            // Hide the default avatar preview
                            const defaultPreview = document.querySelector('.avatar-upload-preview');
                            if (defaultPreview) {
                                defaultPreview.style.display = 'none';
                            }
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        // Handle form submission
        changeAvatarForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = changeAvatarForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('avatarSpinner');
            const fileInput = document.getElementById('avatarUpload');
            
            if (!fileInput.files || fileInput.files.length === 0) {
                showToast('Please select an image to upload.', 'error');
                return;
            }
            
            const file = fileInput.files[0];
            
            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                showToast('Image size must be less than 2MB.', 'error');
                return;
            }
            
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                showToast('Please upload a valid image file (JPEG, PNG, GIF).', 'error');
                return;
            }
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                
                // Create FormData object
                const formData = new FormData();
                formData.append('avatar', file);
                
                // Call API to upload avatar
                await api.uploadAvatar(formData);
                
                // Close modal and refresh profile
                const modal = bootstrap.Modal.getInstance(document.getElementById('changeAvatarModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Show success message and refresh the page
                showToast('Profile picture updated successfully!', 'success');
                renderProfile();
                
            } catch (error) {
                console.error('Error uploading avatar:', error);
                showToast('Failed to update profile picture. Please try again.', 'error');
            } finally {
                // Reset form and loading state
                submitBtn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }
    
    // Open change password modal from the profile page
    const changePasswordLink = document.getElementById('changePasswordLink');
    if (changePasswordLink) {
        changePasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
            modal.show();
        });
    }
}
