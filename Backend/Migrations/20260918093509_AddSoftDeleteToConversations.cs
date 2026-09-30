using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Superbass.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDeleteToConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDeletedByResident",
                table: "Conversations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeletedByWorker",
                table: "Conversations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.DropColumn(
                name: "IsDeletedByResident",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "IsDeletedByWorker",
                table: "Conversations");
        }
    }
}
