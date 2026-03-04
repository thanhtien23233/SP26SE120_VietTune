# Giai đoạn Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Sửa lại đường dẫn COPY theo tên thư mục vật lý thực tế
COPY ["VietTuneArchive/VietTuneArchive.API.csproj", "VietTuneArchive/"]
COPY ["VietTuneArchive.Application/VietTuneArchive.Application.csproj", "VietTuneArchive.Application/"]
COPY ["VietTuneArchive.Domain/VietTuneArchive.Domain.csproj", "VietTuneArchive.Domain/"]

# Restore dự án
RUN dotnet restore "VietTuneArchive/VietTuneArchive.API.csproj"

# Copy toàn bộ code
COPY . .

# Chuyển vào thư mục vật lý VietTuneArchive để build
WORKDIR "/src/VietTuneArchive"
RUN dotnet build "VietTuneArchive.API.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "VietTuneArchive.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Giai đoạn Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

COPY VietTuneArchive/Assets ./Assets

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "VietTuneArchive.API.dll"]