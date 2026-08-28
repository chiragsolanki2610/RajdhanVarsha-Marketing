using Postgrest.Models;

namespace RegisterApi.Models
{
    /// <summary>
    /// Maps directly to the 'user_tree_nodes' view compiled in Supabase.
    /// Uses explicit Postgrest namespace mapping attributes to avoid conflicts with Entity Framework Core.
    /// </summary>
    [Postgrest.Attributes.Table("user_tree_nodes")]
    public class UserTreeNode : BaseModel
    {
        /// <summary>
        /// The unique distributor ID string (e.g., "RD0001")
        /// </summary>
        [Postgrest.Attributes.PrimaryKey("id")]
        public string Id { get; set; }

        /// <summary>
        /// The registration name of the distributor
        /// </summary>
        [Postgrest.Attributes.Column("name")]
        public string Name { get; set; }

        /// <summary>
        /// The ID string of their direct upline recruiter
        /// </summary>
        [Postgrest.Attributes.Column("sponsor_id")]
        public string SponsorId { get; set; }

        /// <summary>
        /// The text name of their upline recruiter
        /// </summary>
        [Postgrest.Attributes.Column("sponsor_name")]
        public string SponsorName { get; set; }

        /// <summary>
        /// Calculated count of active frontline downlines linked to this ID
        /// </summary>
        [Postgrest.Attributes.Column("direct_count")]
        public int DirectCount { get; set; }

        /// <summary>
        /// Flags whether this user has child nodes under them down the matrix path
        /// </summary>
        [Postgrest.Attributes.Column("has_children")]
        public bool HasChildren { get; set; }
    }
}