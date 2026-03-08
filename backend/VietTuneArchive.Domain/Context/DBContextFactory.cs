using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace VietTuneArchive.Domain.Context
{
    public class DbContextFactory : IDesignTimeDbContextFactory<DBContext>
    {
        public DBContext CreateDbContext(string[] args)
        {

            var path = Path.Combine(Directory.GetParent(Directory.GetCurrentDirectory()).FullName, "VietTuneArchive");
            var config = new ConfigurationBuilder()
                .SetBasePath(path)
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .Build();

            var optionsBuilder = new DbContextOptionsBuilder<DBContext>();
            var connectionString = config.GetConnectionString("Database");

            optionsBuilder.UseNpgsql(connectionString);

            return new DBContext(optionsBuilder.Options);
        }
    }
}
