using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <summary>
    /// Pair-matching bug fix: the previous rule paid pairs = min(Left, Right)
    /// once the 2:1 / 1:2 gate opened. That's wrong — the extra member spent
    /// to OPEN the gate (e.g. the 2nd member on a 2-1 start) never becomes
    /// pair-eligible again. The majority side permanently owes 1 member for
    /// every pair after the first: pairs = min(majoritySide - 1, minoritySide).
    ///
    /// Example this fixes: a node at 2-1 earns 1 pair (correct, unchanged).
    /// Growing to 2-5 (only right side growing) must STAY at 1 pair, not
    /// jump to 2 — because the left side still only has 2 members and 1 of
    /// those was already spent opening the gate. Under the old rule
    /// min(2,5)=2 wrongly paid a 2nd pair here.
    ///
    /// Since "majority side" can't be recovered later once Left == Right,
    /// this column records which side was ahead at the exact moment the
    /// gate opened, so the -1 discount is always applied to the correct side.
    /// </summary>
    /// <inheritdoc />
    public partial class AddGateMajoritySide : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GateMajoritySide",
                table: "BinaryNodes",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GateMajoritySide",
                table: "BinaryNodes");
        }
    }
}
