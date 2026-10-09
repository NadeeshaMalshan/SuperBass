using Moq;
using Superbass.Services;

namespace Superbass.Tests.ResidentTests
{
    public static class ResidentTestMocks
    {
        public static Mock<IResidentRepository> GetMockResidentRepository()
        {
            return new Mock<IResidentRepository>();
        }
    }
}
