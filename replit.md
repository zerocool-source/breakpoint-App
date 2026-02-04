# Breakpoint BI - Pool Brain Intelligence

## Overview

Breakpoint BI is a business intelligence and automation platform for commercial pool management companies. It integrates with the Pool Brain API to fetch and analyze pool alerts, customer data, and operational metrics. The application provides AI-powered insights, automated workflow generation (particularly for chemical ordering via email), and a conversational AI assistant for pool operations management.

**Tech Stack:**
- Frontend: React + TypeScript with Vite
- Backend: Express.js (Node.js)
- Database: PostgreSQL via Neon Serverless
- ORM: Drizzle
- UI: shadcn/ui components with Radix UI primitives
- Styling: Tailwind CSS with ClickUp-inspired design system
- AI: External chat API (ace-breakpoint-app proxy)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component Structure:**
- **Layout System:** Collapsed icon-bar sidebar (68px) with hover flyout panels, QuickBooks-style navigation. Main content area uses full page width.
- **Sidebar Navigation:** Dark navy (#1e3a5f) icon bar with white icons. Hover to reveal flyout panels with section names and sub-items. Active icon highlighted with orange left border.
- **Page-Based Routing:** Using wouter for client-side routing
- **Design System:** ClickUp-inspired modern UI with Royal Blue (#1E3A8A) primary, Orange (#F97316) secondary, Baby Blue (#60A5FA) accent colors. Inter font family, clean white cards with subtle shadows, rounded-lg borders, and smooth 200ms transitions
- **State Management:** TanStack Query (React Query) for server state, local React state for UI interactions
- **Key Features:**
  - Dashboard with real-time alert feed
  - Intelligence/Chat interface for AI interactions
  - Automations page for workflow management (email generation)
  - Settings page for API configuration
  - **Operations page** - Dedicated page for managing repairs and service alerts grouped by property
  - **Equipment Notes** (under Properties) - Comprehensive equipment tracking with PM schedules, service records, and maintenance status badges (Critical, Overdue, Due Soon, Current, Paused)
  - **Equipment Tracker** (under Properties) - QuickBooks-style metrics dashboard for equipment
  - **Fleet Management** (expandable nav):
    - Fleet Dashboard - Truck management, service records, maintenance tracking
    - Truck Inventory - Per-truck inventory management with low stock alerts, quantity controls, category filtering
  - **Service Center** - Comprehensive service operations management with three tabs:
    - Windy Day Clean Up - Property-grouped entries with filtering
    - Report Issues - Table format with expandable rows, comprehensive filtering (property search, position type, technician, status, priority, issue type, date range), photo thumbnails, resolution tracking
    - Emergencies - Priority-based emergency tracking with workflow actions
  - **Communication Hub** - Multi-department messaging system:
    - Department Channels: Office (General, Estimates, Parts & Supplies), Dispatch (Scheduling, Route Changes, Emergency), HR (Time Off Requests, Benefits, Training)
    - Property Channels: Organized by category (Residential, Commercial, HOA, Municipal)
    - Collapsible sections with expand/collapse functionality
    - Threaded messaging with reactions, pins, and member tracking
    - Note: Access control (isPrivate/allowedRoles) displayed but not enforced server-side yet

**Rationale:** Page-based architecture provides clear separation of concerns. TanStack Query handles caching and real-time data synchronization automatically. The custom theme creates a distinctive brand identity for the pool management industry.

### Backend Architecture

**Server Setup:**
- Development: Vite dev server with Express middleware
- Production: Static build with Express serving bundled assets
- Session Management: connect-pg-simple for PostgreSQL-backed sessions

**API Routes (Modular Structure):**
Routes are organized into domain-specific modules in `server/routes/`:
- `alerts.ts` - Alert CRUD, enriched alerts, chemical order emails, Outlook integration
- `jobs.ts` - Job management, repairs extraction, scheduling
- `customers.ts` - Customer CRUD, properties, contacts, equipment, pools
- `technicians.ts` - Technician management, Pool Brain sync
- `chat.ts` - AI chat proxy, conversation history
- `fleet.ts` - Fleet trucks, maintenance records, inventory
- `scheduling.ts` - Route scheduling, stops, unscheduled items, seasonal visit days:
    - Properties can have separate summer and winter visit day schedules
    - Active season determines which schedule is used for route generation
    - Backend auto-selects summerVisitDays or winterVisitDays based on activeSeason
- `settings.ts` - API configuration, global active season toggle:
    - GET /api/settings/active-season - Returns current global season
    - POST /api/settings/switch-all-season - Bulk updates all property schedules to specified season
- `payroll.ts` - Pay periods, payroll entries
- `channels.ts` - Communication channels, threads, messages
- `pm.ts` - Preventive maintenance schedules, service types
- `sync.ts` - Field Tech Sync API for mobile app
- `properties.ts` - Property repair summaries
- `estimates.ts` - Estimate management with enhanced workflow:
    - Workflow: Draft → Pending Approval → Approved → Needs Scheduling → Scheduled → Completed → Ready to Invoice → Invoiced
    - Auto-generated estimate numbers in format `YY-NNNNN` (e.g., 26-00001 for year 2026)
    - Dedicated endpoints for each workflow transition: /approve, /reject, /schedule, /complete, /ready-to-invoice, /invoice
    - Metrics dashboard showing approval rate, values by status, average times
    - Scheduling modal for assigning jobs to repair technicians
    - **Work Order Conversion Tracking**: When converting Work Orders to Estimates, tracks `convertedByUserName` and `convertedAt` fields. Uses `formData.officeMemberName` or defaults to "Office Staff"
- `serviceRepairs.ts` - Service repair jobs management (sub-$500 jobs), batch-to-estimate workflow
- `techOps.ts` - Technician operations: service repairs, windy day cleanups, report issues with conversion tracking
    - Service repairs can be converted to estimates via multi-select
    - Converted repairs tracked with convertedToEstimateId and convertedAt fields
    - Estimates store sourceServiceRepairIds array for bidirectional linking
    - Report Issues tracked with positionType, issueTitle, and resolution fields
    - Position types: service_technician, supervisor, repair_technician
    - Issue types: equipment_problem, safety_concern, access_issue, customer_complaint, other
- `emergencies.ts` - Emergency tracking for urgent follow-up work:
    - Workflow: pending_review → in_progress → resolved
    - Convert to Estimate or Invoice Directly actions with atomic transactions
    - Tracks source type, totalAmount, and conversion status
    - Integrates with Estimates via sourceEmergencyId tracking

**Data Flow:**
1. Pool Brain API client fetches raw alerts, customers, and pool data
2. Backend joins data across multiple Pool Brain endpoints (alerts_list, customer_detail, customer_pool_details, customer_notes)
3. Enriched data is cached in PostgreSQL for performance
4. Frontend displays enriched alerts with full context

**Rationale:** The backend acts as an aggregation layer, reducing frontend complexity and API calls. Joining Pool Brain data server-side provides better performance and allows caching. The proxy pattern for AI chat keeps API keys secure.

### Database Schema

**Core Tables:**
- `settings` - System configuration (API keys, default AI model)
- `alerts` - Cached alert data from Pool Brain
- `workflows` - Automation workflow definitions
- `customers` - Customer/HOA information cache
- `chat_messages` - AI conversation history

**Storage Pattern:** DbStorage class implements IStorage interface for database operations. This abstraction allows for potential storage backend swaps.

**Rationale:** Caching Pool Brain data locally reduces API calls and improves performance. The settings table allows both environment variable and database configuration. Chat history enables conversation context for AI interactions.

### External Dependencies

**Pool Brain API:**
- Base URL: `https://prodapi.poolbrain.com`
- Authentication: ACCESS-KEY header + optional COMPANY-ID header
- Key Endpoints: `/v2/alerts_list`, `/v2/customer_detail`, `/v2/customer_pool_details`, `/v2/customer_notes`
- Data Model: Alerts linked to pools via poolId, pools linked to customers via customerId

**API v2 (Breakpoint Mobile API):**
- Base URL: `https://breakpoint-api-v2.onrender.com`
- Purpose: User authentication for mobile app login
- Backend proxy routes in `server/routes/apiv2.ts` forward requests with Authorization headers
- Technician Creation Strategy:
  - CREATE: Dual-write to both API v2 (for mobile app auth) AND local database (for operational data)
  - READ: Fetches from local database (technicians table) for list display
  - UPDATE/DELETE: Local database only (IDs are not synchronized between systems)
- Required fields for new technicians: email, password (min 6 chars), firstName, lastName
- Optional fields: phone, region

**Neon PostgreSQL:**
- Serverless PostgreSQL database
- Connection via `@neondatabase/serverless` with WebSocket support
- Drizzle ORM for type-safe queries

**AI Service (Ace Assistant):**
- Uses OpenAI API (gpt-5-mini model) for AI chat responses
- Full dashboard awareness: AI has real-time visibility into all business data including:
  - Estimates (draft, pending, approved, scheduled, completed, ready to invoice)
  - Service repairs and their status
  - Emergencies and alerts (including urgent/critical priorities)
  - Technician assignments and team composition
  - Customer properties
  - Report issues and windy day cleanups
- Context gathering happens on each chat request for up-to-date information
- Supports conversation context for multi-turn interactions

**Email Generation:**
- Outlook compose URL pattern for pre-filled emails
- Chemical order template matches company formatting standards
- Bulk ordering workflow aggregates multiple properties

**shadcn/ui + Radix UI:**
- Accessible component primitives (Dialog, Dropdown, Tooltip, etc.)
- Customized with Breakpoint brand colors and typography
- "New York" style variant selected

**Rationale:** Pool Brain provides the source of truth for operational data. Neon offers low-latency serverless PostgreSQL without infrastructure management. The external AI service separation allows independent scaling and model updates. Email automation via Outlook URLs avoids SMTP complexity while maintaining familiar UX.

## Deployment (Render)

### Database Migrations

This project uses Drizzle ORM with a migration-based workflow for production deployments.

**Scripts:**
- `npm run db:generate` - Generate migration files from schema changes (run locally)
- `npm run db:migrate` - Apply migrations to database (non-interactive, CI-safe, handles existing tables gracefully)
- `npm run db:push` - Push schema directly (interactive, development only)

**One-time setup (run in Replit before first deploy):**
```bash
npm run db:generate
git add drizzle/
git commit -m "Add database migrations"
git push
```

**When you change the schema:**
```bash
npm run db:generate
git add drizzle/
git commit -m "Add migration for [description]"
git push
```

**Render Build Command:**
```
npm install && npm run db:migrate && npm run build
```

**Render Start Command:**
```
npm run start
```

Migration files are stored in `drizzle/` and must be committed to the repository.