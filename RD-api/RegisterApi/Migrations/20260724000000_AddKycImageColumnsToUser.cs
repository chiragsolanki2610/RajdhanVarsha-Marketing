using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <inheritdoc />
    public partial class AddKycImageColumnsToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AadharFrontImageUrl",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AadharBackImageUrl",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PanCardImageUrl",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankProofImageUrl",
                table: "Users",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AadharFrontImageUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AadharBackImageUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PanCardImageUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BankProofImageUrl",
                table: "Users");
        }
    }
}
