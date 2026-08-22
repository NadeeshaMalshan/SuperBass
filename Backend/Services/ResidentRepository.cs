using Microsoft.EntityFrameworkCore;
using Superbass.Models;
using System.Linq;
using System.Threading.Tasks;

namespace Superbass.Services
{
    public interface IResidentRepository
    {
        Task<Resident?> GetResidentAsync(string email);
        Task<bool> UpdateResidentAsync(string email, ResidentUpdateDto updateDto);
        Task<bool> DeleteResidentAsync(string email);
    }

    public class EfResidentRepository : IResidentRepository
    {
        private readonly SuperbassDbContext _context;

        public EfResidentRepository(SuperbassDbContext context)
        {
            _context = context;
        }

        public async Task<Resident?> GetResidentAsync(string email)
        {
            return await _context.Residents.FindAsync(email);
        }

        public async Task<bool> UpdateResidentAsync(string email, ResidentUpdateDto updateDto)
        {
            var resident = await _context.Residents.FindAsync(email);
            if (resident == null) return false;

            if (updateDto.Name != null) resident.Name = updateDto.Name;
            if (updateDto.PhoneNo != null) resident.PhoneNo = updateDto.PhoneNo;
            if (updateDto.Address != null) resident.Address = updateDto.Address;
            if (updateDto.LocationLat != null) resident.LocationLat = updateDto.LocationLat;
            if (updateDto.LocationLng != null) resident.LocationLng = updateDto.LocationLng;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteResidentAsync(string email)
        {
            var resident = await _context.Residents.FindAsync(email);
            if (resident == null) return false;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                await _context.CommunityComments
                    .Where(c => c.UserId == email)
                    .ExecuteDeleteAsync();

                await _context.CommunityReports
                    .Where(r => r.ReporterUserId == email)
                    .ExecuteDeleteAsync();

                var userPostIds = await _context.CommunityPosts
                    .Where(p => p.UserId == email)
                    .Select(p => p.PostId)
                    .ToListAsync();

                if (userPostIds.Any())
                {
                    await _context.CommunityComments
                        .Where(c => userPostIds.Contains(c.PostId))
                        .ExecuteDeleteAsync();

                    await _context.CommunityReports
                        .Where(r => userPostIds.Contains(r.PostId))
                        .ExecuteDeleteAsync();

                    await _context.CommunityPosts
                        .Where(p => userPostIds.Contains(p.PostId))
                        .ExecuteDeleteAsync();
                }

                _context.Residents.Remove(resident);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
