using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Superbass.Migrations
{
    /// <inheritdoc />
    public partial class DecoupleWorkerAndResident : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Workers_Residents_ResidentEmail",
                table: "Workers");

            migrationBuilder.DropIndex(
                name: "IX_Workers_ResidentEmail",
                table: "Workers");

            migrationBuilder.AlterColumn<string>(
                name: "ResidentEmail",
                table: "Workers",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ResidentEmail",
                table: "Workers",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Workers_ResidentEmail",
                table: "Workers",
                column: "ResidentEmail",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Workers_Residents_ResidentEmail",
                table: "Workers",
                column: "ResidentEmail",
                principalTable: "Residents",
                principalColumn: "Email",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
