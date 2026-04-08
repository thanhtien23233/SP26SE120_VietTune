using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.Context
{
    public class DBContext : DbContext
    {
        public DBContext() { }
        public DBContext(DbContextOptions<DBContext> options) : base(options) { }

        // DbSets - Core Entities
        public DbSet<User> Users { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<UserConnection> UserConnections { get; set; }

        // DbSets - Geographic Entities
        public DbSet<Province> Provinces { get; set; }
        public DbSet<District> Districts { get; set; }
        public DbSet<Commune> Communes { get; set; }

        // DbSets - Reference Data (Music/Cultural)
        public DbSet<EthnicGroup> EthnicGroups { get; set; }
        public DbSet<Instrument> Instruments { get; set; }
        public DbSet<Ceremony> Ceremonies { get; set; }
        public DbSet<VocalStyle> VocalStyles { get; set; }
        public DbSet<MusicalScale> MusicalScales { get; set; }
        public DbSet<Tag> Tags { get; set; }

        // DbSets - Recording & Related Data
        public DbSet<Recording> Recordings { get; set; }
        public DbSet<RecordingImage> RecordingImages { get; set; }
        public DbSet<RecordingInstrument> RecordingInstruments { get; set; }
        public DbSet<RecordingTag> RecordingTags { get; set; }
        public DbSet<Annotation> Annotations { get; set; }
        public DbSet<VectorEmbedding> VectorEmbeddings { get; set; }
        public DbSet<AudioAnalysisResult> AudioAnalysisResults { get; set; }

        // DbSets - Submission & Review Workflow
        public DbSet<Submission> Submissions { get; set; }
        public DbSet<SubmissionVersion> SubmissionVersions { get; set; }
        public DbSet<Review> Reviews { get; set; }

        // DbSets - Knowledge Base
        public DbSet<KBEntry> KBEntries { get; set; }
        public DbSet<KBRevision> KBRevisions { get; set; }
        public DbSet<KBCitation> KBCitations { get; set; }

        // DbSets - Q&A System
        public DbSet<QAConversation> QAConversations { get; set; }
        public DbSet<QAMessage> QAMessages { get; set; }

        // DbSets - Join Tables
        public DbSet<EthnicGroupCeremony> EthnicGroupCeremonies { get; set; }
        public DbSet<InstrumentEthnicGroup> InstrumentEthnicGroups { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ============= USER & AUTH =============
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
                entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Phone).HasMaxLength(20);
                entity.Property(e => e.AvatarUrl).HasMaxLength(500);
                entity.Property(e => e.Role).IsRequired();
                entity.Property(e => e.ContributionScore).IsRequired();
                entity.Property(e => e.IsActive).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasIndex(e => e.Email).IsUnique();
                
                // One-to-many: User -> RefreshTokens
                entity.HasMany(e => e.RefreshTokens)
                    .WithOne(rt => rt.User)
                    .HasForeignKey(rt => rt.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                // One-to-many: User -> Recordings (UploadedBy)
                entity.HasMany(e => e.Recordings)
                    .WithOne(r => r.UploadedBy)
                    .HasForeignKey(r => r.UploadedById)
                    .OnDelete(DeleteBehavior.Restrict);

                // One-to-many: User -> Submissions (Contributor)
                entity.HasMany(e => e.Submissions)
                    .WithOne(s => s.Contributor)
                    .HasForeignKey(s => s.ContributorId)
                    .OnDelete(DeleteBehavior.Restrict);

                // One-to-many: User -> Reviews (Reviewer)
                entity.HasMany(e => e.Reviews)
                    .WithOne(rv => rv.Reviewer)
                    .HasForeignKey(rv => rv.ReviewerId)
                    .OnDelete(DeleteBehavior.Restrict);

                // One-to-many: User -> Annotations (Expert)
                entity.HasMany(e => e.Annotations)
                    .WithOne(a => a.Expert)
                    .HasForeignKey(a => a.ExpertId)
                    .OnDelete(DeleteBehavior.Restrict);

                // One-to-many: User -> QAConversations
                entity.HasMany(e => e.QAConversations)
                    .WithOne(q => q.User)
                    .HasForeignKey(q => q.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                // One-to-many: User -> QAMessages (CorrectedByExpert)
                entity.HasMany(e => e.CorrectedQAMessages)
                    .WithOne(qm => qm.CorrectedByExpert)
                    .HasForeignKey(qm => qm.CorrectedByExpertId)
                    .OnDelete(DeleteBehavior.NoAction);

                // One-to-many: User -> KBEntries (Author)
                entity.HasMany(e => e.KBEntries)
                    .WithOne(kb => kb.Author)
                    .HasForeignKey(kb => kb.AuthorId)
                    .OnDelete(DeleteBehavior.Restrict);

                // One-to-many: User -> KBRevisions (Editor)
                entity.HasMany(e => e.KBRevisions)
                    .WithOne(kbr => kbr.Editor)
                    .HasForeignKey(kbr => kbr.EditorId)
                    .OnDelete(DeleteBehavior.Restrict);

                // One-to-many: User -> AuditLogs
                entity.HasMany(e => e.AuditLogs)
                    .WithOne(al => al.User)
                    .HasForeignKey(al => al.UserId)
                    .OnDelete(DeleteBehavior.SetNull);

                // One-to-many: User -> Notifications
                entity.HasMany(e => e.Notifications)
                    .WithOne(n => n.User)
                    .HasForeignKey(n => n.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                // One-to-many: User -> UserConnections
                entity.HasMany(e => e.UserConnections)
                    .WithOne(uc => uc.User)
                    .HasForeignKey(uc => uc.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============= NOTIFICATIONS & CONNECTIONS =============
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UserId).IsRequired();
                entity.Property(e => e.Title).IsRequired().HasMaxLength(300);
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
                entity.Property(e => e.RelatedEntityType).HasMaxLength(100);
                entity.Property(e => e.IsRead).IsRequired().HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).IsRequired();

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => new { e.UserId, e.IsRead });
                entity.HasIndex(e => e.CreatedAt).IsDescending();
            });

            modelBuilder.Entity<UserConnection>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UserId).IsRequired();
                entity.Property(e => e.ConnectionId).IsRequired().HasMaxLength(200);
                entity.Property(e => e.UserAgent).HasMaxLength(500);
                entity.Property(e => e.ConnectedAt).IsRequired();

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.ConnectionId).IsUnique();
            });

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UserId).IsRequired();
                entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
                entity.Property(e => e.ExpiresAt).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
            });

            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);
                entity.Property(e => e.EntityId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Action).IsRequired().HasMaxLength(20);
                entity.Property(e => e.CreatedAt).IsRequired();
            });

            // ============= GEOGRAPHIC =============
            modelBuilder.Entity<Province>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.RegionCode).IsRequired().HasMaxLength(20);

                entity.HasMany(e => e.Districts)
                    .WithOne(d => d.Province)
                    .HasForeignKey(d => d.ProvinceId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<District>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ProvinceId).IsRequired();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);

                entity.HasMany(e => e.Communes)
                    .WithOne(c => c.District)
                    .HasForeignKey(c => c.DistrictId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Commune>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.DistrictId).IsRequired();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);

                entity.HasMany(e => e.Recordings)
                    .WithOne(r => r.Commune)
                    .HasForeignKey(r => r.CommuneId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // ============= REFERENCE DATA: ETHNIC GROUP =============
            modelBuilder.Entity<EthnicGroup>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.LanguageFamily).HasMaxLength(100);
                entity.Property(e => e.PrimaryRegion).HasMaxLength(200);
                entity.Property(e => e.ImageUrl).HasMaxLength(500);

                entity.HasMany(e => e.OriginInstruments)
                    .WithOne(i => i.OriginEthnicGroup)
                    .HasForeignKey(i => i.OriginEthnicGroupId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasMany(e => e.VocalStyles)
                    .WithOne(vs => vs.EthnicGroup)
                    .HasForeignKey(vs => vs.EthnicGroupId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasMany(e => e.Recordings)
                    .WithOne(r => r.EthnicGroup)
                    .HasForeignKey(r => r.EthnicGroupId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(e => e.EthnicGroupCeremonies)
                    .WithOne(egc => egc.EthnicGroup)
                    .HasForeignKey(egc => egc.EthnicGroupId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.InstrumentEthnicGroups)
                    .WithOne(ieg => ieg.EthnicGroup)
                    .HasForeignKey(ieg => ieg.EthnicGroupId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============= REFERENCE DATA: INSTRUMENT =============
            modelBuilder.Entity<Instrument>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
                entity.Property(e => e.TuningSystem).HasMaxLength(200);
                entity.Property(e => e.ImageUrl).HasMaxLength(500);

                entity.HasMany(e => e.RecordingInstruments)
                    .WithOne(ri => ri.Instrument)
                    .HasForeignKey(ri => ri.InstrumentId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.InstrumentEthnicGroups)
                    .WithOne(ieg => ieg.Instrument)
                    .HasForeignKey(ieg => ieg.InstrumentId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============= REFERENCE DATA: CEREMONY =============
            modelBuilder.Entity<Ceremony>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Season).HasMaxLength(50);

                entity.HasMany(e => e.Recordings)
                    .WithOne(r => r.Ceremony)
                    .HasForeignKey(r => r.CeremonyId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasMany(e => e.EthnicGroupCeremonies)
                    .WithOne(egc => egc.Ceremony)
                    .HasForeignKey(egc => egc.CeremonyId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============= REFERENCE DATA: VOCAL STYLE & MUSICAL SCALE =============
            modelBuilder.Entity<VocalStyle>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);

                entity.HasMany(e => e.Recordings)
                    .WithOne(r => r.VocalStyle)
                    .HasForeignKey(r => r.VocalStyleId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<MusicalScale>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.NotePattern).HasMaxLength(200);

                entity.HasMany(e => e.Recordings)
                    .WithOne(r => r.MusicalScale)
                    .HasForeignKey(r => r.MusicalScaleId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // ============= REFERENCE DATA: TAG =============
            modelBuilder.Entity<Tag>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Category).HasMaxLength(50);

                entity.HasMany(e => e.RecordingTags)
                    .WithOne(rt => rt.Tag)
                    .HasForeignKey(rt => rt.TagId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============= RECORDING & RELATED =============
            modelBuilder.Entity<Recording>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).HasMaxLength(500);
                entity.Property(e => e.AudioFileUrl).HasMaxLength(500);
                entity.Property(e => e.VideoFileUrl).HasMaxLength(500);
                entity.Property(e => e.AudioFormat).HasMaxLength(10);
                entity.Property(e => e.DurationSeconds);
                entity.Property(e => e.FileSizeBytes);
                entity.Property(e => e.UploadedById).IsRequired();
                entity.Property(e => e.CommuneId);
                entity.Property(e => e.EthnicGroupId);
                entity.Property(e => e.CeremonyId);
                entity.Property(e => e.VocalStyleId);
                entity.Property(e => e.MusicalScaleId);
                entity.Property(e => e.PerformanceContext).HasMaxLength(200);
                entity.Property(e => e.PerformerName).HasMaxLength(200);
                entity.Property(e => e.RecordingDate);
                entity.Property(e => e.Tempo);
                entity.Property(e => e.KeySignature).HasMaxLength(20);
                entity.Property(e => e.Status).IsRequired();
                entity.Property(e => e.CreatedAt);
                entity.Property(e => e.UpdatedAt);
                entity.Property(e => e.SubmissionId);

                entity.HasMany(e => e.RecordingImages)
                    .WithOne(ri => ri.Recording)
                    .HasForeignKey(ri => ri.RecordingId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.RecordingInstruments)
                    .WithOne(ri => ri.Recording)
                    .HasForeignKey(ri => ri.RecordingId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.RecordingTags)
                    .WithOne(rt => rt.Recording)
                    .HasForeignKey(rt => rt.RecordingId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.Annotations)
                    .WithOne(a => a.Recording)
                    .HasForeignKey(a => a.RecordingId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.VectorEmbeddings)
                    .WithOne(ve => ve.Recording)
                    .HasForeignKey(ve => ve.RecordingId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.AudioAnalysisResults)
                    .WithOne(aar => aar.Recording)
                    .HasForeignKey(aar => aar.RecordingId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<RecordingImage>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RecordingId).IsRequired();
                entity.Property(e => e.ImageUrl).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Caption).HasMaxLength(500);
                entity.Property(e => e.SortOrder).IsRequired();
            });

            modelBuilder.Entity<RecordingInstrument>(entity =>
            {
                entity.HasKey(e => new { e.RecordingId, e.InstrumentId });
                entity.Property(e => e.PlayingTechnique).HasMaxLength(500);
            });

            modelBuilder.Entity<RecordingTag>(entity =>
            {
                entity.HasKey(e => new { e.RecordingId, e.TagId });
            });

            modelBuilder.Entity<Annotation>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RecordingId).IsRequired();
                entity.Property(e => e.ExpertId).IsRequired();
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ResearchCitation).HasMaxLength(500);
                entity.Property(e => e.CreatedAt).IsRequired();
            });

            modelBuilder.Entity<VectorEmbedding>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EmbeddingJson).IsRequired();
                entity.Property(e => e.ModelVersion).IsRequired().HasMaxLength(100);
                entity.Property(e => e.CreatedAt).IsRequired();
            });

            modelBuilder.Entity<AudioAnalysisResult>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RecordingId).IsRequired();
                entity.Property(e => e.DetectedKey).HasMaxLength(20);
                entity.Property(e => e.SuggestedEthnicGroup).HasMaxLength(100);
                entity.Property(e => e.AnalyzedAt).IsRequired();
            });

            // ============= SUBMISSION & REVIEW WORKFLOW =============
            modelBuilder.Entity<Submission>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RecordingId).IsRequired();
                entity.Property(e => e.ContributorId).IsRequired();
                entity.Property(e => e.CurrentStage).IsRequired();
                entity.Property(e => e.Status).IsRequired();
                entity.Property(e => e.SubmittedAt).IsRequired();
                entity.Property(e => e.UpdatedAt);

                entity.HasMany(e => e.SubmissionVersions)
                    .WithOne(sv => sv.Submission)
                    .HasForeignKey(sv => sv.SubmissionId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.Reviews)
                    .WithOne(r => r.Submission)
                    .HasForeignKey(r => r.SubmissionId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Reviewer)
                    .WithMany(u => u.AssignedSubmissions)
                    .HasForeignKey(e => e.ReviewerId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<SubmissionVersion>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SubmissionId).IsRequired();
                entity.Property(e => e.VersionNumber).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
            });

            modelBuilder.Entity<Review>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SubmissionId).IsRequired();
                entity.Property(e => e.ReviewerId).IsRequired();
                entity.Property(e => e.Stage).IsRequired();
                entity.Property(e => e.Decision).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
            });

            // ============= KNOWLEDGE BASE =============
            modelBuilder.Entity<KBEntry>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Slug).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
                entity.Property(e => e.AuthorId).IsRequired();
                entity.Property(e => e.Status).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt);
                entity.HasIndex(e => e.Slug).IsUnique();

                entity.HasMany(e => e.KBRevisions)
                    .WithOne(kbr => kbr.Entry)
                    .HasForeignKey(kbr => kbr.EntryId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.KBCitations)
                    .WithOne(kbc => kbc.Entry)
                    .HasForeignKey(kbc => kbc.EntryId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<KBRevision>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntryId).IsRequired();
                entity.Property(e => e.EditorId).IsRequired();
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.RevisionNote).HasMaxLength(500);
                entity.Property(e => e.CreatedAt).IsRequired();
            });

            modelBuilder.Entity<KBCitation>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntryId).IsRequired();
                entity.Property(e => e.Citation).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Url).HasMaxLength(500);
            });

            // ============= Q&A SYSTEM =============
            modelBuilder.Entity<QAConversation>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UserId).IsRequired();
                entity.Property(e => e.Title).HasMaxLength(200);
                entity.Property(e => e.CreatedAt).IsRequired();

                entity.HasMany(e => e.QAMessages)
                    .WithOne(qm => qm.Conversation)
                    .HasForeignKey(qm => qm.ConversationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<QAMessage>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ConversationId).IsRequired();
                entity.Property(e => e.Role).IsRequired();
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.FlaggedByExpert).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();

                entity.HasOne(e => e.CorrectedByExpert)
                    .WithMany(u => u.CorrectedQAMessages)
                    .HasForeignKey(e => e.CorrectedByExpertId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // ============= JOIN TABLES =============
            modelBuilder.Entity<EthnicGroupCeremony>(entity =>
            {
                entity.HasKey(e => new { e.EthnicGroupId, e.CeremonyId });
            });

            modelBuilder.Entity<InstrumentEthnicGroup>(entity =>
            {
                entity.HasKey(e => new { e.InstrumentId, e.EthnicGroupId });
            });
            SeedData.Seed(modelBuilder);
        }
    }
}
//Add-Migration InitMigration -Context DBContext -Project VietTuneArchive.Domain -StartupProject VietTuneArchive.API -OutputDir Context/Migrations
