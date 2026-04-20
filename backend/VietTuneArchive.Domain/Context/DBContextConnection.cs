using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace VietTuneArchive.Domain.Context
{
    public static class DbContextConnection
    {
        public static IServiceCollection AddDbContext(this IServiceCollection services, string connectionString)
        {
            services.AddDbContext<DBContext>(options =>
            {
                options.UseNpgsql(connectionString);
            });

            return services;
        }
    }
}
