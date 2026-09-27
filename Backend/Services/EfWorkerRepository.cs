using System;
using Microsoft.EntityFrameworkCore;
using Superbass.Models;

namespace Superbass.Services
{
    public class EfWorkerRepository : WorkerRepository
    {
        private readonly SuperbassDbContext _context;

        public EfWorkerRepository(SuperbassDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Worker>> GetAllWorkersAsync()
        {
            return await _context.Workers.Include(w => w.Skills).ToListAsync();
        }

        public async Task<Worker?> GetWorkerByIdAsync(int id)
        {
            return await _context.Workers.Include(w => w.Skills).FirstOrDefaultAsync(w => w.Id == id);
        }

        public async Task<Worker?> GetWorkerByEmailAsync(string email)
        {
            return await _context.Workers.Include(w => w.Skills).FirstOrDefaultAsync(w => w.ResidentEmail == email || w.Email == email);
        }

        public async Task<IEnumerable<Worker>> SearchWorkersAsync(string? skill, string? location, double? maxDistanceKm, double? residentLat = null, double? residentLng = null)
        {
            var query = _context.Workers.Include(w => w.Skills).AsQueryable();

            if (!string.IsNullOrWhiteSpace(skill))
            {
                var term = skill.Trim().ToLower();
                query = query.Where(w => w.Skills.Any(s => 
                    (s.ServiceName != null && s.ServiceName.ToLower().Contains(term)) ||
                    (s.SkillName != null && s.SkillName.ToLower().Contains(term)) ||
                    s.Skills.Any(sub => sub.ToLower().Contains(term))
                ));
            }

            if (!string.IsNullOrWhiteSpace(location))
            {
                query = query.Where(w => w.PrimaryServiceArea != null && w.PrimaryServiceArea.ToLower().Contains(location.ToLower()));
            }

            var workers = await query.ToListAsync();

            if (residentLat.HasValue && residentLng.HasValue)
            {
                foreach (var w in workers)
                {
                    if (w.LocationLat.HasValue && w.LocationLng.HasValue)
                    {
                        w.Distance = CalculateHaversineDistance(residentLat.Value, residentLng.Value, w.LocationLat.Value, w.LocationLng.Value);
                    }
                }
                
                if (maxDistanceKm.HasValue)
                {
                    workers = workers.Where(w => !w.Distance.HasValue || w.Distance.Value <= maxDistanceKm.Value).ToList();
                }

                workers = workers.OrderBy(w => w.Distance ?? double.MaxValue).ToList();
            }

            return workers;
        }

        private double CalculateHaversineDistance(double lat1, double lon1, double lat2, double lon2)
        {
            var R = 6371; // Radius of the earth in km
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);
            var a = 
                Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) * 
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2); 
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a)); 
            return R * c; // Distance in km
        }

        private double ToRadians(double deg) => deg * (Math.PI / 180);

        public async Task<Worker> CreateWorkerAsync(Worker worker)
        {
            _context.Workers.Add(worker);
            await _context.SaveChangesAsync();
            return worker;
        }

        public async Task<Worker> CreateWorkerFromResidentAsync(string residentEmail, string? description, string primaryServiceArea, double coverageRadiusKm, string pricingModel, decimal? hourlyRate, decimal? dailyRate, List<WorkerSkill> skills)
        {
            var resident = await _context.Residents.FindAsync(residentEmail);
            if (resident == null)
            {
                resident = new Resident
                {
                    Email = residentEmail,
                    Name = residentEmail.Split('@')[0]
                };
                _context.Residents.Add(resident);
                await _context.SaveChangesAsync();
            }

            var existingWorker = await _context.Workers.Include(w => w.Skills).FirstOrDefaultAsync(w => w.ResidentEmail == residentEmail || w.Email == residentEmail);
            if (existingWorker != null)
            {
                existingWorker.Description = description ?? existingWorker.Description;
                existingWorker.PrimaryServiceArea = primaryServiceArea ?? existingWorker.PrimaryServiceArea;
                if (coverageRadiusKm > 0) existingWorker.CoverageRadiusKm = coverageRadiusKm;
                existingWorker.PricingModel = pricingModel ?? existingWorker.PricingModel;
                if (hourlyRate != null) existingWorker.HourlyRate = hourlyRate;
                if (dailyRate != null) existingWorker.DailyRate = dailyRate;
                if (skills != null && skills.Count > 0)
                {
                    _context.WorkerSkills.RemoveRange(existingWorker.Skills);
                    existingWorker.Skills = skills;
                }
                await _context.SaveChangesAsync();
                return existingWorker;
            }

            var worker = new Worker
            {
                ResidentEmail = resident.Email,
                Email = resident.Email,
                Name = resident.Name ?? resident.Email,
                PhoneNo = resident.PhoneNo,
                LocationLat = resident.LocationLat,
                LocationLng = resident.LocationLng,
                Description = description,
                PrimaryServiceArea = primaryServiceArea,
                CoverageRadiusKm = coverageRadiusKm,
                PricingModel = pricingModel,
                HourlyRate = hourlyRate,
                DailyRate = dailyRate,
                IsAvailable = true,
                Skills = skills ?? new List<WorkerSkill>()
            };

            _context.Workers.Add(worker);
            await _context.SaveChangesAsync();
            return worker;
        }

        public async Task<Worker?> UpdateWorkerAsync(int id, Worker updatedWorker)
        {
            var existing = await _context.Workers.Include(w => w.Skills).FirstOrDefaultAsync(w => w.Id == id);
            if (existing == null) return null;

            existing.Name = updatedWorker.Name;
            existing.PhoneNo = updatedWorker.PhoneNo;
            existing.ProfileImage = updatedWorker.ProfileImage;
            existing.Description = updatedWorker.Description;
            existing.PrimaryServiceArea = updatedWorker.PrimaryServiceArea;
            existing.PricingModel = updatedWorker.PricingModel;
            existing.HourlyRate = updatedWorker.HourlyRate;
            existing.DailyRate = updatedWorker.DailyRate;
            existing.IsAvailable = updatedWorker.IsAvailable;

            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteWorkerAsync(int id)
        {
            var worker = await _context.Workers.FindAsync(id);
            if (worker == null) return false;

            _context.Workers.Remove(worker);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteWorkerByEmailAsync(string email)
        {
            var worker = await _context.Workers.Include(w => w.Skills).FirstOrDefaultAsync(w => w.ResidentEmail == email || w.Email == email);
            if (worker == null) return false;

            _context.Workers.Remove(worker);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Worker?> UpdatePerformanceAsync(int id, double rating, bool isCompleted)
        {
            var worker = await _context.Workers.FindAsync(id);
            if (worker == null) return null;

            if (isCompleted)
            {
                worker.CompletedJobs += 1;
                // Calculate moving average rating safely when previous OverallRating might be null
                var prevRating = worker.OverallRating ?? rating;
                worker.OverallRating = Math.Round(((prevRating * (worker.CompletedJobs - 1)) + rating) / worker.CompletedJobs, 2);
            }

            await _context.SaveChangesAsync();
            return worker;
        }

        public async Task<WorkerSkill?> AddSkillAsync(int workerId, WorkerSkill skill)
        {
            var worker = await _context.Workers.FindAsync(workerId);
            if (worker == null) return null;

            skill.WorkerId = workerId;
            _context.WorkerSkills.Add(skill);
            await _context.SaveChangesAsync();

            return skill;
        }

        public async Task<bool> RemoveSkillAsync(int workerId, int skillId)
        {
            var entry = await _context.WorkerSkills
                .FirstOrDefaultAsync(s => s.WorkerId == workerId && s.Id == skillId);

            if (entry == null) return false;

            _context.WorkerSkills.Remove(entry);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateAvailabilityAsync(int workerId, bool isAvailable, string? scheduleJson)
        {
            var worker = await _context.Workers.FindAsync(workerId);
            if (worker == null) return false;

            worker.IsAvailable = isAvailable;
            worker.AvailabilityScheduleJson = scheduleJson;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdatePricingAsync(int workerId, string model, decimal? hourlyRate, decimal? dailyRate)
        {
            var worker = await _context.Workers.FindAsync(workerId);
            if (worker == null) return false;

            worker.PricingModel = model;
            worker.HourlyRate = hourlyRate;
            worker.DailyRate = dailyRate;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateServiceAreaAsync(int workerId, string serviceArea, double radiusKm)
        {
            var worker = await _context.Workers.FindAsync(workerId);
            if (worker == null) return false;

            worker.PrimaryServiceArea = serviceArea;
            worker.CoverageRadiusKm = radiusKm;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdatePasswordAsync(int workerId, string newPassword)
        {
            var worker = await _context.Workers.FindAsync(workerId);
            if (worker == null) return false;

            worker.PasswordHash = newPassword; // Simple hash / string update

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
