# Linkpoint API System Architecture

## Overview

This document describes the complete API architecture, data flow, and system design for the Linkpoint Pool Service Management Admin Application.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  React Frontend (Vite)                                                       │
│  ├── Pages: Dashboard, TechOps, Customers, Estimates, Fleet, etc.           │
│  ├── TanStack Query for server state management                             │
│  ├── Wouter for routing                                                      │
│  └── shadcn/ui + Tailwind CSS for UI                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API LAYER (Express.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Authentication Middleware                                                   │
│  ├── Session-based auth (express-session + connect-pg-simple)               │
│  ├── Mobile API Key auth (X-MOBILE-KEY header)                              │
│  └── Custom auth routes (/api/auth/*)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Route Modules (server/routes/):                                             │
│  ├── techOps.ts      → /api/tech-ops/*                                      │
│  ├── customers.ts    → /api/customers/*                                     │
│  ├── estimates.ts    → /api/estimates/*                                     │
│  ├── scheduling.ts   → /api/scheduling/*                                    │
│  ├── fleet.ts        → /api/fleet/*                                         │
│  ├── dashboard.ts    → /api/dashboard/*                                     │
│  └── ... (20+ route modules)                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Drizzle ORM                                                                 │
│  ├── Schema: shared/schema.ts (1900+ lines, 30+ tables)                     │
│  ├── Type-safe queries with TypeScript                                      │
│  └── Zod validation for insert schemas                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  DbStorage (server/storage.ts)                                               │
│  ├── IStorage interface for all CRUD operations                             │
│  └── Abstraction layer over Drizzle queries                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Neon Serverless)                                                │
│  ├── SSL connections required                                               │
│  ├── Session storage (sessions table)                                       │
│  └── All application data                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### Admin Web Authentication

```
┌──────────┐     POST /api/auth/login      ┌──────────────┐
│  Browser │ ─────────────────────────────▶│   Express    │
│  (React) │     {email, password}         │   Server     │
└──────────┘                               └──────────────┘
                                                  │
                                                  ▼
                                           ┌──────────────┐
                                           │  bcrypt      │
                                           │  compare()   │
                                           └──────────────┘
                                                  │
                                                  ▼
                                           ┌──────────────┐
                                           │  Session     │
                                           │  Created     │
                                           └──────────────┘
                                                  │
                                                  ▼
┌──────────┐     Set-Cookie: session       ┌──────────────┐
│  Browser │ ◀─────────────────────────────│   Express    │
│  (React) │     + user JSON response      │   Server     │
└──────────┘                               └──────────────┘
```

### Mobile App Authentication

```
┌──────────────┐    POST /api/tech-ops     ┌──────────────┐
│  Mobile App  │ ─────────────────────────▶│   Express    │
│  (External)  │    X-MOBILE-KEY header    │   Server     │
└──────────────┘    + JSON body            └──────────────┘
                                                  │
                                                  ▼
                                           ┌──────────────┐
                                           │  Validate    │
                                           │  API Key     │
                                           └──────────────┘
                                                  │
                          ┌───────────────────────┴───────────────────────┐
                          ▼                                               ▼
                    ┌──────────┐                                    ┌──────────┐
                    │  Valid   │                                    │ Invalid  │
                    │  Key     │                                    │ Key      │
                    └──────────┘                                    └──────────┘
                          │                                               │
                          ▼                                               ▼
                    Process Request                                 401 Unauthorized
```

---

## Core API Endpoints

### Authentication APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login with email/password |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/user` | Get current authenticated user |
| POST | `/api/auth/register` | Register new admin user |

### Tech Ops APIs (Field Technician Submissions)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tech-ops` | List all tech ops entries |
| POST | `/api/tech-ops` | Create new entry (web) |
| POST | `/api/tech-ops/mobile` | Create entry from mobile app |
| DELETE | `/api/tech-ops/:id` | Delete entry |
| PATCH | `/api/tech-ops/:id/status` | Update entry status |

### Customer APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers |
| GET | `/api/customers/:id` | Get customer details |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer |

### Estimate APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/estimates` | List estimates |
| POST | `/api/estimates` | Create estimate |
| POST | `/api/estimates/:id/approve` | Approve estimate |
| POST | `/api/estimates/:id/schedule` | Schedule estimate |
| POST | `/api/estimates/:id/complete` | Mark complete |
| POST | `/api/estimates/:id/invoice` | Convert to invoice |

### Scheduling APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scheduling/routes` | Get route schedules |
| GET | `/api/scheduling/stops` | Get stops for route |
| POST | `/api/scheduling/assign` | Assign technician |

### Fleet APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/trucks` | List trucks |
| GET | `/api/fleet/trucks/:id/inventory` | Get truck inventory |
| POST | `/api/fleet/maintenance` | Log maintenance |

---

## Data Flow Examples

### 1. Mobile Tech Submits Repair Request

```
Mobile App                    Server                         Database
    │                           │                               │
    │  POST /api/tech-ops       │                               │
    │  X-MOBILE-KEY: xxx        │                               │
    │  {                        │                               │
    │    entryType: "repairs",  │                               │
    │    propertyId: "abc",     │                               │
    │    description: "...",    │                               │
    │    priority: "urgent"     │                               │
    │  }                        │                               │
    │ ─────────────────────────▶│                               │
    │                           │  Validate API Key             │
    │                           │  Validate Body                │
    │                           │                               │
    │                           │  INSERT INTO "TechOpsEntry"   │
    │                           │ ─────────────────────────────▶│
    │                           │                               │
    │                           │◀───────────── Created ────────│
    │                           │                               │
    │◀────── 201 Created ───────│                               │
    │        {id, ...}          │                               │
```

### 2. Admin Views Dashboard

```
Browser                       Server                         Database
    │                           │                               │
    │  GET /api/dashboard       │                               │
    │  Cookie: session=xxx      │                               │
    │ ─────────────────────────▶│                               │
    │                           │  Verify Session               │
    │                           │                               │
    │                           │  SELECT aggregations          │
    │                           │ ─────────────────────────────▶│
    │                           │                               │
    │                           │  - Tech ops count by type     │
    │                           │  - Estimates by status        │
    │                           │  - Recent activity            │
    │                           │◀───────────── Data ───────────│
    │                           │                               │
    │◀────── 200 OK ────────────│                               │
    │        {metrics...}       │                               │
```

### 3. Estimate Workflow

```
                    ┌─────────────┐
                    │   Draft     │
                    └──────┬──────┘
                           │ POST /approve
                           ▼
                    ┌─────────────┐
                    │  Pending    │
                    │  Approval   │
                    └──────┬──────┘
           ┌───────────────┴───────────────┐
           │ POST /reject                  │ POST /approve
           ▼                               ▼
    ┌─────────────┐                 ┌─────────────┐
    │  Rejected   │                 │  Approved   │
    └─────────────┘                 └──────┬──────┘
                                           │ POST /schedule
                                           ▼
                                    ┌─────────────┐
                                    │  Scheduled  │
                                    └──────┬──────┘
                                           │ POST /complete
                                           ▼
                                    ┌─────────────┐
                                    │  Completed  │
                                    └──────┬──────┘
                                           │ POST /ready-to-invoice
                                           ▼
                                    ┌─────────────┐
                                    │  Ready to   │
                                    │  Invoice    │
                                    └──────┬──────┘
                                           │ POST /invoice
                                           ▼
                                    ┌─────────────┐
                                    │  Invoiced   │
                                    └─────────────┘
```

---

## Database Schema (Key Tables)

### Core Tables

```
┌─────────────────────────────────────────────────────────────────┐
│ users                                                            │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)    │ email      │ password   │ role    │ is_active      │
│ first_name │ last_name  │ created_at │         │                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ customers                                                        │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)    │ name       │ type       │ email   │ phone          │
│ address    │ region     │ status     │         │                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TechOpsEntry                                                     │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)           │ entry_type        │ technician_name         │
│ technician_id     │ property_id       │ property_name           │
│ description       │ priority          │ status                  │
│ photos            │ created_at        │ resolved_at             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ estimates                                                        │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)           │ estimate_number   │ title                   │
│ property_id       │ property_name     │ total_amount            │
│ status            │ line_items        │ assigned_tech_id        │
│ scheduled_date    │ created_at        │ source_service_repair_ids│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ technicians                                                      │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)    │ name       │ email      │ phone   │ region         │
│ role       │ truck_number│ status    │         │                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for session encryption |
| `MOBILE_API_KEY` | API key for mobile app auth |
| `NODE_ENV` | Environment (development/production) |
| `VITE_API_URL` | API base URL for frontend |

---

## Mobile App Integration

The mobile app (Breakpoint field app) submits data via POST requests with API key authentication:

**Endpoint:** `POST /api/tech-ops/mobile`

**Headers:**
```
Content-Type: application/json
X-MOBILE-KEY: <MOBILE_API_KEY>
```

**Request Body:**
```json
{
  "entryType": "repairs_needed",
  "technicianName": "John Smith",
  "technicianId": "tech-123",
  "propertyId": "prop-456",
  "propertyName": "Sunset Community Pool",
  "description": "Pump motor making grinding noise",
  "priority": "urgent",
  "photos": ["https://..."]
}
```

**Entry Types:**
- `repairs_needed` - Equipment repairs
- `service_repairs` - Sub-$500 repair jobs
- `chemical_order` - Chemical requests
- `windy_day_cleanup` - Weather-related cleanup
- `report_issue` - Issue reports
- `supervisor_concerns` - Supervisor notes

---

## Server File Structure

```
server/
├── index.ts              # Production server entry
├── index-dev.ts          # Development server with Vite
├── db.ts                 # Database connection
├── seed.ts               # Data seeding on startup
├── storage.ts            # Storage interface (IStorage)
├── routes/               # API route modules
│   ├── techOps.ts        # Tech ops CRUD
│   ├── customers.ts      # Customer management
│   ├── estimates.ts      # Estimate workflow
│   ├── scheduling.ts     # Route scheduling
│   ├── fleet.ts          # Fleet management
│   ├── dashboard.ts      # Dashboard metrics
│   ├── technicians.ts    # Technician management
│   └── ... (20+ files)
└── replit_integrations/
    └── auth/
        ├── customAuth.ts # Authentication setup
        └── storage.ts    # Auth storage
```

---

## Production Deployment (Render)

**Build Command:**
```bash
npm install && npm run db:migrate && npm run build
```

**Start Command:**
```bash
npm run start
```

**Environment Variables Required:**
- `DATABASE_URL` (with sslmode=require)
- `SESSION_SECRET`
- `MOBILE_API_KEY`
- `NODE_ENV=production`
