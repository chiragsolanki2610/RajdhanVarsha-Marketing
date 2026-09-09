using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPickupCenterPaymentDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" ADD COLUMN IF NOT EXISTS \"AccountHolderName\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" ADD COLUMN IF NOT EXISTS \"BankName\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" ADD COLUMN IF NOT EXISTS \"AccountType\" text NOT NULL DEFAULT 'Savings';");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" ADD COLUMN IF NOT EXISTS \"UpiId\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" ADD COLUMN IF NOT EXISTS \"UpiQrImageBase64\" text;");
            migrationBuilder.Sql("ALTER TABLE \"PaymentOrders\" ADD COLUMN IF NOT EXISTS \"PickupCenterDecision\" text;");
            migrationBuilder.Sql("ALTER TABLE \"PaymentOrders\" ADD COLUMN IF NOT EXISTS \"CommissionDistributed\" boolean NOT NULL DEFAULT false;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" DROP COLUMN IF EXISTS \"UpiQrImageBase64\";");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" DROP COLUMN IF EXISTS \"UpiId\";");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" DROP COLUMN IF EXISTS \"AccountType\";");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" DROP COLUMN IF EXISTS \"BankName\";");
            migrationBuilder.Sql("ALTER TABLE \"PickupCenters\" DROP COLUMN IF EXISTS \"AccountHolderName\";");
            migrationBuilder.Sql("ALTER TABLE \"PaymentOrders\" DROP COLUMN IF EXISTS \"PickupCenterDecision\";");
            migrationBuilder.Sql("ALTER TABLE \"PaymentOrders\" DROP COLUMN IF EXISTS \"CommissionDistributed\";");
        }
    }
}
