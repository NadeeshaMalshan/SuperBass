using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Superbass.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceAndSkillsToWorkerSkill : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ServiceName",
                table: "WorkerSkills",
                type: "text",
                nullable: false,
                defaultValue: "General");

            migrationBuilder.AddColumn<List<string>>(
                name: "Skills",
                table: "WorkerSkills",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>());

            migrationBuilder.AlterColumn<string>(
                name: "SkillName",
                table: "WorkerSkills",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            // Backfill existing ServiceName from SkillName if SkillName was set
            migrationBuilder.Sql("UPDATE \"WorkerSkills\" SET \"ServiceName\" = \"SkillName\" WHERE \"ServiceName\" = 'General' AND \"SkillName\" IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ServiceName",
                table: "WorkerSkills");

            migrationBuilder.DropColumn(
                name: "Skills",
                table: "WorkerSkills");

            migrationBuilder.AlterColumn<string>(
                name: "SkillName",
                table: "WorkerSkills",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
