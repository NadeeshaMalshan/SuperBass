using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Superbass.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDeleteToUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Residents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Residents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Residents",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Residents");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Residents");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Residents");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Residents");
        }
    }
}
