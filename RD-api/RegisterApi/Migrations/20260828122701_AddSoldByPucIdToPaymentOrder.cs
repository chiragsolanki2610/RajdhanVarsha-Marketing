using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSoldByPucIdToPaymentOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SoldByPucId",
                table: "PaymentOrders",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PickupCenterInventoryItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PickupCenterId = table.Column<int>(type: "integer", nullable: false),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PickupCenterInventoryItems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PickupCenterOrders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PickupCenterId = table.Column<int>(type: "integer", nullable: false),
                    PucId = table.Column<string>(type: "text", nullable: false),
                    CenterName = table.Column<string>(type: "text", nullable: false),
                    ContactName = table.Column<string>(type: "text", nullable: false),
                    ContactPhone = table.Column<string>(type: "text", nullable: false),
                    UtrNumber = table.Column<string>(type: "text", nullable: false),
                    ScreenshotUrl = table.Column<string>(type: "text", nullable: true),
                    ItemsJson = table.Column<string>(type: "text", nullable: false),
                    SubTotalDp = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalBv = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProcessedByAdminId = table.Column<string>(type: "text", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PickupCenterOrders", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PickupCenterInventoryItems_PickupCenterId_ProductId",
                table: "PickupCenterInventoryItems",
                columns: new[] { "PickupCenterId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PickupCenterOrders_PickupCenterId",
                table: "PickupCenterOrders",
                column: "PickupCenterId");

            migrationBuilder.CreateIndex(
                name: "IX_PickupCenterOrders_Status",
                table: "PickupCenterOrders",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PickupCenterInventoryItems");

            migrationBuilder.DropTable(
                name: "PickupCenterOrders");

            migrationBuilder.DropColumn(
                name: "SoldByPucId",
                table: "PaymentOrders");
        }
    }
}
