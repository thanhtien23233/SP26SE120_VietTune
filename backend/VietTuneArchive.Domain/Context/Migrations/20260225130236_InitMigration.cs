using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VietTuneArchive.Domain.Context.Migrations
{
    /// <inheritdoc />
    public partial class InitMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Ceremonies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Season = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ceremonies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EthnicGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LanguageFamily = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PrimaryRegion = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EthnicGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MusicalScales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NotePattern = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MusicalScales", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Provinces",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RegionCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Provinces", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    AvatarUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Role = table.Column<int>(type: "int", nullable: false),
                    AcademicCredentials = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ContributionScore = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EthnicGroupCeremonies",
                columns: table => new
                {
                    EthnicGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CeremonyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TuningSystem = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ConstructionMethod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    OriginEthnicGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EthnicGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProvinceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    OldValuesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValuesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AuthorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
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
                name: "QAConversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                name: "InstrumentEthnicGroups",
                columns: table => new
                {
                    InstrumentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EthnicGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DistrictId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Latitude = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Longitude = table.Column<decimal>(type: "decimal(18,2)", nullable: true)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Citation = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EditorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RevisionNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceRecordingIdsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SourceKBEntryIdsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConfidenceScore = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    FlaggedByExpert = table.Column<bool>(type: "bit", nullable: false),
                    CorrectedByExpertId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ExpertCorrection = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AudioFileUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    VideoFileUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AudioFormat = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    DurationSeconds = table.Column<int>(type: "int", nullable: true),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    UploadedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommuneId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EthnicGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CeremonyId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VocalStyleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MusicalScaleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PerformanceContext = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    LyricsOriginal = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LyricsVietnamese = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PerformerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PerformerAge = table.Column<int>(type: "int", nullable: true),
                    RecordingDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    GpsLatitude = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    GpsLongitude = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Tempo = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    KeySignature = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExpertId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ResearchCitation = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    TimestampStart = table.Column<int>(type: "int", nullable: true),
                    TimestampEnd = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DetectedInstrumentsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DetectedTempo = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    DetectedKey = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    SpectralFeaturesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SuggestedEthnicGroup = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SuggestedMetadataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AnalyzedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Caption = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
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
                    RecordingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InstrumentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlayingTechnique = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
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
                    RecordingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TagId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContributorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CurrentStage = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
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
                });

            migrationBuilder.CreateTable(
                name: "VectorEmbeddings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmbeddingJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VectorEmbeddings", x => x.Id);
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReviewerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Stage = table.Column<int>(type: "int", nullable: false),
                    Decision = table.Column<int>(type: "int", nullable: false),
                    Comments = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VersionNumber = table.Column<int>(type: "int", nullable: false),
                    ChangesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                column: "RecordingId");

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionVersions_SubmissionId",
                table: "SubmissionVersions",
                column: "SubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

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
                name: "VectorEmbeddings");

            migrationBuilder.DropTable(
                name: "KBEntries");

            migrationBuilder.DropTable(
                name: "QAConversations");

            migrationBuilder.DropTable(
                name: "Instruments");

            migrationBuilder.DropTable(
                name: "Tags");

            migrationBuilder.DropTable(
                name: "Submissions");

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
