using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProjectManagementSystem.API.Data;
using ProjectManagementSystem.API.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ProjectManagementSystem.API.Services
{
    public interface IPerformanceService
    {
        
        Task UpdateOnWorkItemRejectedAsync(string userId);
        
      
        Task UpdateOnWorkItemApprovedAsync(string userId);
        
        Task<bool> IsEligibleForNewAssignmentsAsync(string userId);
        
       
        Task<decimal> GetPerformanceScoreAsync(string userId);
        
        
        Task UpdatePerformanceMetricsAsync(string userId, bool isAccepted);
    }

    public class PerformanceService : IPerformanceService
    {
        private readonly ApplicationDbContext _context;
private readonly ILogger<PerformanceService> _logger;
        private const decimal PENALTY_PERCENTAGE = 5.0m; // 5% penalty for rejected work item
        private const decimal REWARD_PERCENTAGE = 5.0m;  // 5% reward for every 2 approved work items
        private const decimal MIN_PERFORMANCE = 40.0m;   // Minimum performance to receive new assignments
        private const int REWARD_WORK_ITEMS_THRESHOLD = 2; // Number of approved work items needed for reward
        private const decimal MAX_PERFORMANCE = 100.0m;  // Maximum performance score
        private const decimal MIN_ALLOWED_PERFORMANCE = 0.0m; // Minimum allowed performance score

        public PerformanceService(ApplicationDbContext context, ILogger<PerformanceService> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task UpdateOnWorkItemRejectedAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID cannot be null or empty");
                return;
            }

            try
            {
                var profile = await _context.UserProfiles
                    .FirstOrDefaultAsync(p => p.UserId == userId);
                
                if (profile != null)
                {
                    // Apply penalty for rejected work item (minimum 0%)
                    profile.Performance = Math.Max(MIN_ALLOWED_PERFORMANCE, profile.Performance - PENALTY_PERCENTAGE);
                    profile.UpdatedAt = DateTime.UtcNow;
                    
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Applied {PENALTY_PERCENTAGE}% performance penalty to user {userId}. New score: {profile.Performance}%");
                }
                else
                {
                    _logger.LogWarning($"User profile not found for user ID: {userId}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating performance for rejected work item for user {userId}");
                throw;
            }
        }

        public async Task UpdateOnWorkItemApprovedAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID cannot be null or empty");
                return;
            }

            try
            {
                // Get recent completed work items (Done status)
                var recentCompletedWorkItems = await _context.WorkItems
                    .Where(wi => wi.AssignedToId == userId && wi.Status == "Done")
                    .OrderByDescending(wi => wi.UpdatedAt)
                    .Take(REWARD_WORK_ITEMS_THRESHOLD * 2) // Take double the threshold for better accuracy
                    .ToListAsync();

                // Count how many were approved (status is Done)
                var approvedCount = recentCompletedWorkItems.Count;

                // If we have at least the threshold of approved work items, apply reward
                if (approvedCount >= REWARD_WORK_ITEMS_THRESHOLD)
                {
                    var profile = await _context.UserProfiles
                        .FirstOrDefaultAsync(p => p.UserId == userId);
                        
                    if (profile != null)
                    {
                        // Calculate how many reward increments to apply
                        int rewardIncrements = approvedCount / REWARD_WORK_ITEMS_THRESHOLD;
                        decimal totalReward = rewardIncrements * REWARD_PERCENTAGE;
                        
                        // Apply reward (capped at 100%)
                        profile.Performance = Math.Min(MAX_PERFORMANCE, profile.Performance + totalReward);
                        profile.UpdatedAt = DateTime.UtcNow;
                        
                        await _context.SaveChangesAsync();
                        _logger.LogInformation($"Applied {totalReward}% performance reward to user {userId} for {approvedCount} approved work items. New score: {profile.Performance}%");
                    }
                    else
                    {
                        _logger.LogWarning($"User profile not found for user ID: {userId}");
                    }
                }
                else
                {
                    _logger.LogInformation($"User {userId} has {approvedCount} approved work items. {REWARD_WORK_ITEMS_THRESHOLD - approvedCount} more needed for performance reward.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating performance for approved work item for user {userId}");
                throw;
            }
        }

        public async Task<bool> IsEligibleForNewAssignmentsAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID cannot be null or empty");
                return false;
            }

            try
            {
                var profile = await _context.UserProfiles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UserId == userId);
                    
                if (profile == null)
                {
                    _logger.LogWarning($"User profile not found for user ID: {userId}");
                    return false;
                }

                // Check if performance is at or above minimum threshold
                bool isEligible = profile.Performance >= MIN_PERFORMANCE;
                
                _logger.LogInformation($"User {userId} is {(isEligible ? "" : "not ")}eligible for new assignments. Current performance: {profile.Performance}% (Min: {MIN_PERFORMANCE}%)");
                
                return isEligible;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking if user {userId} is eligible for new assignments");
                throw;
            }
        }
        
        public async Task UpdatePerformanceMetricsAsync(string userId, bool isAccepted)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID cannot be null or empty");
                return;
            }

            try
            {
                var profile = await _context.UserProfiles
                    .FirstOrDefaultAsync(p => p.UserId == userId);
                
                if (profile == null)
                {
                    _logger.LogWarning("User profile not found for user ID: {UserId}", userId);
                    return;
                }

                if (isAccepted)
                {
                    // Increment accepted items counter
                    profile.AcceptedItemsCount = (profile.AcceptedItemsCount % 2) + 1;
                    
                    // Add 5% for every 2 accepted items
                    if (profile.AcceptedItemsCount % 2 == 0)
                    {
                        profile.Performance = Math.Min(MAX_PERFORMANCE, profile.Performance + REWARD_PERCENTAGE);
                        _logger.LogInformation("Increased performance for user {UserId} to {Performance}%", userId, profile.Performance);
                    }
                }
                else
                {
                    // Reset accepted items counter on rejection
                    profile.AcceptedItemsCount = 0;
                    
                    // Apply penalty for rejection
                    profile.Performance = Math.Max(MIN_ALLOWED_PERFORMANCE, profile.Performance - PENALTY_PERCENTAGE);
                    _logger.LogInformation("Decreased performance for user {UserId} to {Performance}% due to rejection", userId, profile.Performance);
                }

                profile.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating performance metrics for user {UserId}", userId);
                throw;
            }
        }

        public async Task<decimal> GetPerformanceScoreAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID cannot be null or empty");
                return MIN_ALLOWED_PERFORMANCE;
            }

            try
            {
                var profile = await _context.UserProfiles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UserId == userId);
                    
                if (profile == null)
                {
                    _logger.LogWarning($"User profile not found for user ID: {userId}");
                    return MIN_ALLOWED_PERFORMANCE;
                }
                
                return profile.Performance;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting performance score for user {userId}");
                throw;
            }
        }
    }
}
