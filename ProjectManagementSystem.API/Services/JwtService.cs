using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using ProjectManagementSystem.API.Models;

namespace ProjectManagementSystem.API.Services
{
    public interface IJwtService
    {
        string GenerateJwtToken(User user);
        string GetUserIdFromToken(string token);
    }

    public class JwtService : IJwtService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<JwtService> _logger;

        public JwtService(IConfiguration configuration, ILogger<JwtService> logger)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public string GenerateJwtToken(User user)
        {
            try
            {
                if (_configuration == null)
                {
                    throw new InvalidOperationException("Configuration is not initialized");
                }
                _logger.LogInformation("Starting JWT token generation for user ID: {UserId}, Email: {Email}", user?.Id, user?.Email);
                
                if (user == null)
                {
                    _logger.LogError("GenerateJwtToken: User is null");
                    throw new ArgumentNullException(nameof(user));
                }
                
                if (string.IsNullOrEmpty(user.Id))
                {
                    _logger.LogError("GenerateJwtToken: User ID is null or empty");
                    throw new ArgumentException("User ID is required", nameof(user));
                }
                
                if (string.IsNullOrEmpty(user.Email))
                {
                    _logger.LogError("GenerateJwtToken: User email is null or empty");
                    throw new ArgumentException("User email is required", nameof(user));
                }
                
                // Set default role if not specified
                user.Role = !string.IsNullOrEmpty(user.Role) ? user.Role : "Employee";
                _logger.LogInformation("User role set to: {Role}", user.Role);

                _logger.LogInformation("Retrieving JWT configuration from appsettings");
                
                // Get JWT settings from configuration
                var jwtSection = _configuration.GetSection("Jwt");
                var jwtKey = jwtSection["Key"];
                var jwtIssuer = jwtSection["Issuer"];
                var jwtAudience = jwtSection["Audience"];
                var expireMinutes = jwtSection["ExpireMinutes"];

                _logger.LogInformation("JWT Configuration - Key: {KeyExists}, Issuer: {Issuer}, Audience: {Audience}, ExpireMinutes: {ExpireMinutes}",
                    !string.IsNullOrEmpty(jwtKey) ? $"[SET, Length: {jwtKey.Length} chars]" : "[MISSING]",
                    !string.IsNullOrEmpty(jwtIssuer) ? jwtIssuer : "[MISSING]",
                    !string.IsNullOrEmpty(jwtAudience) ? jwtAudience : "[MISSING]",
                    !string.IsNullOrEmpty(expireMinutes) ? expireMinutes : "[MISSING]");

                // Validate configuration
                if (string.IsNullOrEmpty(jwtKey))
                {
                    var error = "JWT Key is not configured in appsettings.json";
                    _logger.LogError(error);
                    _logger.LogError("Please ensure the 'Jwt:Key' setting exists in appsettings.json");
                    throw new InvalidOperationException(error);
                }
                
                // Validate key length (should be at least 16 chars, recommend 32+ for HS256)
                if (jwtKey.Length < 16)
                {
                    var error = $"JWT Key is too short. Must be at least 16 characters. Current length: {jwtKey.Length}";
                    _logger.LogError(error);
                    _logger.LogError("Please update the 'Jwt:Key' in appsettings.json to be at least 16 characters long");
                    throw new InvalidOperationException(error);
                }
                
                if (string.IsNullOrEmpty(jwtIssuer))
                {
                    var error = "JWT Issuer is not configured in appsettings.json";
                    _logger.LogError(error);
                    throw new InvalidOperationException(error);
                }
                
                if (string.IsNullOrEmpty(jwtAudience))
                {
                    var error = "JWT Audience is not configured in appsettings.json";
                    _logger.LogError(error);
                    throw new InvalidOperationException(error);
                }
                
                if (string.IsNullOrEmpty(expireMinutes) || !int.TryParse(expireMinutes, out var expireMinutesValue))
                {
                    var error = $"JWT ExpireMinutes is not properly configured. Value: {expireMinutes}";
                    _logger.LogError(error);
                    throw new InvalidOperationException(error);
                }

                _logger.LogInformation("Creating security key...");
                var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
                var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
                _logger.LogInformation("Security key and credentials created successfully");

                _logger.LogInformation("Creating JWT claims...");
                var claims = new List<Claim>
                {
                    new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                    new Claim(JwtRegisteredClaimNames.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim("email", user.Email),
                    new Claim("role", user.Role)
                };
                _logger.LogInformation("Created {ClaimCount} claims for user ID: {UserId}", claims.Count, user.Id);

                _logger.LogInformation("Creating JWT token with issuer: {Issuer}, audience: {Audience}, expires in: {ExpireMinutes} minutes", 
                    jwtIssuer, jwtAudience, expireMinutesValue);
                    
                var token = new JwtSecurityToken(
                    issuer: jwtIssuer,
                    audience: jwtAudience,
                    claims: claims,
                    expires: DateTime.UtcNow.AddMinutes(expireMinutesValue),
                    signingCredentials: credentials
                );
                _logger.LogInformation("JWT token created successfully");

                _logger.LogInformation("Serializing JWT token...");
                var tokenHandler = new JwtSecurityTokenHandler();
                var tokenString = tokenHandler.WriteToken(token);
                
                if (string.IsNullOrEmpty(tokenString))
                {
                    _logger.LogError("Failed to serialize JWT token");
                    throw new InvalidOperationException("Failed to serialize JWT token");
                }
                
                _logger.LogInformation("JWT token generated successfully");
                return tokenString;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating JWT token. Error: {ErrorMessage}", ex.Message);
                throw new InvalidOperationException($"Error generating JWT token: {ex.Message}", ex);
            }
        }

        public string GetUserIdFromToken(string token)
        {
            if (string.IsNullOrEmpty(token))
                throw new ArgumentException("Token is required", nameof(token));

            var jwtKey = _configuration["Jwt:Key"];
            if (string.IsNullOrEmpty(jwtKey))
                throw new InvalidOperationException("JWT Key is not configured");

            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var keyBytes = Encoding.ASCII.GetBytes(jwtKey);
                
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
                    ValidateIssuer = false, // Set to true and provide valid issuer in production
                    ValidateAudience = false, // Set to true and provide valid audience in production
                    ClockSkew = TimeSpan.Zero
                }, out var validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;
                var userId = jwtToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                    throw new SecurityTokenException("User ID not found in token");

                return userId;
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "Invalid token: {Token}", token);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating token");
                throw new SecurityTokenException("Invalid token", ex);
            }
        }
    }
}
