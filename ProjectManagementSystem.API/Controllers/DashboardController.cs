using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagementSystem.API.Data;
using ProjectManagementSystem.API.Models;
using ProjectManagementSystem.API.Models.ViewModels;

namespace ProjectManagementSystem.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DashboardController> _logger;

        public DashboardController(ApplicationDbContext context, ILogger<DashboardController> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        // GET: api/Dashboard/manager
        [Authorize(Roles = "Manager")]
        [HttpGet("manager")]
        public async Task<ActionResult<ManagerDashboardDto>> GetManagerDashboard()
        {
            var dashboard = new ManagerDashboardDto
            {
                // Project Statistics
                TotalProjects = await _context.Projects.CountAsync(),
                ActiveProjects = await _context.Projects.CountAsync(p => p.Status == "Active"),
                CompletedProjects = await _context.Projects.CountAsync(p => p.Status == "Closed"),
                
                // Work Item Statistics
                TotalWorkItems = await _context.WorkItems.CountAsync(),
                WorkItemsByStatus = await _context.WorkItems
                    .GroupBy(wi => wi.Status)
                    .Select(g => new StatusCountDto 
                    { 
                        Status = g.Key, 
                        Count = g.Count() 
                    })
                    .ToListAsync(),
                
                // Employee Statistics
                TotalEmployees = await _context.Users.CountAsync(u => u.Role == "Employee"),
                EmployeesByWorkload = new List<WorkloadRangeDto>
                {
                    new WorkloadRangeDto { Range = "0-25%", Count = await CountEmployeesInWorkloadRange(0, 25) },
                    new WorkloadRangeDto { Range = "26-50%", Count = await CountEmployeesInWorkloadRange(26, 50) },
                    new WorkloadRangeDto { Range = "51-75%", Count = await CountEmployeesInWorkloadRange(51, 75) },
                    new WorkloadRangeDto { Range = "76-100%", Count = await CountEmployeesInWorkloadRange(76, 100) },
                },
                
                // Recent Activity
                RecentWorkItems = await _context.WorkItems
                    .OrderByDescending(wi => wi.UpdatedAt)
                    .Take(5)
                    .Select(wi => new DashboardWorkItemDto
                    {
                        Id = wi.WorkItemId,
                        Name = wi.WorkItemName,
                        ProjectName = wi.Project.ProjectName,
                        Status = wi.Status,
                        Priority = wi.Priority,
                        UpdatedAt = wi.UpdatedAt
                    })
                    .ToListAsync(),

                // Performance Metrics
                AveragePerformance = await _context.UserProfiles
                    .Where(up => up.User.Role == "Employee")
                    .AverageAsync(up => (decimal?)up.Performance) ?? 0,
                
                // Upcoming Deadlines
                UpcomingDeadlines = await _context.WorkItems
                    .Where(wi => wi.Status != "Done" && wi.Status != "Cancelled")
                    .OrderBy(wi => wi.Deadline)
                    .Take(5)
                    .Select(wi => new DeadlineDto
                    {
                        WorkItemId = wi.WorkItemId,
                        WorkItemName = wi.WorkItemName,
                        ProjectName = wi.Project.ProjectName,
                        Deadline = wi.Deadline,
                        DaysRemaining = (int)(wi.Deadline - DateTime.UtcNow).TotalDays
                    })
                    .ToListAsync()
            };


            return Ok(dashboard);
        }

        // GET: api/Dashboard/employee
        [Authorize(Roles = "Employee")]
        [HttpGet("employee")]
        public async Task<ActionResult<EmployeeDashboardDto>> GetEmployeeDashboard()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var userProfile = await _context.UserProfiles
                .Include(up => up.User)
                .FirstOrDefaultAsync(up => up.UserId == userId);

            if (userProfile == null)
            {
                _logger.LogWarning("User profile not found for user ID: {UserId}", userId);
                return NotFound("User profile not found");
            }

            // Convert comma-separated skills string to list
            var skillsList = !string.IsNullOrEmpty(userProfile.Skills) 
                ? userProfile.Skills.Split(',').Select(s => s.Trim()).ToList() 
                : new List<string>();
                
            var dashboard = new EmployeeDashboardDto
            {
                // Profile Summary
                FullName = !string.IsNullOrEmpty(userProfile.FullName) ? userProfile.FullName : "Unknown User",
                Performance = userProfile.Performance,
                Workload = userProfile.CurrentWorkload,
                Skills = skillsList,
                Experience = userProfile.Experience.ToString(),
                
                // Work Items
                TotalWorkItems = await _context.WorkItems.CountAsync(wi => wi.AssignedToId == userId),
                WorkItemsByStatus = await _context.WorkItems
                    .Where(wi => wi.AssignedToId == userId)
                    .GroupBy(wi => wi.Status)
                    .Select(g => new StatusCountDto 
                    { 
                        Status = g.Key, 
                        Count = g.Count() 
                    })
                    .ToListAsync(),
                
                // Recent Work Items
                RecentWorkItems = await _context.WorkItems
                    .Where(wi => wi.AssignedToId == userId)
                    .OrderByDescending(wi => wi.UpdatedAt)
                    .Take(5)
                    .Select(wi => new DashboardWorkItemDto
                    {
                        Id = wi.WorkItemId,
                        Name = wi.WorkItemName,
                        ProjectName = wi.Project.ProjectName,
                        Status = wi.Status,
                        Priority = wi.Priority,
                        UpdatedAt = wi.UpdatedAt
                    })
                    .ToListAsync(),
                
                // Performance History (last 30 days)
                PerformanceHistory = await GetPerformanceHistory(userId, 30),
                
                // Upcoming Deadlines
                UpcomingDeadlines = await _context.WorkItems
                    .Where(wi => wi.AssignedToId == userId && 
                               wi.Status != "Done" && 
                               wi.Status != "Cancelled")
                    .OrderBy(wi => wi.Deadline)
                    .Take(5)
                    .Select(wi => new DeadlineDto
                    {
                        WorkItemId = wi.WorkItemId,
                        WorkItemName = wi.WorkItemName,
                        ProjectName = wi.Project.ProjectName,
                        Deadline = wi.Deadline,
                        DaysRemaining = (int)(wi.Deadline - DateTime.UtcNow).TotalDays
                    })
                    .ToListAsync()
            };

            return Ok(dashboard);
        }

        private async Task<int> CountEmployeesInWorkloadRange(decimal min, decimal max)
        {
            return await _context.UserProfiles
                .Where(up => up.User.Role == "Employee" && 
                           up.CurrentWorkload >= min && 
                           up.CurrentWorkload <= max)
                .CountAsync();
        }

        private async Task<List<PerformanceHistoryDto>> GetPerformanceHistory(string userId, int days)
        {
            // In a real app, you would have historical performance data
            // For now, we'll return the current performance for each of the last 'days' days
            var performance = await _context.UserProfiles
                .Where(up => up.UserId == userId)
                .Select(up => up.Performance)
                .FirstOrDefaultAsync();

            var history = new List<PerformanceHistoryDto>();
            var today = DateTime.UtcNow.Date;
            
            for (int i = days - 1; i >= 0; i--)
            {
                // In a real app, you would have historical data for each day
                // For now, we'll just use the current performance
                history.Add(new PerformanceHistoryDto
                {
                    Date = today.AddDays(-i),
                    Performance = performance
                });
            }


            return history;
        }
    }

    // DTOs
    public class ManagerDashboardDto
    {
        // Project Statistics
        public int TotalProjects { get; set; }
        public int ActiveProjects { get; set; }
        public int CompletedProjects { get; set; }
        
        // Work Item Statistics
        public int TotalWorkItems { get; set; }
        public required List<StatusCountDto> WorkItemsByStatus { get; set; } = new();
        
        // Employee Statistics
        public int TotalEmployees { get; set; }
        public required List<WorkloadRangeDto> EmployeesByWorkload { get; set; } = new();
        public decimal AveragePerformance { get; set; }
        
        // Recent Activity
        public required List<DashboardWorkItemDto> RecentWorkItems { get; set; } = new();
        
        // Upcoming Deadlines
        public required List<DeadlineDto> UpcomingDeadlines { get; set; } = new();
    }

    public class EmployeeDashboardDto
    {
        // Profile Summary
        public required string FullName { get; set; } = string.Empty;
        public decimal Performance { get; set; }
        public decimal Workload { get; set; }
        public required List<string> Skills { get; set; } = new();
        public string Experience { get; set; } = string.Empty;
        
        // Work Items
        public int TotalWorkItems { get; set; }
        public required List<StatusCountDto> WorkItemsByStatus { get; set; } = new();
        public required List<DashboardWorkItemDto> RecentWorkItems { get; set; } = new();
        public required List<PerformanceHistoryDto> PerformanceHistory { get; set; } = new();
        public required List<DeadlineDto> UpcomingDeadlines { get; set; } = new();
    }

    public class StatusCountDto
    {
        public required string Status { get; set; }
        public int Count { get; set; }
    }

    public class WorkloadRangeDto
    {
        public required string Range { get; set; }
        public int Count { get; set; }
    }

    public class DashboardWorkItemDto
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string ProjectName { get; set; }
        public required string Status { get; set; }
        public required string Priority { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class DeadlineDto
    {
        public int WorkItemId { get; set; }
        public required string WorkItemName { get; set; }
        public required string ProjectName { get; set; }
        public DateTime Deadline { get; set; }
        public int DaysRemaining { get; set; }
    }

    public class PerformanceHistoryDto
    {
        public DateTime Date { get; set; }
        public decimal Performance { get; set; }
    }
}
