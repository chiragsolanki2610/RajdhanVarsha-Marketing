using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RegisterApi.Migrations
{
    /// <summary>
    /// The original unique index on (UserId, LeftChildId, RightChildId) was
    /// wrong: a node's LeftChildId/RightChildId stay the same as more people
    /// activate underneath them, so every new pair for that node legitimately
    /// re-uses the same LeftChildId/RightChildId. The unique constraint made
    /// it impossible to insert a 2nd+ pair for the same node, which is what
    /// caused pair commission to get stuck (e.g. a node stuck at "1 pair"
    /// even though min(LeftActiveCount, RightActiveCount) had grown to 2+).
    ///
    /// This migration drops the bad unique index and replaces it with a
    /// plain (non-unique) index on the same columns, so lookups by
    /// UserId+LeftChildId+RightChildId stay fast without blocking inserts.
    /// </summary>
    /// <inheritdoc />
    public partial class FixBinaryPairsUniqueConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BinaryPairs_UserId_LeftChildId_RightChildId",
                table: "BinaryPairs");

            migrationBuilder.CreateIndex(
                name: "IX_BinaryPairs_UserId_LeftChildId_RightChildId",
                table: "BinaryPairs",
                columns: new[] { "UserId", "LeftChildId", "RightChildId" },
                unique: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BinaryPairs_UserId_LeftChildId_RightChildId",
                table: "BinaryPairs");

            migrationBuilder.CreateIndex(
                name: "IX_BinaryPairs_UserId_LeftChildId_RightChildId",
                table: "BinaryPairs",
                columns: new[] { "UserId", "LeftChildId", "RightChildId" },
                unique: true);
        }
    }
}
