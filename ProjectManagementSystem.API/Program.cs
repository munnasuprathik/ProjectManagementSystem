using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProjectManagementSystem.API.Data;
using ProjectManagementSystem.API.Models;
using ProjectManagementSystem.API.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Register application services
builder.Services.AddScoped<IWorkloadService, WorkloadService>();
builder.Services.AddScoped<IPerformanceService, PerformanceService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// Configure SMTP settings
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("Smtp"));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? 
    throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

// Configure DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
    sqlServerOptions => sqlServerOptions.EnableRetryOnFailure()));

// Register services with their dependencies
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IWorkloadService, WorkloadService>();
builder.Services.AddScoped<IPerformanceService, PerformanceService>();


// Add logging
builder.Services.AddLogging(configure => configure.AddConsole());

// Configure Identity
builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    // Password settings
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = true;
    options.Password.RequireLowercase = true;
    
    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(30);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
    
    // User settings
    options.User.RequireUniqueEmail = true;
    
    // Sign in settings
    options.SignIn.RequireConfirmedAccount = false;
    options.SignIn.RequireConfirmedEmail = false;
    options.SignIn.RequireConfirmedPhoneNumber = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Configure Identity options for token providers
builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
{
    options.TokenLifespan = TimeSpan.FromHours(2);
});

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSettings["Key"];
if (string.IsNullOrEmpty(jwtKey))
{
    throw new InvalidOperationException("JWT Key is not configured in appsettings.json");
}
var key = Encoding.ASCII.GetBytes(jwtKey);

// Configure Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ClockSkew = TimeSpan.Zero
    };
    
    // Add custom event for token validation
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
            {
                context.Response.Headers["Token-Expired"] = "true";
            }
            return Task.CompletedTask;
        }
    };
});

// Configure CORS for development
var allowedOrigins = new[]
{
    "http://localhost:5162"   // Only allow the port we're running on
};

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.WithOrigins(allowedOrigins)
               .AllowAnyMethod()
               .AllowAnyHeader()
               .WithExposedHeaders("Content-Disposition");
    });
});

// Add controllers with JSON options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Preserve property names as-is
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// Add HTTP context accessor
builder.Services.AddHttpContextAccessor();

// Add response compression
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

// Configure Kestrel with HTTP only for development
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    // Configure HTTP endpoint
    serverOptions.ListenLocalhost(5162, listenOptions =>
    {
        listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1AndHttp2;
    });
    
    // Configure timeouts
    serverOptions.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
    serverOptions.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(1);
});

// Add routing
builder.Services.AddRouting(options => options.LowercaseUrls = true);


builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    
    // Enable detailed error pages in development
    app.UseStatusCodePages();
}
else
{
    app.UseExceptionHandler("/error");
    app.UseHsts();
}

// Enable routing first
app.UseRouting();

// Then CORS
app.UseCors("AllowAll");

// Then authentication & authorization
app.UseAuthentication();
app.UseAuthorization();

// HTTP only - no HTTPS redirection

// Configure static files with proper MIME types and caching
var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".js"] = "application/javascript; charset=utf-8";
provider.Mappings[".mjs"] = "application/javascript; charset=utf-8";
provider.Mappings[".module"] = "application/javascript";
provider.Mappings[".css"] = "text/css; charset=utf-8";
provider.Mappings[".html"] = "text/html; charset=utf-8";

// Serve all static files from wwwroot
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = provider,
    OnPrepareResponse = ctx =>
    {
        // Cache control for development
        ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        ctx.Context.Response.Headers["Pragma"] = "no-cache";
        ctx.Context.Response.Headers["Expires"] = "0";
    }
});

// Enable response compression
app.UseResponseCompression();


// Map controllers with route attributes
app.MapControllers();

// Fallback to index.html for SPA routing
app.MapFallbackToFile("index.html");

// Get logger for the application
var logger = app.Services.GetRequiredService<ILogger<Program>>();

// Seed initial data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        var userManager = services.GetRequiredService<UserManager<User>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var seederLogger = services.GetRequiredService<ILogger<DataSeeder>>();
        
        // Apply pending migrations
        if (context.Database.GetPendingMigrations().Any())
        {
            await context.Database.MigrateAsync();
        }
        
        // Seed initial data
        var seeder = new DataSeeder(seederLogger);
        await seeder.SeedDataAsync(context, userManager, roleManager);
        
        logger.LogInformation("Database migration and seeding completed successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

// Log application startup
logger.LogInformation("Application starting up...");
logger.LogInformation("Environment: {Environment}", app.Environment.EnvironmentName);
logger.LogInformation("Application Name: {ApplicationName}", app.Environment.ApplicationName);

app.Run();
