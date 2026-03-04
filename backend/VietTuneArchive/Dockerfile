# Giai đoạn 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy các file .csproj vào đúng thư mục để restore (tối ưu cache Docker)
COPY ["VietTuneArchive.API/VietTuneArchive.API.csproj", "VietTuneArchive.API/"]
COPY ["VietTuneArchive.Application/VietTuneArchive.Application.csproj", "VietTuneArchive.Application/"]
COPY ["VietTuneArchive.Domain/VietTuneArchive.Domain.csproj", "VietTuneArchive.Domain/"]

RUN dotnet restore "VietTuneArchive/VietTuneArchive.csproj"

COPY . .

WORKDIR "/src/VietTuneArchive.API"
RUN dotnet build "VietTuneArchive.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "VietTuneArchive.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .


ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "VietTuneArchive.API.dll"]