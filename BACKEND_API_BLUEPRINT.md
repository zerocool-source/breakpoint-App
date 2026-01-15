# Backend API Blueprint - Breakpoint BI Pool Brain Intelligence

Generated: January 15, 2026

---

## A) Stack & Folder Map

### Framework & Libraries

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + Vite 7 | SPA with HMR |
| **Routing** | wouter | Client-side routing |
| **State** | TanStack React Query | Server state management |
| **Backend** | Express.js 4.21 | REST API server |
| **Database** | PostgreSQL (Neon Serverless) | Primary data store |
| **ORM** | Drizzle ORM 0.39 | Type-safe DB queries |
| **Validation** | Zod + drizzle-zod | Schema validation |
| **UI** | shadcn/ui + Radix UI | Component library |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |

### External APIs
- **Pool Brain API** (`https://prodapi.poolbrain.com`) - Source of truth for pools, customers, alerts, technicians
- **QuickBooks Online** - Invoice creation, OAuth integration
- **Ace Breakpoint App** - AI chat proxy (external Replit service)
- **Microsoft Graph** - Outlook email integration (via MSAL)
- **Google Cloud Storage** - Object storage for photos/attachments

### Folder Structure

```
├── client/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui primitives
│   │   │   ├── layout/     # AppLayout, navigation
│   │   │   └── dashboard/  # Dashboard widgets
│   │   ├── pages/          # Route pages (34 pages)
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities, query client
│   └── index.html          # App entry point
├── server/
│   ├── routes/             # Express route handlers (20 modules)
│   │   ├── alerts.ts       # Pool Brain alerts, chemical orders
│   │   ├── customers.ts    # Customer CRUD, Pool Brain sync
│   │   ├── estimates.ts    # Estimate workflow, approval tokens
│   │   ├── fleet.ts        # Fleet trucks, inventory
│   │   ├── jobs.ts         # Repair jobs from Pool Brain
│   │   ├── payroll.ts      # Pay periods, entries
│   │   ├── pm.ts           # Preventive maintenance
│   │   ├── properties.ts   # Property profiles
│   │   ├── quickbooks.ts   # QB OAuth, invoice creation
│   │   ├── scheduling.ts   # Routes, stops, assignments
│   │   ├── serviceRepairs.ts # Sub-$500 service repairs
│   │   ├── sync.ts         # Field Tech Sync API
│   │   ├── techOps.ts      # Tech Ops submissions
│   │   ├── technicians.ts  # Technician management
│   │   └── ...
│   ├── storage.ts          # IStorage interface implementation
│   ├── poolbrain-client.ts # Pool Brain API client
│   ├── db.ts               # Drizzle database connection
│   └── app.ts              # Express app setup
├── shared/
│   └── schema.ts           # Drizzle tables + Zod schemas
└── package.json
```

---

## B) Entities + Schema Details

### Core Entities (35+ tables)

#### 1. Settings
```typescript
settings {
  id: varchar PK (UUID)
  poolBrainApiKey: text
  poolBrainCompanyId: text
  defaultAiModel: text = "goss-20b"
  updatedAt: timestamp
}
```

#### 2. Customers
```typescript
customers {
  id: varchar PK (UUID)
  externalId: text              // Pool Brain CustomerID
  name: text NOT NULL
  email: text
  phone: text
  address, city, state, zip: text
  status: text = "active"       // Enum: active_routed, active_no_route, inactive, lead
  poolCount: integer = 0
  tags, notes: text
  chemicalsBudget: integer      // cents
  chemicalsBudgetPeriod: text = "monthly"
  repairsBudget: integer        // cents
  repairsBudgetPeriod: text = "monthly"
  createdAt, updatedAt: timestamp
}
```
**Relationships:** Has many pools, contacts, addresses, tag assignments

#### 3. Pools (Bodies of Water)
```typescript
pools {
  id: varchar PK (UUID)
  customerId: varchar FK NOT NULL
  externalId: text              // Pool Brain WaterBodyID
  name: text NOT NULL           // "LAP-POOL", "BEACH-POOL", "SPA"
  poolType: text                // Pool, Spa, Fountain
  serviceLevel: text
  waterType: text               // Chlorine, Salt
  gallons: integer
  address, city, state, zip: text
  latitude, longitude: real
  notes: text
  woRequired: boolean = false   // Work Order required
  woNotes: text
  createdAt, updatedAt: timestamp
}
```
**Relationships:** Belongs to customer, has many equipment, route stops

#### 4. Technicians
```typescript
technicians {
  id: varchar PK (UUID)
  externalId: text              // Pool Brain TechnicianID
  firstName, lastName: text NOT NULL
  phone, email: text
  role: text = "service"        // Enum: service, repair, supervisor, foreman
  supervisorId: varchar FK      // Self-referential for hierarchy
  active: boolean = true
  createdAt, updatedAt: timestamp
}
```
**Roles Enum:** `service` | `repair` | `supervisor` | `foreman`

#### 5. Estimates
```typescript
estimates {
  id: varchar PK (UUID)
  propertyId, propertyName: text NOT NULL
  customerName, customerEmail, address: text
  
  // QuickBooks-compatible
  estimateNumber: text          // Auto-generated (EST-2025-0001)
  estimateDate, expirationDate: timestamp
  acceptedBy: text
  acceptedDate: timestamp
  location: text
  tags: text[]
  sourceType: text = "office_staff" // Enum: office_staff, repair_tech, service_tech
  sourceRepairJobId: text
  
  // Details
  title: text NOT NULL
  description: text
  items: json[]                 // Line items with lineNumber, productService, description, sku, quantity, rate, amount, taxable, class
  photos: text[]
  attachments: json[]
  
  // Totals (cents)
  subtotal, discountAmount, taxableSubtotal, salesTaxAmount, depositAmount, totalAmount: integer
  discountType, depositType: text  // "percent" or "fixed"
  discountValue, salesTaxRate, depositValue: real
  partsTotal, laborTotal: integer  // Legacy
  
  // Status
  status: text = "draft"        // Enum: draft, pending_approval, approved, rejected, needs_scheduling, scheduled, completed, ready_to_invoice, invoiced, archived
  
  // People
  createdByTechId, createdByTechName: text
  repairTechId, repairTechName: text
  serviceTechId, serviceTechName: text
  fieldSupervisorId, fieldSupervisorName: text
  officeMemberId, officeMemberName: text
  repairForemanId, repairForemanName: text
  approvedByManagerId, approvedByManagerName: text
  
  // Dates
  createdAt, reportedDate, sentForApprovalAt, approvedAt, rejectedAt: timestamp
  scheduledDate, completedAt, invoicedAt: timestamp
  
  // Notes
  techNotes, managerNotes, rejectionReason: text
  customerNote, memoOnStatement: text
  
  // Customer Approval (token-based, no login)
  approvalToken: text           // 64-char hex token
  approvalTokenExpiresAt: timestamp
  approvalSentTo, approvalSentAt: text/timestamp
  customerApproverName, customerApproverTitle: text
  
  // Links
  jobId, invoiceId, assignedRepairJobId: text
  scheduledByUserId, scheduledByUserName: text
  scheduledAt, deadlineAt: timestamp
  deadlineUnit: text = "hours"
  deadlineValue: integer
  
  // Work Order tracking
  workType: text = "repairs"    // repairs, chemicals, other
  woRequired, woReceived: boolean
  woNumber: text
}
```
**Status Enum:** `draft` | `pending_approval` | `approved` | `rejected` | `needs_scheduling` | `scheduled` | `completed` | `ready_to_invoice` | `invoiced` | `archived`

#### 6. Service Repair Jobs (Sub-$500)
```typescript
serviceRepairJobs {
  id: varchar PK (UUID)
  externalId: text
  jobNumber: text NOT NULL      // SR-2025-0001
  propertyId, propertyName: text NOT NULL
  customerId, customerName: text
  poolId, poolName, address: text
  technicianId, technicianName: text
  jobDate: timestamp
  description, notes: text
  photos: text[]
  laborAmount, partsAmount, totalAmount: integer  // cents
  items: json[]
  status: text = "pending"      // pending, selected, estimated, invoiced
  estimateId, invoiceId: text
  createdAt, updatedAt, batchedAt: timestamp
}
```

#### 7. Routes
```typescript
routes {
  id: varchar PK (UUID)
  externalId: text              // Pool Brain RouteID
  name: text NOT NULL
  date: timestamp               // Specific date (optional)
  dayOfWeek: integer NOT NULL   // 0=Sunday, 1=Monday...
  color: text = "#0891b2"
  technicianId, technicianName: text
  isLocked: boolean = false
  estimatedDriveTime, estimatedOnSiteTime: integer  // minutes
  estimatedMiles: real
  startLocation, endLocation: text
  sortOrder: integer
  createdAt, updatedAt: timestamp
}
```

#### 8. Route Stops
```typescript
routeStops {
  id: varchar PK (UUID)
  externalId: text              // Pool Brain StopID
  routeId: text FK NOT NULL
  propertyId, propertyName: text NOT NULL
  customerId, customerName: text
  poolId, poolName: text
  address, city, state, zip: text
  jobType: text = "route_stop"  // route_stop, one_time
  status: text = "not_started"  // not_started, in_progress, completed, no_access, skipped
  sortOrder: integer
  estimatedTime: integer = 30   // minutes
  notes: text
  frequency: text = "weekly"
  frequencyWeeks: integer = 1
  createdAt, updatedAt: timestamp
}
```

#### 9. Equipment
```typescript
equipment {
  id: varchar PK (UUID)
  customerId: varchar FK NOT NULL
  poolId, propertyId: varchar FK
  category: text NOT NULL       // filter, pump, heater, controller, feed_pump, probe, timer, fill_valve, other
  equipmentType: text NOT NULL  // Sand, DE, Cartridge, Variable Speed, etc.
  brand, model, serialNumber: text
  quantity: integer = 1
  photos: text[]
  installDate, warrantyExpiry: timestamp
  notes: text
  createdAt, updatedAt: timestamp
}
```

#### 10. Tech Ops Entries
```typescript
techOpsEntries {
  id: varchar PK (UUID)
  entryType: text NOT NULL      // repairs_needed, chemical_order, chemicals_dropoff, windy_day_cleanup, report_issue, add_notes
  technicianName: text NOT NULL
  technicianId: varchar FK
  propertyId, propertyName, propertyAddress: text
  description, notes: text
  priority: text = "normal"     // low, normal, high, urgent
  status: text = "pending"      // pending, reviewed, completed, cancelled
  isRead: boolean = false
  chemicals, quantity, issueType: text
  photos: text[]
  reviewedBy: text
  reviewedAt: timestamp
  createdAt, updatedAt: timestamp
}
```

#### 11. Fleet Trucks
```typescript
fleetTrucks {
  id: varchar PK (UUID)
  truckNumber: integer UNIQUE NOT NULL
  currentMileage: integer
  registrationDue, smogDue, smogResult: text
  notes: text
  status: text = "Active"       // Active, Inactive, In Shop
  isActive: boolean = true
  createdAt, updatedAt: timestamp
}
```

#### 12. Truck Inventory
```typescript
truckInventory {
  id: varchar PK (UUID)
  truckId: varchar FK NOT NULL
  truckNumber: integer NOT NULL
  itemName: text NOT NULL
  category: text NOT NULL       // Chemicals, Tools, Parts, Safety Equipment, Cleaning Supplies, Test Equipment, Other
  quantity: integer = 0
  unit: text = "each"
  minQuantity: integer = 0
  maxQuantity: integer
  lastRestocked: timestamp
  notes: text
  createdAt, updatedAt: timestamp
}
```

#### 13. PM Schedules & Records
```typescript
equipmentPmSchedules {
  id: varchar PK
  equipmentId, equipmentName, equipmentType: text NOT NULL
  propertyId, propertyName: text NOT NULL
  bodyOfWaterId, waterType: text
  pmServiceTypeId: varchar FK NOT NULL
  intervalSettingId: varchar FK
  customIntervalMonths: integer
  customIntervalReason: text
  installDate, lastServiceDate, nextDueDate: text  // ISO dates
  status: text = "current"      // current, due_soon, overdue, critical, paused
  duePriority: integer = 0
  notes: text
  isActive: boolean = true
  createdAt, updatedAt: timestamp
}

pmServiceRecords {
  id: varchar PK
  equipmentPmScheduleId: varchar FK NOT NULL
  equipmentId, equipmentName: text NOT NULL
  propertyId, propertyName: text NOT NULL
  bodyOfWaterId: text
  pmServiceTypeId: varchar FK NOT NULL
  serviceDate: text NOT NULL    // ISO date
  completedByName: text
  durationMinutes: integer
  serviceReason: text NOT NULL  // Required dropdown
  workNotes, issuesFound: text
  conditionRating: text         // good, fair, poor, needs_replacement
  recommendedFollowUp: text
  laborCost, partsCost, totalCost: real
  daysSinceLastService: integer
  wasEarlyService: boolean = false
  earlyServiceApprovedBy, earlyServiceReason: text
  nextServiceDate: text         // Auto-calculated
  createdAt, updatedAt: timestamp
}
```

#### 14. Property Channels (Slack-style messaging)
```typescript
propertyChannels {
  id: varchar PK
  propertyId: text UNIQUE NOT NULL
  propertyName: text NOT NULL
  customerName, address, description: text
  createdAt, updatedAt: timestamp
}

channelMessages {
  id: varchar PK
  channelId: varchar FK NOT NULL
  parentMessageId: varchar FK   // For threading
  authorId, authorName: text NOT NULL
  content: text NOT NULL
  messageType: text = "text"    // text, system, file
  attachments: json[]
  mentions: json[]              // User IDs
  isEdited, isPinned: boolean
  createdAt, updatedAt: timestamp
}
```

#### 15. QuickBooks Tokens
```typescript
quickbooksTokens {
  id: varchar PK
  realmId: text NOT NULL
  accessToken, refreshToken: text NOT NULL
  accessTokenExpiresAt, refreshTokenExpiresAt: timestamp NOT NULL
  createdAt, updatedAt: timestamp
}
```

#### Additional Tables
- `alerts` - Cached Pool Brain alerts
- `workflows` - Automation workflow definitions
- `customerTags` / `customerTagAssignments` - Tag system
- `customerAddresses` - Multiple addresses per customer
- `propertyBillingContacts` - Invoice routing by department
- `propertyContacts` - General property contacts
- `propertyAccessNotes` - Gate codes, instructions
- `routeSchedules` / `routeAssignments` - Scheduling configuration
- `serviceOccurrences` - Generated visits from schedules
- `payPeriods` / `payrollEntries` - Payroll tracking
- `chatMessages` - AI conversation history
- `completedAlerts` / `archivedAlerts` - Alert lifecycle
- `threads` / `threadMessages` - Account-level messaging
- `fleetMaintenanceRecords` - Truck service history
- `properties` - Synced service locations
- `fieldEntries` - Mobile app submissions

---

## C) Outbound API Calls (Admin App → External Services)

### Pool Brain API
**Base URL:** `https://prodapi.poolbrain.com`
**Auth Headers:**
```
ACCESS-KEY: {POOLBRAIN_ACCESS_KEY}
COMPANY-ID: {POOLBRAIN_COMPANY_ID}
```

| Endpoint | Method | Purpose | Called From |
|----------|--------|---------|-------------|
| `/v2/alerts_list` | GET | Fetch pool alerts | `server/routes/alerts.ts` |
| `/v2/customer_list` | GET | List all customers | `server/routes/customers.ts` |
| `/v2/customer_detail/{id}` | GET | Customer details | `server/routes/customers.ts` |
| `/v2/customer_pool_details/{id}` | GET | Customer pools | `server/routes/customers.ts` |
| `/v2/customer_notes/{id}` | GET | Customer notes | `server/routes/alerts.ts` |
| `/v2/technicians_list` | GET | List technicians | `server/routes/technicians.ts` |
| `/v2/routes_list` | GET | List routes | `server/routes/scheduling.ts` |
| `/v2/route_stops/{routeId}` | GET | Route stops | `server/routes/scheduling.ts` |
| `/v2/jobs_repairs` | GET | Repair jobs | `server/routes/jobs.ts` |
| `/v2/pools_list` | GET | All pools | `server/routes/customers.ts` |

### QuickBooks Online API
**Auth:** OAuth 2.0 with refresh token
**Credentials:** `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`

| Endpoint | Method | Purpose | Called From |
|----------|--------|---------|-------------|
| `/oauth2/auth` | GET | OAuth authorization | `server/routes/quickbooks.ts` |
| `/oauth2/token` | POST | Token exchange/refresh | `server/routes/quickbooks.ts` |
| `/v3/company/{realmId}/invoice` | POST | Create invoice | `server/routes/quickbooks.ts` |
| `/v3/company/{realmId}/estimate` | POST | Create estimate | `server/routes/quickbooks.ts` |
| `/v3/company/{realmId}/customer` | GET/POST | Customer sync | `server/routes/quickbooks.ts` |

### Ace Breakpoint App (AI Chat)
**URL:** `{ACE_APP_URL}`
**Method:** POST
**Purpose:** AI-powered chat responses
**Called From:** `server/routes/chat.ts`

---

## D) Existing Internal API Routes

### Settings (`server/routes/settings.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/settings` | Get system settings | No |
| POST | `/api/settings` | Update settings | No |

### Estimates (`server/routes/estimates.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/estimates` | List all estimates | No |
| GET | `/api/estimates/metrics` | Estimate dashboard metrics | No |
| GET | `/api/estimates/repair-techs` | List repair technicians | No |
| GET | `/api/estimates/:id` | Get single estimate | No |
| GET | `/api/estimates/property/:propertyId` | Estimates for property | No |
| POST | `/api/estimates` | Create estimate | No |
| PUT | `/api/estimates/:id` | Update estimate | No |
| DELETE | `/api/estimates/:id` | Delete estimate | No |
| PATCH | `/api/estimates/:id/status` | Update status | No |
| PATCH | `/api/estimates/:id/approve` | Internal approval | No |
| PATCH | `/api/estimates/:id/reject` | Internal rejection | No |
| PATCH | `/api/estimates/:id/needs-scheduling` | Move to scheduling | No |
| PATCH | `/api/estimates/:id/schedule` | Schedule job | No |
| PATCH | `/api/estimates/:id/complete` | Mark complete | No |
| PATCH | `/api/estimates/:id/ready-to-invoice` | Ready for invoice | No |
| PATCH | `/api/estimates/:id/invoice` | Mark invoiced | No |
| POST | `/api/estimates/:id/send-for-approval` | Send approval email | No |
| GET | `/api/public/estimates/approve/:token` | Get estimate by token | Public |
| POST | `/api/public/estimates/approve/:token` | Customer approves | Public |
| POST | `/api/public/estimates/reject/:token` | Customer rejects | Public |

### Billing Contacts (`server/routes/estimates.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/customers/:customerId/billing-contacts` | Customer billing contacts | No |
| POST | `/api/customers/:customerId/billing-contacts` | Create billing contact | No |
| DELETE | `/api/customers/:customerId/billing-contacts/:id` | Delete billing contact | No |
| GET | `/api/properties/:propertyId/billing-contacts` | Property billing contacts | No |
| POST | `/api/properties/:propertyId/billing-contacts` | Create billing contact | No |
| PUT | `/api/billing-contacts/:id` | Update billing contact | No |
| DELETE | `/api/billing-contacts/:id` | Delete billing contact | No |
| GET | `/api/properties/:propertyId/billing-email/:workType` | Get billing email for work type | No |
| PATCH | `/api/pools/:poolId/wo-settings` | Update WO settings | No |

### Customers (`server/routes/customers.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/customers` | List customers | No |
| GET | `/api/customers/:id` | Get customer | No |
| GET | `/api/customers/:id/pools` | Customer pools | No |
| GET | `/api/customers/:id/equipment` | Customer equipment | No |
| GET | `/api/customers/:id/contacts` | Customer contacts | No |
| POST | `/api/customers` | Create customer | No |
| PUT | `/api/customers/:id` | Update customer | No |
| POST | `/api/customers/sync-poolbrain` | Sync from Pool Brain | No |
| GET/POST/DELETE | `/api/customers/:id/tags` | Tag management | No |

### Tech Ops (`server/routes/techOps.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/tech-ops` | List entries | No |
| GET | `/api/tech-ops/summary` | Entry counts by type | No |
| GET | `/api/tech-ops/unread-counts` | Unread counts | No |
| GET | `/api/tech-ops/:id` | Get entry | No |
| POST | `/api/tech-ops` | Create entry | No |
| PATCH | `/api/tech-ops/:id` | Update entry | No |
| PATCH | `/api/tech-ops/:id/status` | Update status | No |
| DELETE | `/api/tech-ops/:id` | Delete entry | No |

### Jobs (`server/routes/jobs.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/jobs` | List jobs | No |
| GET | `/api/jobs/repairs` | Repair jobs from Pool Brain | No |
| GET | `/api/jobs/repairs/grouped` | Grouped by property | No |
| POST | `/api/jobs/extract-repairs` | Extract repairs from alerts | No |
| POST | `/api/jobs/archive` | Archive job | No |

### Scheduling (`server/routes/scheduling.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/routes` | List routes | No |
| GET | `/api/routes/:id` | Get route | No |
| POST | `/api/routes` | Create route | No |
| PUT | `/api/routes/:id` | Update route | No |
| DELETE | `/api/routes/:id` | Delete route | No |
| GET | `/api/route-stops` | List stops | No |
| POST | `/api/route-stops` | Create stop | No |
| PUT | `/api/route-stops/:id` | Update stop | No |
| DELETE | `/api/route-stops/:id` | Delete stop | No |
| POST | `/api/routes/sync-poolbrain` | Sync from Pool Brain | No |

### Fleet (`server/routes/fleet.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/fleet/trucks` | List trucks | No |
| GET | `/api/fleet/trucks/:id` | Get truck | No |
| POST | `/api/fleet/trucks` | Create truck | No |
| PUT | `/api/fleet/trucks/:id` | Update truck | No |
| GET | `/api/fleet/maintenance` | Maintenance records | No |
| POST | `/api/fleet/maintenance` | Add maintenance | No |
| GET | `/api/fleet/stats` | Fleet statistics | No |
| GET | `/api/fleet/inventory/:truckId` | Truck inventory | No |
| GET | `/api/fleet/inventory` | All inventory | No |
| GET | `/api/fleet/inventory-low-stock` | Low stock items | No |
| POST | `/api/fleet/inventory` | Add inventory item | No |
| PUT | `/api/fleet/inventory/:id` | Update inventory | No |
| DELETE | `/api/fleet/inventory/:id` | Delete inventory | No |

### Service Repairs (`server/routes/serviceRepairs.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/service-repairs` | List service repairs | No |
| GET | `/api/service-repairs/:id` | Get service repair | No |
| POST | `/api/service-repairs` | Create service repair | No |
| PUT | `/api/service-repairs/:id` | Update service repair | No |
| PATCH | `/api/service-repairs/:id/status` | Update status | No |
| POST | `/api/service-repairs/batch-to-estimate` | Batch to estimate | No |

### QuickBooks (`server/routes/quickbooks.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/quickbooks/auth-url` | Get OAuth URL | No |
| GET | `/api/quickbooks/callback` | OAuth callback | No |
| GET | `/api/quickbooks/status` | Connection status | No |
| POST | `/api/quickbooks/refresh` | Refresh token | No |
| POST | `/api/quickbooks/invoice` | Create invoice | No |
| POST | `/api/quickbooks/disconnect` | Disconnect | No |

### Field Tech Sync (`server/routes/sync.ts`)
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/sync/properties` | Sync properties | No |
| GET | `/api/sync/customers` | Sync customers | No |
| GET | `/api/sync/technicians` | Sync technicians | No |
| GET | `/api/sync/routes` | Sync routes | No |
| GET | `/api/sync/route-stops` | Sync stops | No |
| GET | `/api/sync/field-entries` | Get field entries | No |
| POST | `/api/sync/field-entries` | Submit field entry | No |
| GET | `/api/sync/estimates` | Sync estimates | No |
| POST | `/api/sync/estimates` | Create estimate from field | No |
| GET | `/api/visits` | Get visits | No |

### Additional Routes
- `/api/alerts/*` - Alert management
- `/api/technicians/*` - Technician CRUD
- `/api/payroll/*` - Payroll management
- `/api/pm/*` - Preventive maintenance
- `/api/properties/*` - Property profiles
- `/api/channels/*` - Property channels
- `/api/chat/*` - AI chat
- `/api/dashboard/*` - Dashboard data

---

## E) Auth & RBAC Summary

### Current State: **No Authentication Implemented**

The application currently has **no authentication layer**. All API endpoints are publicly accessible. Session management scaffolding exists (`express-session`, `connect-pg-simple`, `passport`) but is not actively used.

### Roles Defined in Data Model

| Role | DB Value | Intended Access |
|------|----------|-----------------|
| Service Technician | `service` | Field app, route stops, basic entries |
| Repair Technician | `repair` | Repairs, estimates, service repairs |
| Field Supervisor | `supervisor` | Team oversight, approvals, all tech data |
| Repair Foreman | `foreman` | Repair queue, scheduling, job assignment |
| Office Staff | (implicit) | Full admin access, estimates, invoicing |
| General Manager | (implicit) | Full access, reports, payroll |

### Role-Based Screen Mapping (Intended)

| Screen | Service Tech | Repair Tech | Supervisor | Foreman | Office |
|--------|--------------|-------------|------------|---------|--------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tech Ops | ✓ | ✓ | ✓ | ✓ | ✓ |
| Scheduling | View Only | View Only | ✓ | ✓ | ✓ |
| Estimates | — | Create | Approve | Approve | Full |
| Repair Queue | — | ✓ | ✓ | ✓ | ✓ |
| Service Repairs | ✓ | ✓ | ✓ | ✓ | ✓ |
| Customers | View | View | View | View | Full |
| Fleet | View Own | View Own | ✓ | ✓ | ✓ |
| Payroll | — | — | — | — | ✓ |
| Settings | — | — | — | — | ✓ |

### Data Visibility Rules (Intended)
- Service techs see only their assigned routes/stops
- Repair techs see their assigned repair jobs
- Supervisors see their team's data
- Office staff sees everything
- Public approval endpoints are token-gated (no login required)

---

## F) Backend API Blueprint (Proposed Endpoints)

### Authentication (NEW - Required)

```typescript
POST /api/auth/login
Request: { email: string, password: string }
Response: { user: User, token: string }
Roles: Public

POST /api/auth/logout
Request: {}
Response: { success: boolean }
Roles: Authenticated

GET /api/auth/me
Request: {}
Response: { user: User | null }
Roles: Authenticated

POST /api/auth/refresh
Request: { refreshToken: string }
Response: { token: string, refreshToken: string }
Roles: Public
```

### Existing Endpoints (Enhanced with Auth)

All existing endpoints should add:
- `Authorization: Bearer {token}` header requirement
- Role-based access control middleware
- Audit logging for mutations

### Proposed New Endpoints

```typescript
// Team Management
GET /api/teams
POST /api/teams
GET /api/teams/:id/members
POST /api/teams/:id/members

// Audit Log
GET /api/audit-log
Query: { entityType, entityId, userId, startDate, endDate }

// Reports
GET /api/reports/technician-performance
GET /api/reports/property-spending
GET /api/reports/estimate-pipeline
GET /api/reports/payroll-summary
```

---

## G) DB Schema Proposal

The current schema in `shared/schema.ts` is comprehensive and well-designed. Key recommendations:

### Indexes to Add

```sql
-- Performance indexes
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_property ON estimates(property_id);
CREATE INDEX idx_estimates_approval_token ON estimates(approval_token);
CREATE INDEX idx_route_stops_route ON route_stops(route_id);
CREATE INDEX idx_route_stops_property ON route_stops(property_id);
CREATE INDEX idx_tech_ops_status ON tech_ops_entries(status);
CREATE INDEX idx_tech_ops_type ON tech_ops_entries(entry_type);
CREATE INDEX idx_equipment_customer ON equipment(customer_id);
CREATE INDEX idx_equipment_property ON equipment(property_id);
CREATE INDEX idx_service_repairs_status ON service_repair_jobs(status);
CREATE INDEX idx_field_entries_property ON field_entries(property_id);
```

### Missing Tables (Proposed)

```typescript
// Users table for authentication
users {
  id: varchar PK
  email: text UNIQUE NOT NULL
  passwordHash: text NOT NULL
  technicianId: varchar FK  // Link to technician record
  role: text NOT NULL       // admin, supervisor, foreman, service_tech, repair_tech
  isActive: boolean = true
  lastLoginAt: timestamp
  createdAt, updatedAt: timestamp
}

// Audit log for compliance
auditLog {
  id: varchar PK
  userId: varchar FK
  action: text NOT NULL     // create, update, delete, approve, reject
  entityType: text NOT NULL // estimate, customer, etc.
  entityId: text NOT NULL
  oldValue: json
  newValue: json
  ipAddress: text
  userAgent: text
  createdAt: timestamp
}

// User sessions
sessions {
  id: varchar PK
  userId: varchar FK NOT NULL
  token: text UNIQUE NOT NULL
  expiresAt: timestamp NOT NULL
  createdAt: timestamp
}
```

---

## H) Gaps / Unknowns

### Critical Gaps

1. **No Authentication** - All endpoints are public. Need to implement:
   - User authentication (JWT or session-based)
   - Role-based access control middleware
   - Password hashing (bcrypt)

2. **No Input Validation Middleware** - While Zod schemas exist, validation is inconsistent across routes

3. **No Rate Limiting** - API vulnerable to abuse

4. **No Error Handling Middleware** - Errors handled per-route, inconsistent format

### Unknown Areas

1. **Pool Brain API Rate Limits** - Undocumented, may cause issues at scale
   - Files checked: `server/poolbrain-client.ts`

2. **QuickBooks Webhook Support** - Currently polling-based, webhooks would improve sync
   - Files checked: `server/routes/quickbooks.ts`

3. **Photo Storage Cleanup** - Photos uploaded to GCS but no cleanup mechanism
   - Files checked: `server/replit_integrations/object_storage/`

4. **Multi-tenancy** - Currently single-company, no tenant isolation
   - Files checked: All route files

5. **Mobile App API Contract** - Field Tech Sync API exists but no formal contract/versioning
   - Files checked: `server/routes/sync.ts`

### Files Reviewed for This Analysis
- `package.json` - Dependencies
- `shared/schema.ts` - All 1442 lines
- `server/routes/*.ts` - All 20 route modules
- `server/storage.ts` - Storage interface
- `server/poolbrain-client.ts` - Pool Brain API client
- `server/app.ts` - Express setup
- `client/src/pages/*.tsx` - All 34 page components

---

*Generated by Replit Agent for Breakpoint BI Pool Brain Intelligence*
