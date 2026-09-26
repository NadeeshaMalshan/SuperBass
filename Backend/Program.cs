using Microsoft.EntityFrameworkCore;
using Superbass.Models;
using Superbass.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;

// Load .env file
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Configure listening port and host:
// In production / Docker / Render, listen on 0.0.0.0 with $PORT or container default port (8080).
// In development, default to http://localhost:5237.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}
else if (!builder.Environment.IsDevelopment())
{
    var httpPort = Environment.GetEnvironmentVariable("ASPNETCORE_HTTP_PORTS") ?? "8080";
    builder.WebHost.UseUrls($"http://0.0.0.0:{httpPort}");
}
else
{
    builder.WebHost.UseUrls("http://localhost:5237");
}

// Add services to the container.

var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<SuperbassDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            null);
        npgsqlOptions.CommandTimeout(60);
    }));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddSignalR();
builder.Services.AddHttpClient();
builder.Services.AddScoped<ICommunityPostRepository, EfCommunityPostRepository>();
builder.Services.AddScoped<WorkerRepository, EfWorkerRepository>();
builder.Services.AddScoped<IResidentRepository, EfResidentRepository>();
builder.Services.AddScoped<ICommunicationRepository, EfCommunicationRepository>();
builder.Services.AddHttpClient<IPushNotificationService, PushNotificationService>();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// worker
builder.Services.AddScoped<WorkerRepository, EfWorkerRepository>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });

    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var secretKey = builder.Configuration["Authentication:Jwt:Secret"] ?? "super_secret_key_that_must_be_long_enough_12345";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secretKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };

        // Allow SignalR to receive JWT via query string access_token
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && (path.StartsWithSegments("/hubs") || path.StartsWithSegments("/chathub")))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

var app = builder.Build();

// Auto-apply pending migrations (which creates missing tables)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var services = scope.ServiceProvider;
        var context = services.GetRequiredService<SuperbassDbContext>();
        context.Database.Migrate();

        // Ensure missing columns on Bookings table are auto-created if not present in existing database
        try
        {
            context.Database.ExecuteSqlRaw(@"
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""LocationLat"" double precision;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""LocationLng"" double precision;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""PricingModel"" character varying(50) DEFAULT 'Hourly';
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""EstimatedPrice"" numeric;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""AgreedPrice"" numeric;
            ");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Bookings schema patch notice: {ex.Message}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database migration status/warning: {ex.Message}");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || Environment.GetEnvironmentVariable("ENABLE_SWAGGER") == "true")
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseCors("AllowFrontend"); // Use CORS after UseRouting and before Auth & Endpoints

// Global Exception Handler to preserve CORS headers on errors
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"[Error] Unhandled exception on {context.Request.Path}: {ex}");
        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            var errorJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                message = ex.Message,
                type = ex.GetType().Name
            });
            await context.Response.WriteAsync(errorJson);
        }
    }
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");
app.MapHub<ChatHub>("/chathub");

app.Run();
