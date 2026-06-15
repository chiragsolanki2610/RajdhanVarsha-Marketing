# Use the official Microsoft .NET SDK image to build the project
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy everything and restore dependencies
COPY . .
RUN dotnet restore

# Build and publish a release variant
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Use the lightweight ASP.NET Core runtime image for production
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .

# Render exposes traffic on port 8080 by default for Docker containers
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "RegisterApi.dll"]