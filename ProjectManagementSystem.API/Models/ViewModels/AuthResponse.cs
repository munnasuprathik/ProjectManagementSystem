namespace ProjectManagementSystem.API.Models.ViewModels
{
    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "Employee";
        public string FullName { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string ProfileId { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool Success { get; set; }
        
        // Parameterless constructor for JSON deserialization
        public AuthResponse() { }
        
        // Constructor with parameters for easier object creation
        public AuthResponse(string token, string email, string role, string fullName, string userId, string profileId, string message = "", bool success = true)
        {
            Token = token;
            Email = email;
            Role = role;
            FullName = fullName;
            UserId = userId;
            ProfileId = profileId;
            Message = message;
            Success = success;
        }
    }
}
