using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Superbass.Migrations
{
    /// <inheritdoc />
    public partial class AddCommunicationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Conversations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentEmail = table.Column<string>(type: "text", nullable: false),
                    WorkerId = table.Column<int>(type: "integer", nullable: false),
                    BookingId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastMessage = table.Column<string>(type: "text", nullable: true),
                    LastMessageAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastSenderEmail = table.Column<string>(type: "text", nullable: true),
                    LastSenderRole = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Conversations_Residents_ResidentEmail",
                        column: x => x.ResidentEmail,
                        principalTable: "Residents",
                        principalColumn: "Email",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Conversations_Workers_WorkerId",
                        column: x => x.WorkerId,
                        principalTable: "Workers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChatMessages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ConversationId = table.Column<int>(type: "integer", nullable: false),
                    SenderEmail = table.Column<string>(type: "text", nullable: false),
                    SenderRole = table.Column<string>(type: "text", nullable: false),
                    MessageType = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    AttachmentUrl = table.Column<string>(type: "text", nullable: true),
                    AttachmentName = table.Column<string>(type: "text", nullable: true),
                    AttachmentSize = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatMessages_Conversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "Conversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_ConversationId_CreatedAt",
                table: "ChatMessages",
                columns: new[] { "ConversationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_ResidentEmail",
                table: "Conversations",
                column: "ResidentEmail");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_WorkerId",
                table: "Conversations",
                column: "WorkerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChatMessages");

            migrationBuilder.DropTable(
                name: "Conversations");
        }
    }
}
