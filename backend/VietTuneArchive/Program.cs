using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Service.EmailConfirmation;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Text;
using System.Text.Json;
using VietTuneArchive.Application.Common.Email;
using VietTuneArchive.Application.Mapper;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Services;

var builder = WebApplication.CreateBuilder(args);
var smtpSettings = builder.Configuration.GetSection("SmtpSettings");
var connectionString = builder.Configuration.GetConnectionString("Database");
builder.Services.AddDbContext<DBContext>(options =>
    options.UseSqlServer(connectionString));

var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Key"] ?? "");
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

// Add services to the container.
builder.Services.Configure<SmtpSettings>(smtpSettings);
builder.Services.AddSingleton<EmailService>();

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase);
builder.Services.AddHttpClient();
builder.Services.AddControllersWithViews()
    .AddJsonOptions(x =>
        x.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.Preserve);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(option =>
{
    ////JWT Config
    option.DescribeAllParametersInCamelCase();
    option.ResolveConflictingActions(conf => conf.First());
    option.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter a valid token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });
    option.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type=ReferenceType.SecurityScheme,
                    Id="Bearer"
                }
            },
            new string[]{}
        }
    });
});

// CORS: mặc định gồm localhost (Vite 5173, React 3000, backend 7200). Có thể ghi đè bằng appsettings "Cors:AllowedOrigins" (mảng) hoặc env Cors__AllowedOrigins (chuỗi cách nhau bởi dấu phẩy).
var defaultCorsOrigins = new[] { "http://localhost:3000", "https://localhost:7200", "http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:3000" };
var fromSection = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
var corsOriginsSetting = builder.Configuration["Cors:AllowedOrigins"]; // env var (chuỗi)
var corsOrigins = defaultCorsOrigins.ToList();
if (fromSection?.Length > 0)
    corsOrigins = corsOrigins.Union(fromSection).Distinct().ToList();
if (!string.IsNullOrWhiteSpace(corsOriginsSetting))
    corsOrigins = corsOrigins.Union(corsOriginsSetting.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)).Distinct().ToList();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
        policy.WithOrigins(corsOrigins.ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Repositories

// Services — Gemini: toàn bộ hệ thống VietTune dùng chung key qua IGeminiService (appsettings Gemini:ApiKey, Gemini:Model)
builder.Services.AddScoped<IGeminiService, GeminiService>();

//Others
builder.Services.Configure<SmtpSettings>(smtpSettings);
builder.Services.AddTransient<EmailService>();
builder.Services.AddAutoMapper(cfg => { }, typeof(MappingProfile));
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("SmtpSettings"));
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Chỉ bật HTTPS redirect khi có HTTPS (tránh warning "Failed to determine the https port" khi chạy profile http)
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();


app.Run();

//fake push