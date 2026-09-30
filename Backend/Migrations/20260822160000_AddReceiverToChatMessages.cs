using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Superbass.Migrations
{
    /// <inheritdoc />
    public partial class AddReceiverToChatMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReceiverEmail",
                table: "ChatMessages",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiverRole",
                table: "ChatMessages",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReceiverEmail",
                table: "ChatMessages");

            migrationBuilder.DropColumn(
                name: "ReceiverRole",
                table: "ChatMessages");
        }
    }
}
