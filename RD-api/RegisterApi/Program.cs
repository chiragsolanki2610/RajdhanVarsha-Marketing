using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using RegisterApi.Data;
using RegisterApi.Services;
using QuestPDF.Infrastructure;

QuestPDF.Settings.License = LicenseType.Community;

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── CORS Policy ──────────────────────────────────────────────────────────
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("NextFrontendPolicy", policy =>
        {
            policy.WithOrigins(
                    "https://rd-app-piwd.onrender.com",
                    "http://localhost:3000",   // for local dev
                    "http://localhost:5173"    // for Vite dev
                  )
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
    });

    // ── Database (Supabase PostgreSQL via EF Core) ───────────────────────────
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))
        throw new InvalidOperationException("❌ 'DefaultConnection' is missing in configuration.");

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(
            connectionString,
            npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorCodesToAdd: null);
                npgsqlOptions.CommandTimeout(60);
            }
        )
    );

    // ── Supabase Client SDK ──────────────────────────────────────────────────
    var supabaseUrl = (builder.Configuration["Supabase:Url"] ?? "").Trim();
    var supabaseKey = (builder.Configuration["Supabase:Key"] ?? "").Trim();

    if (string.IsNullOrWhiteSpace(supabaseUrl))
        throw new InvalidOperationException("❌ 'Supabase:Url' is missing in configuration.");

    if (string.IsNullOrWhiteSpace(supabaseKey))
        throw new InvalidOperationException("❌ 'Supabase:Key' is missing in configuration.");

    if (!supabaseUrl.StartsWith("http"))
        supabaseUrl = $"https://{supabaseUrl}";

    builder.Services.AddSingleton(provider =>
        new Supabase.Client(supabaseUrl, supabaseKey, new Supabase.SupabaseOptions
        {
            AutoRefreshToken = true,
            AutoConnectRealtime = false
        }));

    // ── HTTP Client Factory ──────────────────────────────────────────────────
    builder.Services.AddHttpClient();

    // ── Services ─────────────────────────────────────────────────────────────
    builder.Services.AddScoped<IWalletService, WalletService>();
    builder.Services.AddScoped<ICommissionService, CommissionService>();
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IUserIdGenerator, UserIdGenerator>();
    builder.Services.AddScoped<IPasswordService, PasswordService>();
    builder.Services.AddScoped<IReceiptService, ReceiptService>();
    builder.Services.AddScoped<IBinaryPlanService, BinaryPlanService>();

    // ── JWT Auth ─────────────────────────────────────────────────────────────
    var jwtKey = builder.Configuration["Jwt__Key"];
    var jwtIssuer = builder.Configuration["Jwt__Issuer"];
    var jwtAudience = builder.Configuration["Jwt__Audience"];

    if (string.IsNullOrWhiteSpace(jwtKey))
        throw new InvalidOperationException("❌ 'Jwt:Key' is missing in configuration.");

    if (string.IsNullOrWhiteSpace(jwtIssuer))
        throw new InvalidOperationException("❌ 'Jwt:Issuer' is missing in configuration.");

    if (string.IsNullOrWhiteSpace(jwtAudience))
        throw new InvalidOperationException("❌ 'Jwt:Audience' is missing in configuration.");

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtKey))
            };
        });

    builder.Services.AddAuthorization();
    builder.Services.AddControllers();

    // ── Swagger ───────────────────────────────────────────────────────────────
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Register API", Version = "v1" });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "Paste JWT token string",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.Http,
            Scheme = "Bearer",
            BearerFormat = "JWT"
        });
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id   = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });

    // ── Build App ─────────────────────────────────────────────────────────────
    var app = builder.Build();

    // ── Auto-apply Migrations on Startup ─────────────────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        try
        {
            Console.WriteLine("Checking database migrations...");
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            if (db.Database.CanConnect())
            {
                var pending = db.Database.GetPendingMigrations().ToList();
                if (pending.Count != 0)
                {
                    Console.WriteLine($"Applying {pending.Count} pending migration(s)...");
                    db.Database.Migrate();
                    Console.WriteLine("✅ Database migration completed successfully.");
                }
                else
                {
                    Console.WriteLine("✅ No pending migrations. Database is up to date.");
                }
            }
            else
            {
                Console.WriteLine("⚠️ Cannot connect to database. Migration skipped.");
            }
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"[Warning] Migration issue: {ex.Message}");
            Console.WriteLine($"[Warning] Inner: {ex.InnerException?.Message}");
            Console.ResetColor();
        }
    }

    // ── Middleware Pipeline ───────────────────────────────────────────────────
    // ✅ CORS must be FIRST
    app.UseCors("NextFrontendPolicy");

    // ✅ Swagger available in all environments (helpful for Render debugging)
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Register API v1");
        c.RoutePrefix = "swagger";
    });

    // ✅ Do NOT use HttpsRedirection on Render — it handles HTTPS itself
    // app.UseHttpsRedirection(); ← keep this commented out

    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    Console.WriteLine("🚀 Server started successfully!");
    app.Run();
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("\n❌ FATAL APPLICATION CRASH ON STARTUP!");
    Console.WriteLine($"Exception Type:     {ex.GetType().FullName}");
    Console.WriteLine($"Exception Message:  {ex.Message}");
    Console.WriteLine($"Inner Exception:    {ex.InnerException?.Message}");
    Console.WriteLine($"Stack Trace:\n{ex.StackTrace}");
    Console.ResetColor();
}
