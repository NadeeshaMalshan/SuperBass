using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Superbass.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkerManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Workers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    PhoneNo = table.Column<string>(type: "text", nullable: true),
                    ProfileImage = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    PrimaryServiceArea = table.Column<string>(type: "text", nullable: true),
                    LocationLat = table.Column<double>(type: "double precision", nullable: true),
                    LocationLng = table.Column<double>(type: "double precision", nullable: true),
                    CoverageRadiusKm = table.Column<double>(type: "double precision", nullable: false),
                    PricingModel = table.Column<string>(type: "text", nullable: false),
                    HourlyRate = table.Column<decimal>(type: "numeric", nullable: true),
                    DailyRate = table.Column<decimal>(type: "numeric", nullable: true),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    AvailabilityScheduleJson = table.Column<string>(type: "text", nullable: true),
                    OverallRating = table.Column<double>(type: "double precision", nullable: false),
                    QualityRating = table.Column<int>(type: "integer", nullable: false),
                    PunctualityRating = table.Column<int>(type: "integer", nullable: false),
                    CommunicationRating = table.Column<int>(type: "integer", nullable: false),
                    CompletedJobs = table.Column<int>(type: "integer", nullable: false),
                    CancelledJobs = table.Column<int>(type: "integer", nullable: false),
                    AcceptedJobs = table.Column<int>(type: "integer", nullable: false),
                    RejectedJobs = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkerSkills",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorkerId = table.Column<int>(type: "integer", nullable: false),
                    SkillName = table.Column<string>(type: "text", nullable: false),
                    ExperienceYears = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkerSkills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkerSkills_Workers_WorkerId",
                        column: x => x.WorkerId,
                        principalTable: "Workers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkerSkills_WorkerId",
                table: "WorkerSkills",
                column: "WorkerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkerSkills");

            migrationBuilder.DropTable(
                name: "Workers");
        }
    }
}
