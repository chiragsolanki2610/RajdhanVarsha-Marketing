using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using RegisterApi.Data;
using RegisterApi.Services;

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── CORS Policy ──────────────────────────────────────────────────────────
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("NextFrontendPolicy", policy =>
        {
            policy.WithOrigins(
                    "http://localhost:3000",
                    "https://localhost:3000",
                    "http://localhost:3001",
                    "https://localhost:3001",
                    "https://rd-app.onrender.com"   // ← add your Render URL too
                  )
                  .AllowAnyHeader()
                  .AllowAnyMethod();
            // ✅ Removed AllowCredentials() — was causing ERR_EMPTY_RESPONSE
        });
    });

    // ── Database (Supabase PostgreSQL via EF Core) ───────────────────────────
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorCodesToAdd: null);
                npgsqlOptions.CommandTimeout(60);
            }
        )
    );

    // ── Supabase Client SDK ──────────────────────────────────────────────────
    var supabaseUrl = (builder.Configuration["Supabase:Url"]
        ?? "https://tojcysqttbbcnvvapkoi.supabase.co").Trim();
    var supabaseKey = (builder.Configuration["Supabase:Key"]
        ?? "sb_publishable_-qIK8w1a0eTo-UH4Yd8Eyw_TfxeL2Z3").Trim();

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
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IUserIdGenerator, UserIdGenerator>();
    builder.Services.AddScoped<IPasswordService, PasswordService>();

    // ── JWT Auth ─────────────────────────────────────────────────────────────
    var jwtKey = builder.Configuration["Jwt:Key"]
        ?? throw new InvalidOperationException(
            "Jwt:Key is missing in appsettings.json under 'Jwt' -> 'Key'.");

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
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
            Console.ResetColor();
        }
    }

    // ── Middleware Pipeline ───────────────────────────────────────────────────
    // ✅ CORS must be before everything else
    app.UseCors("NextFrontendPolicy");

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }
    else
    {
        app.UseHttpsRedirection();
    }

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
    Console.WriteLine($"Exception Message:  {ex.Message}");
    Console.WriteLine($"Inner Exception:    {ex.InnerException?.Message}");
    Console.WriteLine($"Stack Trace:\n{ex.StackTrace}");
    Console.ResetColor();

    Console.WriteLine("\nPress any key to close this window...");
    Console.ReadKey();
}