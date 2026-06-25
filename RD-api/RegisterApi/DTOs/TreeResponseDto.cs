using System.Collections.Generic;

namespace RegisterApi.Models
{
    /// <summary>
    /// Represents a single distributor node formatted specifically for the React Flow tree layout canvas.
    /// This structure automatically tracks the Dream Purchase Plan parameters.
    /// </summary>
    public class TreeResponseDto
    {
        /// <summary>
        /// The unique alphanumeric alphanumeric ID of the distributor (e.g., "RD0001")
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// The distributor's registration name
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// The ID string of the upline recruiter/sponsor
        /// </summary>
        public string SponsorId { get; set; }

        /// <summary>
        /// The matching name of the upline sponsor
        /// </summary>
        public string SponsorName { get; set; }

        /// <summary>
        /// Active/Inactive status of this distributor's ID (User.IdStatus)
        /// </summary>
        public string IdStatus { get; set; }

        /// <summary>
        /// The depth tracking index within the organization matrix layout (Levels 0 through 12)
        /// </summary>
        public int Level { get; set; }

        /// <summary>
        /// The number of direct team members sponsored by this user (Capped at 10)
        /// </summary>
        public int DirectCount { get; set; }

        /// <summary>
        /// Rule 1: A user must add a minimum of 3 direct users to activate commission withdrawals.
        /// </summary>
        public bool IsEligibleForWithdrawal => DirectCount >= 3;

        /// <summary>
        /// Business Volume metric — the sum of this distributor's own PAID purchases
        /// (Plan.TotalBv). Set explicitly by the controller from real purchase data;
        /// NOT derived from team size.
        /// </summary>
        public int CalculatedBv { get; set; }

        /// <summary>
        /// Percentage payout assigned to the active tree node depth level according to the plan chart
        /// </summary>
        public double LevelCommissionPercentage { get; set; }

        /// <summary>
        /// Estimated incentive value in Rs generated from THIS node's own BV at THIS node's level
        /// (CalculatedBv * LevelCommissionPercentage). This is the commission this node's purchase
        /// generates for its upline — it is NOT this node's total wallet incentive.
        /// </summary>
        public double EstimatedEarnings { get; set; }

        /// <summary>
        /// The TOTAL incentive this node has earned/will earn = its own EstimatedEarnings
        /// (commission on its own BV) PLUS the sum of EstimatedEarnings contributed by every
        /// descendant in its downline (up to level 12). This is the correct value to show
        /// as "Incentive" in the tree UI — it matches what gets credited to the Dream Wallet.
        /// </summary>
        public double TotalIncentive { get; set; }

        /// <summary>
        /// Flag that controls whether an expansion trigger icon should render in the UI
        /// </summary>
        public bool HasChildren { get; set; }

        /// <summary>
        /// Nested collection holding downline children for smooth lazy loading inside the tree view
        /// </summary>
        public List<TreeResponseDto> Children { get; set; } = new List<TreeResponseDto>();
    }
}