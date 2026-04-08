using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace VietTuneArchive.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddKBEntryIdToVectorEmbeddings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Ceremonies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Season = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ceremonies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EthnicGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    LanguageFamily = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PrimaryRegion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EthnicGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MusicalScales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    NotePattern = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MusicalScales", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Provinces",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RegionCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Provinces", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Password = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ConfirmEmailToken = table.Column<string>(type: "text", nullable: true),
                    IsEmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    ResetPasswordToken = table.Column<string>(type: "text", nullable: true),
                    ResetPasswordTokenExpiry = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AvatarUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Role = table.Column<string>(type: "text", nullable: false),
                    AcademicCredentials = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ContributionScore = table.Column<decimal>(type: "numeric", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EthnicGroupCeremonies",
                columns: table => new
                {
                    EthnicGroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    CeremonyId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EthnicGroupCeremonies", x => new { x.EthnicGroupId, x.CeremonyId });
                    table.ForeignKey(
                        name: "FK_EthnicGroupCeremonies_Ceremonies_CeremonyId",
                        column: x => x.CeremonyId,
                        principalTable: "Ceremonies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EthnicGroupCeremonies_EthnicGroups_EthnicGroupId",
                        column: x => x.EthnicGroupId,
                        principalTable: "EthnicGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Instruments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    TuningSystem = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ConstructionMethod = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    OriginEthnicGroupId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Instruments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Instruments_EthnicGroups_OriginEthnicGroupId",
                        column: x => x.OriginEthnicGroupId,
                        principalTable: "EthnicGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "VocalStyles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    EthnicGroupId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VocalStyles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VocalStyles_EthnicGroups_EthnicGroupId",
                        column: x => x.EthnicGroupId,
                        principalTable: "EthnicGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Districts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProvinceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Districts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Districts_Provinces_ProvinceId",
                        column: x => x.ProvinceId,
                        principalTable: "Provinces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EntityType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Action = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    OldValuesJson = table.Column<string>(type: "text", nullable: true),
                    NewValuesJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "KBEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Slug = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KBEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KBEntries_Users_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RelatedEntityType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    RelatedEntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QAConversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QAConversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QAConversations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserConnections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConnectionId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserConnections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserConnections_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InstrumentEthnicGroups",
                columns: table => new
                {
                    InstrumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    EthnicGroupId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstrumentEthnicGroups", x => new { x.InstrumentId, x.EthnicGroupId });
                    table.ForeignKey(
                        name: "FK_InstrumentEthnicGroups_EthnicGroups_EthnicGroupId",
                        column: x => x.EthnicGroupId,
                        principalTable: "EthnicGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InstrumentEthnicGroups_Instruments_InstrumentId",
                        column: x => x.InstrumentId,
                        principalTable: "Instruments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Communes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DistrictId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Latitude = table.Column<decimal>(type: "numeric", nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Communes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Communes_Districts_DistrictId",
                        column: x => x.DistrictId,
                        principalTable: "Districts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KBCitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Citation = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KBCitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KBCitations_KBEntries_EntryId",
                        column: x => x.EntryId,
                        principalTable: "KBEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KBRevisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    EditorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    RevisionNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KBRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KBRevisions_KBEntries_EntryId",
                        column: x => x.EntryId,
                        principalTable: "KBEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KBRevisions_Users_EditorId",
                        column: x => x.EditorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QAMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    SourceRecordingIdsJson = table.Column<string>(type: "text", nullable: true),
                    SourceKBEntryIdsJson = table.Column<string>(type: "text", nullable: true),
                    ConfidenceScore = table.Column<decimal>(type: "numeric", nullable: true),
                    FlaggedByExpert = table.Column<bool>(type: "boolean", nullable: false),
                    CorrectedByExpertId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExpertCorrection = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QAMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QAMessages_QAConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "QAConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_QAMessages_Users_CorrectedByExpertId",
                        column: x => x.CorrectedByExpertId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Recordings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    AudioFileUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    VideoFileUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AudioFormat = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    UploadedById = table.Column<Guid>(type: "uuid", nullable: false),
                    CommuneId = table.Column<Guid>(type: "uuid", nullable: true),
                    EthnicGroupId = table.Column<Guid>(type: "uuid", nullable: true),
                    CeremonyId = table.Column<Guid>(type: "uuid", nullable: true),
                    VocalStyleId = table.Column<Guid>(type: "uuid", nullable: true),
                    MusicalScaleId = table.Column<Guid>(type: "uuid", nullable: true),
                    PerformanceContext = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LyricsOriginal = table.Column<string>(type: "text", nullable: true),
                    LyricsVietnamese = table.Column<string>(type: "text", nullable: true),
                    PerformerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PerformerAge = table.Column<int>(type: "integer", nullable: true),
                    RecordingDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    GpsLatitude = table.Column<decimal>(type: "numeric", nullable: true),
                    GpsLongitude = table.Column<decimal>(type: "numeric", nullable: true),
                    Tempo = table.Column<decimal>(type: "numeric", nullable: true),
                    KeySignature = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    SubmissionId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Recordings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Recordings_Ceremonies_CeremonyId",
                        column: x => x.CeremonyId,
                        principalTable: "Ceremonies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Recordings_Communes_CommuneId",
                        column: x => x.CommuneId,
                        principalTable: "Communes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Recordings_EthnicGroups_EthnicGroupId",
                        column: x => x.EthnicGroupId,
                        principalTable: "EthnicGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Recordings_MusicalScales_MusicalScaleId",
                        column: x => x.MusicalScaleId,
                        principalTable: "MusicalScales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Recordings_Users_UploadedById",
                        column: x => x.UploadedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Recordings_VocalStyles_VocalStyleId",
                        column: x => x.VocalStyleId,
                        principalTable: "VocalStyles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Annotations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpertId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ResearchCitation = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TimestampStart = table.Column<int>(type: "integer", nullable: true),
                    TimestampEnd = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Annotations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Annotations_Recordings_RecordingId",
                        column: x => x.RecordingId,
                        principalTable: "Recordings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Annotations_Users_ExpertId",
                        column: x => x.ExpertId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AudioAnalysisResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uuid", nullable: false),
                    DetectedInstrumentsJson = table.Column<string>(type: "text", nullable: true),
                    DetectedTempo = table.Column<decimal>(type: "numeric", nullable: true),
                    DetectedKey = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    SpectralFeaturesJson = table.Column<string>(type: "text", nullable: true),
                    SuggestedEthnicGroup = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SuggestedMetadataJson = table.Column<string>(type: "text", nullable: true),
                    AnalyzedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AudioAnalysisResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AudioAnalysisResults_Recordings_RecordingId",
                        column: x => x.RecordingId,
                        principalTable: "Recordings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecordingImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Caption = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecordingImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecordingImages_Recordings_RecordingId",
                        column: x => x.RecordingId,
                        principalTable: "Recordings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecordingInstruments",
                columns: table => new
                {
                    RecordingId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstrumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayingTechnique = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecordingInstruments", x => new { x.RecordingId, x.InstrumentId });
                    table.ForeignKey(
                        name: "FK_RecordingInstruments_Instruments_InstrumentId",
                        column: x => x.InstrumentId,
                        principalTable: "Instruments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecordingInstruments_Recordings_RecordingId",
                        column: x => x.RecordingId,
                        principalTable: "Recordings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecordingTags",
                columns: table => new
                {
                    RecordingId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecordingTags", x => new { x.RecordingId, x.TagId });
                    table.ForeignKey(
                        name: "FK_RecordingTags_Recordings_RecordingId",
                        column: x => x.RecordingId,
                        principalTable: "Recordings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecordingTags_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Submissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContributorId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrentStage = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ReviewerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Submissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Submissions_Recordings_RecordingId",
                        column: x => x.RecordingId,
                        principalTable: "Recordings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Submissions_Users_ContributorId",
                        column: x => x.ContributorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Submissions_Users_ReviewerId",
                        column: x => x.ReviewerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "VectorEmbeddings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uuid", nullable: false),
                    KBEntryId = table.Column<Guid>(type: "uuid", nullable: true),
                    EmbeddingJson = table.Column<string>(type: "text", nullable: false),
                    ModelVersion = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VectorEmbeddings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VectorEmbeddings_KBEntries_KBEntryId",
                        column: x => x.KBEntryId,
                        principalTable: "KBEntries",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_VectorEmbeddings_Recordings_RecordingId",
                        column: x => x.RecordingId,
                        principalTable: "Recordings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmissionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Stage = table.Column<int>(type: "integer", nullable: false),
                    Decision = table.Column<int>(type: "integer", nullable: false),
                    Comments = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reviews_Submissions_SubmissionId",
                        column: x => x.SubmissionId,
                        principalTable: "Submissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Reviews_Users_ReviewerId",
                        column: x => x.ReviewerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SubmissionVersions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmissionId = table.Column<Guid>(type: "uuid", nullable: false),
                    VersionNumber = table.Column<int>(type: "integer", nullable: false),
                    ChangesJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubmissionVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubmissionVersions_Submissions_SubmissionId",
                        column: x => x.SubmissionId,
                        principalTable: "Submissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Ceremonies",
                columns: new[] { "Id", "Description", "Name", "Season", "Type" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0003-000000000001"), "Nghi lễ cưới hỏi truyền thống", "Lễ cưới", null, "Wedding" },
                    { new Guid("00000000-0000-0000-0003-000000000002"), "Nghi lễ tiễn đưa người mất", "Lễ tang", null, "Funeral" },
                    { new Guid("00000000-0000-0000-0003-000000000003"), "Lễ mừng thu hoạch lúa, phổ biến ở Tây Nguyên", "Lễ mừng lúa mới", "Thu", "Harvest" },
                    { new Guid("00000000-0000-0000-0003-000000000004"), "Lễ hội lớn nhất của người H'Mông", "Lễ hội Gầu Tào", "Xuân", "Festival" },
                    { new Guid("00000000-0000-0000-0003-000000000005"), "Lễ hội xuống đồng của người Tày", "Lễ hội Lồng Tồng", "Xuân", "Festival" },
                    { new Guid("00000000-0000-0000-0003-000000000006"), "Lễ cúng thần nước của các dân tộc Tây Nguyên", "Lễ cúng bến nước", null, "Ritual" },
                    { new Guid("00000000-0000-0000-0003-000000000007"), "Nghi lễ then - Di sản UNESCO, người Tày/Nùng", "Hát then", null, "Ritual" },
                    { new Guid("00000000-0000-0000-0003-000000000008"), "Nghệ thuật ca trù - Di sản UNESCO", "Ca trù", null, "Daily" },
                    { new Guid("00000000-0000-0000-0003-000000000009"), "Nhạc cung đình Huế - Di sản UNESCO", "Nhã nhạc cung đình Huế", null, "Ritual" },
                    { new Guid("00000000-0000-0000-0003-000000000010"), "Lễ giỗ tổ tiên, cúng ông bà", "Đám giỗ", null, "Ritual" },
                    { new Guid("00000000-0000-0000-0003-000000000011"), "Lễ trưởng thành của người Dao", "Lễ cấp sắc", null, "Ritual" },
                    { new Guid("00000000-0000-0000-0003-000000000012"), "Lễ bỏ mả của các dân tộc Tây Nguyên", "Lễ bỏ mả", null, "Funeral" }
                });

            migrationBuilder.InsertData(
                table: "EthnicGroups",
                columns: new[] { "Id", "Description", "ImageUrl", "LanguageFamily", "Name", "PrimaryRegion" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0001-000000000001"), null, null, "Austroasiatic", "Kinh (Việt)", "Toàn quốc" },
                    { new Guid("00000000-0000-0000-0001-000000000002"), null, null, "Tai-Kadai", "Tày", "Đông Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000003"), null, null, "Tai-Kadai", "Thái", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000004"), null, null, "Austroasiatic", "Mường", "Bắc Trung Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000005"), null, null, "Austroasiatic", "Khmer", "Đồng bằng sông Cửu Long" },
                    { new Guid("00000000-0000-0000-0001-000000000006"), null, null, "Sino-Tibetan", "Hoa", "TP.HCM, Đông Nam Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000007"), null, null, "Tai-Kadai", "Nùng", "Đông Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000008"), null, null, "Hmong-Mien", "H'Mông", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000009"), null, null, "Hmong-Mien", "Dao", "Bắc Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000010"), null, null, "Austronesian", "Gia Rai", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000011"), null, null, "Austronesian", "Ê Đê", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000012"), null, null, "Austroasiatic", "Ba Na", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000013"), null, null, "Austroasiatic", "Xơ Đăng", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000014"), null, null, "Tai-Kadai", "Sán Chay", "Đông Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000015"), null, null, "Austroasiatic", "Cơ Ho", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000016"), null, null, "Austronesian", "Chăm", "Nam Trung Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000017"), null, null, "Sino-Tibetan", "Sán Dìu", "Đông Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000018"), null, null, "Austroasiatic", "Hrê", "Trung Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000019"), null, null, "Austronesian", "Ra Glai", "Nam Trung Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000020"), null, null, "Austroasiatic", "Mnông", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000021"), null, null, "Austroasiatic", "Thổ", "Bắc Trung Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000022"), null, null, "Austroasiatic", "Xtiêng", "Đông Nam Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000023"), null, null, "Austroasiatic", "Khơ Mú", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000024"), null, null, "Austroasiatic", "Bru - Vân Kiều", "Bắc Trung Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000025"), null, null, "Austroasiatic", "Cơ Tu", "Trung Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000026"), null, null, "Tai-Kadai", "Giáy", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000027"), null, null, "Austroasiatic", "Tà Ôi", "Trung Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000028"), null, null, "Austroasiatic", "Mạ", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000029"), null, null, "Austroasiatic", "Giẻ Triêng", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000030"), null, null, "Austroasiatic", "Co", "Trung Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000031"), null, null, "Austroasiatic", "Chơ Ro", "Đông Nam Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000032"), null, null, "Austroasiatic", "Xinh Mun", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000033"), null, null, "Sino-Tibetan", "Hà Nhì", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000034"), null, null, "Austronesian", "Chu Ru", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000035"), null, null, "Tai-Kadai", "Lào", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000036"), null, null, "Tai-Kadai", "La Chí", "Đông Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000037"), null, null, "Austroasiatic", "Kháng", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000038"), null, null, "Sino-Tibetan", "Phù Lá", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000039"), null, null, "Sino-Tibetan", "La Hủ", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000040"), null, null, "Tai-Kadai", "La Ha", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000041"), null, null, "Hmong-Mien", "Pà Thẻn", "Đông Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000042"), null, null, "Tai-Kadai", "Lự", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000043"), null, null, "Sino-Tibetan", "Ngái", "Đông Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000044"), null, null, "Austroasiatic", "Chứt", "Bắc Trung Bộ" },
                    { new Guid("00000000-0000-0000-0001-000000000045"), null, null, "Sino-Tibetan", "Lô Lô", "Đông Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000046"), null, null, "Austroasiatic", "Mảng", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000047"), null, null, "Hmong-Mien", "Cơ Lao", "Đông Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000048"), null, null, "Tai-Kadai", "Bố Y", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000049"), null, null, "Sino-Tibetan", "Cống", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000050"), null, null, "Sino-Tibetan", "Si La", "Tây Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000051"), null, null, "Hmong-Mien", "Pu Péo", "Đông Bắc" },
                    { new Guid("00000000-0000-0000-0001-000000000052"), null, null, "Austroasiatic", "Brâu", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000053"), null, null, "Austroasiatic", "Rơ Măm", "Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0001-000000000054"), null, null, "Austroasiatic", "Ơ Đu", "Bắc Trung Bộ" }
                });

            migrationBuilder.InsertData(
                table: "MusicalScales",
                columns: new[] { "Id", "Description", "Name", "NotePattern" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0005-000000000001"), "Thang âm ngũ cung Bắc, tính chất vui tươi sáng sủa", "Điệu Bắc", "Hò-Xự-Xang-Xê-Cống" },
                    { new Guid("00000000-0000-0000-0005-000000000002"), "Thang âm ngũ cung Nam, tính chất buồn ai oán", "Điệu Nam", "Hò-Xự-Xang-Xê-Cống (biến thể Nam)" },
                    { new Guid("00000000-0000-0000-0005-000000000003"), "Hơi Xuân trong nhạc tài tử, tươi sáng", "Nam Xuân", "Hò-Xự-Xang-Xê-Cống (Xuân)" },
                    { new Guid("00000000-0000-0000-0005-000000000004"), "Hơi Ai trong nhạc tài tử, buồn thương", "Nam Ai", "Hò-Xự-Xang-Xê-Cống (Ai)" },
                    { new Guid("00000000-0000-0000-0005-000000000005"), "Hơi Oán trong nhạc tài tử, bi thương sâu lắng", "Oán điệu", "Hò-Xự-Xang-Xê-Cống (Oán)" },
                    { new Guid("00000000-0000-0000-0005-000000000006"), "Hơi Bắc trong nhạc cải lương, vui sáng", "Bắc điệu", "Hò-Xự-Xang-Xê-Cống (Bắc)" },
                    { new Guid("00000000-0000-0000-0005-000000000007"), "Thang ngũ cung Đô thứ, phổ biến trong nhạc dân tộc thiểu số", "Ngũ cung thứ", "C-Eb-F-G-Bb" },
                    { new Guid("00000000-0000-0000-0005-000000000008"), "Thang ngũ cung Đô trưởng", "Ngũ cung trưởng", "C-D-E-G-A" }
                });

            migrationBuilder.InsertData(
                table: "Tags",
                columns: new[] { "Id", "Category", "Name" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0006-000000000001"), "Heritage", "Di sản UNESCO" },
                    { new Guid("00000000-0000-0000-0006-000000000002"), "Heritage", "Di sản quốc gia" },
                    { new Guid("00000000-0000-0000-0006-000000000003"), "Rarity", "Nhạc cụ hiếm" },
                    { new Guid("00000000-0000-0000-0006-000000000004"), "Source", "Bản ghi gốc" },
                    { new Guid("00000000-0000-0000-0006-000000000005"), "Performer", "Nghệ nhân ưu tú" },
                    { new Guid("00000000-0000-0000-0006-000000000006"), "Genre", "Nhạc cung đình" },
                    { new Guid("00000000-0000-0000-0006-000000000007"), "Genre", "Nhạc dân gian" },
                    { new Guid("00000000-0000-0000-0006-000000000008"), "Genre", "Nhạc lễ Tết" },
                    { new Guid("00000000-0000-0000-0006-000000000009"), "Region", "Nhạc Tây Nguyên" },
                    { new Guid("00000000-0000-0000-0006-000000000010"), "Region", "Nhạc Tây Bắc" },
                    { new Guid("00000000-0000-0000-0006-000000000011"), "Region", "Nhạc Nam Bộ" },
                    { new Guid("00000000-0000-0000-0006-000000000012"), "Region", "Nhạc Trung Bộ" },
                    { new Guid("00000000-0000-0000-0006-000000000013"), "Region", "Nhạc Bắc Bộ" },
                    { new Guid("00000000-0000-0000-0006-000000000014"), "Genre", "Hát ru con ngủ" },
                    { new Guid("00000000-0000-0000-0006-000000000015"), "Rarity", "Nhạc nguyên thủy" }
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "AcademicCredentials", "AvatarUrl", "ConfirmEmailToken", "ContributionScore", "CreatedAt", "Email", "FullName", "IsActive", "IsEmailConfirmed", "Password", "PasswordHash", "Phone", "ResetPasswordToken", "ResetPasswordTokenExpiry", "Role", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0007-000000000001"), "IT Manager, VietTuneArchive Project Lead", null, null, 1000m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "admin@gmail.com", "System Administrator", true, true, "1", "$2a$12$ESO37RsCeR9TfAF3ct4R2.oN1s3QuRqVvdVPkhT60VoIa3LVJAbiu", "+84901234567", null, null, "Admin", null },
                    { new Guid("00000000-0000-0000-0007-000000000002"), "Music Enthusiast, Traditional Music Collector", null, null, 250m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "contributor1@gmail.com", "Nguyễn Thị Thu Hương", true, true, "1", "$2a$12$ESO37RsCeR9TfAF3ct4R2.oN1s3QuRqVvdVPkhT60VoIa3LVJAbiu", "+84912345678", null, null, "Contributor", null },
                    { new Guid("00000000-0000-0000-0007-000000000003"), "Audio Engineer, Recording Specialist", null, null, 180m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "contributor2@gmail.com", "Trần Văn Tùng", true, true, "1", "$2a$12$ESO37RsCeR9TfAF3ct4R2.oN1s3QuRqVvdVPkhT60VoIa3LVJAbiu", "+84923456789", null, null, "Contributor", null },
                    { new Guid("00000000-0000-0000-0007-000000000004"), "PhD Ethnomusicology, Senior Researcher at Vietnam Institute of Music", null, null, 450m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "researcher1@gmail.com", "Dr. Phạm Quốc Bảo", true, true, "1", "$2a$12$ESO37RsCeR9TfAF3ct4R2.oN1s3QuRqVvdVPkhT60VoIa3LVJAbiu", "+84934567890", null, null, "Researcher", null },
                    { new Guid("00000000-0000-0000-0007-000000000005"), "Assoc. Prof. Ethnology, Hanoi National University of Education", null, null, 380m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "researcher2@gmail.com", "Assoc. Prof. Vũ Thị Hương Ly", true, true, "1", "$2a$12$ESO37RsCeR9TfAF3ct4R2.oN1s3QuRqVvdVPkhT60VoIa3LVJAbiu", "+84945678901", null, null, "Researcher", null },
                    { new Guid("00000000-0000-0000-0007-000000000006"), "Master Traditional Musician, National Treasure of Vietnam, 40+ years experience", null, null, 850m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "expert1@gmail.com", "Maestro Nguyễn Tuấn Hùng", true, true, "1", "$2a$12$ESO37RsCeR9TfAF3ct4R2.oN1s3QuRqVvdVPkhT60VoIa3LVJAbiu", "+84956789012", null, null, "Expert", null },
                    { new Guid("00000000-0000-0000-0007-000000000007"), "PhD Traditional Arts, Director of Vietnam Heritage Music Center", null, null, 720m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "expert2@gmail.com", "Dr. Đặng Thái Sơn", true, true, "1", "$2a$12$ESO37RsCeR9TfAF3ct4R2.oN1s3QuRqVvdVPkhT60VoIa3LVJAbiu", "+84967890123", null, null, "Expert", null },
                    { new Guid("00000000-0000-0000-0007-000000000008"), "Prof. Musicology, Dean of Traditional Music Faculty - Hanoi Academy of Music", null, null, 950m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "expert3@gmail.com", "Prof. Lê Văn Hoàng", true, true, "1", "$2a$12$ESO37RsCeR9TfAF3ct4R2.oN1s3QuRqVvdVPkhT60VoIa3LVJAbiu", "+84978901234", null, null, "Expert", null }
                });

            migrationBuilder.InsertData(
                table: "EthnicGroupCeremonies",
                columns: new[] { "CeremonyId", "EthnicGroupId" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0003-000000000001"), new Guid("00000000-0000-0000-0001-000000000001") },
                    { new Guid("00000000-0000-0000-0003-000000000002"), new Guid("00000000-0000-0000-0001-000000000001") },
                    { new Guid("00000000-0000-0000-0003-000000000008"), new Guid("00000000-0000-0000-0001-000000000001") },
                    { new Guid("00000000-0000-0000-0003-000000000009"), new Guid("00000000-0000-0000-0001-000000000001") },
                    { new Guid("00000000-0000-0000-0003-000000000010"), new Guid("00000000-0000-0000-0001-000000000001") },
                    { new Guid("00000000-0000-0000-0003-000000000001"), new Guid("00000000-0000-0000-0001-000000000002") },
                    { new Guid("00000000-0000-0000-0003-000000000002"), new Guid("00000000-0000-0000-0001-000000000002") },
                    { new Guid("00000000-0000-0000-0003-000000000005"), new Guid("00000000-0000-0000-0001-000000000002") },
                    { new Guid("00000000-0000-0000-0003-000000000007"), new Guid("00000000-0000-0000-0001-000000000002") },
                    { new Guid("00000000-0000-0000-0003-000000000001"), new Guid("00000000-0000-0000-0001-000000000003") },
                    { new Guid("00000000-0000-0000-0003-000000000002"), new Guid("00000000-0000-0000-0001-000000000003") },
                    { new Guid("00000000-0000-0000-0003-000000000001"), new Guid("00000000-0000-0000-0001-000000000005") },
                    { new Guid("00000000-0000-0000-0003-000000000007"), new Guid("00000000-0000-0000-0001-000000000007") },
                    { new Guid("00000000-0000-0000-0003-000000000001"), new Guid("00000000-0000-0000-0001-000000000008") },
                    { new Guid("00000000-0000-0000-0003-000000000004"), new Guid("00000000-0000-0000-0001-000000000008") },
                    { new Guid("00000000-0000-0000-0003-000000000011"), new Guid("00000000-0000-0000-0001-000000000009") },
                    { new Guid("00000000-0000-0000-0003-000000000003"), new Guid("00000000-0000-0000-0001-000000000010") },
                    { new Guid("00000000-0000-0000-0003-000000000006"), new Guid("00000000-0000-0000-0001-000000000010") },
                    { new Guid("00000000-0000-0000-0003-000000000012"), new Guid("00000000-0000-0000-0001-000000000010") },
                    { new Guid("00000000-0000-0000-0003-000000000003"), new Guid("00000000-0000-0000-0001-000000000011") },
                    { new Guid("00000000-0000-0000-0003-000000000006"), new Guid("00000000-0000-0000-0001-000000000011") },
                    { new Guid("00000000-0000-0000-0003-000000000003"), new Guid("00000000-0000-0000-0001-000000000012") },
                    { new Guid("00000000-0000-0000-0003-000000000006"), new Guid("00000000-0000-0000-0001-000000000012") },
                    { new Guid("00000000-0000-0000-0003-000000000012"), new Guid("00000000-0000-0000-0001-000000000012") }
                });

            migrationBuilder.InsertData(
                table: "Instruments",
                columns: new[] { "Id", "Category", "ConstructionMethod", "Description", "ImageUrl", "Name", "OriginEthnicGroupId", "TuningSystem" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0002-000000000001"), "String", null, "Đàn một dây, biểu tượng âm nhạc Việt Nam", null, "Đàn bầu", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000002"), "String", null, "Đàn 16 dây, zither truyền thống", null, "Đàn tranh", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000003"), "String", null, "Đàn hai dây mặt tròn như mặt trăng", null, "Đàn nguyệt", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000004"), "String", null, "Đàn hai dây kéo cung, fiddle truyền thống", null, "Đàn nhị", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000005"), "String", null, "Đàn bốn dây giống pipa", null, "Đàn tỳ bà", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000006"), "String", null, "Đàn ba dây phím dài, dùng trong ca trù", null, "Đàn đáy", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000007"), "Wind", null, "Sáo ngang bằng trúc", null, "Sáo trúc", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000008"), "Wind", null, "Sáo dọc bằng trúc", null, "Tiêu", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000009"), "Wind", null, "Kèn ống bầu truyền thống", null, "Kèn bầu", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000010"), "Percussion", null, "Trống hai mặt dùng trong nhạc cung đình", null, "Trống cơm", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000011"), "Percussion", null, "Trống đồng cổ, biểu tượng văn hóa Đông Sơn", null, "Trống đồng", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000012"), "Percussion", null, "Nhạc cụ gõ bằng tre, dùng trong ca trù", null, "Phách", new Guid("00000000-0000-0000-0001-000000000001"), null },
                    { new Guid("00000000-0000-0000-0002-000000000013"), "Percussion", null, "Đàn tre xylophone của Tây Nguyên", null, "T'rưng", new Guid("00000000-0000-0000-0001-000000000010"), null },
                    { new Guid("00000000-0000-0000-0002-000000000014"), "Percussion", null, "Bộ cồng chiêng Tây Nguyên - Di sản UNESCO", null, "Cồng chiêng", new Guid("00000000-0000-0000-0001-000000000010"), null },
                    { new Guid("00000000-0000-0000-0002-000000000015"), "Wind", null, "Sáo mũi của người Ê Đê", null, "Đing năm", new Guid("00000000-0000-0000-0001-000000000011"), null },
                    { new Guid("00000000-0000-0000-0002-000000000016"), "Wind", null, "Ống tre vỗ tay của Tây Nguyên", null, "Klong put", new Guid("00000000-0000-0000-0001-000000000012"), null },
                    { new Guid("00000000-0000-0000-0002-000000000017"), "Wind", null, "Kèn bầu nhiều ống của người H'Mông", null, "Khèn", new Guid("00000000-0000-0000-0001-000000000008"), null },
                    { new Guid("00000000-0000-0000-0002-000000000018"), "String", null, "Đàn hai dây của người Tày", null, "Đàn tính", new Guid("00000000-0000-0000-0001-000000000002"), null },
                    { new Guid("00000000-0000-0000-0002-000000000019"), "String", null, "Đàn tre môi của người Ra Glai", null, "Đàn Chapi", new Guid("00000000-0000-0000-0001-000000000019"), null },
                    { new Guid("00000000-0000-0000-0002-000000000020"), "String", null, "Đàn kéo cung một dây của Tây Nguyên", null, "Đàn K'ní", new Guid("00000000-0000-0000-0001-000000000010"), null }
                });

            migrationBuilder.InsertData(
                table: "VocalStyles",
                columns: new[] { "Id", "Description", "EthnicGroupId", "Name" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0004-000000000001"), "Hát then của người Tày, Nùng - Di sản UNESCO", new Guid("00000000-0000-0000-0001-000000000002"), "Hát then" },
                    { new Guid("00000000-0000-0000-0004-000000000002"), "Hát xoan Phú Thọ - Di sản UNESCO", new Guid("00000000-0000-0000-0001-000000000001"), "Hát xoan" },
                    { new Guid("00000000-0000-0000-0004-000000000003"), "Hát văn trong nghi lễ hầu đồng", new Guid("00000000-0000-0000-0001-000000000001"), "Hát chầu văn" },
                    { new Guid("00000000-0000-0000-0004-000000000004"), "Dân ca quan họ Bắc Ninh - Di sản UNESCO", new Guid("00000000-0000-0000-0001-000000000001"), "Hát quan họ" },
                    { new Guid("00000000-0000-0000-0004-000000000005"), "Nghệ thuật ca trù - Di sản UNESCO", new Guid("00000000-0000-0000-0001-000000000001"), "Ca trù" },
                    { new Guid("00000000-0000-0000-0004-000000000006"), "Ví, giặm Nghệ Tĩnh - Di sản UNESCO", new Guid("00000000-0000-0000-0001-000000000001"), "Hát ví" },
                    { new Guid("00000000-0000-0000-0004-000000000007"), "Hát ru con ngủ, phổ biến toàn quốc", new Guid("00000000-0000-0000-0001-000000000001"), "Hát ru" },
                    { new Guid("00000000-0000-0000-0004-000000000008"), "Đờn ca tài tử Nam Bộ - Di sản UNESCO", new Guid("00000000-0000-0000-0001-000000000001"), "Đờn ca tài tử" },
                    { new Guid("00000000-0000-0000-0004-000000000009"), "Hát bội (tuồng) miền Trung", new Guid("00000000-0000-0000-0001-000000000001"), "Hát bội" },
                    { new Guid("00000000-0000-0000-0004-000000000010"), "Cải lương Nam Bộ", new Guid("00000000-0000-0000-0001-000000000001"), "Cải lương" },
                    { new Guid("00000000-0000-0000-0004-000000000011"), "Hát A Đay của người Ê Đê", new Guid("00000000-0000-0000-0001-000000000011"), "Hát A Đay" },
                    { new Guid("00000000-0000-0000-0004-000000000012"), "Hát khắp của người Thái", new Guid("00000000-0000-0000-0001-000000000003"), "Hát khắp" }
                });

            migrationBuilder.InsertData(
                table: "InstrumentEthnicGroups",
                columns: new[] { "EthnicGroupId", "InstrumentId" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000001") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000002") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000003") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000004") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000005") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000006") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000007") },
                    { new Guid("00000000-0000-0000-0001-000000000002"), new Guid("00000000-0000-0000-0002-000000000007") },
                    { new Guid("00000000-0000-0000-0001-000000000003"), new Guid("00000000-0000-0000-0002-000000000007") },
                    { new Guid("00000000-0000-0000-0001-000000000004"), new Guid("00000000-0000-0000-0002-000000000007") },
                    { new Guid("00000000-0000-0000-0001-000000000008"), new Guid("00000000-0000-0000-0002-000000000007") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000008") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000009") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000010") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000011") },
                    { new Guid("00000000-0000-0000-0001-000000000001"), new Guid("00000000-0000-0000-0002-000000000012") },
                    { new Guid("00000000-0000-0000-0001-000000000010"), new Guid("00000000-0000-0000-0002-000000000013") },
                    { new Guid("00000000-0000-0000-0001-000000000012"), new Guid("00000000-0000-0000-0002-000000000013") },
                    { new Guid("00000000-0000-0000-0001-000000000010"), new Guid("00000000-0000-0000-0002-000000000014") },
                    { new Guid("00000000-0000-0000-0001-000000000011"), new Guid("00000000-0000-0000-0002-000000000014") },
                    { new Guid("00000000-0000-0000-0001-000000000012"), new Guid("00000000-0000-0000-0002-000000000014") },
                    { new Guid("00000000-0000-0000-0001-000000000013"), new Guid("00000000-0000-0000-0002-000000000014") },
                    { new Guid("00000000-0000-0000-0001-000000000020"), new Guid("00000000-0000-0000-0002-000000000014") },
                    { new Guid("00000000-0000-0000-0001-000000000011"), new Guid("00000000-0000-0000-0002-000000000015") },
                    { new Guid("00000000-0000-0000-0001-000000000012"), new Guid("00000000-0000-0000-0002-000000000016") },
                    { new Guid("00000000-0000-0000-0001-000000000008"), new Guid("00000000-0000-0000-0002-000000000017") },
                    { new Guid("00000000-0000-0000-0001-000000000002"), new Guid("00000000-0000-0000-0002-000000000018") },
                    { new Guid("00000000-0000-0000-0001-000000000007"), new Guid("00000000-0000-0000-0002-000000000018") },
                    { new Guid("00000000-0000-0000-0001-000000000019"), new Guid("00000000-0000-0000-0002-000000000019") },
                    { new Guid("00000000-0000-0000-0001-000000000010"), new Guid("00000000-0000-0000-0002-000000000020") },
                    { new Guid("00000000-0000-0000-0001-000000000012"), new Guid("00000000-0000-0000-0002-000000000020") }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Annotations_ExpertId",
                table: "Annotations",
                column: "ExpertId");

            migrationBuilder.CreateIndex(
                name: "IX_Annotations_RecordingId",
                table: "Annotations",
                column: "RecordingId");

            migrationBuilder.CreateIndex(
                name: "IX_AudioAnalysisResults_RecordingId",
                table: "AudioAnalysisResults",
                column: "RecordingId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                table: "AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Communes_DistrictId",
                table: "Communes",
                column: "DistrictId");

            migrationBuilder.CreateIndex(
                name: "IX_Districts_ProvinceId",
                table: "Districts",
                column: "ProvinceId");

            migrationBuilder.CreateIndex(
                name: "IX_EthnicGroupCeremonies_CeremonyId",
                table: "EthnicGroupCeremonies",
                column: "CeremonyId");

            migrationBuilder.CreateIndex(
                name: "IX_InstrumentEthnicGroups_EthnicGroupId",
                table: "InstrumentEthnicGroups",
                column: "EthnicGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Instruments_OriginEthnicGroupId",
                table: "Instruments",
                column: "OriginEthnicGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_KBCitations_EntryId",
                table: "KBCitations",
                column: "EntryId");

            migrationBuilder.CreateIndex(
                name: "IX_KBEntries_AuthorId",
                table: "KBEntries",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_KBEntries_Slug",
                table: "KBEntries",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KBRevisions_EditorId",
                table: "KBRevisions",
                column: "EditorId");

            migrationBuilder.CreateIndex(
                name: "IX_KBRevisions_EntryId",
                table: "KBRevisions",
                column: "EntryId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications",
                column: "CreatedAt",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_IsRead",
                table: "Notifications",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_QAConversations_UserId",
                table: "QAConversations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_QAMessages_ConversationId",
                table: "QAMessages",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_QAMessages_CorrectedByExpertId",
                table: "QAMessages",
                column: "CorrectedByExpertId");

            migrationBuilder.CreateIndex(
                name: "IX_RecordingImages_RecordingId",
                table: "RecordingImages",
                column: "RecordingId");

            migrationBuilder.CreateIndex(
                name: "IX_RecordingInstruments_InstrumentId",
                table: "RecordingInstruments",
                column: "InstrumentId");

            migrationBuilder.CreateIndex(
                name: "IX_Recordings_CeremonyId",
                table: "Recordings",
                column: "CeremonyId");

            migrationBuilder.CreateIndex(
                name: "IX_Recordings_CommuneId",
                table: "Recordings",
                column: "CommuneId");

            migrationBuilder.CreateIndex(
                name: "IX_Recordings_EthnicGroupId",
                table: "Recordings",
                column: "EthnicGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Recordings_MusicalScaleId",
                table: "Recordings",
                column: "MusicalScaleId");

            migrationBuilder.CreateIndex(
                name: "IX_Recordings_UploadedById",
                table: "Recordings",
                column: "UploadedById");

            migrationBuilder.CreateIndex(
                name: "IX_Recordings_VocalStyleId",
                table: "Recordings",
                column: "VocalStyleId");

            migrationBuilder.CreateIndex(
                name: "IX_RecordingTags_TagId",
                table: "RecordingTags",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ReviewerId",
                table: "Reviews",
                column: "ReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_SubmissionId",
                table: "Reviews",
                column: "SubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_ContributorId",
                table: "Submissions",
                column: "ContributorId");

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_RecordingId",
                table: "Submissions",
                column: "RecordingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_ReviewerId",
                table: "Submissions",
                column: "ReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionVersions_SubmissionId",
                table: "SubmissionVersions",
                column: "SubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserConnections_ConnectionId",
                table: "UserConnections",
                column: "ConnectionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserConnections_UserId",
                table: "UserConnections",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VectorEmbeddings_KBEntryId",
                table: "VectorEmbeddings",
                column: "KBEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_VectorEmbeddings_RecordingId",
                table: "VectorEmbeddings",
                column: "RecordingId");

            migrationBuilder.CreateIndex(
                name: "IX_VocalStyles_EthnicGroupId",
                table: "VocalStyles",
                column: "EthnicGroupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Annotations");

            migrationBuilder.DropTable(
                name: "AudioAnalysisResults");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "EthnicGroupCeremonies");

            migrationBuilder.DropTable(
                name: "InstrumentEthnicGroups");

            migrationBuilder.DropTable(
                name: "KBCitations");

            migrationBuilder.DropTable(
                name: "KBRevisions");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "QAMessages");

            migrationBuilder.DropTable(
                name: "RecordingImages");

            migrationBuilder.DropTable(
                name: "RecordingInstruments");

            migrationBuilder.DropTable(
                name: "RecordingTags");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "Reviews");

            migrationBuilder.DropTable(
                name: "SubmissionVersions");

            migrationBuilder.DropTable(
                name: "UserConnections");

            migrationBuilder.DropTable(
                name: "VectorEmbeddings");

            migrationBuilder.DropTable(
                name: "QAConversations");

            migrationBuilder.DropTable(
                name: "Instruments");

            migrationBuilder.DropTable(
                name: "Tags");

            migrationBuilder.DropTable(
                name: "Submissions");

            migrationBuilder.DropTable(
                name: "KBEntries");

            migrationBuilder.DropTable(
                name: "Recordings");

            migrationBuilder.DropTable(
                name: "Ceremonies");

            migrationBuilder.DropTable(
                name: "Communes");

            migrationBuilder.DropTable(
                name: "MusicalScales");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "VocalStyles");

            migrationBuilder.DropTable(
                name: "Districts");

            migrationBuilder.DropTable(
                name: "EthnicGroups");

            migrationBuilder.DropTable(
                name: "Provinces");
        }
    }
}
