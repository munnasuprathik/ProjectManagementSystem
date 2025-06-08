using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;

namespace ProjectManagementSystem.API.Models
{
    public class User : IdentityUser
    {
        public string Role { get; set; } = "Employee"; // Default role is Employee
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual ICollection<WorkItem> AssignedWorkItems { get; set; } = new List<WorkItem>();
        public virtual ICollection<WorkItem> CreatedWorkItems { get; set; } = new List<WorkItem>();
        public virtual ICollection<Project> CreatedProjects { get; set; } = new List<Project>();
        public virtual UserProfile? Profile { get; set; }
    }
}
