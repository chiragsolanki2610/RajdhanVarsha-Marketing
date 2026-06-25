# Register API — ASP.NET Core 8

Auto-generates a unique User ID (`RD0001`, `RD0002`, …) and a secure random
password when a user registers. The user then logs in with those credentials
and receives a JWT token.

---

## Project structure

```
RegisterApi/
├── Controllers/
│   └── AuthController.cs       # POST /api/auth/register  &  /api/auth/login
├── Data/
│   └── AppDbContext.cs         # EF Core DbContext
├── DTOs/
│   └── UserDtos.cs             # Request / response shapes
├── Models/
│   └── User.cs                 # Database entity
├── Services/
│   ├── UserIdGenerator.cs      # Generates RD0001, RD0002 …
│   ├── PasswordService.cs      # Random password + BCrypt hashing
│   └── UserService.cs          # Business logic + JWT
├── appsettings.json
├── Program.cs
└── RegisterApi.csproj
```

---

## Quick start

### 1. Restore packages
```bash
dotnet restore
```

### 2. Configure `appsettings.json`
- Set your SQL Server connection string under `ConnectionStrings:DefaultConnection`
- Change `Jwt:Key` to a strong secret (≥ 32 characters)
- For local dev, swap to **SQLite** in Program.cs + .csproj (comments included)

### 3. Run migrations
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```
(Migrations also auto-run on startup in Development mode.)

### 4. Run the API
```bash
dotnet run
```
Open Swagger UI: `https://localhost:{port}/swagger`

---

## Endpoints

### `POST /api/auth/register`
**Request body:**
```json
{
  "fullName":   "Ravi Sharma",
  "email":      "ravi@example.com",
  "phone":      "9876543210",
  "address":    "Jaipur, Rajasthan",
  "department": "Engineering",
  "role":       "Developer"
}
```

**Response `201 Created`:**
```json
{
  "userId":            "RD0001",
  "generatedPassword": "mK7@tP2!qX",
  "fullName":          "Ravi Sharma",
  "email":             "ravi@example.com",
  "message":           "Registration successful. Save your credentials — the password won't be shown again."
}
```

> ⚠️ The plain-text password is returned **once only**. Store it securely or
> email it to the user immediately after registration.

---

### `POST /api/auth/login`
**Request body:**
```json
{
  "userId":   "RD0001",
  "password": "mK7@tP2!qX"
}
```

**Response `200 OK`:**
```json
{
  "userId":     "RD0001",
  "fullName":   "Ravi Sharma",
  "email":      "ravi@example.com",
  "role":       "Developer",
  "department": "Engineering",
  "token":      "<JWT token>",
  "message":    "Login successful"
}
```

---

## How the User ID is generated

`UserIdGenerator` queries the highest existing `RD####` number, increments it,
and zero-pads to 4 digits. A `SemaphoreSlim(1)` prevents duplicate IDs under
concurrent requests.

| Registered users | Next ID |
|-----------------|---------|
| 0               | RD0001  |
| 1               | RD0002  |
| 999             | RD1000  |

To use a different prefix (e.g. `EMP` or `USR`) just change the string in
`UserIdGenerator.cs`.

---

## Password rules
- 10 characters by default (configurable)
- At least 1 uppercase, 1 lowercase, 1 digit, 1 symbol
- Hashed with **BCrypt** (work factor 12) before storage
- Plain text is **never stored**
