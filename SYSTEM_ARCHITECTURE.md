# Breakpoint BI - System Architecture

## Executive Summary

**Breakpoint BI** (also known as **Pool Brain Intelligence**) is a comprehensive business intelligence and operations management platform designed specifically for commercial pool service companies. It serves as a central command center that integrates with Pool Brain (the field service management system) while adding powerful features for estimate management, technician oversight, fleet tracking, and operational analytics.

---

## What The App Does

### Core Purpose
Transform raw operational data from pool service operations into actionable intelligence, streamlined workflows, and automated processes.

### Key Value Propositions
1. **Estimate Workflow Management** - Full lifecycle from draft to invoice with approval tracking
2. **Supervisor Oversight** - Monitor and manage field technicians with activity tracking
3. **Emergency Response** - Track urgent issues and convert them to estimates or invoices
4. **Field Tech Synchronization** - Mobile app API for technicians to submit entries
5. **Fleet & Inventory Management** - Vehicle maintenance and per-truck inventory
6. **Customer Intelligence** - Property profiles, equipment tracking, billing contacts

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 USERS                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Supervisors │  │ Repair Techs│  │Service Techs│  │   Office    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                                │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        38 PAGES / FEATURES                                │   │
│  │                                                                           │   │
│  │  Dashboard ─────────── Overview metrics, alerts, quick stats             │   │
│  │  Estimates ─────────── Full workflow: Draft→Approved→Scheduled→Invoiced  │   │
│  │  Emergencies ───────── Urgent work tracking, conversion to estimates     │   │
│  │  Tech Ops ──────────── Field tech service entry submissions              │   │
│  │  Supervisor Teams ──── Team management, activity monitoring              │   │
│  │  Jobs ──────────────── Pool Brain jobs display                           │   │
│  │  Customers ─────────── Customer/property management                      │   │
│  │  Equipment ─────────── PM schedules, service records                     │   │
│  │  Scheduling ────────── Route management, technician assignments          │   │
│  │  Fleet ─────────────── Vehicle maintenance, truck inventory              │   │
│  │  Payroll ───────────── Pay periods, technician earnings                  │   │
│  │  Intelligence ──────── AI chat assistant                                 │   │
│  │  Settings ──────────── API configuration, system preferences             │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  UI: shadcn/ui + Radix UI + Tailwind CSS                                        │
│  State: TanStack Query (React Query)                                            │
│  Routing: wouter                                                                │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │
                                 │ REST API (HTTP/JSON)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Express.js / Node.js)                          │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         24 API ROUTE MODULES                              │   │
│  │                                                                           │   │
│  │  Core Business Logic:                                                     │   │
│  │  ├── estimates.ts ────── Estimate CRUD, workflow transitions, scheduling │   │
│  │  ├── emergencies.ts ──── Emergency tracking, conversion workflows        │   │
│  │  ├── serviceRepairs.ts ─ Sub-$500 repair jobs, batch-to-estimate         │   │
│  │  ├── techOps.ts ──────── Field tech entry management                     │   │
│  │  └── supervisorActivity.ts ─ Supervisor action logging                   │   │
│  │                                                                           │   │
│  │  Pool Brain Integration:                                                  │   │
│  │  ├── alerts.ts ───────── Alert fetching, enrichment, chemical orders     │   │
│  │  ├── jobs.ts ─────────── Pool Brain job aggregation                      │   │
│  │  ├── customers.ts ────── Customer/property/pool data                     │   │
│  │  ├── technicians.ts ──── Technician sync and management                  │   │
│  │  └── sync.ts ─────────── Field Tech mobile app API                       │   │
│  │                                                                           │   │
│  │  Operations:                                                              │   │
│  │  ├── scheduling.ts ───── Route scheduling, assignments                   │   │
│  │  ├── fleet.ts ────────── Fleet trucks, inventory                         │   │
│  │  ├── payroll.ts ──────── Pay periods, entries                            │   │
│  │  ├── pm.ts ───────────── Preventive maintenance                          │   │
│  │  └── properties.ts ───── Property profiles, repair summaries             │   │
│  │                                                                           │   │
│  │  Support:                                                                 │   │
│  │  ├── chat.ts ─────────── AI chat proxy                                   │   │
│  │  ├── channels.ts ─────── Team messaging                                  │   │
│  │  ├── dashboard.ts ────── Overview metrics                                │   │
│  │  ├── estimateHistory.ts ─ Audit trail logging                            │   │
│  │  ├── quickbooks.ts ───── QuickBooks OAuth integration                    │   │
│  │  ├── reports.ts ──────── Report generation                               │   │
│  │  └── settings.ts ─────── Configuration management                        │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Session: connect-pg-simple (PostgreSQL-backed)                                 │
│  ORM: Drizzle                                                                   │
└───────────┬─────────────────────────────────────┬───────────────────────────────┘
            │                                     │
            ▼                                     ▼
┌───────────────────────────────┐   ┌─────────────────────────────────────────────┐
│    PostgreSQL (Neon)          │   │           EXTERNAL SERVICES                  │
│    Drizzle ORM                │   │                                              │
│                               │   │  ┌─────────────────────────────────────────┐ │
│  55+ Database Tables:         │   │  │  Pool Brain API                         │ │
│                               │   │  │  https://prodapi.poolbrain.com          │ │
│  Core:                        │   │  │  - Technicians, Jobs, Customers         │ │
│  ├── estimates               │   │  │  - Alerts, Pools, Schedules             │ │
│  ├── emergencies             │   │  └─────────────────────────────────────────┘ │
│  ├── service_repair_jobs     │   │                                              │
│  ├── tech_ops_entries        │   │  ┌─────────────────────────────────────────┐ │
│  ├── supervisor_activity     │   │  │  QuickBooks Online                      │ │
│  └── estimate_history_log    │   │  │  OAuth 2.0 Integration                  │ │
│                               │   │  │  - Invoice sync                         │ │
│  People:                      │   │  └─────────────────────────────────────────┘ │
│  ├── technicians             │   │                                              │
│  ├── customers               │   │  ┌─────────────────────────────────────────┐ │
│  ├── customer_contacts       │   │  │  Azure/Outlook                          │ │
│  └── customer_tags           │   │  │  - Email compose URLs                   │ │
│                               │   │  │  - Chemical order automation           │ │
│  Properties:                  │   │  └─────────────────────────────────────────┘ │
│  ├── properties              │   │                                              │
│  ├── pools                   │   │  ┌─────────────────────────────────────────┐ │
│  ├── equipment               │   │  │  AI Chat Service                        │ │
│  ├── property_billing_contacts│  │  │  ace-breakpoint-app proxy              │ │
│  └── property_access_notes   │   │  │  - Conversational assistant            │ │
│                               │   │  └─────────────────────────────────────────┘ │
│  Operations:                  │   │                                              │
│  ├── routes                  │   │  ┌─────────────────────────────────────────┐ │
│  ├── route_stops             │   │  │  Object Storage (Replit)               │ │
│  ├── fleet_trucks            │   │  │  - Photo attachments                    │ │
│  ├── fleet_maintenance_records│  │  │  - Document storage                     │ │
│  ├── truck_inventory         │   │  └─────────────────────────────────────────┘ │
│  └── pm_service_records      │   │                                              │
│                               │   └─────────────────────────────────────────────┘
│  Communication:               │
│  ├── channels                │
│  ├── channel_messages        │
│  ├── threads                 │
│  └── chat_messages           │
│                               │
└───────────────────────────────┘
```

---

## Complete Feature List

### 1. Dashboard
- **Overview Metrics**: Estimates by status, open emergencies, technician counts
- **Real-time Feed**: Live alerts from Pool Brain
- **Quick Navigation**: Access to key areas

### 2. Estimates Management
**Full Workflow Pipeline:**
```
Draft → Pending Approval → Approved → Needs Scheduling → Scheduled → In Progress → Completed → Ready to Invoice → Invoiced
```

**Features:**
- Create estimates from alerts, emergencies, or manually
- Send for customer approval via email
- Track verbal approvals (phone)
- Schedule to repair technicians with date
- Line item management (parts, labor, materials)
- Photo attachments
- Source tracking (Service Tech, Repair Tech, Supervisor, Customer Request, Emergency/SOS)
- Full audit history log
- PDF/Excel export
- Metrics dashboard (approval rates, values by status)

### 3. Emergencies (SOS)
**Workflow:**
```
Pending Review → In Progress → Resolved
                      │
                      ├── Convert to Estimate
                      └── Invoice Directly
```

**Features:**
- Track urgent follow-up work
- Assign to technicians
- Convert to full estimate with atomic transaction
- Invoice directly for small jobs
- Track source and conversion status

### 4. Tech Ops (Field Tech Submissions)
**Entry Types:**
- Repairs Needed
- Chemicals Drop-Off
- Windy Day Clean Up
- Check-In (Inspected Property)
- Valve Maintenance
- PM (Preventive Maintenance)

**Features:**
- Field technicians submit via mobile
- Photo attachments
- Supervisor review workflow
- Convert to estimates

### 5. Supervisor Teams
**Features:**
- Team assignment (supervisors → technicians)
- Activity tracking:
  - Inspected Property
  - Assignments Created
  - Not Completed Resolved
  - Need Assistance Resolved
  - Dismissed
- Supervisor Profile with performance metrics
- Filterable activity log with date range
- CSV export

### 6. Jobs (Pool Brain Integration)
**Features:**
- View jobs from Pool Brain API
- Repair technician grouping
- Job value tracking
- Account-based organization
- Completion status tracking

### 7. Service Repairs
**Features:**
- Sub-$500 repair jobs
- Batch multiple jobs into single estimate
- Quick conversion workflow

### 8. Customers & Properties
**Features:**
- Customer/HOA profiles
- Property profiles with:
  - Billing contacts
  - Access notes
  - Equipment inventory
  - Pool details
- Customer tags (categorization)
- Repair price lookup
- Contact management

### 9. Equipment & PM
**Features:**
- Equipment inventory per property
- PM (Preventive Maintenance) schedules
- Service types (weekly, monthly, quarterly, annual)
- Service records with dates
- Status badges: Critical, Overdue, Due Soon, Current, Paused

### 10. Scheduling
**Features:**
- Route management
- Technician assignments by day
- Route stops with ordering
- Unscheduled items queue
- Visit tracking

### 11. Fleet Management
**Features:**
- Fleet truck profiles
- Maintenance records
- Per-truck inventory
- Low stock alerts
- Category filtering
- Quantity controls

### 12. Payroll
**Features:**
- Pay period management
- Technician entries
- Job value summaries
- Monthly quotas

### 13. Communication
**Features:**
- Team channels
- Threaded messages
- Property-specific channels
- Read receipts
- AI chat assistant (Intelligence page)

### 14. Integrations
- **QuickBooks**: OAuth connection for invoicing
- **Pool Brain API**: Sync technicians, jobs, customers, alerts
- **Outlook/Azure**: Email automation for chemical orders
- **Object Storage**: Photo/document uploads

### 15. Field Tech Sync API
**Endpoint:** `/api/sync/*`
- Mobile app synchronization
- Push field entries
- Pull assigned work
- Offline-capable design

---

## Data Flow Diagrams

### Estimate Lifecycle Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Alert     │────▶│   Draft     │────▶│  Pending    │────▶│  Approved   │
│  (trigger)  │     │  Estimate   │     │  Approval   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                                                                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Invoiced   │◀────│  Ready to   │◀────│  Completed  │◀────│  Scheduled  │
│             │     │   Invoice   │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                    │
                                                                    ▼
                                                            ┌─────────────┐
                                                            │ In Progress │
                                                            └─────────────┘
```

### Pool Brain Data Flow
```
┌──────────────────────┐
│   Pool Brain API     │
│  (External System)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BREAKPOINT BI BACKEND                             │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                     AGGREGATION LAYER                            │ │
│  │                                                                  │ │
│  │  alerts_list ─────────────┐                                      │ │
│  │  customer_detail ─────────┼───▶ Enriched Alerts (joined data)   │ │
│  │  customer_pool_details ───┤                                      │ │
│  │  customer_notes ──────────┘                                      │ │
│  │                                                                  │ │
│  │  technician_detail ────────────▶ Technician List (synced)       │ │
│  │                                                                  │ │
│  │  one_time_jobs ────────────────▶ Jobs Page Display              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                     │                                 │
│                                     ▼                                 │
│                           ┌─────────────────┐                        │
│                           │   PostgreSQL    │                        │
│                           │   (Cache)       │                        │
│                           └─────────────────┘                        │
└──────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │    FRONTEND     │
                            └─────────────────┘
```

### Emergency Conversion Flow
```
┌─────────────────┐
│    Emergency    │
│  (Urgent Work)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pending Review  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  In Progress    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────────────┐
│Convert│ │Invoice        │
│  to   │ │Directly       │
│Estimate│ │(Small Jobs)   │
└───┬───┘ └───────┬───────┘
    │             │
    ▼             ▼
┌───────┐     ┌───────┐
│Estimate│     │Resolved│
│Created │     │        │
└───────┘     └───────┘
```

---

## User Roles

| Role | Description | Key Access |
|------|-------------|------------|
| **Supervisor** | Oversees field technicians | Team management, activity tracking, estimates, assignments |
| **Repair Technician** | Handles larger repair jobs | Assigned estimates, job completion, photos |
| **Service Technician** | Daily route service | Tech Ops entries, route visits, PM |
| **Repair Foreman** | Leads repair team | Repair queue, team coordination |
| **Office Staff** | Administrative | Full system access, estimates, invoicing |

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI components |
| Build | Vite | Fast development, production builds |
| Routing | wouter | Client-side navigation |
| State | TanStack Query | Server state, caching |
| UI Components | shadcn/ui + Radix UI | Accessible primitives |
| Styling | Tailwind CSS | Utility-first CSS |
| Backend | Express.js (Node.js) | REST API server |
| ORM | Drizzle | Type-safe database queries |
| Database | PostgreSQL (Neon) | Serverless PostgreSQL |
| Sessions | connect-pg-simple | Database-backed sessions |
| Storage | Replit Object Storage | File uploads |

---

## Design System

### Brand Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Azure Blue | `#0078D4` | Primary, navigation, headers |
| Vivid Tangerine | `#FF8000` | CTAs, buttons, highlights |
| Tropical Teal | `#17BEBB` | Accents, source tags |
| Mint Green | `#16A679` | Success, approved states |
| Red | `#EF4444` | Errors, critical, deleted |

### Typography
- **Font**: Inter (system-ui fallback)
- **Style**: Clean, modern, professional

### Components
- White cards with subtle shadows
- Rounded-lg borders (8px)
- 200ms smooth transitions
- Badge/pill indicators

---

## Database Tables (55+ Tables)

### Core Business
| Table | Purpose |
|-------|---------|
| `estimates` | Full estimate records with workflow status |
| `estimate_history_log` | Audit trail for all estimate changes |
| `emergencies` | Urgent work tracking |
| `service_repair_jobs` | Sub-$500 repair jobs |
| `tech_ops_entries` | Field tech submissions |

### People
| Table | Purpose |
|-------|---------|
| `technicians` | All technician records (synced from Pool Brain) |
| `supervisor_activity` | Supervisor action logging |
| `customers` | Customer/HOA records |
| `customer_contacts` | Contact information |
| `customer_tags` | Tag definitions |
| `customer_tag_assignments` | Tag-to-customer mappings |

### Properties
| Table | Purpose |
|-------|---------|
| `properties` | Property profiles |
| `pools` | Pool records per property |
| `equipment` | Equipment inventory |
| `property_billing_contacts` | Billing contact info |
| `property_access_notes` | Access instructions |
| `property_contacts` | Property-specific contacts |

### Operations
| Table | Purpose |
|-------|---------|
| `routes` | Service routes |
| `route_stops` | Stops on routes |
| `route_assignments` | Technician-to-route assignments |
| `pm_service_types` | PM service definitions |
| `pm_service_records` | PM completion records |
| `equipment_pm_schedules` | PM schedule assignments |
| `service_occurrences` | Service visit records |

### Fleet
| Table | Purpose |
|-------|---------|
| `fleet_trucks` | Vehicle records |
| `fleet_maintenance_records` | Maintenance history |
| `truck_inventory` | Per-truck inventory items |

### Finance
| Table | Purpose |
|-------|---------|
| `pay_periods` | Payroll periods |
| `payroll_entries` | Technician pay entries |
| `quickbooks_tokens` | OAuth credentials |

### Communication
| Table | Purpose |
|-------|---------|
| `channels` | Team messaging channels |
| `property_channels` | Property-specific channels |
| `channel_messages` | Messages in channels |
| `channel_reactions` | Message reactions |
| `channel_reads` | Read tracking |
| `threads` | Message threads |
| `thread_messages` | Threaded replies |
| `chat_messages` | AI assistant history |

### System
| Table | Purpose |
|-------|---------|
| `settings` | Configuration |
| `alerts` | Cached Pool Brain alerts |
| `archived_alerts` | Hidden/archived items |
| `completed_alerts` | Completed alert tracking |
| `workflows` | Automation definitions |

---

## API Endpoints Summary

### Estimates
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/estimates` | GET | List all estimates |
| `/api/estimates` | POST | Create new estimate |
| `/api/estimates/:id` | PUT | Update estimate |
| `/api/estimates/:id/send-for-approval` | POST | Send to customer |
| `/api/estimates/:id/approve` | POST | Mark approved |
| `/api/estimates/:id/verbal-approval` | POST | Record phone approval |
| `/api/estimates/:id/schedule` | POST | Assign to technician |
| `/api/estimates/:id/complete` | POST | Mark completed |
| `/api/estimates/:id/ready-to-invoice` | POST | Ready for billing |
| `/api/estimates/:id/invoice` | POST | Mark invoiced |
| `/api/estimates/:id/history` | GET | Get audit log |

### Emergencies
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/emergencies` | GET | List emergencies |
| `/api/emergencies` | POST | Create emergency |
| `/api/emergencies/:id` | PUT | Update emergency |
| `/api/emergencies/:id/convert-to-estimate` | POST | Convert to estimate |
| `/api/emergencies/:id/resolve` | POST | Mark resolved |

### Tech Ops
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tech-ops` | GET | List entries |
| `/api/tech-ops` | POST | Create entry |
| `/api/tech-ops/:id` | PUT | Update entry |
| `/api/tech-ops/:id` | DELETE | Delete entry |

### Supervisors
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/supervisor-activity` | GET | List activities |
| `/api/supervisor-activity` | POST | Log activity |
| `/api/supervisor-activity/profile/:id` | GET | Get supervisor profile |
| `/api/supervisor-activity/export/:id` | GET | Export CSV |

### Sync (Mobile App)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sync/technician/:id` | GET | Get technician data |
| `/api/sync/entries` | POST | Submit field entries |
| `/api/sync/estimates` | GET | Get assigned estimates |

### Pool Brain Proxy
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/jobs` | GET | Fetch jobs from Pool Brain |
| `/api/technicians` | GET | Sync technicians |
| `/api/customers` | GET | Fetch customers |
| `/api/alerts` | GET | Fetch enriched alerts |

---

## Known Architecture Notes

### Data Separation
- **Pool Brain Jobs**: Fetched live from external API, displayed in Jobs page
- **Internal Estimates**: Stored in PostgreSQL, managed through Estimates page
- **Gap**: Scheduled estimates don't automatically appear in Jobs (different data sources)

### Session Management
- PostgreSQL-backed sessions via connect-pg-simple
- Supports authenticated workflows

### Caching Strategy
- Pool Brain data cached in PostgreSQL for performance
- TanStack Query handles frontend caching with configurable stale times

---

## All Pages (38 Total)

| Page | File | Description |
|------|------|-------------|
| Dashboard | `Dashboard.tsx` | Main overview with metrics |
| Estimates | `Estimates.tsx` | Full estimate workflow management |
| Estimate Approval | `EstimateApproval.tsx` | Customer approval interface |
| Estimate History | `EstimateHistory.tsx` | Audit trail viewer |
| Emergencies | `Emergencies.tsx` | SOS/urgent work tracking |
| Tech Ops | `TechOps.tsx` | Field tech entries by type |
| Tech Ops Landing | `TechOpsLanding.tsx` | Entry type selection |
| Supervisor Teams | `SupervisorTeams.tsx` | Team management |
| Tech Supervisor | `TechSupervisor.tsx` | Supervisor dashboard |
| Tech Foreman | `TechForeman.tsx` | Repair foreman view |
| Repair Techs | `RepairTechs.tsx` | Repair technician list |
| Service Techs | `ServiceTechs.tsx` | Service technician list |
| Jobs | `Jobs.tsx` | Pool Brain jobs view |
| Repairs | `Repairs.tsx` | Repair tracking |
| Repair Queue | `RepairQueue.tsx` | Repair assignment queue |
| Service Repairs | `ServiceRepairs.tsx` | Sub-$500 jobs |
| Customers | `Customers.tsx` | Customer management |
| Account Details | `AccountDetails.tsx` | Customer profile |
| Property Profiles | `PropertyProfiles.tsx` | Property details |
| Property Repair Prices | `PropertyRepairPrices.tsx` | Price lookup |
| Equipment | `Equipment.tsx` | Equipment inventory |
| Equipment Reports | `EquipmentReports.tsx` | PM reports |
| Scheduling | `Scheduling.tsx` | Route management |
| Visits | `Visits.tsx` | Visit tracking |
| Fleet | `Fleet.tsx` | Vehicle management |
| Truck Inventory | `TruckInventory.tsx` | Per-truck inventory |
| Payroll | `Payroll.tsx` | Pay period management |
| Operations | `Operations.tsx` | Operations overview |
| Chemicals | `Chemicals.tsx` | Chemical ordering |
| Channels | `Channels.tsx` | Team messaging |
| Chat | `Chat.tsx` | AI chat interface |
| Chat Hubs | `ChatHubs.tsx` | Chat management |
| Intelligence | `Intelligence.tsx` | AI assistant |
| Automations | `Automations.tsx` | Workflow automation |
| Settings | `Settings.tsx` | System configuration |

---

## Deployment

**Platform**: Render (or Replit for development)

**Build Command:**
```bash
npm install && npm run db:migrate && npm run build
```

**Start Command:**
```bash
npm run start
```

**Environment Variables Required:**
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `POOLBRAIN_ACCESS_KEY` | Pool Brain API key |
| `POOLBRAIN_COMPANY_ID` | Pool Brain company ID |
| `QUICKBOOKS_CLIENT_ID` | QuickBooks OAuth |
| `QUICKBOOKS_CLIENT_SECRET` | QuickBooks OAuth |
| `AZURE_CLIENT_ID` | Azure/Outlook integration |
| `AZURE_CLIENT_SECRET` | Azure/Outlook integration |
| `AZURE_TENANT_ID` | Azure/Outlook integration |
| `RESEND_API_KEY` | Email service |

---

## Summary

Breakpoint BI is a comprehensive operations management platform that:

1. **Integrates** with Pool Brain for live field service data
2. **Manages** the complete estimate lifecycle from creation to invoice
3. **Tracks** emergencies and service repairs with conversion workflows
4. **Monitors** supervisor and technician activity
5. **Syncs** with mobile field tech apps
6. **Organizes** customer and property information
7. **Maintains** fleet vehicles and inventory
8. **Automates** communication and chemical ordering
9. **Connects** to QuickBooks for billing

The platform serves as the operational command center for commercial pool service companies, providing visibility, automation, and control over all aspects of the business.
