using Superbass.Models;

namespace Superbass.Services
{
    public interface WorkerRepository
    {
        Task<IEnumerable<Worker>> GetAllWorkersAsync();
        Task<Worker?> GetWorkerByIdAsync(int id);
        Task<Worker?> GetWorkerByEmailAsync(string email);
        Task<IEnumerable<Worker>> SearchWorkersAsync(string? skill, string? location, double? maxDistanceKm);
        Task<Worker> CreateWorkerAsync(Worker worker);
        Task<Worker> CreateWorkerFromResidentAsync(string residentEmail, string? description, string primaryServiceArea, double coverageRadiusKm, string pricingModel, decimal? hourlyRate, decimal? dailyRate, List<WorkerSkill> skills);
        Task<Worker?> UpdateWorkerAsync(int id, Worker updatedWorker);
        Task<bool> DeleteWorkerAsync(int id);
        Task<bool> DeleteWorkerByEmailAsync(string email);
        Task<Worker?> UpdatePerformanceAsync(int id, double rating, bool isCompleted);
        
        Task<WorkerSkill?> AddSkillAsync(int workerId, WorkerSkill skill);
        Task<bool> RemoveSkillAsync(int workerId, int skillId);
        Task<bool> UpdateAvailabilityAsync(int workerId, bool isAvailable, string? scheduleJson);
        Task<bool> UpdatePricingAsync(int workerId, string model, decimal? hourlyRate, decimal? dailyRate);
        Task<bool> UpdateServiceAreaAsync(int workerId, string serviceArea, double radiusKm);
    }
}
