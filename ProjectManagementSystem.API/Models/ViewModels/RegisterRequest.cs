using System.ComponentModel.DataAnnotations;

namespace ProjectManagementSystem.API.Models.ViewModels
{
    public class RegisterRequest : LoginRequest
    {
        [Required]
        [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
        [DataType(DataType.Password)]
        public required string ConfirmPassword { get; set; }
        
        [Required]
        [MaxLength(100)]
        public required string FullName { get; set; }
        
        public string? Skills { get; set; }
        
        [Range(0, 100, ErrorMessage = "Experience must be between 0 and 100 years")]
        public int Experience { get; set; } = 0;
    }
}
