using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using RegisterApi.Data;

#nullable disable

namespace RegisterApi.Migrations
{
    [Migration("20260903230000_AddCommissionDistributedToPaymentOrder")]
    [DbContext(typeof(AppDbContext))]
    public partial class AddCommissionDistributedToPaymentOrder : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"PaymentOrders\" ADD COLUMN IF NOT EXISTS \"CommissionDistributed\" boolean NOT NULL DEFAULT false;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"PaymentOrders\" DROP COLUMN IF EXISTS \"CommissionDistributed\";");
        }
    }
}
