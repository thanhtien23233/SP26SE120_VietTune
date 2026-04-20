using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VietTuneArchive.Domain.Context.Migrations
{
    /// <inheritdoc />
    public partial class UpdateCopyrightDisputeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssignedReviewerId",
                table: "CopyrightDisputes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Resolution",
                table: "CopyrightDisputes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResolutionNotes",
                table: "CopyrightDisputes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResolvedAt",
                table: "CopyrightDisputes",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "CopyrightDisputes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_CopyrightDisputes_AssignedReviewerId",
                table: "CopyrightDisputes",
                column: "AssignedReviewerId");

            migrationBuilder.AddForeignKey(
                name: "FK_CopyrightDisputes_Users_AssignedReviewerId",
                table: "CopyrightDisputes",
                column: "AssignedReviewerId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CopyrightDisputes_Users_AssignedReviewerId",
                table: "CopyrightDisputes");

            migrationBuilder.DropIndex(
                name: "IX_CopyrightDisputes_AssignedReviewerId",
                table: "CopyrightDisputes");

            migrationBuilder.DropColumn(
                name: "AssignedReviewerId",
                table: "CopyrightDisputes");

            migrationBuilder.DropColumn(
                name: "Resolution",
                table: "CopyrightDisputes");

            migrationBuilder.DropColumn(
                name: "ResolutionNotes",
                table: "CopyrightDisputes");

            migrationBuilder.DropColumn(
                name: "ResolvedAt",
                table: "CopyrightDisputes");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "CopyrightDisputes");
        }
    }
}
