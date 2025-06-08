using System.Security.Claims;
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
    [ApiController]
    [Route("api/[controller]")]
    public class AccountController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly SignInManager<User> _signInManager;
        private readonly IJwtService _jwtService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AccountController> _logger;
        private readonly ApplicationDbContext _context;

        public AccountController(
            UserManager<User> userManager,
            SignInManager<User> signInManager,
            IJwtService jwtService,
            IConfiguration configuration,
            ApplicationDbContext context,
            ILogger<AccountController> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtService = jwtService;
            _configuration = configuration;
            _context = context;
            _logger = logger;
            
            _logger.LogInformation("AccountController initialized");
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest model)
        {
            _logger.LogInformation("Register endpoint called with email: {Email}", model?.Email);
            
            if (model == null)
            {
                _logger.LogWarning("Register: Model is null");
                return BadRequest(new { message = "Invalid request data" });
            }

            _logger.LogInformation("Register: Model validation started");
            if (!ModelState.IsValid)
            {
                var errors = string.Join(", ", ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage));
                _logger.LogWarning("Register: Model validation failed. Errors: {Errors}", errors);
                return BadRequest(new { message = "Invalid request data", errors = ModelState.Values.SelectMany(v => v.Errors) });
            }

            try
            {
                _logger.LogInformation("Checking if user with email {Email} already exists", model.Email);
                var existingUser = await _userManager.FindByEmailAsync(model.Email);
                if (existingUser != null)
                {
                    _logger.LogWarning("Register: Email {Email} already exists", model.Email);
                    return BadRequest(new { message = "Email already exists" });
                }

                _logger.LogInformation("Creating new user with email: {Email}", model.Email);
                var user = new User
                {
                    UserName = model.Email,
                    Email = model.Email,
                    Role = "Employee" // Default role is Employee
                };

                _logger.LogInformation("Creating user in Identity");
                var result = await _userManager.CreateAsync(user, model.Password);
                if (!result.Succeeded)
                {
                    var firstError = result.Errors.FirstOrDefault()?.Description ?? "Error creating user";
                    _logger.LogError("Failed to create user. Errors: {Errors}", 
                        string.Join(", ", result.Errors.Select(e => e.Description)));
                    return BadRequest(new { message = firstError, errors = result.Errors });
                }

                _logger.LogInformation("User created with ID: {UserId}", user.Id);

                // Add user to role
                _logger.LogInformation("Adding user to role: {Role}", user.Role);
                var roleResult = await _userManager.AddToRoleAsync(user, user.Role);
                if (!roleResult.Succeeded)
                {
                    var firstError = roleResult.Errors.FirstOrDefault()?.Description ?? "Error adding user to role";
                    _logger.LogError("Failed to add user to role. Errors: {Errors}",
                        string.Join(", ", roleResult.Errors.Select(e => e.Description)));
                    return BadRequest(new { message = firstError, errors = roleResult.Errors });
                }

                _logger.LogInformation("Creating user profile");
                // Create user profile
                var profile = new UserProfile
                {
                    User = user,
                    UserId = user.Id,
                    FullName = model.FullName,
                    Skills = model.Skills,
                    Experience = model.Experience,
                    Performance = 100.0m, // Start with 100% performance
                    CurrentWorkload = 0.0m, // Start with 0% workload
                    AcceptedItemsCount = 0 // Initialize accepted items count
                };

                await _context.UserProfiles.AddAsync(profile);
                await _context.SaveChangesAsync();
                _logger.LogInformation("User profile created with ID: {ProfileId}", profile.ProfileId);

                // Generate JWT token
                _logger.LogInformation("Generating JWT token for user ID: {UserId}", user.Id);
                var token = _jwtService.GenerateJwtToken(user);
                
                if (string.IsNullOrEmpty(token))
                {
                    _logger.LogError("Failed to generate JWT token for user ID: {UserId}", user.Id);
                    return StatusCode(500, new { message = "Failed to generate authentication token" });
                }
                
                _logger.LogInformation("Successfully generated JWT token for user ID: {UserId}", user.Id);

                // Return response with camelCase property names for consistency with frontend
                var response = new 
                {
                    success = true,
                    token = token,
                    email = user.Email,
                    role = user.Role,
                    fullName = profile.FullName,
                    userId = user.Id,
                    message = "Registration successful"
                };
                
                _logger.LogInformation("Registration successful for user ID: {UserId}, Email: {Email}", user.Id, user.Email);
                return Ok(response);
            }
            catch (Exception ex)
            {
                // Log the error
                return StatusCode(500, new { message = "An error occurred while processing your request", details = ex.Message });
            }
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest model)
        {
            if (model == null)
                return BadRequest(new { message = "Invalid request data" });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = await _userManager.FindByEmailAsync(model.Email);
                if (user == null)
                    return Unauthorized(new { message = "Invalid email or password" });

                var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, false);
                if (!result.Succeeded)
                    return Unauthorized(new { message = "Invalid email or password" });

                var profile = await _context.UserProfiles
                    .FirstOrDefaultAsync(p => p.UserId == user.Id);

                if (profile == null)
                    return StatusCode(500, new { message = "User profile not found" });

                // Generate JWT token
                var token = _jwtService.GenerateJwtToken(user);

                if (user == null || profile == null || string.IsNullOrEmpty(token))
                {
                    _logger.LogError("User, profile, or token is null during registration");
                    return BadRequest("An error occurred during registration");
                }

                // Prepare profile ID safely
                var profileId = profile?.ProfileId > 0 ? profile.ProfileId.ToString() : null;
                
                // Create and return the response as an anonymous type
                var response = new 
                {
                    success = true,
                    token = token,
                    email = user.Email ?? string.Empty,
                    role = (user.Role ?? "Employee").ToLower(),
                    fullName = profile?.FullName ?? user.Email?.Split('@')[0] ?? "User",
                    userId = user.Id,
                    profileId = profileId,
                    message = "Login successful"
                };
                
                _logger.LogInformation("Login successful for user ID: {UserId}, Email: {Email}", user.Id, user.Email);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while processing your request", details = ex.Message });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "User not authenticated" });

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                    return NotFound(new { message = "User not found" });

                var profile = await _context.UserProfiles
                    .FirstOrDefaultAsync(p => p.UserId == userId);
                    
                if (profile == null)
                    return StatusCode(500, new { message = "User profile not found" });

                return Ok(new UserProfileDto
                {
                    UserId = user.Id,
                    Email = user.Email ?? string.Empty,
                    Role = user.Role ?? string.Empty,
                    FullName = profile.FullName ?? string.Empty,
                    Skills = profile.Skills,
                    Experience = profile.Experience,
                    Performance = profile.Performance,
                    CurrentWorkload = profile.CurrentWorkload,
                    CreatedAt = profile.CreatedAt,
                    UpdatedAt = profile.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving user information", details = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpGet("test-token")]
        public IActionResult TestToken()
        {
            _logger.LogInformation("TestToken endpoint called");
            
            var testUser = new User
            {
                Id = "test-user-id",
                Email = "test@example.com",
                Role = "Employee"
            };

            _logger.LogInformation("Generating test token for user: {Email}", testUser.Email);
            var token = _jwtService.GenerateJwtToken(testUser);
            
            if (string.IsNullOrEmpty(token))
            {
                _logger.LogError("Failed to generate test token");
                return StatusCode(500, new { message = "Failed to generate test token" });
            }
            
            _logger.LogInformation("Successfully generated test token");
            return Ok(new 
            { 
                Token = token,
                Message = "Test token generated successfully" 
            });
        }
    }
}
