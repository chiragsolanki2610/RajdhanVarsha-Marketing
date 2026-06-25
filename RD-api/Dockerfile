# Use the official Microsoft .NET SDK image to build the project
FROM mcr.microsoft.com/dotnet/sdk:8.0-jammy AS build
WORKDIR /src

# Copy everything from the RD-api folder into the container
COPY . .

# Move into the actual project folder where the .csproj lives and restore dependencies
WORKDIR /src/RegisterApi
RUN dotnet restore

# Build and publish a release variant from the project directory
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Use the lightweight ASP.NET Core runtime image for production
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .

# Render exposes traffic on port 8080 by default for Docker containers
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "RegisterApi.dll"]