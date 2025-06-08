using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectManagementSystem.API.Models
{
    public class Project
    {
        [Key]
        public int ProjectId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public required string ProjectName { get; set; }
        
        public string? Description { get; set; }
        
        [Required]
        public DateTime StartDate { get; set; }
        
        [Required]
        public DateTime Deadline { get; set; }
        
        public string? Requirements { get; set; }
        
        [Required]
        [MaxLength(20)]
        public required string Priority { get; set; } // "Critical", "Major", "Medium", "Minor", "Low"
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active"; // "Active" or "Closed"
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        [Required]
        public required string CreatedById { get; set; }
        
        // Navigation properties
        public virtual required User CreatedBy { get; set; } = null!;
        public virtual ICollection<WorkItem> WorkItems { get; set; } = new List<WorkItem>();
    }
}
