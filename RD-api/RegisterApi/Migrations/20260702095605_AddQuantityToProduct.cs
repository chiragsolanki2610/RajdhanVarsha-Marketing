using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <inheritdoc />
    public partial class AddQuantityToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FirstCommissionLeftCount",
                table: "BinaryNodes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FirstCommissionRightCount",
                table: "BinaryNodes",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FirstCommissionLeftCount",
                table: "BinaryNodes");

            migrationBuilder.DropColumn(
                name: "FirstCommissionRightCount",
                table: "BinaryNodes");
        }
    }
}
