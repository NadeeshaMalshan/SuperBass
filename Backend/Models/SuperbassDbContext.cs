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

        // Component 3: Communication & Booking
        public DbSet<Conversation> Conversations { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<Booking> Bookings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Worker>()
                .HasOne(w => w.Resident)
                .WithOne(r => r.WorkerProfile)
                .HasForeignKey<Worker>(w => w.ResidentEmail)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Conversation>()
                .HasOne(c => c.Resident)
                .WithMany()
                .HasForeignKey(c => c.ResidentEmail)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Conversation>()
                .HasOne(c => c.Worker)
                .WithMany()
                .HasForeignKey(c => c.WorkerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasIndex(m => new { m.ConversationId, m.CreatedAt });

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Resident)
                .WithMany()
                .HasForeignKey(b => b.ResidentEmail)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Worker)
                .WithMany()
                .HasForeignKey(b => b.WorkerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Conversation)
                .WithMany()
                .HasForeignKey(b => b.ConversationId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Booking>()
                .HasIndex(b => new { b.ResidentEmail, b.Status });

            modelBuilder.Entity<Booking>()
                .HasIndex(b => new { b.WorkerId, b.Status });
        }
    }
}
