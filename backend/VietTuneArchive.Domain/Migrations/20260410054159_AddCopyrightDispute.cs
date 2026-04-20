using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VietTuneArchive.Domain.Context.Migrations
{
    /// <inheritdoc />
    public partial class AddCopyrightDispute : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CopyrightDisputes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmissionId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReportedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReasonCode = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    EvidenceUrls = table.Column<List<string>>(type: "text[]", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CopyrightDisputes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CopyrightDisputes_Recordings_RecordingId",
                        column: x => x.RecordingId,
                        principalTable: "Recordings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CopyrightDisputes_Submissions_SubmissionId",
                        column: x => x.SubmissionId,
                        principalTable: "Submissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CopyrightDisputes_Users_ReportedByUserId",
                        column: x => x.ReportedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CopyrightDisputes_RecordingId",
                table: "CopyrightDisputes",
                column: "RecordingId");

            migrationBuilder.CreateIndex(
                name: "IX_CopyrightDisputes_ReportedByUserId",
                table: "CopyrightDisputes",
                column: "ReportedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CopyrightDisputes_SubmissionId",
                table: "CopyrightDisputes",
                column: "SubmissionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CopyrightDisputes");
        }
    }
}
