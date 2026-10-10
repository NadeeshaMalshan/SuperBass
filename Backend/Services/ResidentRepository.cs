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
        Task<bool> VerifyResidentAsync(string email, string? nicNumber);
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
            if (resident == null)
            {
                resident = new Resident
                {
                    Email = email,
                    Name = updateDto.Name ?? (email.Contains("@") ? email.Split('@')[0] : email),
                    PhoneNo = updateDto.PhoneNo ?? "",
                    Address = updateDto.Address ?? "",
                    LocationLat = updateDto.LocationLat,
                    LocationLng = updateDto.LocationLng,
                    District = updateDto.District,
                    ProfileImage = updateDto.ProfileImage,
                    IsVerified = updateDto.IsVerified ?? false,
                    NicNumber = updateDto.NicNumber
                };
                _context.Residents.Add(resident);
            }
            else
            {
                if (updateDto.Name != null) resident.Name = updateDto.Name;
                if (updateDto.PhoneNo != null) resident.PhoneNo = updateDto.PhoneNo;
                if (updateDto.Address != null) resident.Address = updateDto.Address;
                if (updateDto.LocationLat != null) resident.LocationLat = updateDto.LocationLat;
                if (updateDto.LocationLng != null) resident.LocationLng = updateDto.LocationLng;
                if (updateDto.District != null) resident.District = updateDto.District;
                if (updateDto.ProfileImage != null) resident.ProfileImage = updateDto.ProfileImage;
                if (updateDto.IsVerified.HasValue) resident.IsVerified = updateDto.IsVerified.Value;
                if (updateDto.NicNumber != null) resident.NicNumber = updateDto.NicNumber;
            }

            // Profile image is updated for resident only - workers are completely independent

            if (updateDto.Address != null && updateDto.LocationLat == null && updateDto.LocationLng == null)
            {
                try 
                {
                    using var client = new System.Net.Http.HttpClient();
                    client.DefaultRequestHeaders.Add("User-Agent", "SuperBassApp/1.0");
                    var url = $"https://nominatim.openstreetmap.org/search?q={System.Uri.EscapeDataString(updateDto.Address)}&format=json&limit=1";
                    var response = await client.GetAsync(url);
                    if (response.IsSuccessStatusCode)
                    {
                        var jsonString = await response.Content.ReadAsStringAsync();
                        using var doc = System.Text.Json.JsonDocument.Parse(jsonString);
                        if (doc.RootElement.GetArrayLength() > 0)
                        {
                            var first = doc.RootElement[0];
                            if (first.TryGetProperty("lat", out var latProp) && first.TryGetProperty("lon", out var lonProp))
                            {
                                if (double.TryParse(latProp.GetString(), out double lat) && double.TryParse(lonProp.GetString(), out double lon))
                                {
                                    resident.LocationLat = lat;
                                    resident.LocationLng = lon;
                                }
                            }
                        }
                    }
                }
                catch { /* Ignore geocoding errors */ }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> VerifyResidentAsync(string email, string? nicNumber)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            var cleanEmail = email.Trim().ToLower();
            var resident = await _context.Residents.FirstOrDefaultAsync(r => r.Email.ToLower() == cleanEmail);
            if (resident == null)
            {
                resident = new Resident
                {
                    Email = email,
                    Name = email.Contains("@") ? email.Split('@')[0] : email,
                    PhoneNo = "",
                    Address = "",
                    IsVerified = true,
                    NicNumber = !string.IsNullOrWhiteSpace(nicNumber) ? nicNumber.Trim() : null
                };
                _context.Residents.Add(resident);
            }
            else
            {
                resident.IsVerified = true;
                if (!string.IsNullOrWhiteSpace(nicNumber))
                {
                    resident.NicNumber = nicNumber.Trim();
                }
            }

            // Workers are completely independent entities - no verification sync

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteResidentAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            var cleanEmail = email.Trim().ToLower();
            var resident = await _context.Residents.FirstOrDefaultAsync(r => r.Email.ToLower() == cleanEmail);
            if (resident == null) return false;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Workers are completely independent entities — deleting a resident does NOT affect any worker account.

                // 1. Delete Chat Messages & Conversations owned by resident
                var conversationIds = await _context.Conversations
                    .Where(c => c.ResidentEmail.ToLower() == cleanEmail)
                    .Select(c => c.Id)
                    .ToListAsync();

                if (conversationIds.Any())
                {
                    await _context.ChatMessages
                        .Where(m => conversationIds.Contains(m.ConversationId))
                        .ExecuteDeleteAsync();

                    await _context.Conversations
                        .Where(c => conversationIds.Contains(c.Id))
                        .ExecuteDeleteAsync();
                }

                // 2. Delete Bookings requested by resident
                await _context.Bookings
                    .Where(b => b.ResidentEmail.ToLower() == cleanEmail)
                    .ExecuteDeleteAsync();

                // 3. Delete Community Comments & Reports by this user
                await _context.CommunityComments
                    .Where(c => c.UserId.ToLower() == cleanEmail)
                    .ExecuteDeleteAsync();

                await _context.CommunityReports
                    .Where(r => r.ReporterUserId.ToLower() == cleanEmail)
                    .ExecuteDeleteAsync();

                // 4. Delete Community Posts by this user
                var userPostIds = await _context.CommunityPosts
                    .Where(p => p.UserId.ToLower() == cleanEmail)
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

                // 5. Delete Resident
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
