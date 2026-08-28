using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <inheritdoc />
    public partial class AddWithdrawalTaxFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "NetPayableAmount",
                table: "WithdrawalRequests",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceTaxAmount",
                table: "WithdrawalRequests",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TdsAmount",
                table: "WithdrawalRequests",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "NetAmount",
                table: "WalletTransactions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceTaxAmount",
                table: "WalletTransactions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TdsAmount",
                table: "WalletTransactions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<string>(
                name: "AadharNo",
                table: "Users",
                type: "character varying(12)",
                maxLength: 12,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(12)",
                oldMaxLength: 12);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NetPayableAmount",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "ServiceTaxAmount",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "TdsAmount",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "NetAmount",
                table: "WalletTransactions");

            migrationBuilder.DropColumn(
                name: "ServiceTaxAmount",
                table: "WalletTransactions");

            migrationBuilder.DropColumn(
                name: "TdsAmount",
                table: "WalletTransactions");

            migrationBuilder.AlterColumn<string>(
                name: "AadharNo",
                table: "Users",
                type: "character varying(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(12)",
                oldMaxLength: 12,
                oldNullable: true);
        }
    }
}
