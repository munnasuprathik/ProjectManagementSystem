using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProjectManagementSystem.API.Data;
using ProjectManagementSystem.API.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ProjectManagementSystem.API.Services
{
    public interface IWorkloadService
    {
        Task<bool> CanAssignWorkItemAsync(string userId);
        
    
        Task UpdateWorkloadAsync(string userId);
        
        Task<decimal> CalculateWorkloadPercentageAsync(string userId);
        
        Task<int> GetActiveWorkItemCountAsync(string userId);
    }

    public class WorkloadService : IWorkloadService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<WorkloadService> _logger;
        private const int MAX_ACTIVE_WORK_ITEMS = 10; // Maximum 10 active work items per employee

        public WorkloadService(ApplicationDbContext context, ILogger<WorkloadService> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<bool> CanAssignWorkItemAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID cannot be null or empty");
                return false;
            }

            try
            {
                // Get active work item count
                var activeCount = await GetActiveWorkItemCountAsync(userId);
                
                // Check if user has reached the maximum active work items
                bool canAssign = activeCount < MAX_ACTIVE_WORK_ITEMS;
                
                _logger.LogInformation($"User {userId} can{(canAssign ? "" : "not")} be assigned a new work item. Current active items: {activeCount}/{MAX_ACTIVE_WORK_ITEMS}");
                
                return canAssign;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking if user {userId} can be assigned a new work item");
                throw;
            }
        }

        public async Task UpdateWorkloadAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID cannot be null or empty");
                return;
            }

            try
            {
                var workload = await CalculateWorkloadPercentageAsync(userId);
                
                var profile = await _context.UserProfiles
                    .FirstOrDefaultAsync(p => p.UserId == userId);
                    
                if (profile != null)
                {
                    profile.CurrentWorkload = workload;
                    profile.UpdatedAt = DateTime.UtcNow;
                    
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Updated workload for user {userId} to {workload}%");
                }
                else
                {
                    _logger.LogWarning($"User profile not found for user ID: {userId}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating workload for user {userId}");
                throw;
            }
        }

        public async Task<decimal> CalculateWorkloadPercentageAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID cannot be null or empty");
                return 0m;
            }

            try
            {
                var activeCount = await GetActiveWorkItemCountAsync(userId);
                
                var percentage = (decimal)activeCount / MAX_ACTIVE_WORK_ITEMS * 100;
                
                return Math.Min(percentage, 100.0m);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error calculating workload percentage for user {userId}");
                throw;
            }
        }
        
        public async Task<int> GetActiveWorkItemCountAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID cannot be null or empty");
                return 0;
            }

            try
            {
               
                return await _context.WorkItems
                    .CountAsync(wi => wi.AssignedToId == userId && 
                                   (wi.Status == "ToDo" || wi.Status == "InProgress" || wi.Status == "Review"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting active work item count for user {userId}");
                throw;
            }
        }
    }
}
