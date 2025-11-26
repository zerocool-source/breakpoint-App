# Breakpoint BI - Complete Technical Rebuild Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Backend API](#backend-api)
6. [Frontend Components](#frontend-components)
7. [External Integrations](#external-integrations)
8. [Data Flow](#data-flow)
9. [Step-by-Step Rebuild Instructions](#step-by-step-rebuild-instructions)

---

## Architecture Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  - Dashboard (Alert Feed)                                    │
│  - Intelligence (AI Chat)                                    │
│  - Automations (Email Generator)                             │
│  - Settings                                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST API
┌─────────────────────▼───────────────────────────────────────┐
│                 BACKEND (Express.js)                         │
│  - /api/alerts/enriched (Pool Brain data)                   │
│  - /api/alerts/chemical-order-email (Email generation)      │
│  - /api/chat (AI proxy)                                     │
│  - /api/settings (Configuration)                            │
└─────┬────────────────────────┬──────────────────────────────┘
      │                        │
      ▼                        ▼
┌─────────────┐      ┌──────────────────────┐
│ PostgreSQL  │      │  Pool Brain API      │
│ Database    │      │  (External Service)  │
│ - Alerts    │      │  - Alerts List       │
│ - Chat Log  │      │  - Customers         │
│ - Settings  │      │  - Technicians       │
└─────────────┘      │  - Pools             │
                     └──────────────────────┘
                              │
                              ▼
                     ┌──────────────────────┐
                     │ ace-breakpoint-app   │
                     │ (Your AI Proxy)      │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Ollama (Local Mac)   │
                     │ ace-breakpoint model │
                     └──────────────────────┘
```

### Request Flow Example: Loading Dashboard
```
1. User opens dashboard
   ↓
2. Frontend calls GET /api/alerts/enriched
   ↓
3. Backend fetches from Pool Brain:
   - GET /v2/alerts_list (up to 10,000 alerts)
   - GET /v2/customer_detail (1,000 customers)
   - GET /v2/customer_pool_details (1,000 pools)
   - GET /v2/customer_notes_detail (5,000 notes)
   - GET /v2/technician_detail (ALL, paginated)
   ↓
4. Backend enriches data:
   - Match alerts → pools → customers
   - Add technician names
   - Extract addresses and notes
   - Combine pictures
   ↓
5. Backend returns enriched alerts array
   ↓
6. Frontend displays in EnrichedAlertsFeed component
```

---

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Wouter** - Client-side routing (lightweight alternative to React Router)
- **TanStack Query (React Query)** - Server state management and caching
- **shadcn/ui** - Component library (built on Radix UI)
- **Tailwind CSS** - Styling framework
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime
- **Express.js** - Web server framework
- **TypeScript** - Type safety
- **tsx** - TypeScript execution (dev mode)

### Database
- **PostgreSQL** - Primary database
- **Neon Serverless** - Hosted PostgreSQL provider
- **Drizzle ORM** - Type-safe SQL query builder
- **@neondatabase/serverless** - Serverless Postgres driver

### External Services
- **Pool Brain API** - Pool management data source
- **Ollama** - Local AI model (ace-breakpoint)
- **ace-breakpoint-app** - Custom AI proxy service
- **ngrok** - Tunnel to local Ollama instance

---

## Project Structure

```
breakpoint-bi/
├── client/                    # Frontend code
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── layout/       
│   │   │   │   ├── AppLayout.tsx       # Main app wrapper
│   │   │   │   └── Sidebar.tsx         # Navigation sidebar
│   │   │   ├── dashboard/    
│   │   │   │   ├── EnrichedAlertsFeed.tsx   # Main alert list
│   │   │   │   ├── AICommand.tsx            # Quick AI widget
│   │   │   │   └── PoolHealthChart.tsx      # Stats charts
│   │   │   └── ui/           # shadcn/ui components
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── badge.tsx
│   │   │       └── ... (30+ UI primitives)
│   │   ├── pages/            # Route pages
│   │   │   ├── Dashboard.tsx      # Home/alerts page
│   │   │   ├── Chat.tsx           # AI chat page
│   │   │   ├── Automations.tsx    # Email automation page
│   │   │   └── Settings.tsx       # Configuration page
│   │   ├── lib/
│   │   │   └── utils.ts           # Utility functions (cn, etc.)
│   │   ├── hooks/
│   │   │   └── use-toast.ts       # Toast notifications hook
│   │   ├── App.tsx                # Root component with routing
│   │   ├── main.tsx               # React app entry point
│   │   └── index.css              # Global styles + Tailwind
│   └── index.html                 # HTML entry point
│
├── server/                    # Backend code
│   ├── index.ts               # Production server
│   ├── index-dev.ts           # Development server (Vite middleware)
│   ├── routes.ts              # All API routes
│   ├── storage.ts             # Database interface (IStorage + DbStorage)
│   ├── poolbrain-client.ts    # Pool Brain API client
│   └── email-template.ts      # Email formatting logic
│
├── shared/                    # Code shared between frontend/backend
│   └── schema.ts              # Drizzle database schema + Zod types
│
├── drizzle/                   # Database migrations
│   └── migrations/
│
├── attached_assets/           # User-uploaded or generated assets
│   ├── generated_images/
│   └── stock_images/
│
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── drizzle.config.ts          # Drizzle ORM configuration
└── replit.md                  # Project memory/documentation
```

---

## Database Schema

Location: `shared/schema.ts`

### Tables

#### 1. `settings` - System Configuration
```typescript
{
  id: varchar (UUID, primary key)
  poolBrainApiKey: text (optional)
  poolBrainCompanyId: text (optional)
  defaultAiModel: text (default: "gpt-4")
  createdAt: timestamp
  updatedAt: timestamp
}
```
**Purpose**: Store API keys and system configuration
**Used by**: Settings page, API initialization

#### 2. `alerts` - Cached Pool Alerts
```typescript
{
  id: varchar (UUID, primary key)
  externalId: text (Pool Brain alert ID)
  poolName: text (required)
  type: text (required) // "Chemical", "Equipment", "Leak", "Service"
  severity: text (required) // "Critical", "High", "Medium", "Low"
  message: text (required)
  status: text (default: "Active") // "Active", "Resolved"
  timestamp: timestamp
  createdAt: timestamp
}
```
**Purpose**: Cache alerts from Pool Brain for historical tracking
**Used by**: Alert sync endpoint (not currently used in UI)

#### 3. `workflows` - Automation Definitions
```typescript
{
  id: varchar (UUID, primary key)
  name: text (required)
  trigger: text (required)
  action: text (required)
  status: text (default: "active") // "active", "paused"
  createdAt: timestamp
  updatedAt: timestamp
}
```
**Purpose**: Store automation workflow configurations
**Used by**: Automations page (currently shows mock data)

#### 4. `customers` - Customer Cache
```typescript
{
  id: varchar (UUID, primary key)
  externalId: text (Pool Brain customer ID)
  name: text (required)
  email: text
  phone: text
  address: text
  createdAt: timestamp
}
```
**Purpose**: Cache customer data from Pool Brain
**Used by**: Historical reference (enriched data fetched live)

#### 5. `chat_messages` - AI Conversation History
```typescript
{
  id: varchar (UUID, primary key)
  role: text (required) // "user" | "assistant"
  content: text (required)
  timestamp: timestamp (default: now())
}
```
**Purpose**: Store AI chat conversation history
**Used by**: Chat page, AI context building

### Zod Schemas & Types

Each table has corresponding Zod schemas for validation:

```typescript
// Insert schemas (for creating new records)
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });
export const insertWorkflowSchema = createInsertSchema(workflows).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true });

// TypeScript types
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Select types (for reading records)
export type Settings = typeof settings.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
```

---

## Backend API

Location: `server/routes.ts`

### Storage Interface (`server/storage.ts`)

**IStorage Interface** - Defines all database operations:

```typescript
interface IStorage {
  // Settings
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;
  
  // Alerts
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlertStatus(id: string, status: string): Promise<Alert>;
  
  // Workflows
  getWorkflows(): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  
  // Customers
  getCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  
  // Chat
  getChatHistory(limit?: number): Promise<ChatMessage[]>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatHistory(): Promise<void>;
}
```

**DbStorage Class** - PostgreSQL implementation using Drizzle:

```typescript
class DbStorage implements IStorage {
  private db: NeonDatabase<typeof schema>;
  
  constructor(connectionString: string) {
    const client = neon(connectionString);
    this.db = drizzle(client, { schema });
  }
  
  // Example: Get chat history
  async getChatHistory(limit: number = 50): Promise<ChatMessage[]> {
    return this.db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);
  }
  
  // Example: Save chat message
  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [result] = await this.db
      .insert(chatMessages)
      .values(message)
      .returning();
    return result;
  }
}
```

### API Endpoints

#### 1. **GET /api/alerts/enriched** - Fetch Enriched Alerts

**Purpose**: Get all alerts from Pool Brain with customer, technician, and pool data

**Process**:
```typescript
1. Get API credentials from settings/env
2. Create Pool Brain client
3. Fetch data in parallel:
   - Alerts (limit: 10000)
   - Customers (limit: 1000)
   - Pool details (limit: 1000)
   - Customer notes (limit: 5000)
   - Technicians (ALL pages, paginated)

4. Build maps:
   - customerMap[customerId] = customer data
   - poolToCustomerMap[poolId] = customerId
   - technicianMap[techId] = technician data
   - customerNotesMap[customerId] = notes

5. For each alert:
   - Get pool ID from alert.waterBodyId
   - Get customer ID from alert.CustomerID or poolToCustomerMap
   - Get customer data from customerMap
   - Get technician data from technicianMap
   - Extract address from customer.Addresses (PRIMARY only)
   - Extract pictures from alert.Pictures array
   - Parse AlertCategories for message/severity/type
   
6. Return enriched alert object:
   {
     alertId, poolId, poolName,
     customerId, customerName,
     address, phone, email, contact,
     notes, message, type, severity, status,
     createdAt, pictures,
     techName, techPhone, techEmail, techId,
     rawAlert (complete Pool Brain data)
   }
```

**Response**:
```json
{
  "alerts": [
    {
      "alertId": "16509375",
      "poolId": "1567143",
      "poolName": "Spa",
      "customerId": "54702188",
      "customerName": "The Colony at California Oaks",
      "address": "40710 Avenida Florita, Murrieta, CA 92563",
      "phone": "9515551234",
      "email": "contact@example.com",
      "contact": "John Doe",
      "notes": "Gate code: 1234",
      "message": "Pool acid rola chem needs to be replaced",
      "type": "IssueReport",
      "severity": "URGENT",
      "status": "Active",
      "createdAt": "2025-11-26T06:47:39",
      "pictures": ["https://..."],
      "techName": "Alfred Pena",
      "techPhone": "9515551234",
      "techEmail": "alfred@example.com",
      "techId": 28643,
      "rawAlert": { /* complete Pool Brain alert object */ }
    }
  ]
}
```

#### 2. **GET /api/alerts/chemical-order-email** - Generate Chemical Order Email

**Purpose**: Scan alerts for chemical needs and generate formatted email

**Process**:
```typescript
1. Fetch same data as enriched alerts endpoint
2. Filter alerts for chemical-related keywords:
   - "chlorine", "acid", "algae", "tank", "drum", 
     "carboy", "chemical", "bleach", "requesting"
   
3. For each chemical alert:
   - Extract customer info
   - Get PRIMARY address ONLY (skip PO boxes)
   - Get access notes from PRIMARY address
   - Mark as RUSH if "urgent" or "below half" in message
   
4. Group alerts by customer:
   - Combine multiple items per customer
   - Keep rush flag if ANY item is rush
   
5. Format email using buildChemicalOrderEmail():
   For each customer:
     {Customer Name} RUSH (if urgent)
     {Address}
     {Access Notes}
     {Item 1}
     {Item 2}
     [blank line]
   
   Footer:
     David Harding Sr | 951-312-5060
```

**Response**:
```json
{
  "emailText": "CITRO OWNERS ASSOCIATION\n35020 Hacienda...",
  "orderCount": 15,
  "orders": [/* array of order objects */]
}
```

#### 3. **POST /api/chat** - AI Chat Endpoint

**Purpose**: Proxy chat requests to ace-breakpoint-app

**Request Body**:
```json
{
  "message": "What is the ideal pH for a pool?",
  "saveHistory": true
}
```

**Process**:
```typescript
1. Get ACE_APP_URL from environment
2. Fetch last 20 chat messages from database
3. Format history for ace-breakpoint-app:
   [
     { role: "user", content: "..." },
     { role: "assistant", content: "..." }
   ]
   
4. Send POST to ace-breakpoint-app/api/chat:
   {
     message: userMessage,
     history: formattedHistory
   }
   
5. Receive response: { answer: "..." }
6. If saveHistory is true:
   - Save user message to database
   - Save assistant response to database
7. Return: { message: answer }
```

**Error Handling**:
```typescript
- ECONNREFUSED/ENOTFOUND → 503 PROXY_OFFLINE
- Ace app error → 502 OLLAMA_ERROR  
- Other errors → 500 UNKNOWN
```

#### 4. **GET /api/chat/history** - Get Chat History

**Purpose**: Retrieve conversation history

**Response**:
```json
{
  "history": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What is ideal pH?",
      "timestamp": "2025-11-26T10:30:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Ideal pH is 7.4-7.6",
      "timestamp": "2025-11-26T10:30:05Z"
    }
  ]
}
```

#### 5. **DELETE /api/chat/history** - Clear Chat History

**Purpose**: Delete all chat messages

**Response**:
```json
{
  "message": "Chat history cleared successfully"
}
```

#### 6. **GET /api/settings** - Get Settings

**Response**:
```json
{
  "id": "uuid",
  "poolBrainApiKey": "key123",
  "poolBrainCompanyId": "3913",
  "defaultAiModel": "gpt-4",
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### 7. **PUT /api/settings** - Update Settings

**Request Body**:
```json
{
  "poolBrainApiKey": "newkey",
  "poolBrainCompanyId": "3913"
}
```

---

## Pool Brain API Client

Location: `server/poolbrain-client.ts`

### PoolBrainClient Class

```typescript
class PoolBrainClient {
  private apiKey: string;
  private companyId?: string;
  private baseUrl: string = "https://prodapi.poolbrain.com";
  
  constructor(config: {
    apiKey: string;
    companyId?: string;
    baseUrl?: string;
  }) {
    this.apiKey = config.apiKey;
    this.companyId = config.companyId;
    if (config.baseUrl) this.baseUrl = config.baseUrl;
  }
  
  // Build headers for every request
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "ACCESS-KEY": this.apiKey,
      "Content-Type": "application/json",
    };
    if (this.companyId) {
      headers["COMPANY-ID"] = this.companyId;
    }
    return headers;
  }
}
```

### Methods

#### getAlertsList()
```typescript
async getAlertsList(params: {
  fromDate?: string;   // YYYY-MM-DD
  toDate?: string;     // YYYY-MM-DD
  offset?: number;
  limit?: number;
}) {
  const url = new URL(`${this.baseUrl}/v2/alerts_list`);
  // Add query params
  // Fetch with headers
  // Return response.json()
}
```

#### getCustomerDetail()
```typescript
async getCustomerDetail(params: {
  offset?: number;
  limit?: number;
}) {
  // GET /v2/customer_detail
  // Returns customer records with:
  // - RecordID, CustomerName, CompanyName
  // - Addresses object (PRIMARY, BILLING)
  // - Phone, Email, Contact
}
```

#### getCustomerPoolDetails()
```typescript
async getCustomerPoolDetails(params: {
  offset?: number;
  limit?: number;
}) {
  // GET /v2/customer_pool_details
  // Returns pool records with:
  // - RecordID (waterBodyId)
  // - CustomerID
  // - Equipment info (Filter, Pump, Heater, etc.)
}
```

#### getCustomerNotes()
```typescript
async getCustomerNotes(params: {
  offset?: number;
  limit?: number;
}) {
  // GET /v2/customer_notes_detail
  // Returns notes with:
  // - CustomerID
  // - Note (text content)
}
```

#### getTechnicianDetail()
```typescript
async getTechnicianDetail(params: {
  offset?: number;
  limit?: number;
}) {
  // GET /v2/technician_detail
  // Returns technician records with:
  // - RecordID (TechnicianID)
  // - Name, Email, Phone
  // - Status, CreatedDate
}
```

### Pool Brain API Response Format

All endpoints return:
```json
{
  "status": "200",
  "data": [ /* array of records */ ],
  "message": "Success message",
  "returnedRecords": 150,
  "hasMore": true,
  "totalRecordsCount": 0
}
```

### Alert Structure Example

```json
{
  "JobID": 16509375,
  "waterBodyId": 1567143,
  "JobDate": "2025-11-26T06:47:39",
  "Date": "2025-11-26T06:52:05",
  "TechnicianID": 28643,
  "CustomerID": 54702188,
  "BodyOfWater": "Spa",
  "Pictures": [
    {
      "url": "https://...",
      "imageUrl": "https://..."
    }
  ],
  "AlertCategories": [
    {
      "IssueReport": [
        {
          "jobID": 16509375,
          "alertId": 176425522,
          "status": "Confirm",
          "IssueReports": "Pool acid rola chem needs to be replaced",
          "aiPriorityLevel": "URGENT",
          "AlertName": "RepairNeeded"
        }
      ],
      "SystemIssue": [
        {
          "type": "Not Enough Time",
          "priority": "light_blue",
          "priorityLevel": "URGENT",
          "AlertName": "Not Enough Time On Site"
        }
      ],
      "NotComplted": [],
      "CustomAlert": []
    }
  ]
}
```

### Customer Address Structure

```json
{
  "RecordID": 54702188,
  "CustomerName": "The Colony",
  "Addresses": {
    "67313803": {
      "PrimaryAddress": "40710 Avenida Florita",
      "PrimaryCity": "Murrieta",
      "PrimaryState": "CA",
      "PrimaryZip": "92563",
      "AccessNotes": "Gate code: 1234",
      "BillingAddress": "P.O. Box 123",
      "BillingCity": "Murrieta",
      "BillingState": "CA",
      "BillingZip": "92563"
    }
  },
  "Phone": "9515551234",
  "Email": "contact@example.com"
}
```

---

## Frontend Components

### Layout Components

#### AppLayout.tsx
```typescript
// Main app container with background and sidebar
export function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Background image with blur overlay */}
      <div className="fixed inset-0 z-0">
        <img src="/placeholder.svg" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex">
        <Sidebar />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### Sidebar.tsx
```typescript
// Navigation sidebar with glassmorphism
export function Sidebar() {
  return (
    <aside className="w-64 h-screen sticky top-0 glass-card border-r border-white/10">
      <div className="p-6">
        <h1 className="font-display text-2xl">BREAKPOINT</h1>
        <p className="text-primary">INTELLIGENCE</p>
      </div>
      
      <nav className="space-y-2 px-4">
        <Link href="/" className="nav-item">
          <LayoutDashboard /> Dashboard
        </Link>
        <Link href="/chat" className="nav-item">
          <MessageSquare /> Chat with Ace
        </Link>
        <Link href="/automations" className="nav-item">
          <Zap /> Automations
        </Link>
        <Link href="/settings" className="nav-item">
          <Settings /> Settings
        </Link>
      </nav>
    </aside>
  );
}
```

### Dashboard Components

#### EnrichedAlertsFeed.tsx

**Purpose**: Display all alerts with filtering, categorization, and expand/collapse

**Data Fetching**:
```typescript
const { data: alertsData, isLoading } = useQuery({
  queryKey: ["enrichedAlerts"],
  queryFn: async () => {
    const res = await fetch("/api/alerts/enriched");
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  },
});

const alerts = alertsData?.alerts || [];
```

**State Management**:
```typescript
const [showAll, setShowAll] = useState(false);
const [selectedTab, setSelectedTab] = useState("all");
const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
```

**Alert Categorization**:
```typescript
function categorizeAlert(alert: EnrichedAlert): string[] {
  const categories: string[] = [];
  const msgLower = alert.message.toLowerCase();
  
  if (msgLower.includes("algae")) categories.push("algae");
  if (msgLower.includes("not enough time")) categories.push("time");
  if (alert.type === "IssueReport") categories.push("repair");
  if (msgLower.includes("chlorine") || msgLower.includes("ph")) {
    categories.push("chemical");
  }
  if (msgLower.includes("added") || msgLower.includes("drum")) {
    categories.push("chemicals-added");
  }
  
  return categories.length > 0 ? categories : ["other"];
}
```

**Filtering & Sorting**:
```typescript
// Filter by tab
const filteredAlerts = selectedTab === "all" 
  ? alerts 
  : alerts.filter(a => categorizeAlert(a).includes(selectedTab));

// Sort by severity (URGENT first) then status (Active first)
const sortedAlerts = [...filteredAlerts].sort((a, b) => {
  const severityOrder = { URGENT: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
  const aSev = severityOrder[a.severity.toUpperCase()] ?? 5;
  const bSev = severityOrder[b.severity.toUpperCase()] ?? 5;
  if (aSev !== bSev) return aSev - bSev;
  
  if (a.status === "Active" && b.status !== "Active") return -1;
  if (a.status !== "Active" && b.status === "Active") return 1;
  return 0;
});

// Show top 5 or all
const displayedAlerts = showAll ? sortedAlerts : sortedAlerts.slice(0, 5);
```

**Alert Card Structure**:
```tsx
<div className="alert-card">
  {/* Header: Pool + Customer + Severity Badge */}
  <div className="mb-2">
    <h4>{alert.poolName}</h4>
    <div className="customer-info">
      <Building2 /> {alert.customerName}
    </div>
    <Badge className={getSeverityColor(alert.severity)}>
      {alert.severity}
    </Badge>
  </div>
  
  {/* Contact Info */}
  <div className="contact-info">
    {alert.address && <div><MapPin /> {alert.address}</div>}
    {alert.phone && <a href={`tel:${alert.phone}`}>{alert.phone}</a>}
    {alert.email && <a href={`mailto:${alert.email}`}>{alert.email}</a>}
    {alert.contact && <div><User /> {alert.contact}</div>}
  </div>
  
  {/* Alert Message */}
  <p className="message">{alert.message}</p>
  
  {/* Pictures */}
  {alert.pictures?.length > 0 && (
    <div className="pictures-grid">
      {alert.pictures.slice(0, 3).map((pic, idx) => (
        <img key={idx} src={pic} alt="Alert" />
      ))}
    </div>
  )}
  
  {/* Notes */}
  {alert.notes && (
    <div className="notes">{alert.notes}</div>
  )}
  
  {/* Technician */}
  {alert.techName && (
    <div className="tech-badge">
      <User /> {alert.techName}
      {alert.techPhone && <a href={`tel:${alert.techPhone}`}>{alert.techPhone}</a>}
    </div>
  )}
  
  {/* Footer: Type + Expand Button + Date */}
  <div className="footer">
    <span className="type">{alert.type}</span>
    <Button onClick={() => toggleExpand(alert.alertId)}>
      <ChevronDown /> {expanded ? "Hide" : "Show All"}
    </Button>
    <time>{new Date(alert.createdAt).toLocaleDateString()}</time>
  </div>
  
  {/* Expanded Raw Data */}
  {expandedAlerts.has(alert.alertId) && (
    <div className="raw-data">
      <h5>Complete Alert Data</h5>
      <pre>{JSON.stringify(alert.rawAlert, null, 2)}</pre>
    </div>
  )}
</div>
```

#### AICommand.tsx

**Purpose**: Quick AI analysis widget on dashboard

**Usage**:
```typescript
const mutation = useMutation({
  mutationFn: async () => {
    // Get alerts
    const alertsRes = await fetch("/api/alerts/enriched");
    const { alerts } = await alertsRes.json();
    
    // Build summary
    const summary = `Analyze these ${alerts.length} pool alerts...`;
    
    // Send to AI (saveHistory: false to not pollute chat)
    const chatRes = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: summary,
        saveHistory: false
      })
    });
    
    return chatRes.json();
  }
});

// Usage
<Button onClick={() => mutation.mutate()}>
  Analyze Alerts
</Button>
{mutation.data && (
  <div>{mutation.data.message}</div>
)}
```

### Chat Page (Intelligence)

#### Chat.tsx

**Purpose**: Full AI chat interface with history

**State**:
```typescript
const [input, setInput] = useState("");
const [messages, setMessages] = useState<Message[]>([]);

// Load history on mount
useEffect(() => {
  fetch("/api/chat/history")
    .then(res => res.json())
    .then(data => setMessages(data.history));
}, []);
```

**Send Message**:
```typescript
const sendMessage = useMutation({
  mutationFn: async (message: string) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        saveHistory: true
      })
    });
    return res.json();
  },
  onSuccess: (data) => {
    // Add user message
    setMessages(prev => [...prev, {
      role: "user",
      content: input,
      timestamp: new Date().toISOString()
    }]);
    
    // Add assistant response
    setMessages(prev => [...prev, {
      role: "assistant",
      content: data.message,
      timestamp: new Date().toISOString()
    }]);
    
    setInput("");
  }
});
```

**UI Structure**:
```tsx
<div className="chat-container">
  {/* Header */}
  <div className="header">
    <h1>Chat with Ace</h1>
    <Button onClick={clearHistory}>Clear History</Button>
  </div>
  
  {/* Messages */}
  <div className="messages">
    {messages.map((msg, idx) => (
      <div key={idx} className={msg.role === "user" ? "user-message" : "assistant-message"}>
        <div className="avatar">
          {msg.role === "user" ? <User /> : <Bot />}
        </div>
        <div className="content">{msg.content}</div>
      </div>
    ))}
  </div>
  
  {/* Input */}
  <form onSubmit={(e) => {
    e.preventDefault();
    sendMessage.mutate(input);
  }}>
    <Input 
      value={input} 
      onChange={(e) => setInput(e.target.value)}
      placeholder="Ask about pool chemistry, Title 22, QC..."
    />
    <Button type="submit">Send</Button>
  </form>
</div>
```

### Automations Page

#### Automations.tsx

**Purpose**: Generate and send chemical order emails

**Email Generation**:
```typescript
const { data: emailData, refetch } = useQuery({
  queryKey: ["chemicalOrderEmail"],
  queryFn: async () => {
    const res = await fetch("/api/alerts/chemical-order-email");
    return res.json();
  },
  enabled: false  // Only fetch when button clicked
});

// Generate button
<Button onClick={() => refetch()}>
  Generate from Alerts
</Button>
```

**Open in Outlook**:
```typescript
const handleOpenInOutlook = () => {
  const to = encodeURIComponent('pmtorder@awspoolsupply.com');
  const cc = encodeURIComponent('Jesus@awspoolsupply.com');
  const subject = encodeURIComponent('Alpha Chemical Order');
  const body = encodeURIComponent(emailData.emailText);
  
  const url = `https://outlook.office.com/mail/deeplink/compose?to=${to}&cc=${cc}&subject=${subject}&body=${body}`;
  
  window.open(url, '_blank');
};

<Button onClick={handleOpenInOutlook}>
  Open in Outlook
</Button>
```

**Email Preview**:
```tsx
{emailData && (
  <div className="email-preview">
    <Badge>{emailData.orderCount} Properties</Badge>
    <pre>{emailData.emailText}</pre>
  </div>
)}
```

---

## Styling & Design System

### Theme Configuration (tailwind.config.ts)

```typescript
const config = {
  theme: {
    extend: {
      colors: {
        primary: "hsl(180 100% 50%)",      // Cyan neon
        secondary: "hsl(280 100% 60%)",    // Purple
        background: "hsl(222.2 84% 4.9%)", // Dark navy
        foreground: "hsl(210 40% 98%)",    // Light text
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],  // Headers
        ui: ["Rajdhani", "sans-serif"],       // UI/numbers
        sans: ["Inter", "sans-serif"],        // Body text
      },
    },
  },
};
```

### Custom CSS (client/src/index.css)

```css
/* Glassmorphism card */
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.3);
  border-radius: 3px;
}
```

### Component Patterns

**Card with Glassmorphism**:
```tsx
<Card className="glass-card border-white/5">
  <CardHeader>
    <CardTitle className="font-display tracking-wide">TITLE</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Neon Badge**:
```tsx
<Badge className="bg-primary/10 text-primary border-primary/30">
  ACTIVE
</Badge>
```

**Icon with Text**:
```tsx
<div className="flex items-center gap-2">
  <User className="w-4 h-4 text-primary" />
  <span className="font-ui">Tech Name</span>
</div>
```

---

## External Integrations

### 1. Pool Brain API

**Base URL**: `https://prodapi.poolbrain.com`

**Authentication**:
- Header: `ACCESS-KEY: your_api_key`
- Header: `COMPANY-ID: your_company_id` (optional)

**Rate Limits**: Unknown (use reasonable limits)

**Key Endpoints**:
- `/v2/alerts_list` - Get alerts
- `/v2/customer_detail` - Get customers
- `/v2/customer_pool_details` - Get pools
- `/v2/customer_notes_detail` - Get notes
- `/v2/technician_detail` - Get technicians

**Pagination**:
- All endpoints support `offset` and `limit` params
- Response includes `hasMore` boolean
- Loop with increasing offset until `hasMore === false`

### 2. ace-breakpoint-app (AI Proxy)

**URL**: Configured in `ACE_APP_URL` environment variable
**Current**: `https://suppliable-elsa-ruffianly.ngrok-free.dev`

**Purpose**: Proxy between Breakpoint BI and local Ollama

**Endpoint**: `POST /api/chat`

**Request**:
```json
{
  "message": "User question",
  "history": [
    { "role": "user", "content": "Previous question" },
    { "role": "assistant", "content": "Previous answer" }
  ]
}
```

**Response**:
```json
{
  "answer": "AI response text"
}
```

**Error Codes**:
- 503: ace-breakpoint-app offline
- 502: Ollama connection error
- 500: Unknown error

### 3. Ollama (Local AI)

**Running on**: Your Mac
**Access via**: ngrok tunnel → ace-breakpoint-app
**Model**: ace-breakpoint
**Expertise**: Pool chemistry, Title 22, QC, Pool Brain

---

## Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=5432
PGUSER=...
PGPASSWORD=...
PGDATABASE=...

# Pool Brain API
POOLBRAIN_ACCESS_KEY=your_access_key
POOLBRAIN_COMPANY_ID=your_company_id

# AI Service
ACE_APP_URL=https://your-ngrok-url.ngrok-free.dev
```

---

## Step-by-Step Rebuild Instructions

### Phase 1: Setup & Dependencies

```bash
# 1. Create new project
mkdir breakpoint-bi
cd breakpoint-bi
npm init -y

# 2. Install dependencies
npm install \
  react react-dom \
  express \
  @neondatabase/serverless \
  drizzle-orm drizzle-zod \
  zod \
  wouter \
  @tanstack/react-query \
  lucide-react \
  class-variance-authority clsx tailwind-merge

npm install -D \
  typescript @types/react @types/react-dom @types/node @types/express \
  vite @vitejs/plugin-react \
  tailwindcss postcss autoprefixer \
  tsx \
  drizzle-kit

# 3. Install shadcn/ui CLI
npx shadcn-ui@latest init

# 4. Add shadcn components
npx shadcn-ui@latest add card button badge input tabs switch
```

### Phase 2: Database Setup

```bash
# 1. Create shared/schema.ts with all tables
# 2. Create drizzle.config.ts
# 3. Generate migrations
npx drizzle-kit generate

# 4. Run migrations
npx drizzle-kit migrate
```

### Phase 3: Backend Implementation

```typescript
// 1. Create server/poolbrain-client.ts
//    - Implement PoolBrainClient class
//    - Add all API methods

// 2. Create server/storage.ts
//    - Define IStorage interface
//    - Implement DbStorage class

// 3. Create server/email-template.ts
//    - Implement buildChemicalOrderEmail()

// 4. Create server/routes.ts
//    - Implement all API endpoints
//    - Connect to Pool Brain
//    - Connect to database

// 5. Create server/index.ts (production)
//    - Set up Express server
//    - Serve static files
//    - Mount routes

// 6. Create server/index-dev.ts (development)
//    - Set up Vite middleware
//    - Hot module replacement
```

### Phase 4: Frontend Implementation

```typescript
// 1. Create client/src/App.tsx
//    - Set up wouter routing
//    - Define routes

// 2. Create layout components
//    - AppLayout.tsx
//    - Sidebar.tsx

// 3. Create pages
//    - Dashboard.tsx
//    - Chat.tsx
//    - Automations.tsx
//    - Settings.tsx

// 4. Create dashboard components
//    - EnrichedAlertsFeed.tsx
//    - AICommand.tsx

// 5. Set up TanStack Query
//    - Configure QueryClientProvider
//    - Create query hooks
```

### Phase 5: Styling

```bash
# 1. Configure Tailwind
# 2. Add custom fonts (Orbitron, Rajdhani, Inter)
# 3. Add glassmorphism styles
# 4. Create custom scrollbar
# 5. Add neon color palette
```

### Phase 6: Integration & Testing

```bash
# 1. Set up environment variables
# 2. Test Pool Brain connection
# 3. Test database queries
# 4. Test AI chat integration
# 5. Test email generation
# 6. Test Outlook deep link
```

### Phase 7: Deployment

```bash
# 1. Build production bundle
npm run build

# 2. Deploy to Replit or other platform
# 3. Configure environment variables
# 4. Set up PostgreSQL database
# 5. Run migrations
```

---

## Key Patterns & Best Practices

### 1. Data Fetching with TanStack Query

```typescript
// Always use useQuery for GET requests
const { data, isLoading, error } = useQuery({
  queryKey: ["alerts"],
  queryFn: async () => {
    const res = await fetch("/api/alerts/enriched");
    if (!res.ok) throw new Error("Failed");
    return res.json();
  },
});

// Use useMutation for POST/PUT/DELETE
const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.json();
  },
  onSuccess: () => {
    // Invalidate queries, update UI, etc.
  },
});
```

### 2. Error Handling

```typescript
// Backend
try {
  const result = await someOperation();
  res.json({ success: true, data: result });
} catch (error: any) {
  console.error("Error:", error);
  res.status(500).json({ 
    error: "Operation failed",
    message: error.message 
  });
}

// Frontend
const { data, error } = useQuery({...});

if (error) {
  return <div>Error: {error.message}</div>;
}
```

### 3. Type Safety

```typescript
// Always define types for API responses
interface EnrichedAlert {
  alertId: string;
  poolName: string;
  // ... all fields
}

interface ApiResponse {
  alerts: EnrichedAlert[];
}

// Use in queries
const { data } = useQuery<ApiResponse>({...});
```

### 4. Component Composition

```typescript
// Break down complex components
<AlertCard>
  <AlertHeader />
  <AlertContact />
  <AlertMessage />
  <AlertPictures />
  <AlertTechnician />
  <AlertFooter />
</AlertCard>
```

### 5. State Management

```typescript
// Local state for UI
const [expanded, setExpanded] = useState(false);

// Server state with React Query
const { data } = useQuery({...});

// Form state
const [formData, setFormData] = useState({...});
```

---

## Testing the App

### Manual Testing Checklist

**Dashboard**:
- [ ] Alerts load from Pool Brain
- [ ] Technician names appear
- [ ] Pictures display correctly
- [ ] Expand/collapse works
- [ ] Tabs filter correctly
- [ ] Severity sorting works

**Chat**:
- [ ] Can send messages
- [ ] Receives AI responses
- [ ] History persists
- [ ] Clear history works
- [ ] Error handling works

**Automations**:
- [ ] Email generates from alerts
- [ ] Chemical alerts detected
- [ ] Address extraction works (PRIMARY only)
- [ ] Email format correct
- [ ] Outlook link works
- [ ] Copy email works

**Settings**:
- [ ] Can view settings
- [ ] Can update API keys
- [ ] Changes persist

---

## Troubleshooting

### Common Issues

**1. Pool Brain API 401 Unauthorized**
- Check `POOLBRAIN_ACCESS_KEY` is set
- Verify API key is valid
- Check `COMPANY-ID` if required

**2. AI Chat not working**
- Verify `ACE_APP_URL` is set
- Check ace-breakpoint-app is running
- Verify ngrok tunnel is active
- Check Ollama is running on Mac

**3. Database connection errors**
- Verify `DATABASE_URL` is correct
- Check database is accessible
- Run migrations if needed

**4. Outlook link doesn't work**
- Email too long → Use download approach
- Browser blocks popup → Allow popups
- URL encoding issues → Check encodeURIComponent

**5. Alerts not showing**
- Check Pool Brain API credentials
- Verify API responses in network tab
- Check console for errors
- Verify enrichment logic

---

## Performance Optimization

### Backend
- Use parallel fetching with `Promise.all()`
- Implement pagination for large datasets
- Cache frequently accessed data
- Use connection pooling for database

### Frontend
- Use TanStack Query caching
- Lazy load images
- Virtualize long lists if needed
- Debounce search inputs
- Memoize expensive calculations

---

## Future Enhancements

Potential features to add:

1. **Real-time Updates**
   - WebSocket connection for live alerts
   - Auto-refresh dashboard

2. **Advanced Filtering**
   - Date range picker
   - Custom filters
   - Saved filter presets

3. **Reporting**
   - Generate PDF reports
   - Export to Excel
   - Email scheduled reports

4. **Workflow Automation**
   - Visual workflow builder
   - Custom triggers and actions
   - Integration marketplace

5. **Mobile App**
   - React Native version
   - Push notifications
   - Offline support

---

This documentation provides everything needed to rebuild the Breakpoint BI application from scratch. Follow the phases in order, refer to code examples, and test each feature as you build.
