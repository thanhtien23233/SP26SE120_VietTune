## Welcome to SEP490 Repository

### You will find in this repo the following stuff

- A comprehensive Vietnamese traditional music documentation system
- Modern React frontend with ASP.NET Core Web API backend
- Implementation of intelligent search with ethnomusicology metadata filtering
- Audio recording management and community verification functionality
- Traditional Vietnamese aesthetic UI/UX with cultural heritage design elements

### Technologies used

#### Front-end

- React 18 with TypeScript (strict typing and modern React patterns)
- Vite for fast build tooling and development server
- Tailwind CSS for utility-first, responsive styling
- Zustand for lightweight app state (auth, player, search stores)
- React Router (react-router-dom) for client-side navigation
- Axios for HTTP API integration
- React Hook Form for login/register form handling
- Lucide React for icons and lightweight SVG components
- Local UI patterns: portal-based dropdowns & modals, toast notifications, and extensive localStorage usage (demo auth, local recordings, offline flows)
- Tooling: ESLint + TypeScript checks, Prettier formatting, and Tailwind-based design tokens

#### Back-end

- .NET 8.0 (C#)
- ASP.NET Core Web API
- Entity Framework Core 9.0.9
- Microsoft SQL Server
- JWT Authentication (Microsoft.AspNetCore.Authentication.JwtBearer)
- Swagger/Swashbuckle for API documentation
- AutoMapper for object mapping
- BCrypt.Net-Next for password hashing
- Serilog for logging
- Clean Architecture (API, Application, Domain layers)

### API Features

- JWT authentication and role-based access control (ASP.NET Core Identity)
- Recording upload and metadata management system
- Advanced search by ethnicity, region, instruments, and ceremonial context
- Community-driven verification and curation
- Multi-role dashboard (User, Contributor, Researcher, Moderator, Admin)
- RESTful API architecture with comprehensive error handling
- Swagger UI for API documentation and testing
- CORS configuration for frontend integration
- Email service integration for notifications

### E2E (Playwright)

- Local / CI / staging (`PW_BASE_URL`, `E2E_CONTRIBUTOR_*`): **[docs/E2E-contributor-runbook.md](docs/E2E-contributor-runbook.md)** và [docs/PLAN-e2e-contributor-workflow.md](docs/PLAN-e2e-contributor-workflow.md).

#### Copyright © 2026 VietTune