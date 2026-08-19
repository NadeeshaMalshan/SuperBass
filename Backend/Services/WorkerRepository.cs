using Superbass.Models;

namespace Superbass.Services
{
    public interface WorkerRepository
    {
        Task<IEnumerable<Worker>> GetAllWorkersAsync();
        Task<Worker?> GetWorkerByIdAsync(int id);
        Task<IEnumerable<Worker>> SearchWorkersAsync(string? skill, string? location, double? maxDistanceKm);
        Task<Worker> CreateWorkerAsync(Worker worker);
        Task<Worker?> UpdateWorkerAsync(int id, Worker updatedWorker);
        Task<bool> DeleteWorkerAsync(int id);
        Task<Worker?> UpdatePerformanceAsync(int id, double rating, bool isCompleted);
        
        Task<WorkerSkill?> AddSkillAsync(int workerId, WorkerSkill skill);
        Task<bool> RemoveSkillAsync(int workerId, int skillId);
        Task<bool> UpdateAvailabilityAsync(int workerId, bool isAvailable, string? scheduleJson);
        Task<bool> UpdatePricingAsync(int workerId, string model, decimal? hourlyRate, decimal? dailyRate);
        Task<bool> UpdateServiceAreaAsync(int workerId, string serviceArea, double radiusKm);
    }
}
