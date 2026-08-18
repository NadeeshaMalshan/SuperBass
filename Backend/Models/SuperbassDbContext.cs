using Microsoft.EntityFrameworkCore;

namespace Superbass.Models
{
    public class SuperbassDbContext : DbContext
    {
        public SuperbassDbContext(DbContextOptions<SuperbassDbContext> options)
            : base(options)
        {
        }

        public DbSet<CommunityPost> CommunityPosts { get; set; }
        public DbSet<CommunityComment> CommunityComments { get; set; }
        public DbSet<CommunityReport> CommunityReports { get; set; }
        public DbSet<Resident> Residents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Resident>().HasQueryFilter(u => !u.IsDeleted);
        }
    }
}
