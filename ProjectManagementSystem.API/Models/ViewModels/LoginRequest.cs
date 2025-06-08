using System.ComponentModel.DataAnnotations;

namespace ProjectManagementSystem.API.Models.ViewModels
{
    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public required string Email { get; set; }

        [Required]
        [DataType(DataType.Password)]
        public required string Password { get; set; }
    }
}
