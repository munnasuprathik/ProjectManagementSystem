using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
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
    public class WorkItemsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWorkloadService _workloadService;
        private readonly IPerformanceService _performanceService;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<WorkItemsController> _logger;

        public WorkItemsController(
            ApplicationDbContext context,
            IWorkloadService workloadService,
            IPerformanceService performanceService,
            UserManager<User> userManager,
            ILogger<WorkItemsController> logger)
        {
            _context = context;
            _workloadService = workloadService;
            _performanceService = performanceService;
            _userManager = userManager;
            _logger = logger;
        }

        // GET: api/WorkItems
        [HttpGet]
        public async Task<ActionResult<IEnumerable<WorkItemDto>>> GetWorkItems([FromQuery] int? projectId = null)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            _logger.LogInformation($"GetWorkItems called with projectId: {projectId}, User: {userId}, Role: {userRole}");
            _logger.LogInformation($"Request query string: {Request.QueryString}");

            // Start with base query
            IQueryable<WorkItem> query = _context.WorkItems
                .Include(wi => wi.Project)
                .Include(wi => wi.AssignedTo)
                .Include(wi => wi.CreatedBy);

            // Apply project filter first if projectId is provided and valid
            if (projectId.HasValue && projectId > 0)
            {
                _logger.LogInformation($"Applying project filter for project ID: {projectId}");
                query = query.Where(wi => wi.ProjectId == projectId.Value);
                
                // Log the filtered count
                var filteredCount = await query.CountAsync();
                _logger.LogInformation($"Found {filteredCount} work items for project {projectId} after project filter");
            }
            else
            {
                _logger.LogInformation("No valid project ID provided, project filter not applied");
            }

            // Apply role-based filtering
            if (userRole == "Employee")
            {
                _logger.LogInformation($"Applying employee filter for user ID: {userId}");
                query = query.Where(wi => wi.AssignedToId == userId);
                
                // Log the final count after all filters
                var finalCount = await query.CountAsync();
                _logger.LogInformation($"Found {finalCount} work items after all filters");
            }
            else
            {
                _logger.LogInformation("User is a manager, no additional filters applied");
            }

            // Employees can only see their own work items
            if (userRole == "Employee")
            {
                _logger.LogInformation($"Filtering work items for employee: {userId}");
                query = query.Where(wi => wi.AssignedToId == userId);
            }
            else
            {
                _logger.LogInformation("User is a manager, showing all work items");
            }

            var sql = query.ToQueryString();
            _logger.LogInformation($"Generated SQL query: {sql}");

            var workItemsQuery = await query
                .OrderByDescending(wi => wi.CreatedAt)
                .ToListAsync();
                
            _logger.LogInformation($"Found {workItemsQuery.Count} work items matching the criteria");

            var workItems = workItemsQuery.Select(wi => new WorkItemDto
            {
                WorkItemId = wi.WorkItemId,
                WorkItemName = wi.WorkItemName,
                Description = wi.Description,
                Priority = wi.Priority,
                Status = wi.Status,
                CreatedAt = wi.CreatedAt,
                UpdatedAt = wi.UpdatedAt,
                Deadline = wi.Deadline != DateTime.MinValue ? wi.Deadline : (DateTime?)null,
                ProjectId = wi.ProjectId,
                ProjectName = wi.Project?.ProjectName ?? string.Empty,
                AssignedToId = wi.AssignedToId ?? string.Empty,
                AssignedToName = wi.AssignedTo?.UserName ?? string.Empty,
                CreatedById = wi.CreatedById ?? string.Empty,
                CreatedByName = wi.CreatedBy?.UserName ?? string.Empty
            }).ToList();

            return Ok(workItems);
        }

        // GET: api/WorkItems/5
        [HttpGet("{id}")]
        public async Task<ActionResult<WorkItemDto>> GetWorkItem(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var workItemQuery = await _context.WorkItems
                .Include(wi => wi.Project)
                .Include(wi => wi.AssignedTo)
                .Include(wi => wi.CreatedBy)
                .Where(wi => wi.WorkItemId == id && 
                           (userRole == "Manager" || wi.AssignedToId == userId))
                .FirstOrDefaultAsync();

            if (workItemQuery == null)
            {
                return NotFound();
            }

            var workItem = new WorkItemDto
            {
                WorkItemId = workItemQuery.WorkItemId,
                WorkItemName = workItemQuery.WorkItemName,
                Description = workItemQuery.Description,
                Priority = workItemQuery.Priority,
                Status = workItemQuery.Status,
                CreatedAt = workItemQuery.CreatedAt,
                UpdatedAt = workItemQuery.UpdatedAt,
                ProjectId = workItemQuery.ProjectId,
                ProjectName = workItemQuery.Project?.ProjectName ?? string.Empty,
                AssignedToId = workItemQuery.AssignedToId ?? string.Empty,
                AssignedToName = workItemQuery.AssignedTo?.UserName ?? string.Empty,
                CreatedById = workItemQuery.CreatedById ?? string.Empty,
                CreatedByName = workItemQuery.CreatedBy?.UserName ?? string.Empty
            };

            return workItem;
        }

        // POST: api/WorkItems
        [HttpPost]
        [Authorize(Roles = "Manager")]
        public async Task<ActionResult<WorkItemDto>> CreateWorkItem(CreateWorkItemDto createWorkItemDto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            var project = await _context.Projects.FindAsync(createWorkItemDto.ProjectId);
            if (project == null)
            {
                return BadRequest("Project not found");
            }

            // Enforce project status rule
            if (project.Status != "Active")
            {
                return BadRequest("Cannot add work items to a non-active project");
            }

            // Check if assigned user exists and is an employee
            var assignedToUser = await _userManager.FindByIdAsync(createWorkItemDto.AssignedToId);
            if (assignedToUser == null)
            {
                return BadRequest("Assigned user not found");
            }

            var isEmployee = await _userManager.IsInRoleAsync(assignedToUser, "Employee");
            if (!isEmployee)
            {
                return BadRequest("Can only assign work items to employees");
            }

            // Check workload (max 10 active work items)
            var activeWorkItems = await _context.WorkItems
                .CountAsync(wi => wi.AssignedToId == createWorkItemDto.AssignedToId && 
                               wi.Status != "Done" && 
                               wi.Status != "Rejected");
            
            if (activeWorkItems >= 10)
            {
                return BadRequest("Employee has reached the maximum of 10 active work items");
            }

            // Check performance (minimum 40%)
            var userProfile = await _context.UserProfiles
                .FirstOrDefaultAsync(up => up.UserId == createWorkItemDto.AssignedToId);
                
            if (userProfile?.Performance < 40.0m)
            {
                return BadRequest("Employee's performance is below the required threshold (40%)");
            }

            // Get required navigation properties
            var assignedTo = await _userManager.FindByIdAsync(createWorkItemDto.AssignedToId);
            var createdBy = await _userManager.FindByIdAsync(userId);

            if (assignedTo == null || createdBy == null)
            {
                return BadRequest("Invalid assigned user or creator");
            }

            // Create work item with required navigation properties
            var workItem = new WorkItem
            {
                ProjectId = createWorkItemDto.ProjectId,
                Project = project,
                AssignedToId = createWorkItemDto.AssignedToId,
                AssignedTo = assignedTo,
                WorkItemName = createWorkItemDto.WorkItemName,
                Description = createWorkItemDto.Description,
                Priority = createWorkItemDto.Priority,
                Status = "ToDo",
                CreatedById = userId,
                CreatedBy = createdBy,
                Deadline = createWorkItemDto.Deadline,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WorkItems.Add(workItem);
            await _context.SaveChangesAsync();

            // Update workload percentage
            if (userProfile != null)
            {
                userProfile.CurrentWorkload = (activeWorkItems + 1) * 10; // 10% per work item
                userProfile.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetWorkItem), new { id = workItem.WorkItemId }, MapToDto(workItem));
        }

        // PATCH: api/WorkItems/5/status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateWorkItemStatus(int id, UpdateWorkItemStatusDto statusDto)
        {
            var workItem = await _context.WorkItems
                .Include(wi => wi.Project)
                .Include(wi => wi.AssignedTo)
                .Include(wi => wi.CreatedBy)
                .FirstOrDefaultAsync(wi => wi.WorkItemId == id);

            if (workItem == null)
            {
                return NotFound("Work item not found");
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            var isAssignedTo = workItem.AssignedToId == userId;
            var isManager = User.IsInRole("Manager");

            // Enforce status transition rules
            var validTransition = IsValidStatusTransition(workItem.Status, statusDto.Status, isManager, isAssignedTo);
            if (!validTransition.isValid)
            {
                return BadRequest(validTransition.errorMessage);
            }

            // Update status and track changes for performance metrics
            var oldStatus = workItem.Status;
            workItem.Status = statusDto.Status;
            workItem.UpdatedAt = DateTime.UtcNow;
            
            if (!string.IsNullOrEmpty(statusDto.Comments))
            {
                workItem.Comments = statusDto.Comments;
            }

            // Update performance metrics based on status change
            if (statusDto.Status == "Done" || (statusDto.Status == "InProgress" && oldStatus == "Review") || statusDto.Status == "Rejected")
            {
                var isAccepted = statusDto.Status == "Done";
                if (workItem.AssignedTo?.Profile != null)
                {
                    workItem.AssignedTo.Profile.UpdatePerformance(isAccepted);
                }
            }

            await _context.SaveChangesAsync();

            // Update workload if status affects active work items
            if (oldStatus != statusDto.Status && 
                (oldStatus == "Done" || statusDto.Status == "Done" || 
                 oldStatus == "Rejected" || statusDto.Status == "Rejected"))
            {
                if (workItem.AssignedTo?.Profile != null)
                {
                    var activeWorkItems = await _context.WorkItems
                        .CountAsync(wi => wi.AssignedToId == workItem.AssignedToId && 
                                       wi.Status != "Done" && 
                                       wi.Status != "Rejected");
                    workItem.AssignedTo.Profile.UpdateWorkload(activeWorkItems);
                }
            }

            // Email notifications have been removed as per user request

            return NoContent();
        }

        // Performance and workload update methods moved to UserProfile model

        private WorkItemDto MapToDto(WorkItem workItem)
        {
            return new WorkItemDto
            {
                WorkItemId = workItem.WorkItemId,
                WorkItemName = workItem.WorkItemName,
                Description = workItem.Description,
                Priority = workItem.Priority,
                Status = workItem.Status,
                CreatedAt = workItem.CreatedAt,
                UpdatedAt = workItem.UpdatedAt,
                Deadline = workItem.Deadline,
                Comments = workItem.Comments,
                ProjectId = workItem.ProjectId,
                ProjectName = workItem.Project?.ProjectName ?? string.Empty,
                AssignedToId = workItem.AssignedToId ?? string.Empty,
                AssignedToName = workItem.AssignedTo?.UserName ?? string.Empty,
                CreatedById = workItem.CreatedById ?? string.Empty,
                CreatedByName = workItem.CreatedBy?.UserName ?? string.Empty
            };
        }

        private bool WorkItemExists(int id)
        {
            return _context.WorkItems.Any(e => e.WorkItemId == id);
        }

        private (bool isValid, string errorMessage) IsValidStatusTransition(string currentStatus, string newStatus, bool isManager, bool isAssignedTo)
        {
            // Define valid transitions
            var validTransitions = new Dictionary<string, List<string>>
            {
                ["ToDo"] = new List<string> { "InProgress" },
                ["InProgress"] = new List<string> { "Review" },
                ["Review"] = isManager ? new List<string> { "Done", "InProgress" } : new List<string>(),
                ["Done"] = new List<string>(),
                ["Rejected"] = new List<string> { "InProgress" }
            };

            // Check if the transition is valid
            if (!validTransitions.ContainsKey(currentStatus) || 
                !validTransitions[currentStatus].Contains(newStatus))
            {
                return (false, $"Invalid status transition from {currentStatus} to {newStatus}");
            }

            // Additional validation for role-based transitions
            if (newStatus == "Done" && !isManager)
            {
                return (false, "Only managers can mark work items as Done");
            }

            if (newStatus == "InProgress" && !isAssignedTo)
            {
                return (false, "Only the assigned employee can start working on this item");
            }

            if (newStatus == "Review" && !isAssignedTo)
            {
                return (false, "Only the assigned employee can submit work for review");
            }

            return (true, string.Empty);
        }
    }

    // DTOs
    public class WorkItemDto
    {
        public int WorkItemId { get; set; }
        [Required]
        public required string WorkItemName { get; set; }
        public string? Description { get; set; }
        [Required]
        public required string Priority { get; set; }
        [Required]
        public required string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? Deadline { get; set; }
        public string? Comments { get; set; }
        public int ProjectId { get; set; }
        [Required]
        public required string ProjectName { get; set; }
        [Required]
        public required string AssignedToId { get; set; }
        [Required]
        public required string AssignedToName { get; set; }
        [Required]
        public required string CreatedById { get; set; }
        [Required]
        public required string CreatedByName { get; set; }
    }

    public class CreateWorkItemDto
    {
        public int ProjectId { get; set; }
        [Required]
        public required string AssignedToId { get; set; }
        [Required]
        public required string WorkItemName { get; set; }
        public string? Description { get; set; }
        [Required]
        [RegularExpression("^(Critical|Major|Medium|Minor|Low)$", 
            ErrorMessage = "Priority must be one of: Critical, Major, Medium, Minor, Low")]
        public required string Priority { get; set; } // "Critical", "Major", "Medium", "Minor", "Low"
        [Required]
        [DataType(DataType.Date)]
        public DateTime Deadline { get; set; } = DateTime.UtcNow.AddDays(7);
    }

    public class UpdateWorkItemStatusDto
    {
        [Required]
        [RegularExpression("^(ToDo|InProgress|Review|Done)$", 
            ErrorMessage = "Status must be one of: ToDo, InProgress, Review, Done")]
        public required string Status { get; set; } // "ToDo", "InProgress", "Review", "Done"
        public string? Comments { get; set; } // For rejection reason
    }
}