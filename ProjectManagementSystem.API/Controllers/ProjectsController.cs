using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagementSystem.API.Data;
using ProjectManagementSystem.API.Models;
using ProjectManagementSystem.API.Models.ViewModels;

namespace ProjectManagementSystem.API.Controllers
{
    [Authorize(Roles = "Manager")]
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ProjectsController> _logger;

        public ProjectsController(ApplicationDbContext context, ILogger<ProjectsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Projects
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectDto>>> GetProjects([FromQuery] bool includeClosed = false)
        {
            var query = _context.Projects
                .Include(p => p.CreatedBy)
                .Include(p => p.WorkItems)
                .AsQueryable();
                
            // Filter out closed projects by default
            if (!includeClosed)
            {
                query = query.Where(p => p.Status != "Closed");
            }
            
            var projects = await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new ProjectDto
                {
                    ProjectId = p.ProjectId,
                    ProjectName = p.ProjectName ?? string.Empty,
                    Description = p.Description ?? string.Empty,
                    StartDate = p.StartDate,
                    Deadline = p.Deadline,
                    Requirements = p.Requirements ?? string.Empty,
                    Priority = p.Priority ?? "Medium",
                    Status = p.Status ?? "Active",
                    CreatedAt = p.CreatedAt,
                    CreatedBy = p.CreatedBy.UserName ?? "Unknown",
                    TotalWorkItems = p.WorkItems.Count
                })
                .ToListAsync();

            return Ok(projects);
        }

        // GET: api/Projects/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ProjectDto>> GetProject(int id)
        {
            var project = await _context.Projects
                .Include(p => p.CreatedBy)
                .Select(p => new ProjectDto
                {
                    ProjectId = p.ProjectId,
                    ProjectName = p.ProjectName ?? string.Empty,
                    Description = p.Description ?? string.Empty,
                    StartDate = p.StartDate,
                    Deadline = p.Deadline,
                    Requirements = p.Requirements ?? string.Empty,
                    Priority = p.Priority ?? "Medium",
                    Status = p.Status ?? "Active",
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    CreatedBy = p.CreatedBy.UserName ?? "Unknown"
                })
                .FirstOrDefaultAsync(p => p.ProjectId == id);

            if (project == null)
            {
                return NotFound();
            }

            return project;
        }

        // POST: api/Projects
        [HttpPost]
        public async Task<ActionResult<Project>> CreateProject(CreateProjectDto createProjectDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            // Get the current user to set as CreatedBy
            var currentUser = await _context.Users.FindAsync(userId);
            if (currentUser == null)
                return Unauthorized("User not found");

            var project = new Project
            {
                ProjectName = createProjectDto.ProjectName,
                Description = createProjectDto.Description,
                StartDate = createProjectDto.StartDate,
                Deadline = createProjectDto.Deadline,
                Requirements = createProjectDto.Requirements,
                Priority = createProjectDto.Priority,
                Status = "Active", // New projects are active by default
                CreatedById = userId,
                CreatedBy = currentUser
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProject), new { id = project.ProjectId }, project);
        }

        // PUT: api/Projects/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProject(int id, UpdateProjectDto updateProjectDto)
        {
            if (id != updateProjectDto.ProjectId)
                return BadRequest("Project ID mismatch");

            var project = await _context.Projects.FindAsync(id);
            if (project == null)
                return NotFound();

            // Update the project properties
            project.ProjectName = updateProjectDto.ProjectName;
            project.Description = updateProjectDto.Description;
            project.StartDate = updateProjectDto.StartDate;
            project.Deadline = updateProjectDto.Deadline;
            project.Requirements = updateProjectDto.Requirements;
            project.Priority = updateProjectDto.Priority;
            project.Status = updateProjectDto.Status;
            project.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProjectExists(id))
                    return NotFound();
                else
                    throw;
            }

            return NoContent();
        }

        // PATCH: api/Projects/5/status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateProjectStatus(int id, [FromBody] UpdateProjectStatusDto statusDto)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null)
                return NotFound();

            // Validate the new status
            if (statusDto.Status != "Active" && statusDto.Status != "Closed")
                return BadRequest("Invalid status. Must be 'Active' or 'Closed'.");

            project.Status = statusDto.Status;
            project.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProjectExists(id))
                    return NotFound();
                else
                    throw;
            }

            return NoContent();
        }

        private bool ProjectExists(int id)
        {
            return _context.Projects.Any(e => e.ProjectId == id);
        }
    }

    // DTOs
    public class ProjectDto
    {
        public int ProjectId { get; set; }
        public required string ProjectName { get; set; }
        public required string Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime Deadline { get; set; }
        public required string Requirements { get; set; }
        public required string Priority { get; set; }
        public required string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public required string CreatedBy { get; set; }
        public int TotalWorkItems { get; set; }
    }

    public class CreateProjectDto
    {
        [Required]
        public required string ProjectName { get; set; }
        [Required]
        public required string Description { get; set; }
        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime Deadline { get; set; } = DateTime.UtcNow.AddDays(30);
        [Required]
        public required string Requirements { get; set; }
        [Required]
        public required string Priority { get; set; } // "Critical", "Major", "Medium", "Minor", "Low"
    }

    public class UpdateProjectDto
    {
        public int ProjectId { get; set; }
        [Required]
        public required string ProjectName { get; set; }
        [Required]
        public required string Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime Deadline { get; set; }
        [Required]
        public required string Requirements { get; set; }
        [Required]
        public required string Priority { get; set; }
        [Required]
        public required string Status { get; set; } // "Active" or "Closed"
    }

    public class UpdateProjectStatusDto
    {
        [Required]
        [RegularExpression("^(Active|Closed)$", ErrorMessage = "Status must be either 'Active' or 'Closed'")]
        public required string Status { get; set; } // "Active" or "Closed"
    }
}
