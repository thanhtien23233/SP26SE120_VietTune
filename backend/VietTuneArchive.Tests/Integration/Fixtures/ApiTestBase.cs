using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using VietTuneArchive.Domain.Context;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;

namespace VietTuneArchive.Tests.Integration;

[Collection("IntegrationTests")]
public abstract class ApiTestBase : IAsyncLifetime
{
    protected readonly WebAppFactory Factory;
    protected HttpClient Client;
    protected IServiceScope Scope;
    protected DBContext DbContext;

    protected ApiTestBase(WebAppFactory factory)
    {
        Factory = factory;
        Client = Factory.CreateClient();
    }

    public virtual Task InitializeAsync()
    {
        Scope = Factory.Services.CreateScope();
        DbContext = Scope.ServiceProvider.GetRequiredService<DBContext>();
        return Task.CompletedTask;
    }

    public virtual Task DisposeAsync()
    {
        Scope?.Dispose();
        Client?.Dispose();
        return Task.CompletedTask;
    }

    // Fixed seeded user IDs — must stay in sync with DatabaseFixture
    private static readonly Dictionary<string, (string Id, string Email)> SeededUsers = new()
    {
        ["Contributor"] = ("aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa", "contrib@test.com"),
        ["Expert"]      = ("bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb", "expert@test.com"),
        ["Admin"]       = ("cccccccc-0003-0003-0003-cccccccccccc", "admin@test.com"),
        ["Researcher"]  = ("dddddddd-0004-0004-0004-dddddddddddd", "researcher@test.com"),
    };

    protected void AuthenticateAs(string role)
    {
        var (id, email) = SeededUsers.TryGetValue(role, out var u)
            ? u
            : (Guid.NewGuid().ToString(), "unknown@test.com");
        var token = JwtTokenHelper.GenerateToken(id, email, role);
        Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }

    protected void ClearAuth() =>
        Client.DefaultRequestHeaders.Authorization = null;

    protected async Task<HttpResponseMessage> GetAsync(string url)
    {
        return await Client.GetAsync(url);
    }

    protected async Task<HttpResponseMessage> PostAsync<T>(string url, T data)
    {
        return await Client.PostAsJsonAsync(url, data);
    }

    protected async Task<HttpResponseMessage> PutAsync<T>(string url, T data)
    {
        return await Client.PutAsJsonAsync(url, data);
    }
}
