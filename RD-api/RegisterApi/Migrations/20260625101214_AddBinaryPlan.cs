using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <inheritdoc />
    public partial class AddBinaryPlan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ReceiptFinalized",
                table: "PaymentOrders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReceiptFinalizedAt",
                table: "PaymentOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReceiptGeneratedAt",
                table: "PaymentOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptItemsJson",
                table: "PaymentOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptNotes",
                table: "PaymentOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "ReceiptPdf",
                table: "PaymentOrders",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ReceiptTotalAmount",
                table: "PaymentOrders",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ReceiptTotalBv",
                table: "PaymentOrders",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BinaryNodes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    SponsorId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    ParentId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Position = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    LeftChildId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    RightChildId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    TreeLevel = table.Column<int>(type: "integer", nullable: false),
                    LeftLegCount = table.Column<int>(type: "integer", nullable: false),
                    RightLegCount = table.Column<int>(type: "integer", nullable: false),
                    LeftLegBv = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    RightLegBv = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalBv = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ActivatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BinaryNodes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BinaryPairs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    LeftChildId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    RightChildId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CommissionAmt = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CreditedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BinaryPairs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BinaryWallets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Balance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalEarned = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalWithdrawn = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PairsCount = table.Column<int>(type: "integer", nullable: false),
                    WithdrawalUnlocked = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BinaryWallets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BinaryWalletTransactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    BalanceAfter = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ReferenceId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BinaryWalletTransactions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BinaryWithdrawalRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AdminNote = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BinaryWithdrawalRequests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BinaryNodes_ParentId",
                table: "BinaryNodes",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_BinaryNodes_SponsorId",
                table: "BinaryNodes",
                column: "SponsorId");

            migrationBuilder.CreateIndex(
                name: "IX_BinaryNodes_UserId",
                table: "BinaryNodes",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BinaryPairs_UserId",
                table: "BinaryPairs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BinaryWallets_UserId",
                table: "BinaryWallets",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BinaryWalletTransactions_CreatedAt",
                table: "BinaryWalletTransactions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_BinaryWalletTransactions_UserId",
                table: "BinaryWalletTransactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BinaryWithdrawalRequests_Status",
                table: "BinaryWithdrawalRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_BinaryWithdrawalRequests_UserId",
                table: "BinaryWithdrawalRequests",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BinaryNodes");

            migrationBuilder.DropTable(
                name: "BinaryPairs");

            migrationBuilder.DropTable(
                name: "BinaryWallets");

            migrationBuilder.DropTable(
                name: "BinaryWalletTransactions");

            migrationBuilder.DropTable(
                name: "BinaryWithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "ReceiptFinalized",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "ReceiptFinalizedAt",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "ReceiptGeneratedAt",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "ReceiptItemsJson",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "ReceiptNotes",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "ReceiptPdf",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "ReceiptTotalAmount",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "ReceiptTotalBv",
                table: "PaymentOrders");
        }
    }
}
