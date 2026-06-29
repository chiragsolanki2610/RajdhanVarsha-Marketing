using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <inheritdoc />
    public partial class AddActivePairMatching : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LeftActiveCount",
                table: "BinaryNodes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RightActiveCount",
                table: "BinaryNodes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MatchedPairs",
                table: "BinaryNodes",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LeftActiveCount",
                table: "BinaryNodes");

            migrationBuilder.DropColumn(
                name: "RightActiveCount",
                table: "BinaryNodes");

            migrationBuilder.DropColumn(
                name: "MatchedPairs",
                table: "BinaryNodes");
        }
    }
}
