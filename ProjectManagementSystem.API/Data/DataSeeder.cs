using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProjectManagementSystem.API.Models;

namespace ProjectManagementSystem.API.Data
{
    public class DataSeeder
    {
        private readonly ILogger<DataSeeder> _logger;

        public DataSeeder(ILogger<DataSeeder> logger)
        {
            _logger = logger;
        }

        public async Task SeedDataAsync(ApplicationDbContext context, UserManager<User> userManager, RoleManager<IdentityRole> roleManager)
        {
            try
            {
                _logger.LogInformation("Starting database seeding...");
                
                string[] roles = { "Manager", "Employee" };
                foreach (var role in roles)
                {
                    var roleExists = await roleManager.RoleExistsAsync(role);
                    if (!roleExists)
                    {
                        await roleManager.CreateAsync(new IdentityRole(role));
                        _logger.LogInformation($"Created role: {role}");
                    }
                }

                
                var managerEmail = "manager@company.com";
                var managerUser = await userManager.FindByEmailAsync(managerEmail);
                
                if (managerUser == null)
                {
                    var manager = new User
                    {
                        UserName = managerEmail,
                        Email = managerEmail,
                        EmailConfirmed = true,
                        Role = "Manager",
                        CreatedAt = DateTime.UtcNow
                    };

                    var createResult = await userManager.CreateAsync(manager, "Manager123!");
                    if (createResult.Succeeded)
                    {
                        _logger.LogInformation("Seeding default manager user...");
                        
                        // Assign Manager role
                        await userManager.AddToRoleAsync(manager, "Manager");
                        _logger.LogInformation("Assigned Manager role to manager user");

                        // Create manager profile
                        var profile = new UserProfile
                        {
                            User = manager,
                            UserId = manager.Id,
                            FullName = "System Manager",
                            Skills = "Project Management, Team Leadership",
                            Experience = 10,
                            Performance = 100.0m,
                            CurrentWorkload = 0.0m,
                            AcceptedItemsCount = 0,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        await context.UserProfiles.AddAsync(profile);
                        await context.SaveChangesAsync();
                        _logger.LogInformation("Created manager profile");
                    }
                    else
                    {
                        _logger.LogError($"Failed to create manager user: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");
                    }
                }
                else
                {
                    _logger.LogInformation("Default manager user already exists.");
                }
                
                _logger.LogInformation("Database seeding completed successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while seeding the database.");
                throw;
            }
        }
    }
}
