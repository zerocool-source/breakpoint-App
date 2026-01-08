import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, json, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// System Settings (API keys, config)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolBrainApiKey: text("pool_brain_api_key"),
  poolBrainCompanyId: text("pool_brain_company_id"),
  defaultAiModel: text("default_ai_model").default("goss-20b"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Alerts (cached from Pool Brain or generated internally)
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id"),
  poolName: text("pool_name").notNull(),
  type: text("type").notNull(), // "Chemical", "Equipment", "Leak", "Service"
  severity: text("severity").notNull(), // "Critical", "High", "Medium", "Low"
  message: text("message").notNull(),
  status: text("status").notNull().default("Active"), // "Active", "Resolved"
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Automation Workflows
export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull().default("active"), // "active", "paused"
  executions: integer("executions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Technicians (from Pool Brain)
export const technicians = pgTable("technicians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  role: text("role").default("service"), // "service", "repair"
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTechnicianSchema = createInsertSchema(technicians).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof technicians.$inferSelect;

// Customers / HOAs (from Pool Brain or manual entry)
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  status: text("status").default("active"), // active_routed, active_no_route, inactive, lead
  poolCount: integer("pool_count").default(0),
  tags: text("tags"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Addresses (multiple addresses per customer)
export const customerAddresses = pgTable("customer_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  externalId: text("external_id"),
  addressType: text("address_type").default("primary"), // "primary", "billing", "service"
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pools / Bodies of Water (linked to customers)
export const pools = pgTable("pools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  externalId: text("external_id"),
  name: text("name").notNull(), // "LAP-POOL", "BEACH-POOL", "SPA", etc.
  poolType: text("pool_type"), // Pool, Spa, Fountain, etc.
  serviceLevel: text("service_level"), // "Pool Tech Services", etc.
  waterType: text("water_type"), // Chlorine, Salt, etc.
  gallons: integer("gallons"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Equipment (pool equipment linked to bodies of water)
export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  poolId: varchar("pool_id"), // Links to body of water (pool, spa, fountain, etc.)
  propertyId: varchar("property_id"),
  category: text("category").notNull(), // "filter", "pump", "heater", "controller", "feed_pump", "probe", "timer", "fill_valve", "other"
  equipmentType: text("equipment_type").notNull(), // "Sand", "DE", "Cartridge", "Variable Speed", etc.
  brand: text("brand"), // Make
  model: text("model"),
  serialNumber: text("serial_number"), // For warranty items
  quantity: integer("quantity").default(1),
  photos: text("photos").array(), // Array of photo URLs
  installDate: timestamp("install_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

// Route Schedules (assigns properties to technicians by day)
export const routeSchedules = pgTable("route_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(), // Links to customerAddresses
  poolId: varchar("pool_id"), // Optional legacy field
  isActive: boolean("is_active").default(false),
  frequency: text("frequency").default("weekly"), // "weekly", "biweekly", "custom"
  frequencyInterval: integer("frequency_interval").default(1), // Number of weeks between visits
  visitDays: text("visit_days").array(), // Array of day names: ["monday", "wednesday", "friday"]
  routeNotes: text("route_notes"),
  endDate: timestamp("end_date"),
  lastGeneratedThrough: timestamp("last_generated_through"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service Occurrences (generated visits from schedules)
export const serviceOccurrences = pgTable("service_occurrences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").default("unscheduled"), // unscheduled, scheduled, completed, skipped
  routeId: varchar("route_id"),
  technicianId: varchar("technician_id"),
  sourceScheduleId: varchar("source_schedule_id").notNull(),
  isAutoGenerated: boolean("is_auto_generated").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Route Schedule Assignments (which technician on which day)
export const routeAssignments = pgTable("route_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
  technicianId: text("technician_id").notNull(),
  technicianName: text("technician_name"),
  routeName: text("route_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer Contacts
export const customerContacts = pgTable("customer_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  contactType: text("contact_type").default("primary"), // primary, billing, emergency
  createdAt: timestamp("created_at").defaultNow(),
});

// Pool Equipment Settings
export const poolEquipment = pgTable("pool_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").notNull(),
  equipmentType: text("equipment_type").notNull(), // filter, pump, chlorinator, heater
  equipmentValue: text("equipment_value"), // Sand Filter, Cartridge, Variable Speed, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Service Tasks (per pool workflow)
export const serviceTasks = pgTable("service_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // whenArriving, beforePictures, chemicalReadings, chemicalDosing, inProgress
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isCompleted: boolean("is_completed").default(false),
  icons: text("icons"), // comma-separated: camera,calendar
  hiddenConditions: text("hidden_conditions"), // JSON string of conditions
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat History (for Ace Prime conversations)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull(), // "user", "agent", "system"
  content: text("content").notNull(),
  model: text("model"), // Which AI model was used
  timestamp: timestamp("timestamp").defaultNow(),
});

// Completed/Reviewed Alerts (tracks which Pool Brain alerts have been handled)
export const completedAlerts = pgTable("completed_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertId: text("alert_id").notNull().unique(), // Pool Brain alert ID
  category: text("category").notNull(), // "repair", "chemical", etc.
  completedAt: timestamp("completed_at").defaultNow(),
  reviewedBy: text("reviewed_by"), // Optional: who reviewed it
});

// Pay Periods (bi-weekly cycles)
export const payPeriods = pgTable("pay_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("open"), // "open", "closed", "paid"
  createdAt: timestamp("created_at").defaultNow(),
});

// Archived Alerts (repairs/jobs that have been archived after processing)
export const archivedAlerts = pgTable("archived_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertId: text("alert_id").notNull().unique(),
  alertType: text("alert_type").notNull(), // "repair", "job", etc.
  archivedAt: timestamp("archived_at").defaultNow(),
  archivedBy: text("archived_by"),
});

// Payroll Entries (service jobs assigned to technician payroll)
export const payrollEntries = pgTable("payroll_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payPeriodId: varchar("pay_period_id").notNull(),
  technicianId: text("technician_id").notNull(),
  technicianName: text("technician_name").notNull(),
  jobId: text("job_id").notNull(),
  jobTitle: text("job_title").notNull(),
  customerName: text("customer_name"),
  amount: integer("amount").notNull(), // Amount in cents
  commissionRate: integer("commission_rate").default(10), // 10% or 15%
  commissionAmount: integer("commission_amount").notNull(),
  notes: text("notes"),
  addedBy: text("added_by"), // Office manager who added it
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas
export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  timestamp: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
  executions: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerAddressSchema = createInsertSchema(customerAddresses).omit({
  id: true,
  createdAt: true,
});

export const insertPoolSchema = createInsertSchema(pools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRouteScheduleSchema = createInsertSchema(routeSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRouteAssignmentSchema = createInsertSchema(routeAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertServiceOccurrenceSchema = createInsertSchema(serviceOccurrences).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerContactSchema = createInsertSchema(customerContacts).omit({
  id: true,
  createdAt: true,
});

export const insertPoolEquipmentSchema = createInsertSchema(poolEquipment).omit({
  id: true,
  createdAt: true,
});

export const insertServiceTaskSchema = createInsertSchema(serviceTasks).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertCompletedAlertSchema = createInsertSchema(completedAlerts).omit({
  id: true,
  completedAt: true,
});

export const insertPayPeriodSchema = createInsertSchema(payPeriods).omit({
  id: true,
  createdAt: true,
});

export const insertPayrollEntrySchema = createInsertSchema(payrollEntries).omit({
  id: true,
  createdAt: true,
});

export const insertArchivedAlertSchema = createInsertSchema(archivedAlerts).omit({
  id: true,
  archivedAt: true,
});

// Types
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflows.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertCustomerAddress = z.infer<typeof insertCustomerAddressSchema>;
export type CustomerAddress = typeof customerAddresses.$inferSelect;

export type InsertPool = z.infer<typeof insertPoolSchema>;
export type Pool = typeof pools.$inferSelect;

export type InsertRouteSchedule = z.infer<typeof insertRouteScheduleSchema>;
export type RouteSchedule = typeof routeSchedules.$inferSelect;

export type InsertRouteAssignment = z.infer<typeof insertRouteAssignmentSchema>;
export type RouteAssignment = typeof routeAssignments.$inferSelect;

export type InsertServiceOccurrence = z.infer<typeof insertServiceOccurrenceSchema>;
export type ServiceOccurrence = typeof serviceOccurrences.$inferSelect;

export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type CustomerContact = typeof customerContacts.$inferSelect;

export type InsertPoolEquipment = z.infer<typeof insertPoolEquipmentSchema>;
export type PoolEquipment = typeof poolEquipment.$inferSelect;

export type InsertServiceTask = z.infer<typeof insertServiceTaskSchema>;
export type ServiceTask = typeof serviceTasks.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertCompletedAlert = z.infer<typeof insertCompletedAlertSchema>;
export type CompletedAlert = typeof completedAlerts.$inferSelect;

export type InsertPayPeriod = z.infer<typeof insertPayPeriodSchema>;
export type PayPeriod = typeof payPeriods.$inferSelect;

export type InsertPayrollEntry = z.infer<typeof insertPayrollEntrySchema>;
export type PayrollEntry = typeof payrollEntries.$inferSelect;

export type InsertArchivedAlert = z.infer<typeof insertArchivedAlertSchema>;
export type ArchivedAlert = typeof archivedAlerts.$inferSelect;

// Account Threads (one per account for communication)
export const threads = pgTable("threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: text("account_id").notNull().unique(),
  accountName: text("account_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message types for structured communication
export const messageTypeEnum = ["update", "assist", "issue", "repair", "chemical", "task", "photo"] as const;
export type MessageType = typeof messageTypeEnum[number];

// Visibility levels
export const visibilityEnum = ["all", "office_only", "supervisors_only"] as const;
export type Visibility = typeof visibilityEnum[number];

// Thread Messages
export const threadMessages = pgTable("thread_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  type: text("type").notNull().default("update"),
  text: text("text"),
  photoUrls: json("photo_urls").$type<string[]>().default([]),
  taggedUserIds: json("tagged_user_ids").$type<string[]>().default([]),
  taggedRoles: json("tagged_roles").$type<string[]>().default([]),
  visibility: text("visibility").default("all"),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Read Receipts (optional but useful)
export const messageReadReceipts = pgTable("message_read_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull(),
  userId: text("user_id").notNull(),
  readAt: timestamp("read_at").defaultNow(),
});

// Insert Schemas for Threads
export const insertThreadSchema = createInsertSchema(threads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertThreadMessageSchema = createInsertSchema(threadMessages).omit({
  id: true,
  createdAt: true,
});

export const insertMessageReadReceiptSchema = createInsertSchema(messageReadReceipts).omit({
  id: true,
  readAt: true,
});

// Types for Threads
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type Thread = typeof threads.$inferSelect;

export type InsertThreadMessage = z.infer<typeof insertThreadMessageSchema>;
export type ThreadMessage = typeof threadMessages.$inferSelect;

export type InsertMessageReadReceipt = z.infer<typeof insertMessageReadReceiptSchema>;
export type MessageReadReceipt = typeof messageReadReceipts.$inferSelect;

// Property Channels (Slack-style messaging for each property/pool)
export const propertyChannels = pgTable("property_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: text("property_id").notNull().unique(), // Pool Brain pool/property ID
  propertyName: text("property_name").notNull(),
  customerName: text("customer_name"),
  address: text("address"),
  description: text("description"), // Channel topic/description
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Channel Members (who has access to the channel)
export const channelMembers = pgTable("channel_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull(),
  userId: text("user_id").notNull(), // Technician ID or user ID
  userName: text("user_name").notNull(),
  role: text("role").default("member"), // "owner", "admin", "member"
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Channel Messages
export const channelMessages = pgTable("channel_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull(),
  parentMessageId: varchar("parent_message_id"), // For threaded replies
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // "text", "system", "file"
  attachments: json("attachments").$type<{ name: string; url: string; type: string }[]>().default([]),
  mentions: json("mentions").$type<string[]>().default([]), // User IDs mentioned
  isEdited: boolean("is_edited").default(false),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Channel Reactions (emoji reactions on messages)
export const channelReactions = pgTable("channel_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull(),
  userId: text("user_id").notNull(),
  emoji: text("emoji").notNull(), // e.g., "👍", "🔥", "✅"
  createdAt: timestamp("created_at").defaultNow(),
});

// Channel Read Receipts (track unread messages)
export const channelReads = pgTable("channel_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull(),
  userId: text("user_id").notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow(),
  lastReadMessageId: varchar("last_read_message_id"),
});

// Insert Schemas for Property Channels
export const insertPropertyChannelSchema = createInsertSchema(propertyChannels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChannelMemberSchema = createInsertSchema(channelMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertChannelMessageSchema = createInsertSchema(channelMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isEdited: true,
});

export const insertChannelReactionSchema = createInsertSchema(channelReactions).omit({
  id: true,
  createdAt: true,
});

export const insertChannelReadSchema = createInsertSchema(channelReads).omit({
  id: true,
});

// Types for Property Channels
export type InsertPropertyChannel = z.infer<typeof insertPropertyChannelSchema>;
export type PropertyChannel = typeof propertyChannels.$inferSelect;

export type InsertChannelMember = z.infer<typeof insertChannelMemberSchema>;
export type ChannelMember = typeof channelMembers.$inferSelect;

export type InsertChannelMessage = z.infer<typeof insertChannelMessageSchema>;
export type ChannelMessage = typeof channelMessages.$inferSelect;

export type InsertChannelReaction = z.infer<typeof insertChannelReactionSchema>;
export type ChannelReaction = typeof channelReactions.$inferSelect;

export type InsertChannelRead = z.infer<typeof insertChannelReadSchema>;
export type ChannelRead = typeof channelReads.$inferSelect;

// Estimates (Repair estimates requiring HOA approval)
export const estimateStatusEnum = ["draft", "pending_approval", "approved", "rejected", "scheduled", "completed", "invoiced"] as const;
export type EstimateStatus = typeof estimateStatusEnum[number];

export const estimates = pgTable("estimates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: text("property_id").notNull(),
  propertyName: text("property_name").notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  address: text("address"),
  
  // Estimate details
  title: text("title").notNull(),
  description: text("description"),
  items: json("items").$type<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    type: "part" | "labor";
  }[]>().default([]),
  
  // Totals
  partsTotal: integer("parts_total").default(0),
  laborTotal: integer("labor_total").default(0),
  totalAmount: integer("total_amount").default(0),
  
  // Status tracking
  status: text("status").notNull().default("draft"),
  
  // People involved
  createdByTechId: text("created_by_tech_id"),
  createdByTechName: text("created_by_tech_name"),
  approvedByManagerId: text("approved_by_manager_id"),
  approvedByManagerName: text("approved_by_manager_name"),
  
  // Dates
  createdAt: timestamp("created_at").defaultNow(),
  sentForApprovalAt: timestamp("sent_for_approval_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  scheduledDate: timestamp("scheduled_date"),
  completedAt: timestamp("completed_at"),
  invoicedAt: timestamp("invoiced_at"),
  
  // Notes
  techNotes: text("tech_notes"),
  managerNotes: text("manager_notes"),
  rejectionReason: text("rejection_reason"),
  
  // Link to job once scheduled
  jobId: text("job_id"),
  invoiceId: text("invoice_id"),
});

export const insertEstimateSchema = createInsertSchema(estimates).omit({
  id: true,
  createdAt: true,
});

export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimates.$inferSelect;

// Routes (Service routes for technicians)
export const routes = pgTable("routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id"), // Pool Brain route ID
  name: text("name").notNull(),
  date: timestamp("date"), // Specific date for this route (for date-based scheduling)
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
  color: text("color").notNull().default("#0891b2"),
  technicianId: text("technician_id"),
  technicianName: text("technician_name"),
  isLocked: boolean("is_locked").default(false),
  estimatedDriveTime: integer("estimated_drive_time").default(0), // minutes
  estimatedMiles: real("estimated_miles").default(0),
  estimatedOnSiteTime: integer("estimated_on_site_time").default(0), // minutes
  startLocation: text("start_location"),
  endLocation: text("end_location"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;

// Route Stops (Jobs/pools assigned to routes)
export const routeStops = pgTable("route_stops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id"), // Pool Brain stop ID
  routeId: text("route_id").notNull(),
  propertyId: text("property_id").notNull(),
  propertyName: text("property_name").notNull(),
  customerId: text("customer_id"), // Pool Brain CustomerID
  customerName: text("customer_name"),
  poolId: text("pool_id"), // Pool Brain WaterBodyID
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  poolName: text("pool_name"),
  jobType: text("job_type").default("route_stop"), // route_stop, one_time
  status: text("status").default("not_started"), // not_started, in_progress, completed, no_access, skipped
  sortOrder: integer("sort_order").default(0),
  estimatedTime: integer("estimated_time").default(30), // minutes
  notes: text("notes"),
  frequency: text("frequency").default("weekly"), // weekly, biweekly, monthly
  frequencyWeeks: integer("frequency_weeks").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRouteStopSchema = createInsertSchema(routeStops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRouteStop = z.infer<typeof insertRouteStopSchema>;
export type RouteStop = typeof routeStops.$inferSelect;

// Temporary Route Moves (One-time schedule changes)
export const routeMoves = pgTable("route_moves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stopId: text("stop_id").notNull(),
  originalRouteId: text("original_route_id").notNull(),
  temporaryRouteId: text("temporary_route_id").notNull(),
  moveDate: timestamp("move_date").notNull(),
  isPermanent: boolean("is_permanent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRouteMoveSchema = createInsertSchema(routeMoves).omit({
  id: true,
  createdAt: true,
});

export type InsertRouteMove = z.infer<typeof insertRouteMoveSchema>;
export type RouteMove = typeof routeMoves.$inferSelect;

// Unscheduled Stops (Jobs not assigned to any route)
export const unscheduledStops = pgTable("unscheduled_stops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: text("property_id").notNull(),
  propertyName: text("property_name").notNull(),
  customerName: text("customer_name"),
  address: text("address"),
  poolName: text("pool_name"),
  jobType: text("job_type").default("route_stop"),
  notes: text("notes"),
  estimatedTime: integer("estimated_time").default(30),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUnscheduledStopSchema = createInsertSchema(unscheduledStops).omit({
  id: true,
  createdAt: true,
});

export type InsertUnscheduledStop = z.infer<typeof insertUnscheduledStopSchema>;
export type UnscheduledStop = typeof unscheduledStops.$inferSelect;

// Property Repair Summary (computed, not stored)
export interface PropertyRepairSummary {
  propertyId: string;
  propertyName: string;
  customerName: string;
  address: string;
  poolNames: string[];
  totalRepairs: number;
  completedRepairs: number;
  pendingRepairs: number;
  totalSpend: number;
  averageRepairCost: number;
  lastServiceDate: string | null;
  technicians: string[];
  monthlySpend: Record<string, number>;
  repairs: {
    jobId: string;
    title: string;
    price: number;
    isCompleted: boolean;
    scheduledDate: string | null;
    technician: string | null;
  }[];
}

// ============================================
// PREVENTATIVE MAINTENANCE (PM) TABLES
// ============================================

// PM Service Types (Heater De-soot, Filter Rejuvenation, etc.)
export const pmServiceTypes = pgTable("pm_service_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "heater", "filter", "pump", "automation", "salt_system", "other"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPmServiceTypeSchema = createInsertSchema(pmServiceTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPmServiceType = z.infer<typeof insertPmServiceTypeSchema>;
export type PmServiceType = typeof pmServiceTypes.$inferSelect;

// PM Interval Settings (adjustable intervals per service type and water type)
export const pmIntervalSettings = pgTable("pm_interval_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pmServiceTypeId: varchar("pm_service_type_id").notNull(),
  waterType: text("water_type").notNull(), // "spa", "pool", "wader", "fountain", "all"
  recommendedIntervalMonths: integer("recommended_interval_months").notNull(),
  minimumIntervalMonths: integer("minimum_interval_months").notNull(),
  maximumIntervalMonths: integer("maximum_interval_months").notNull(),
  warningThresholdDays: integer("warning_threshold_days").default(30),
  industryStandard: text("industry_standard"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPmIntervalSettingSchema = createInsertSchema(pmIntervalSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPmIntervalSetting = z.infer<typeof insertPmIntervalSettingSchema>;
export type PmIntervalSetting = typeof pmIntervalSettings.$inferSelect;

// Equipment PM Schedules (PM schedule for each piece of equipment)
export const equipmentPmSchedules = pgTable("equipment_pm_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: text("equipment_id").notNull(), // From Pool Brain or local
  equipmentName: text("equipment_name").notNull(),
  equipmentType: text("equipment_type").notNull(),
  propertyId: text("property_id").notNull(),
  propertyName: text("property_name").notNull(),
  bodyOfWaterId: text("body_of_water_id"),
  waterType: text("water_type").notNull(), // "spa", "pool", "wader"
  pmServiceTypeId: varchar("pm_service_type_id").notNull(),
  intervalSettingId: varchar("interval_setting_id"),
  customIntervalMonths: integer("custom_interval_months"),
  customIntervalReason: text("custom_interval_reason"),
  installDate: text("install_date"), // ISO date string
  lastServiceDate: text("last_service_date"), // ISO date string
  nextDueDate: text("next_due_date").notNull(), // ISO date string
  status: text("status").notNull().default("current"), // "current", "due_soon", "overdue", "critical", "paused"
  duePriority: integer("due_priority").default(0), // Days until due, negative = overdue
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEquipmentPmScheduleSchema = createInsertSchema(equipmentPmSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentPmSchedule = z.infer<typeof insertEquipmentPmScheduleSchema>;
export type EquipmentPmSchedule = typeof equipmentPmSchedules.$inferSelect;

// PM Service Records (completed services with required justification)
export const pmServiceRecords = pgTable("pm_service_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentPmScheduleId: varchar("equipment_pm_schedule_id").notNull(),
  equipmentId: text("equipment_id").notNull(),
  equipmentName: text("equipment_name").notNull(),
  propertyId: text("property_id").notNull(),
  propertyName: text("property_name").notNull(),
  bodyOfWaterId: text("body_of_water_id"),
  pmServiceTypeId: varchar("pm_service_type_id").notNull(),
  serviceDate: text("service_date").notNull(), // ISO date string
  completedByName: text("completed_by_name"),
  durationMinutes: integer("duration_minutes"),
  serviceReason: text("service_reason").notNull(), // Required dropdown value
  workNotes: text("work_notes"),
  issuesFound: text("issues_found"),
  conditionRating: text("condition_rating"), // "good", "fair", "poor", "needs_replacement"
  recommendedFollowUp: text("recommended_follow_up"),
  laborCost: real("labor_cost"),
  partsCost: real("parts_cost"),
  totalCost: real("total_cost"),
  daysSinceLastService: integer("days_since_last_service"),
  wasEarlyService: boolean("was_early_service").default(false),
  earlyServiceApprovedBy: text("early_service_approved_by"),
  earlyServiceReason: text("early_service_reason"),
  nextServiceDate: text("next_service_date"), // Auto-calculated ISO date
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPmServiceRecordSchema = createInsertSchema(pmServiceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPmServiceRecord = z.infer<typeof insertPmServiceRecordSchema>;
export type PmServiceRecord = typeof pmServiceRecords.$inferSelect;

// Service Reason Options (for dropdown)
export const PM_SERVICE_REASONS = [
  "Scheduled maintenance - due date reached",
  "Scheduled maintenance - due soon",
  "Customer reported issue",
  "Problem found during routine visit",
  "Seasonal preparation",
  "Post-repair verification",
  "New equipment break-in service",
  "High usage adjustment",
  "Equipment age requires more frequent service",
  "Property manager requested",
  "Other (see notes)",
] as const;

export type PmServiceReason = typeof PM_SERVICE_REASONS[number];

// Fleet Truck Statuses
export const FLEET_TRUCK_STATUSES = [
  "Active",
  "Inactive",
  "In Shop",
] as const;

export type FleetTruckStatus = typeof FLEET_TRUCK_STATUSES[number];

// Fleet Trucks
export const fleetTrucks = pgTable("fleet_trucks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckNumber: integer("truck_number").notNull().unique(),
  currentMileage: integer("current_mileage"),
  registrationDue: text("registration_due"),
  smogDue: text("smog_due"),
  smogResult: text("smog_result"),
  notes: text("notes"),
  status: text("status").default("Active"), // "Active", "Inactive", "In Shop"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFleetTruckSchema = createInsertSchema(fleetTrucks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFleetTruck = z.infer<typeof insertFleetTruckSchema>;
export type FleetTruck = typeof fleetTrucks.$inferSelect;

// Fleet Service Types (Oil Change, Tire Rotation, etc.)
export const FLEET_SERVICE_TYPES = [
  "Oil Change",
  "Tire Rotation",
  "Brake Inspection",
  "Air Filter",
  "Transmission Fluid",
  "Coolant System",
  "Brake Fluid",
  "New Tires",
] as const;

export type FleetServiceType = typeof FLEET_SERVICE_TYPES[number];

// Fleet Maintenance Records
export const fleetMaintenanceRecords = pgTable("fleet_maintenance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").notNull(),
  truckNumber: integer("truck_number").notNull(),
  serviceType: text("service_type").notNull(), // One of FLEET_SERVICE_TYPES
  serviceDate: text("service_date"), // Excel serial date or ISO string
  vendor: text("vendor"),
  mileage: integer("mileage"),
  cost: real("cost"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFleetMaintenanceRecordSchema = createInsertSchema(fleetMaintenanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFleetMaintenanceRecord = z.infer<typeof insertFleetMaintenanceRecordSchema>;
export type FleetMaintenanceRecord = typeof fleetMaintenanceRecords.$inferSelect;
