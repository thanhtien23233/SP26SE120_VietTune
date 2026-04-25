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

    protected void AuthenticateAs(string role)
    {
        var token = JwtTokenHelper.GenerateToken(Guid.NewGuid().ToString(), "test@test.com", role);
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

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
