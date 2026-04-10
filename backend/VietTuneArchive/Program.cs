using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Service.EmailConfirmation;
using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Common.Email;
using VietTuneArchive.Application.Hubs;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper;
using VietTuneArchive.Application.Services;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Domain.Entities;
using VietTuneArchive.Domain.IRepositories;
using VietTuneArchive.Domain.Repositories;
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Database");
builder.Services.AddDbContext<DBContext>(options => options.UseNpgsql(connectionString));
//builder.Services.AddDbContext<DBContext>(options => options.UseSqlServer(connectionString));

var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Key"]!);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new()
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

// ✅ CRITICAL: Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", p => p.RequireRole("Admin"));
    options.AddPolicy("Expert", p => p.RequireRole("Expert"));
    options.AddPolicy("Owner", p => p.RequireAssertion(c => true)); // Custom impl
});

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.ReferenceHandler =
        System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    try
    {
        c.SwaggerDoc(builder.Configuration["Swagger:Version"] ?? "v1", new()
        {
            Title = builder.Configuration["Swagger:Title"] ?? "VietTuneArchive",
            Version = builder.Configuration["Swagger:Version"] ?? "v1"
        });
        c.AddSecurityDefinition("Bearer", new()
        {
            Description = "JWT Bearer",
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer"
        });
        c.AddSecurityRequirement(new()
        {
            { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, new string[] { } }
        });

        // ✅ Fix: Handle circular references and duplicate schema IDs
        c.CustomSchemaIds(type => type.FullName);
        //c.ResolveConflictingActions(apiDescriptions => apiDescriptions.First());
    }
    catch (Exception ex)
    {
        System.Diagnostics.Debug.WriteLine($"Swagger Error: {ex.Message}");
    }
});

// ✅ REPOSITORIES - Geographic
builder.Services.AddScoped<IGenericRepository<Province>, GenericRepository<Province>>();
builder.Services.AddScoped<IProvinceRepository, ProvinceRepository>();
builder.Services.AddScoped<IGenericRepository<District>, GenericRepository<District>>();
builder.Services.AddScoped<IDistrictRepository, DistrictRepository>();
builder.Services.AddScoped<IGenericRepository<Commune>, GenericRepository<Commune>>();
builder.Services.AddScoped<ICommuneRepository, CommuneRepository>();

// ✅ REPOSITORIES - Reference Data
builder.Services.AddScoped<IGenericRepository<EthnicGroup>, GenericRepository<EthnicGroup>>();
builder.Services.AddScoped<IEthnicGroupRepository, EthnicGroupRepository>();
builder.Services.AddScoped<IGenericRepository<Ceremony>, GenericRepository<Ceremony>>();
builder.Services.AddScoped<ICeremonyRepository, CeremonyRepository>();
builder.Services.AddScoped<IGenericRepository<VocalStyle>, GenericRepository<VocalStyle>>();
builder.Services.AddScoped<IVocalStyleRepository, VocalStyleRepository>();
builder.Services.AddScoped<IGenericRepository<MusicalScale>, GenericRepository<MusicalScale>>();
builder.Services.AddScoped<IMusicalScaleRepository, MusicalScaleRepository>();
builder.Services.AddScoped<IGenericRepository<Tag>, GenericRepository<Tag>>();
builder.Services.AddScoped<ITagRepository, TagRepository>();
builder.Services.AddScoped<IGenericRepository<Instrument>, GenericRepository<Instrument>>();
builder.Services.AddScoped<IInstrumentRepository, InstrumentRepository>();

// ✅ REPOSITORIES - Recording & Related
builder.Services.AddScoped<IGenericRepository<Recording>, GenericRepository<Recording>>();
builder.Services.AddScoped<IRecordingRepository, RecordingRepository>();
builder.Services.AddScoped<IGenericRepository<RecordingImage>, GenericRepository<RecordingImage>>();
builder.Services.AddScoped<IRecordingImageRepository, RecordingImageRepository>();
builder.Services.AddScoped<IEmbargoRepository, EmbargoRepository>();

// ✅ REPOSITORIES - Submission & Review
builder.Services.AddScoped<IGenericRepository<Submission>, GenericRepository<Submission>>();
builder.Services.AddScoped<ISubmissionRepository, SubmissionRepository>();
builder.Services.AddScoped<ISubmissionVersionRepository, SubmissionVersionRepository>();
builder.Services.AddScoped<IGenericRepository<Review>, GenericRepository<Review>>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();

// ✅ REPOSITORIES - User & Audit
builder.Services.AddScoped<IGenericRepository<User>, GenericRepository<User>>();
builder.Services.AddScoped<IGenericRepository<RefreshToken>, GenericRepository<RefreshToken>>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IGenericRepository<AuditLog>, GenericRepository<AuditLog>>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();

// ✅ REPOSITORIES - Annotation & AI
builder.Services.AddScoped<IAnnotationRepository, AnnotationRepository>();
builder.Services.AddScoped<IVectorEmbeddingRepository, VectorEmbeddingRepository>();
builder.Services.AddScoped<IAudioAnalysisResultRepository, AudioAnalysisResultRepository>();

// ✅ REPOSITORIES - Knowledge Base
builder.Services.AddScoped<IKBEntryRepository, KBEntryRepository>();
builder.Services.AddScoped<IKBRevisionRepository, KBRevisionRepository>();
builder.Services.AddScoped<IKBCitationRepository, KBCitationRepository>();

// ✅ REPOSITORIES - Q&A System
builder.Services.AddScoped<IQAConversationRepository, QAConversationRepository>();
builder.Services.AddScoped<IQAMessageRepository, QAMessageRepository>();
builder.Services.AddScoped<IRagChatRepository, RagChatRepository>();
builder.Services.AddScoped<ICopyrightDisputeRepository, CopyrightDisputeRepository>();

builder.Services.AddScoped<IUserRepository, UserRepository>();


builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();

// ✅ SERVICES - Geographic
builder.Services.AddScoped<IProvinceService, ProvinceService>();
builder.Services.AddScoped<IDistrictService, DistrictService>();
builder.Services.AddScoped<ICommuneService, CommuneService>();

// ✅ SERVICES - Reference Data
builder.Services.AddScoped<IEthnicGroupService, EthnicGroupService>();
builder.Services.AddScoped<ICeremonyService, CeremonyService>();
builder.Services.AddScoped<IVocalStyleService, VocalStyleService>();
builder.Services.AddScoped<IMusicalScaleService, MusicalScaleService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IInstrumentService, InstrumentService>();

// ✅ SERVICES - Recording & Related
builder.Services.AddScoped<IRecordingService, RecordingService>();
builder.Services.AddScoped<IRecordingImageService, RecordingImageService>();
builder.Services.AddScoped<IEmbargoService, EmbargoService>();

// ✅ SERVICES - Submission & Review
builder.Services.AddScoped<ISubmissionService2, SubmissionService2>();
builder.Services.AddScoped<ISubmissionVersionService, SubmissionVersionService>();
builder.Services.AddScoped<IReviewService, ReviewService>();

// ✅ SERVICES - Annotation & AI
builder.Services.AddScoped<IAnnotationService, AnnotationService>();
builder.Services.AddScoped<IVectorEmbeddingService, VectorEmbeddingService>();
builder.Services.AddScoped<IAudioProcessingService, AudioProcessingService>();
// ✅ Gemini Transcription Service
builder.Services.AddHttpClient<ITranscriptionService, GeminiTranscriptionService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(120); 
});
// ✅ YamNet Service Config
builder.Services.Configure<YamNetServiceConfig>(builder.Configuration.GetSection("YamNetService"));

// ✅ Register HttpClient for InstrumentDetectionService (Typed HttpClient)
builder.Services.AddHttpClient<IInstrumentDetectionService, InstrumentDetectionService>((sp, client) =>
{
    var config = sp.GetRequiredService<IOptions<YamNetServiceConfig>>().Value;
    client.BaseAddress = new Uri(config.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(config.TimeoutSeconds);
});

// === Gemini & Vector Embedding Services ===
builder.Services.Configure<GeminiOptions>(
    builder.Configuration.GetSection(GeminiOptions.SectionName));

builder.Services.AddHttpClient<IOpenAIEmbeddingService, GeminiEmbeddingService>();
builder.Services.AddHttpClient("GeminiApi");
builder.Services.AddScoped<IEmbeddingTextBuilder, EmbeddingTextBuilder>();
builder.Services.AddScoped<IVectorEmbeddingService, VectorEmbeddingService>();
builder.Services.AddScoped<ISemanticSearchService, SemanticSearchService>();
builder.Services.AddScoped<IKnowledgeGraphService, KnowledgeGraphService>();


// ✅ SERVICES - Knowledge Base
builder.Services.AddScoped<IKBEntryService, KBEntryService>();
builder.Services.AddScoped<IKBRevisionService, KBRevisionService>();
builder.Services.AddScoped<IKBCitationService, KBCitationService>();

// ✅ SERVICES - Q&A System
builder.Services.AddScoped<IQAConversationService, QAConversationService>();
builder.Services.AddScoped<IQAMessageService, QAMessageService>();
builder.Services.AddScoped<IRagChatService, RagChatService>();
builder.Services.AddScoped<IEmbeddingService, EmbeddingService>();
builder.Services.AddScoped<IKnowledgeRetrievalService, KnowledgeRetrievalService>();
builder.Services.AddScoped<ILocalLlmService, LocalLlmService>();

// === LOCAL WHISPER SERVICE (MỚI) ===
builder.Services.AddHttpClient<ILocalWhisperService, LocalWhisperService>(client =>
{
    var baseUrl = builder.Configuration["LocalWhisperService:BaseUrl"] ?? "http://localhost:8001";
    client.BaseAddress = new Uri(baseUrl);
    
    var timeout = int.Parse(builder.Configuration["LocalWhisperService:TimeoutSeconds"] ?? "300");
    client.Timeout = TimeSpan.FromSeconds(timeout);
});

// HttpClient cho Python AI microservice (RAG)
builder.Services.AddHttpClient("AiService", client =>
{
    var config = builder.Configuration.GetSection("RagChat");
    var baseUrl = config["AiServiceBaseUrl"];
    if (string.IsNullOrEmpty(baseUrl))
    {
        throw new InvalidOperationException("RagChat:AiServiceBaseUrl is not configured in appsettings.json");
    }
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(int.Parse(config["RequestTimeoutSeconds"] ?? "120"));
});

// ✅ SERVICES - User & Audit
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IRefreshTokenService, RefreshTokenService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ICopyrightDisputeService, CopyrightDisputeService>();

// ✅ REPOSITORIES - Analytics
builder.Services.AddScoped<IAnalyticsRepository, AnalyticsRepository>();

// ✅ SERVICES - Analytics
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();


builder.Services.AddMemoryCache();
builder.Services.AddScoped<IEnumProviderService, EnumProviderService>();
// AutoMapper
builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

// Email + AutoMapper
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("SmtpSettings"));
builder.Services.Configure<GmailApiSettings>(builder.Configuration.GetSection("GmailApiSettings"));
builder.Services.AddTransient<EmailService>();
builder.Services.AddHttpClient<EmailService>();

// SignalR Service
builder.Services.AddSignalR();

builder.Services.AddCors(o =>
{
    o.AddPolicy("AllowReactApp", p =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (origins != null && origins.Length > 0)
        {
            p.WithOrigins(origins)
             .AllowAnyHeader()
             .AllowAnyMethod()
             .AllowCredentials();
        }
        else
        {
            p.AllowAnyOrigin()
             .AllowAnyHeader()
             .AllowAnyMethod();
        }
    });
});

var app = builder.Build();
var errorPath = builder.Configuration["AppPaths:ErrorPath"] ?? "/error";
app.UseExceptionHandler(errorPath);
app.MapGet(errorPath, () => Results.Problem("An error occurred", statusCode: StatusCodes.Status500InternalServerError));

if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        var version = builder.Configuration["Swagger:Version"] ?? "v1";
        var title = builder.Configuration["Swagger:Title"] ?? "VietTuneArchive";
        c.SwaggerEndpoint($"/swagger/{version}/swagger.json", $"{title} {version}");
        c.RoutePrefix = builder.Configuration["Swagger:RoutePrefix"] ?? "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>(builder.Configuration["SignalR:HubPath"] ?? "/notificationHub");

app.Run();
