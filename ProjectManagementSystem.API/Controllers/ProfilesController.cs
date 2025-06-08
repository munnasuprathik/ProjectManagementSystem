using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagementSystem.API.Data;
using ProjectManagementSystem.API.Models;
using ProjectManagementSystem.API.Models.ViewModels;
using ProjectManagementSystem.API.Services;

namespace ProjectManagementSystem.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ProfilesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<User> _userManager;
        private readonly IWorkloadService _workloadService;
        private readonly ILogger<ProfilesController> _logger;

        public ProfilesController(
            ApplicationDbContext context,
            UserManager<User> userManager,
            IWorkloadService workloadService,
            ILogger<ProfilesController> logger)
        {
            _context = context;
            _userManager = userManager;
            _workloadService = workloadService;
            _logger = logger;
        }

        // GET: api/Profiles/me
        [HttpGet("me")]
        public async Task<ActionResult<UserProfileDto>> GetMyProfile()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var profile = await _context.UserProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
                return NotFound();

            return Ok(new UserProfileDto
            {
                UserId = profile.UserId,
                Email = profile.User.Email ?? string.Empty,
                Role = profile.User.Role ?? "User",
                FullName = profile.FullName ?? string.Empty,
                Skills = profile.Skills,
                Experience = profile.Experience,
                Performance = profile.Performance,
                CurrentWorkload = profile.CurrentWorkload,
                CreatedAt = profile.CreatedAt,
                UpdatedAt = profile.UpdatedAt
            });
        }

        // PUT: api/Profiles/me
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMyProfile(UpdateProfileDto updateProfileDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var profile = await _context.UserProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
                return NotFound();

            // Update profile
            profile.FullName = updateProfileDto.FullName ?? profile.FullName;
            profile.Skills = updateProfileDto.Skills ?? profile.Skills;
            profile.Experience = updateProfileDto.Experience;
            profile.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProfileExists(userId))
                    return NotFound();
                else
                    throw;
            }

            return NoContent();
        }

        // GET: api/Profiles/employees
        [Authorize(Roles = "Manager")]
        [HttpGet("employees")]
        public async Task<ActionResult<IEnumerable<EmployeeProfileDto>>> GetEmployeeProfiles()
        {
            var employees = await _context.UserProfiles
                .Include(p => p.User)
                .Where(p => p.User.Role == "Employee")
                .OrderBy(p => p.FullName)
                .Select(p => new EmployeeProfileDto
                {
                    UserId = p.UserId,
                    Email = p.User.Email ?? string.Empty,
                    Role = p.User.Role ?? "Employee",
                    FullName = p.FullName ?? string.Empty,
                    Skills = p.Skills,
                    Experience = p.Experience,
                    Performance = p.Performance,
                    CurrentWorkload = p.CurrentWorkload,
                    AssignedWorkItems = _context.WorkItems
                        .Count(wi => wi.AssignedToId == p.UserId && 
                                  wi.Status != "Done" && 
                                  wi.Status != "Cancelled")
                })
                .ToListAsync();

            return Ok(employees);
        }

        // GET: api/Profiles/employees/5
        [Authorize(Roles = "Manager")]
        [HttpGet("employees/{id}")]
        public async Task<ActionResult<EmployeeProfileDto>> GetEmployeeProfile(string id)
        {
            var profile = await _context.UserProfiles
                .Include(p => p.User)
                .Where(p => p.UserId == id && p.User.Role == "Employee")
                .Select(p => new EmployeeProfileDto
                {
                    UserId = p.UserId,
                    Email = p.User.Email ?? string.Empty,
                    Role = p.User.Role ?? "Employee",
                    FullName = p.FullName ?? string.Empty,
                    Skills = p.Skills,
                    Experience = p.Experience,
                    Performance = p.Performance,
                    CurrentWorkload = p.CurrentWorkload,
                    AssignedWorkItems = _context.WorkItems
                        .Count(wi => wi.AssignedToId == p.UserId && 
                                  wi.Status != "Done" && 
                                  wi.Status != "Cancelled")
                })
                .FirstOrDefaultAsync();

            if (profile == null)
                return NotFound();

            return profile;
        }

        // GET: api/Profiles/employees/5/workitems
        [Authorize(Roles = "Manager")]
        [HttpGet("employees/{id}/workitems")]
        public async Task<ActionResult<IEnumerable<WorkItemDto>>> GetEmployeeWorkItems(string id)
        {
            // Verify the user exists and is an employee
            var user = await _userManager.FindByIdAsync(id);
            if (user == null || user.Role != "Employee")
                return NotFound("Employee not found");

            var workItems = await _context.WorkItems
                .Include(wi => wi.AssignedTo)
                .Include(wi => wi.CreatedBy)
                .Include(wi => wi.Project)
                .Where(wi => wi.AssignedToId == id)
                .OrderByDescending(wi => wi.CreatedAt)
                .Select(wi => new WorkItemDto
                {
                    WorkItemId = wi.WorkItemId,
                    WorkItemName = wi.WorkItemName,
                    Description = wi.Description,
                    Status = wi.Status,
                    Priority = wi.Priority,
                    Deadline = wi.Deadline,
                    CreatedAt = wi.CreatedAt,
                    UpdatedAt = wi.UpdatedAt,
                    ProjectId = wi.ProjectId,
                    ProjectName = wi.Project != null ? wi.Project.ProjectName : "Unknown Project",
                    AssignedToId = wi.AssignedToId,
                    AssignedToName = wi.AssignedTo != null ? wi.AssignedTo.UserName : "Unknown User",
                    CreatedById = wi.CreatedById,
                    CreatedByName = wi.CreatedBy != null ? wi.CreatedBy.UserName : "System"
                })
                .ToListAsync();

            return Ok(workItems);
        }

        private bool ProfileExists(string id)
        {
            return _context.UserProfiles.Any(e => e.UserId == id);
        }
    }

    // DTOs
    public class UserProfileDto
    {
        [Required]
        public required string UserId { get; set; }
        [Required]
        [EmailAddress]
        public required string Email { get; set; }
        [Required]
        public required string Role { get; set; }
        [Required]
        public required string FullName { get; set; }
        public string? Skills { get; set; }
        [Range(0, 100, ErrorMessage = "Experience must be between 0 and 100 years")]
        public int Experience { get; set; }
        [Range(0, 100, ErrorMessage = "Performance must be between 0 and 100")]
        public decimal Performance { get; set; }
        [Range(0, 100, ErrorMessage = "Workload must be between 0 and 100")]
        public decimal CurrentWorkload { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class EmployeeProfileDto : UserProfileDto
    {
        [Range(0, int.MaxValue, ErrorMessage = "Assigned work items cannot be negative")]
        public int AssignedWorkItems { get; set; }
    }

    public class UpdateProfileDto
    {
        [Required(ErrorMessage = "Full name is required")]
        [StringLength(100, ErrorMessage = "Full name cannot be longer than 100 characters")]
        public required string FullName { get; set; }
        
        [StringLength(500, ErrorMessage = "Skills cannot be longer than 500 characters")]
        public string? Skills { get; set; }
        
        [Range(0, 100, ErrorMessage = "Experience must be between 0 and 100 years")]
        public int Experience { get; set; }
    }
}
