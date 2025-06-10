using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectManagementSystem.API.Models
{
    public class UserProfile
    {
        [Key]
        public int ProfileId { get; set; }
        
        [Required]
        public required string UserId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public required string FullName { get; set; }
        
        public string? Skills { get; set; }
        public int Experience { get; set; } // in years
        
        [Column(TypeName = "decimal(5,2)")]
        public decimal Performance { get; set; } = 100.0m; // Start with 100%
        
        [Column(TypeName = "decimal(5,2)")]
        public decimal CurrentWorkload { get; set; } = 0.0m; // Start with 0%
        
        public int AcceptedItemsCount { get; set; } // Tracks number of accepted work items for performance calculation
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation property
        public virtual required User User { get; set; } = null!;

        // Performance calculation methods
        public void UpdatePerformance(bool isAccepted)
        {
            if (isAccepted)
            {
                // +5% for every 2 accepted items
                AcceptedItemsCount++;
                if (AcceptedItemsCount % 2 == 0)
                {
                    Performance = Math.Min(100, Performance + 5);
                }
            }
            else
            {
                // -5% for rejection
                Performance = Math.Max(0, Performance - 5);
                // Reset accepted items counter on rejection
                AcceptedItemsCount = 0;
            }
            
            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdateWorkload(int activeWorkItemsCount)
        {
            CurrentWorkload = Math.Min(100, activeWorkItemsCount * 10); // 10% per work item, max 100%
            UpdatedAt = DateTime.UtcNow;
        }
    }
}
