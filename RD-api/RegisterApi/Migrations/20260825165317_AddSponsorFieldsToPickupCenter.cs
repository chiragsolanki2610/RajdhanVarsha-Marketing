using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSponsorFieldsToPickupCenter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "BinaryWallets",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AlterColumn<string>(
                name: "GateMajoritySide",
                table: "BinaryNodes",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10,
                oldNullable: true);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "BinaryNodes",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.CreateTable(
                name: "PickupCenterRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Username = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Phone = table.Column<string>(type: "text", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    SponsorId = table.Column<string>(type: "text", nullable: true),
                    SponsorName = table.Column<string>(type: "text", nullable: true),
                    AadharNumber = table.Column<string>(type: "text", nullable: false),
                    AadharImageBase64 = table.Column<string>(type: "text", nullable: true),
                    PanNumber = table.Column<string>(type: "text", nullable: false),
                    PanImageBase64 = table.Column<string>(type: "text", nullable: true),
                    AccountNumber = table.Column<string>(type: "text", nullable: false),
                    IfscCode = table.Column<string>(type: "text", nullable: false),
                    PassbookImageBase64 = table.Column<string>(type: "text", nullable: true),
                    CenterName = table.Column<string>(type: "text", nullable: false),
                    CenterAddress = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "Pending"),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedBy = table.Column<string>(type: "text", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    GeneratedPucId = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PickupCenterRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PickupCenters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PucId = table.Column<string>(type: "text", nullable: false),
                    Username = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Phone = table.Column<string>(type: "text", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    SponsorId = table.Column<string>(type: "text", nullable: true),
                    SponsorName = table.Column<string>(type: "text", nullable: true),
                    AadharNumber = table.Column<string>(type: "text", nullable: false),
                    AadharImageBase64 = table.Column<string>(type: "text", nullable: true),
                    PanNumber = table.Column<string>(type: "text", nullable: false),
                    PanImageBase64 = table.Column<string>(type: "text", nullable: true),
                    AccountNumber = table.Column<string>(type: "text", nullable: false),
                    IfscCode = table.Column<string>(type: "text", nullable: false),
                    PassbookImageBase64 = table.Column<string>(type: "text", nullable: true),
                    CenterName = table.Column<string>(type: "text", nullable: false),
                    CenterAddress = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "Active"),
                    SourceRequestId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ApprovedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PickupCenters", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PickupCenterRequests_Status",
                table: "PickupCenterRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PickupCenterRequests_Username",
                table: "PickupCenterRequests",
                column: "Username");

            migrationBuilder.CreateIndex(
                name: "IX_PickupCenters_PucId",
                table: "PickupCenters",
                column: "PucId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PickupCenters_Username",
                table: "PickupCenters",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PickupCenterRequests");

            migrationBuilder.DropTable(
                name: "PickupCenters");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "BinaryWallets");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "BinaryNodes");

            migrationBuilder.AlterColumn<string>(
                name: "GateMajoritySide",
                table: "BinaryNodes",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
