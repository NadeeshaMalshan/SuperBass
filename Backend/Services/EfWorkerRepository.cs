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

        public async Task<IEnumerable<Worker>> SearchWorkersAsync(string? skill, string? location, double? maxDistanceKm, double? residentLat = null, double? residentLng = null, decimal? maxHourlyRate = null, decimal? minHourlyRate = null)
        {
            var query = _context.Workers.Include(w => w.Skills).Include(w => w.Resident).AsQueryable();

            if (!string.IsNullOrWhiteSpace(skill))
            {
                var term = skill.Trim().ToLower();
                var primary = term;
                var alias = "";
                if (term.Contains("car") || term.Contains("vehicle") || term.Contains("mechanic") || term.Contains("auto") || term.Contains("mcanin") || term.Contains("vechil"))
                {
                    alias = "vehicle";
                }
                else if (term.Contains("plumb") || term.Contains("pipe") || term.Contains("leak") || term.Contains("tap"))
                {
                    alias = "plumbing";
                }
                else if (term.Contains("electr") || term.Contains("wire") || term.Contains("wiring"))
                {
                    alias = "electrical";
                }
                else if (term.Contains("ac") || term.Contains("air condition"))
                {
                    alias = "air conditioning";
                }

                if (!string.IsNullOrEmpty(alias))
                {
                    query = query.Where(w => w.Skills.Any(s => 
                        (s.ServiceName != null && (s.ServiceName.ToLower().Contains(primary) || s.ServiceName.ToLower().Contains(alias))) ||
                        (s.SkillName != null && (s.SkillName.ToLower().Contains(primary) || s.SkillName.ToLower().Contains(alias))) ||
                        s.Skills.Any(sub => sub.ToLower().Contains(primary) || sub.ToLower().Contains(alias))
                    ));
                }
                else
                {
                    query = query.Where(w => w.Skills.Any(s => 
                        (s.ServiceName != null && s.ServiceName.ToLower().Contains(primary)) ||
                        (s.SkillName != null && s.SkillName.ToLower().Contains(primary)) ||
                        s.Skills.Any(sub => sub.ToLower().Contains(primary))
                    ));
                }
            }

            if (!string.IsNullOrWhiteSpace(location))
            {
                query = query.Where(w => w.PrimaryServiceArea != null && w.PrimaryServiceArea.ToLower().Contains(location.ToLower()));
            }

            if (maxHourlyRate.HasValue)
            {
                query = query.Where(w => w.HourlyRate != null && w.HourlyRate <= maxHourlyRate.Value);
            }

            if (minHourlyRate.HasValue)
            {
                query = query.Where(w => w.HourlyRate != null && w.HourlyRate >= minHourlyRate.Value);
            }

            var workers = await query.ToListAsync();

            if (residentLat.HasValue && residentLng.HasValue)
            {
                foreach (var w in workers)
                {
                    double? lat = w.LocationLat;
                    double? lng = w.LocationLng;

                    if (!lat.HasValue || !lng.HasValue)
                    {
                        if (w.Resident != null && w.Resident.LocationLat.HasValue && w.Resident.LocationLng.HasValue)
                        {
                            lat = w.Resident.LocationLat;
                            lng = w.Resident.LocationLng;
                        }
                    }

                    if (!lat.HasValue || !lng.HasValue)
                    {
                        var cityCoords = GetCityCoordinates(w.PrimaryServiceArea) ?? (w.Resident != null ? GetCityCoordinates(w.Resident.Address) : null);
                        if (cityCoords.HasValue)
                        {
                            lat = cityCoords.Value.Lat;
                            lng = cityCoords.Value.Lng;
                        }
                    }

                    if (lat.HasValue && lng.HasValue)
                    {
                        w.Distance = CalculateHaversineDistance(residentLat.Value, residentLng.Value, lat.Value, lng.Value);
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

        private static readonly Dictionary<string, (double Lat, double Lng)> KnownCityCoordinates = new(StringComparer.OrdinalIgnoreCase)
        {
            { "Colombo", (6.9271, 79.8612) },
            { "Dehiwala", (6.8511, 79.8659) },
            { "Mount Lavinia", (6.8378, 79.8667) },
            { "Moratuwa", (6.7730, 79.8816) },
            { "Kotte", (6.8914, 79.9048) },
            { "Kaduwela", (6.9333, 79.9833) },
            { "Gampaha", (7.0840, 79.9925) },
            { "Negombo", (7.2008, 79.8736) },
            { "Kalutara", (6.5854, 79.9607) },
            { "Kandy", (7.2906, 80.6337) },
            { "Matale", (7.4675, 80.6234) },
            { "Nuwara Eliya", (6.9497, 80.7891) },
            { "Galle", (6.0535, 80.2210) },
            { "Matara", (5.9549, 80.5550) },
            { "Hambantota", (6.1429, 81.1212) },
            { "Jaffna", (9.6615, 80.0255) },
            { "Kurunegala", (7.4863, 80.3623) },
            { "Puttalam", (8.0362, 79.8283) },
            { "Anuradhapura", (8.3114, 80.4037) },
            { "Polonnaruwa", (7.9403, 81.0188) },
            { "Badulla", (6.9934, 81.0550) },
            { "Ratnapura", (6.6828, 80.4034) },
            { "Trincomalee", (8.5874, 81.2152) },
            { "Batticaloa", (7.7310, 81.6747) }
        };

        private (double Lat, double Lng)? GetCityCoordinates(string? location)
        {
            if (string.IsNullOrWhiteSpace(location)) return null;
            foreach (var kvp in KnownCityCoordinates)
            {
                if (location.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                {
                    return kvp.Value;
                }
            }
            return null;
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
