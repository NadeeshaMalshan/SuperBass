using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Superbass.Migrations
{
    /// <inheritdoc />
    public partial class LinkResidentAndWorker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ResidentEmail",
                table: "Workers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(@"
                UPDATE ""Workers"" 
                SET ""ResidentEmail"" = ""Email"" 
                WHERE ""ResidentEmail"" = '' OR ""ResidentEmail"" IS NULL;
            ");

            migrationBuilder.Sql(@"
                INSERT INTO ""Residents"" (""Email"", ""Name"")
                SELECT DISTINCT w.""Email"", w.""Name""
                FROM ""Workers"" w
                WHERE NOT EXISTS (SELECT 1 FROM ""Residents"" r WHERE r.""Email"" = w.""Email"");
            ");

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Workers_Residents_ResidentEmail",
                table: "Workers");

            migrationBuilder.DropIndex(
                name: "IX_Workers_ResidentEmail",
                table: "Workers");

            migrationBuilder.DropColumn(
                name: "ResidentEmail",
                table: "Workers");
        }
    }
}
