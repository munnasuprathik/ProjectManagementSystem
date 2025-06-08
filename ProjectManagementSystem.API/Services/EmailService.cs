using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ProjectManagementSystem.API.Services
{
    public class EmailSettings
    {
        public string SmtpServer { get; set; } = "smtp.gmail.com";
        public int Port { get; set; } = 587;
        public required string Username { get; set; }
        public required string Password { get; set; }
        public required string FromEmail { get; set; }
        public string FromName { get; set; } = "Project Management System";
        public bool EnableSsl { get; set; } = true;
    }

    public interface IEmailService
    {
        Task SendWorkItemAssignedEmailAsync(string toEmail, string employeeName, string workItemName, string projectName, string priority);
        Task SendWorkItemReviewEmailAsync(string toEmail, string employeeName, string workItemName, string projectName);
        Task SendWorkItemRejectedEmailAsync(string toEmail, string employeeName, string workItemName, string reason);
        Task SendWorkItemStatusUpdateEmailAsync(string toEmail, string employeeName, string workItemName, string projectName, string oldStatus, string newStatus, string? comments = null);
        Task SendEmailAsync(string toEmail, string subject, string message, bool isHtml = false);
    }

    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger)
        {
            _emailSettings = emailSettings?.Value ?? throw new ArgumentNullException(nameof(emailSettings));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            
            // Initialize required properties
            _emailSettings.Username ??= string.Empty;
            _emailSettings.Password ??= string.Empty;
            _emailSettings.FromEmail ??= string.Empty;

            // Validate required settings
            if (string.IsNullOrWhiteSpace(_emailSettings.SmtpServer))
                throw new ArgumentException("SMTP Server is not configured");

            if (string.IsNullOrWhiteSpace(_emailSettings.Username) || string.IsNullOrWhiteSpace(_emailSettings.Password))
                throw new ArgumentException("SMTP credentials are not configured");

            if (string.IsNullOrWhiteSpace(_emailSettings.FromEmail))
                throw new ArgumentException("From email address is not configured");
        }



        public async Task SendWorkItemAssignedEmailAsync(string toEmail, string employeeName, string workItemName, string projectName, string priority)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
                throw new ArgumentException("Recipient email cannot be empty", nameof(toEmail));

            if (string.IsNullOrWhiteSpace(workItemName))
                throw new ArgumentException("Work item name cannot be empty", nameof(workItemName));

            var subject = $"New Work Item Assigned: {workItemName}";
            var body = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background-color: #4a6fdc; color: white; padding: 10px 20px; }}
                        .content {{ padding: 20px; background-color: #f9f9f9; }}
                        .footer {{ margin-top: 20px; font-size: 0.9em; color: #777; }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h2>New Work Item Assigned</h2>
                        </div>
                        <div class='content'>
                            <p>Dear {employeeName},</p>
                            <p>You have been assigned a new work item:</p>
                            <p><strong>Work Item:</strong> {workItemName}</p>
                            <p><strong>Project:</strong> {projectName}</p>
                            <p><strong>Priority:</strong> {priority}</p>
                            <p>Please log in to start working on this item.</p>
                            <div class='footer'>
                                <p>This is an automated notification. Please do not reply to this email.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>";

            await SendEmailAsync(toEmail, subject, body);
            _logger.LogInformation($"Work item assigned email sent to {toEmail} for work item '{workItemName}'");
        }

        public async Task SendWorkItemReviewEmailAsync(string toEmail, string employeeName, string workItemName, string projectName)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
                throw new ArgumentException("Recipient email cannot be empty", nameof(toEmail));

            var subject = $"Work Item Ready for Review: {workItemName}";
            var body = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background-color: #4a6fdc; color: white; padding: 10px 20px; }}
                        .content {{ padding: 20px; background-color: #f9f9f9; }}
                        .footer {{ margin-top: 20px; font-size: 0.9em; color: #777; }}
                        .button {{ 
                            display: inline-block; 
                            padding: 10px 20px; 
                            background-color: #4a6fdc; 
                            color: white; 
                            text-decoration: none; 
                            border-radius: 4px;
                            margin: 10px 0;
                        }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h2>Work Item Ready for Review</h2>
                        </div>
                        <div class='content'>
                            <p>Dear Manager,</p>
                            <p>{employeeName} has completed work item: <strong>{workItemName}</strong></p>
                            <p><strong>Project:</strong> {projectName}</p>
                            <p>Please log in to review and approve/reject this work item.</p>
                            <a href='[YOUR_APP_URL]/workitems/review' class='button'>Review Work Item</a>
                            <div class='footer'>
                                <p>This is an automated notification. Please do not reply to this email.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>";

            await SendEmailAsync(toEmail, subject, body);
            _logger.LogInformation($"Work item review email sent to {toEmail} for work item '{workItemName}' by {employeeName}");
        }

        public async Task SendWorkItemStatusUpdateEmailAsync(string toEmail, string employeeName, string workItemName, string projectName, string oldStatus, string newStatus, string? comments = null)
        {
            try
            {
                var subject = $"Work Item Status Updated: {workItemName}";
                var body = $@"
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                            .header {{ background-color: #4a6fdc; color: white; padding: 10px 20px; }}
                            .content {{ padding: 20px; background-color: #f9f9f9; }}
                            .footer {{ margin-top: 20px; font-size: 0.9em; color: #777; }}
                        </style>
                    </head>
                    <body>
                        <div class='container'>
                            <div class='header'>
                                <h2>Work Item Status Updated</h2>
                            </div>
                            <div class='content'>
                                <p>Hello {employeeName},</p>
                                <p>The status of work item <strong>{workItemName}</strong> in project <strong>{projectName}</strong> has been updated.</p>
                                <p><strong>Old Status:</strong> {oldStatus}<br>
                                <strong>New Status:</strong> {newStatus}</p>";

                if (!string.IsNullOrEmpty(comments))
                {
                    body += $"<p><strong>Comments:</strong> {comments}</p>";
                }

                body += @"
                                <p>Please log in to the system to view the details.</p>
                                <div class='footer'>
                                    <p>This is an automated notification. Please do not reply to this email.</p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>";

                await SendEmailAsync(toEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending work item status update email to {Email}", toEmail);
                throw;
            }
        }

        public async Task SendWorkItemRejectedEmailAsync(string toEmail, string employeeName, string workItemName, string reason)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
                throw new ArgumentException("Recipient email cannot be empty", nameof(toEmail));

            if (string.IsNullOrWhiteSpace(workItemName))
                throw new ArgumentException("Work item name cannot be empty", nameof(workItemName));

            if (string.IsNullOrWhiteSpace(reason))
                reason = "No reason provided";

            var subject = $"Work Item Rejected: {workItemName}";
            var body = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background-color: #dc4a4a; color: white; padding: 10px 20px; }}
                        .content {{ padding: 20px; background-color: #f9f9f9; }}
                        .footer {{ margin-top: 20px; font-size: 0.9em; color: #777; }}
                        .button {{ 
                            display: inline-block; 
                            padding: 10px 20px; 
                            background-color: #dc4a4a; 
                            color: white; 
                            text-decoration: none; 
                            border-radius: 4px;
                            margin: 10px 0;
                        }}
                        .reason {{ 
                            background-color: #fff3f3; 
                            border-left: 4px solid #dc4a4a; 
                            padding: 10px 15px; 
                            margin: 10px 0;
                        }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h2>Work Item Rejected</h2>
                        </div>
                        <div class='content'>
                            <p>Dear {employeeName},</p>
                            <p>Your work item has been rejected: <strong>{workItemName}</strong></p>
                            <div class='reason'>
                                <p><strong>Reason for rejection:</strong></p>
                                <p>{reason}</p>
                            </div>
                            <p>Please review the feedback and make the necessary changes.</p>
                            <a href='[YOUR_APP_URL]/workitems/{workItemName}/edit' class='button'>Update Work Item</a>
                            <div class='footer'>
                                <p>This is an automated notification. Please do not reply to this email.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>";

            await SendEmailAsync(toEmail, subject, body);
            _logger.LogInformation($"Work item rejection email sent to {toEmail} for work item '{workItemName}'. Reason: {reason}");
        }

        public async Task SendEmailAsync(string toEmail, string subject, string message, bool isHtml = false)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
                throw new ArgumentException("Recipient email cannot be empty", nameof(toEmail));

            if (string.IsNullOrWhiteSpace(subject))
                throw new ArgumentException("Email subject cannot be empty", nameof(subject));

            if (string.IsNullOrWhiteSpace(message))
                throw new ArgumentException("Email message cannot be empty", nameof(message));

            using var client = new SmtpClient(_emailSettings.SmtpServer, _emailSettings.Port);
            client.EnableSsl = _emailSettings.EnableSsl;
            client.Credentials = new NetworkCredential(_emailSettings.Username, _emailSettings.Password);
            client.Timeout = 30000; // 30 seconds timeout

            var fromEmail = string.IsNullOrWhiteSpace(_emailSettings.FromEmail) ? 
                _emailSettings.Username : _emailSettings.FromEmail;
                    
            using var mailMessage = new MailMessage
            {
                From = new MailAddress(fromEmail, _emailSettings.FromName),
                Subject = subject,
                Body = message,
                IsBodyHtml = isHtml,
                Priority = MailPriority.Normal
            };

            try
            {
                // Add recipients
                var emails = toEmail.Split(new[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var email in emails)
                {
                    var trimmedEmail = email.Trim();
                    if (!string.IsNullOrWhiteSpace(trimmedEmail))
                    {
                        mailMessage.To.Add(trimmedEmail);
                    }
                }

                // Send the email with retry logic
                await SendWithRetryAsync(client, mailMessage, toEmail, subject);
            }
            catch (Exception ex) when (ex is SmtpException || ex is InvalidOperationException)
            {
                _logger.LogError(ex, $"Error sending email to {toEmail}");
                throw new InvalidOperationException($"Failed to send email: {ex.Message}", ex);
            }
        }

        private async Task SendWithRetryAsync(SmtpClient client, MailMessage mailMessage, string toEmail, string subject)
        {
            const int maxRetryAttempts = 2;
            var retryCount = 0;
            var retryDelay = TimeSpan.FromSeconds(2);

            while (true)
            {
                try
                {
                    await client.SendMailAsync(mailMessage);
                    _logger.LogInformation($"Email sent successfully to {toEmail} with subject: {subject}");
                    return;
                }
                catch (SmtpException smtpEx) when (smtpEx.StatusCode == SmtpStatusCode.MailboxBusy || 
                                                smtpEx.StatusCode == SmtpStatusCode.MailboxUnavailable ||
                                                smtpEx.StatusCode == SmtpStatusCode.ServiceNotAvailable)
                {
                    retryCount++;
                    if (retryCount > maxRetryAttempts)
                    {
                        _logger.LogError(smtpEx, $"Failed to send email to {toEmail} after {maxRetryAttempts} attempts");
                        throw new InvalidOperationException($"Failed to send email after {maxRetryAttempts} attempts: {smtpEx.Message}", smtpEx);
                    }

                    _logger.LogWarning(smtpEx, $"Temporary error sending email to {toEmail}. Retry attempt {retryCount}/{maxRetryAttempts} in {retryDelay.TotalSeconds} seconds...");
                    await Task.Delay(retryDelay);
                    retryDelay = TimeSpan.FromSeconds(retryDelay.TotalSeconds * 2); // Exponential backoff
                }
            }
        }
    }
}