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

        // Component 2: Worker Management
        public DbSet<Worker> Workers { get; set; }
        public DbSet<WorkerSkill> WorkerSkills { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Worker>()
                .HasOne(w => w.Resident)
                .WithOne(r => r.WorkerProfile)
                .HasForeignKey<Worker>(w => w.ResidentEmail)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
