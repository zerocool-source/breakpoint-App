# Breakpoint BI - Pool Brain Intelligence

## Overview

Breakpoint BI is a business intelligence and automation platform for commercial pool management companies. It integrates with the Pool Brain API to fetch and analyze pool alerts, customer data, and operational metrics. The application provides AI-powered insights, automated workflow generation (particularly for chemical ordering via email), and a conversational AI assistant for pool operations management.

**Tech Stack:**
- Frontend: React + TypeScript with Vite
- Backend: Express.js (Node.js)
- Database: PostgreSQL via Neon Serverless
- ORM: Drizzle
- UI: shadcn/ui components with Radix UI primitives
- Styling: Tailwind CSS with custom "Antigravity Dark" theme
- AI: External chat API (ace-breakpoint-app proxy)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component Structure:**
- **Layout System:** Fixed sidebar navigation with main content area, background image overlay with blur effect
- **Page-Based Routing:** Using wouter for client-side routing
- **Design System:** Custom "Antigravity Dark" theme with cyan/purple neon accents, three-font hierarchy (Orbitron for headers, Rajdhani for UI/numbers, Inter for body text)
- **State Management:** TanStack Query (React Query) for server state, local React state for UI interactions
- **Key Features:**
  - Dashboard with real-time alert feed
  - Intelligence/Chat interface for AI interactions
  - Automations page for workflow management (email generation)
  - Settings page for API configuration

**Rationale:** Page-based architecture provides clear separation of concerns. TanStack Query handles caching and real-time data synchronization automatically. The custom theme creates a distinctive brand identity for the pool management industry.

### Backend Architecture

**Server Setup:**
- Development: Vite dev server with Express middleware
- Production: Static build with Express serving bundled assets
- Session Management: connect-pg-simple for PostgreSQL-backed sessions

**API Routes:**
- `/api/alerts/enriched` - Fetches alerts from Pool Brain and enriches with customer/pool data
- `/api/alerts/chemical-order-email` - Generates formatted chemical order emails
- `/api/chat` - Proxies requests to external AI service (ace-breakpoint-app)
- `/api/settings` - Manages Pool Brain API credentials and configuration

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

**Neon PostgreSQL:**
- Serverless PostgreSQL database
- Connection via `@neondatabase/serverless` with WebSocket support
- Drizzle ORM for type-safe queries

**AI Service (ace-breakpoint-app):**
- External Replit service for AI chat responses
- Proxy pattern keeps credentials secure
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