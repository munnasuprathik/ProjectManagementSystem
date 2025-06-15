using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace ProjectManagementSystem.API.Services
{
    public interface IEmailService
    {
        Task SendWorkItemAssignmentEmailAsync(string employeeEmail, string employeeName, string workItemName, string projectName, string priority, DateTime deadline, string managerName);
        Task SendEmailAsync(string to, string subject, string body);
    }

    public class EmailService : IEmailService
    {
        private readonly SmtpSettings _smtpSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<SmtpSettings> smtpSettings, ILogger<EmailService> logger)
        {
            _smtpSettings = smtpSettings.Value;
            _logger = logger;
        }

        public async Task SendWorkItemAssignmentEmailAsync(string employeeEmail, string employeeName, string workItemName, string projectName, string priority, DateTime deadline, string managerName)
        {
            var subject = $"New Work Item Assigned: {workItemName}";
            var body = GenerateWorkItemAssignmentEmailBody(employeeName, workItemName, projectName, priority, deadline, managerName);
            
            await SendEmailAsync(employeeEmail, subject, body);
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            try
            {
                using var client = new SmtpClient(_smtpSettings.Host, _smtpSettings.Port)
                {
                    Credentials = new NetworkCredential(_smtpSettings.User, _smtpSettings.Pass),
                    EnableSsl = true
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_smtpSettings.From),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };

                mailMessage.To.Add(to);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation($"Email sent successfully to {to} with subject: {subject}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {to} with subject: {subject}");
                throw;
            }
        }

        private string GenerateWorkItemAssignmentEmailBody(string employeeName, string workItemName, string projectName, string priority, DateTime deadline, string managerName)
        {
            return $@"
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                        .content {{ background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }}
                        .work-item-details {{ background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }}
                        .priority-{priority.ToLower()} {{ border-left-color: {GetPriorityColor(priority)} !important; }}
                        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
                        .deadline {{ color: #dc3545; font-weight: bold; }}
                    </style>
                </head>
                <body>
                    <div class=""container"">
                        <div class=""header"">
                            <h1>New Work Item Assignment</h1>
                        </div>
                        <div class=""content"">
                            <p>Dear {employeeName},</p>
                            <p>You have been assigned a new work item by {managerName}. Please review the details below:</p>
                            
                            <div class=""work-item-details priority-{priority.ToLower()}"">
                                <h3>{workItemName}</h3>
                                <p><strong>Project:</strong> {projectName}</p>
                                <p><strong>Priority:</strong> <span style=""color: {GetPriorityColor(priority)}; font-weight: bold;"">{priority}</span></p>
                                <p><strong>Deadline:</strong> <span class=""deadline"">{deadline:MMMM dd, yyyy}</span></p>
                                <p><strong>Assigned by:</strong> {managerName}</p>
                            </div>
                            
                            <p>Please log into the Project Management System to view the complete details and start working on this task.</p>
                            
                            <p>If you have any questions or concerns about this assignment, please contact your manager.</p>
                            
                            <p>Best regards,<br/>Project Management System</p>
                        </div>
                        <div class=""footer"">
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            ";
        }

        private string GetPriorityColor(string priority)
        {
            return priority.ToLower() switch
            {
                "critical" => "#dc3545", // Red
                "major" => "#fd7e14",    // Orange
                "medium" => "#ffc107",   // Yellow
                "minor" => "#20c997",    // Teal
                "low" => "#6c757d",      // Gray
                _ => "#007bff"            // Blue (default)
            };
        }
    }

    public class SmtpSettings
    {
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; }
        public string User { get; set; } = string.Empty;
        public string Pass { get; set; } = string.Empty;
        public string From { get; set; } = string.Empty;
    }
}