using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectManagementSystem.API.Models
{
    public class WorkItem
    {
        [Key]
        public int WorkItemId { get; set; }
        
        [Required]
        public int ProjectId { get; set; }
        
        [Required]
        public required string AssignedToId { get; set; }
        
        [Required]
        [MaxLength(200)]
        public required string WorkItemName { get; set; }
        
        public string? Description { get; set; }
        
        [Required]
        [MaxLength(20)]
        public required string Priority { get; set; } // "Critical", "Major", "Medium", "Minor", "Low"
        
        [Required]
        [MaxLength(20)]
        [RegularExpression("^(ToDo|InProgress|Review|Done|Rejected)$", ErrorMessage = "Status must be one of: ToDo, InProgress, Review, Done, Rejected")]
        public string Status { get; set; } = "ToDo";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        [Required]
        [DataType(DataType.Date)]
        public DateTime Deadline { get; set; } = DateTime.UtcNow.AddDays(7);
        
        [Required]
        public required string CreatedById { get; set; }
        
        public string? Comments { get; set; }
        
        // Navigation properties
        [ForeignKey("ProjectId")]
        public virtual required Project Project { get; set; }
        
        [ForeignKey("AssignedToId")]
        public virtual required User AssignedTo { get; set; }
        
        [ForeignKey("CreatedById")]
        public virtual required User CreatedBy { get; set; }
    }
}
