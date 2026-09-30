using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <inheritdoc />
    public partial class AddStateCityToPickupCenter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" ADD COLUMN IF NOT EXISTS \"City\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" ADD COLUMN IF NOT EXISTS \"State\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenterRequests\" ADD COLUMN IF NOT EXISTS \"City\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenterRequests\" ADD COLUMN IF NOT EXISTS \"State\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE \"PaymentOrders\" ADD COLUMN IF NOT EXISTS \"SelectedPucId\" text;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                table: "PickupCenters");

            migrationBuilder.DropColumn(
                name: "State",
                table: "PickupCenters");

            migrationBuilder.DropColumn(
                name: "City",
                table: "PickupCenterRequests");

            migrationBuilder.DropColumn(
                name: "State",
                table: "PickupCenterRequests");

            migrationBuilder.DropColumn(
                name: "SelectedPucId",
                table: "PaymentOrders");
        }
    }
}
