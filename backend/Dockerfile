# Use the official .NET 8.0 SDK image to build the application
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /src

# Copy the entire backend directory into the container
COPY . ./

# Restore down all dependencies for the solution
# Using the solution file ensures it restores all referenced class libraries
RUN dotnet restore VietTuneArchive.sln

# Publish the main API project in Release mode
RUN dotnet publish VietTuneArchive/VietTuneArchive.API.csproj -c Release -o /app/publish --no-restore

# Build the final runtime image using the ASP.NET Core runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build-env /app/publish .

# Render dynamically sets the PORT environment variable.
# Your Program.cs already reads this and binds to it (http://0.0.0.0:{port}).
# By default, we expose 8080 to match local setups, but Render will override it properly.
EXPOSE 8080

ENTRYPOINT ["dotnet", "VietTuneArchive.API.dll"]
