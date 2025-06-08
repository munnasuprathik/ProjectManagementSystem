using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ProjectManagementSystem.API.Models;

namespace ProjectManagementSystem.API.Data
{
    public class ApplicationDbContext : IdentityDbContext<User>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<WorkItem> WorkItems { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure UserProfile - User one-to-one relationship
            modelBuilder.Entity<User>()
                .HasOne(u => u.Profile)
                .WithOne(p => p.User)
                .HasForeignKey<UserProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Project - User (Creator) relationship
            modelBuilder.Entity<Project>()
                .HasOne(p => p.CreatedBy)
                .WithMany(u => u.CreatedProjects)
                .HasForeignKey(p => p.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure WorkItem - Project relationship
            modelBuilder.Entity<WorkItem>()
                .HasOne(w => w.Project)
                .WithMany(p => p.WorkItems)
                .HasForeignKey(w => w.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure WorkItem - User (AssignedTo) relationship
            modelBuilder.Entity<WorkItem>()
                .HasOne(w => w.AssignedTo)
                .WithMany(u => u.AssignedWorkItems)
                .HasForeignKey(w => w.AssignedToId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure WorkItem - User (CreatedBy) relationship
            modelBuilder.Entity<WorkItem>()
                .HasOne(w => w.CreatedBy)
                .WithMany(u => u.CreatedWorkItems)
                .HasForeignKey(w => w.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            // Add indexes for better query performance
            modelBuilder.Entity<Project>()
                .HasIndex(p => p.Status);

            modelBuilder.Entity<WorkItem>()
                .HasIndex(w => w.Status);

            modelBuilder.Entity<WorkItem>()
                .HasIndex(w => w.AssignedToId);
        }
    }
}
