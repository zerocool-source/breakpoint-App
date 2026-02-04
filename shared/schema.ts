import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, json, jsonb, real, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

// System Settings (API keys, config)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolBrainApiKey: text("pool_brain_api_key"),
  poolBrainCompanyId: text("pool_brain_company_id"),
  defaultAiModel: text("default_ai_model").default("goss-20b"),
  globalActiveSeason: text("global_active_season").default("summer"), // "summer" or "winter" - global seasonal schedule setting
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
  photoUrl: text("photo_url"), // Profile photo URL
  role: text("role").default("service"), // "service", "repair", "supervisor", "foreman"
  region: text("region"), // "south", "mid", "north" - county region assignment (supervisors assign to technicians)
  supervisorId: varchar("supervisor_id"), // Self-referential FK for team hierarchy
  truckNumber: text("truck_number"), // Assigned truck number
  commissionPercent: integer("commission_percent").default(0), // Commission % on parts for service repairs
  routeLocked: boolean("route_locked").default(false), // When true, technician cannot reorder their route in mobile app
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

// Technician Notes (internal notes about technicians)
export const technicianNotes = pgTable("technician_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  technicianId: varchar("technician_id").notNull(),
  content: text("content").notNull(),
  createdBy: text("created_by"), // User who created the note
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTechnicianNoteSchema = createInsertSchema(technicianNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTechnicianNote = z.infer<typeof insertTechnicianNoteSchema>;
export type TechnicianNote = typeof technicianNotes.$inferSelect;

// Customer Zones (for grouping customers by geographic zones)
export const customerZones = pgTable("customer_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").default("#0077b6"), // Hex color for badge
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomerZoneSchema = createInsertSchema(customerZones).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomerZone = z.infer<typeof insertCustomerZoneSchema>;
export type CustomerZone = typeof customerZones.$inferSelect;

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
  zoneId: varchar("zone_id"), // FK to customerZones for geographic grouping
  // Budget fields (optional)
  chemicalsBudget: integer("chemicals_budget"), // Amount in cents
  chemicalsBudgetPeriod: text("chemicals_budget_period").default("monthly"), // "monthly" or "annual"
  repairsBudget: integer("repairs_budget"), // Amount in cents
  repairsBudgetPeriod: text("repairs_budget_period").default("monthly"), // "monthly" or "annual"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Tags (structured tags with pre-built and custom options)
export const customerTags = pgTable("customer_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").default("#6B7280"), // Hex color for badge
  isPrebuilt: boolean("is_prebuilt").default(false), // Pre-built vs custom
  isWarningTag: boolean("is_warning_tag").default(false), // Shows as warning in field app
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for customer-tag relationships
export const customerTagAssignments = pgTable("customer_tag_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  tagId: varchar("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomerTagSchema = createInsertSchema(customerTags).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerTagAssignmentSchema = createInsertSchema(customerTagAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomerTag = z.infer<typeof insertCustomerTagSchema>;
export type CustomerTag = typeof customerTags.$inferSelect;
export type InsertCustomerTagAssignment = z.infer<typeof insertCustomerTagAssignmentSchema>;
export type CustomerTagAssignment = typeof customerTagAssignments.$inferSelect;

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
  // Work Order requirements
  woRequired: boolean("wo_required").default(false),
  woNotes: text("wo_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property Billing Contacts (for invoice routing by department)
export const propertyBillingContacts = pgTable("property_billing_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(), // Can be pool ID or customer ID
  contactType: text("contact_type").notNull(), // "repairs", "chemicals", "primary"
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertyBillingContactSchema = createInsertSchema(propertyBillingContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPropertyBillingContact = z.infer<typeof insertPropertyBillingContactSchema>;
export type PropertyBillingContact = typeof propertyBillingContacts.$inferSelect;

// Property Contacts (general contacts for a property)
export const propertyContacts = pgTable("property_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  name: text("name").notNull(),
  role: text("role"), // "Manager", "Owner", "Maintenance", etc.
  phone: text("phone"),
  email: text("email"),
  isPrimary: boolean("is_primary").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertyContactSchema = createInsertSchema(propertyContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPropertyContact = z.infer<typeof insertPropertyContactSchema>;
export type PropertyContact = typeof propertyContacts.$inferSelect;

// Property Access Notes (gate codes, instructions, etc.)
export const propertyAccessNotes = pgTable("property_access_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  noteType: text("note_type").notNull(), // "gate_code", "key_location", "instruction", "warning"
  title: text("title").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertyAccessNoteSchema = createInsertSchema(propertyAccessNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPropertyAccessNote = z.infer<typeof insertPropertyAccessNoteSchema>;
export type PropertyAccessNote = typeof propertyAccessNotes.$inferSelect;

// Chemical Vendors (suppliers for chemical orders)
export const chemicalVendors = pgTable("chemical_vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorName: text("vendor_name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"), // For account numbers, special instructions, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChemicalVendorSchema = createInsertSchema(chemicalVendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChemicalVendor = z.infer<typeof insertChemicalVendorSchema>;
export type ChemicalVendor = typeof chemicalVendors.$inferSelect;

// Invoice Templates (for chemical order invoices)
export const invoiceTemplates = pgTable("invoice_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateName: text("template_name").notNull(),
  headerText: text("header_text"),
  footerText: text("footer_text"),
  termsConditions: text("terms_conditions"),
  layoutPreferences: json("layout_preferences"), // JSON for layout options
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvoiceTemplateSchema = createInsertSchema(invoiceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvoiceTemplate = z.infer<typeof insertInvoiceTemplateSchema>;
export type InvoiceTemplate = typeof invoiceTemplates.$inferSelect;

// Tech Ops Entries (field technician submissions)
export const techOpsEntries = pgTable("TechOpsEntry", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceRepairNumber: text("serviceRepairNumber"),
  entryType: text("entryType").notNull(),
  technicianName: text("technicianName"),
  technicianId: text("technicianId"),
  positionType: text("positionType"),
  propertyId: text("propertyId"),
  propertyName: text("propertyName"),
  propertyAddress: text("propertyAddress"),
  issueTitle: text("issueTitle"),
  description: text("description"),
  notes: text("notes"),
  priority: text("priority").default("normal"),
  status: text("status").default("pending"),
  isRead: boolean("isRead").default(false),
  chemicals: text("chemicals"),
  quantity: text("quantity"),
  issueType: text("issueType"),
  photos: text("photos").array(),
  reviewedBy: text("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  resolvedBy: text("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  resolutionNotes: text("resolutionNotes"),
  vendorId: text("vendorId"),
  vendorName: text("vendorName"),
  orderStatus: text("orderStatus").default("pending"),
  invoiceSentAt: timestamp("invoiceSentAt"),
  invoiceSentToVendorId: text("invoiceSentToVendorId"),
  invoiceTemplateId: text("invoiceTemplateId"),
  partsCost: integer("partsCost").default(0),
  commissionPercent: integer("commissionPercent"),
  commissionAmount: integer("commissionAmount"),
  convertedToEstimateId: text("convertedToEstimateId"),
  convertedAt: timestamp("convertedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const insertTechOpsEntrySchema = createInsertSchema(techOpsEntries).omit({
  id: true,
  reviewedBy: true,
  reviewedAt: true,
  invoiceSentAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTechOpsEntry = z.infer<typeof insertTechOpsEntrySchema>;
export type TechOpsEntry = typeof techOpsEntries.$inferSelect;

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
  visitDays: text("visit_days").array(), // Array of day names: ["monday", "wednesday", "friday"] - LEGACY, now uses seasonal
  summerVisitDays: text("summer_visit_days").array(), // Summer schedule visit days
  winterVisitDays: text("winter_visit_days").array(), // Winter schedule visit days
  activeSeason: text("active_season").default("summer"), // "summer" or "winter" - which schedule is currently active
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

// System Users table for admin and office staff access management
export const systemUsers = pgTable("system_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("office_staff"), // 'admin' or 'office_staff'
  active: boolean("active").notNull().default(true),
  passwordHash: text("password_hash"), // For password-based auth
  inviteSent: boolean("invite_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSystemUserSchema = createInsertSchema(systemUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type InsertSystemUser = z.infer<typeof insertSystemUserSchema>;
export type SystemUser = typeof systemUsers.$inferSelect;

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

// Department Channels (Office, Dispatch, HR sections for field techs to communicate with)
export const departmentChannels = pgTable("department_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  department: text("department").notNull(), // "office", "dispatch", "hr"
  description: text("description"),
  icon: text("icon").default("hash"), // Icon name for the channel
  isPrivate: boolean("is_private").default(false),
  allowedRoles: text("allowed_roles").array(), // Which roles can access: "repair_tech", "service_tech", "foreman", "supervisor", "office"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDepartmentChannelSchema = createInsertSchema(departmentChannels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDepartmentChannel = z.infer<typeof insertDepartmentChannelSchema>;
export type DepartmentChannel = typeof departmentChannels.$inferSelect;

// Property Channels (Slack-style messaging for each property/pool)
export const propertyChannels = pgTable("property_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: text("property_id").notNull().unique(), // Pool Brain pool/property ID
  propertyName: text("property_name").notNull(),
  customerName: text("customer_name"),
  address: text("address"),
  category: text("category").default("general"), // Category for grouping: "residential", "commercial", "hoa", "municipal"
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
export const estimateStatusEnum = ["draft", "pending_approval", "approved", "rejected", "needs_scheduling", "scheduled", "completed", "ready_to_invoice", "invoiced", "archived"] as const;
export type EstimateStatus = typeof estimateStatusEnum[number];

export const estimates = pgTable("estimates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: text("property_id").notNull(),
  propertyName: text("property_name").notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  address: text("address"),
  
  // QuickBooks-compatible fields
  estimateNumber: text("estimate_number"), // Auto-generated estimate number
  estimateDate: timestamp("estimate_date").defaultNow(),
  expirationDate: timestamp("expiration_date"),
  acceptedBy: text("accepted_by"), // Customer name who accepted
  acceptedDate: timestamp("accepted_date"),
  location: text("location"), // Service location/job site
  tags: text("tags").array(), // Tags for categorization
  sourceType: text("source_type").default("office_staff"), // "office_staff", "repair_tech", "service_tech", "emergency" - tracks origin
  sourceRepairJobId: text("source_repair_job_id"), // Link to original service repair job if converted
  sourceEmergencyId: text("source_emergency_id"), // Link to original emergency if converted from emergency
  serviceRepairCount: integer("service_repair_count"), // Count of service repairs bundled into this estimate
  sourceServiceRepairIds: text("source_service_repair_ids").array(), // Array of tech_ops_entry IDs that were converted to this estimate
  
  // Conversion tracking (who converted from emergency/service repair to estimate)
  convertedByUserId: text("converted_by_user_id"),
  convertedByUserName: text("converted_by_user_name"),
  convertedAt: timestamp("converted_at"),
  
  // Estimate details
  title: text("title").notNull(),
  description: text("description"),
  items: json("items").$type<{
    lineNumber: number;
    serviceDate?: string;
    productService: string;
    description: string;
    sku?: string;
    quantity: number;
    rate: number;
    amount: number;
    taxable: boolean;
    class?: string;
  }[]>().default([]),
  
  // Photos/Attachments
  photos: text("photos").array(),
  attachments: json("attachments").$type<{
    name: string;
    url: string;
    size: number;
  }[]>().default([]),
  
  // Totals (QuickBooks format - stored in cents)
  subtotal: integer("subtotal").default(0),
  discountType: text("discount_type").default("percent"), // "percent" or "fixed"
  discountValue: real("discount_value").default(0),
  discountAmount: integer("discount_amount").default(0),
  taxableSubtotal: integer("taxable_subtotal").default(0),
  salesTaxRate: real("sales_tax_rate").default(0),
  salesTaxAmount: integer("sales_tax_amount").default(0),
  depositType: text("deposit_type").default("percent"), // "percent" or "fixed"
  depositValue: real("deposit_value").default(0),
  depositAmount: integer("deposit_amount").default(0),
  totalAmount: integer("total_amount").default(0),
  
  // Legacy totals (keep for backward compatibility)
  partsTotal: integer("parts_total").default(0),
  laborTotal: integer("labor_total").default(0),
  
  // Status tracking
  status: text("status").notNull().default("draft"),
  
  // People involved (QuickBooks-compatible)
  createdByTechId: text("created_by_tech_id"),
  createdByTechName: text("created_by_tech_name"),
  repairTechId: text("repair_tech_id"),
  repairTechName: text("repair_tech_name"),
  serviceTechId: text("service_tech_id"),
  serviceTechName: text("service_tech_name"),
  fieldSupervisorId: text("field_supervisor_id"),
  fieldSupervisorName: text("field_supervisor_name"),
  officeMemberId: text("office_member_id"),
  officeMemberName: text("office_member_name"),
  repairForemanId: text("repair_foreman_id"),
  repairForemanName: text("repair_foreman_name"),
  approvedByManagerId: text("approved_by_manager_id"),
  approvedByManagerName: text("approved_by_manager_name"),
  
  // Dates
  createdAt: timestamp("created_at").defaultNow(),
  reportedDate: timestamp("reported_date"),
  sentForApprovalAt: timestamp("sent_for_approval_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  scheduledDate: timestamp("scheduled_date"),
  completedAt: timestamp("completed_at"),
  invoicedAt: timestamp("invoiced_at"),
  
  // Notes (QuickBooks-compatible)
  techNotes: text("tech_notes"),
  managerNotes: text("manager_notes"),
  rejectionReason: text("rejection_reason"),
  customerNote: text("customer_note"), // Note to customer (visible on estimate)
  memoOnStatement: text("memo_on_statement"), // Internal memo (not visible to customer)
  
  // Customer Approval Tracking (QuickBooks-style)
  approvalToken: text("approval_token"), // Unique token for secure approval link (no login required)
  approvalTokenExpiresAt: timestamp("approval_token_expires_at"),
  approvalSentTo: text("approval_sent_to"), // Email address approval was sent to
  approvalSentAt: timestamp("approval_sent_at"),
  customerApproverName: text("customer_approver_name"), // Name of customer who approved/rejected
  customerApproverTitle: text("customer_approver_title"), // Title/role of customer who approved/rejected
  
  // Verbal Approval Tracking
  verbalApprovalRecordedBy: text("verbal_approval_recorded_by"), // Office staff who recorded the verbal approval
  verbalApprovalMethod: text("verbal_approval_method"), // "email", "phone", or "other"
  verbalApprovalMethodDetails: text("verbal_approval_method_details"), // Details if method is "other" (max 100 chars)
  
  // Link to job once scheduled
  jobId: text("job_id"),
  invoiceId: text("invoice_id"),
  assignedRepairJobId: text("assigned_repair_job_id"), // Links to service_repair_jobs when scheduled
  scheduledByUserId: text("scheduled_by_user_id"),
  scheduledByUserName: text("scheduled_by_user_name"),
  scheduledAt: timestamp("scheduled_at"),
  
  // Deadline tracking for job completion
  deadlineAt: timestamp("deadline_at"), // When the job must be completed by
  deadlineUnit: text("deadline_unit").default("hours"), // "hours" or "days"
  deadlineValue: integer("deadline_value"), // Number of hours or days
  
  // Work Order (WO) tracking
  workType: text("work_type").default("repairs"), // "repairs", "chemicals", "other"
  woRequired: boolean("wo_required").default(false), // Flag if this property requires a work order
  woReceived: boolean("wo_received").default(false),
  woNumber: text("wo_number"),
  
  // Soft Delete and Archive Tracking
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedByUserId: text("deleted_by_user_id"),
  deletedByUserName: text("deleted_by_user_name"),
  deletedReason: text("deleted_reason"),
  archivedAt: timestamp("archived_at"),
  archivedByUserId: text("archived_by_user_id"),
  archivedByUserName: text("archived_by_user_name"),
  archivedReason: text("archived_reason"),
});

export const insertEstimateSchema = createInsertSchema(estimates).omit({
  id: true,
  createdAt: true,
});

export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimates.$inferSelect;

// Estimate History Log (Audit Trail)
export const estimateHistoryActionEnum = ["created", "updated", "sent_for_approval", "approved", "rejected", "verbal_approval", "needs_scheduling", "scheduled", "completed", "invoiced", "archived", "deleted", "restored"] as const;
export type EstimateHistoryAction = typeof estimateHistoryActionEnum[number];

export const estimateHistoryLog = pgTable("estimate_history_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estimateId: text("estimate_id").notNull(),
  estimateNumber: text("estimate_number"),
  propertyId: text("property_id"),
  propertyName: text("property_name"),
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  estimateValue: integer("estimate_value"), // Amount in cents
  
  // Action tracking
  actionType: text("action_type").notNull(), // created, sent_for_approval, approved, rejected, verbal_approval, archived, deleted, restored
  actionDescription: text("action_description"), // Human-readable description
  
  // Who performed the action
  performedByUserId: text("performed_by_user_id"),
  performedByUserName: text("performed_by_user_name"),
  performedAt: timestamp("performed_at").defaultNow(),
  
  // Approval details (for approval actions)
  approvalMethod: text("approval_method"), // "email" or "verbal"
  approverName: text("approver_name"), // Customer who approved
  approverTitle: text("approver_title"), // Property Manager, HOA President, etc.
  approverContactMethod: text("approver_contact_method"), // "email_link", "phone", "in_person", "other"
  
  // For archive/delete actions
  reason: text("reason"),
  notes: text("notes"),
  
  // Previous and new status for tracking transitions
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  
  // Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEstimateHistoryLogSchema = createInsertSchema(estimateHistoryLog).omit({
  id: true,
  createdAt: true,
});

export type InsertEstimateHistoryLog = z.infer<typeof insertEstimateHistoryLogSchema>;
export type EstimateHistoryLog = typeof estimateHistoryLog.$inferSelect;

// Service Repair Jobs (from service techs, under $500)
export const serviceRepairJobs = pgTable("service_repair_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id"), // From mobile app sync
  jobNumber: text("job_number").notNull(), // Auto-generated job number (e.g., SR-2025-0001)
  
  // Location/Customer
  propertyId: text("property_id").notNull(),
  propertyName: text("property_name").notNull(),
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  poolId: text("pool_id"),
  poolName: text("pool_name"),
  address: text("address"),
  
  // Technician
  technicianId: text("technician_id"),
  technicianName: text("technician_name"),
  
  // Job details
  jobDate: timestamp("job_date").defaultNow(),
  description: text("description"),
  notes: text("notes"),
  photos: text("photos").array(), // Array of photo URLs from field app
  
  // Amounts (stored in cents)
  laborAmount: integer("labor_amount").default(0),
  partsAmount: integer("parts_amount").default(0),
  totalAmount: integer("total_amount").default(0),
  
  // Line items from the job
  items: json("items").$type<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[]>().default([]),
  
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, selected, estimated, invoiced
  
  // Links to estimate/invoice
  estimateId: text("estimate_id"),
  invoiceId: text("invoice_id"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  batchedAt: timestamp("batched_at"),
});

export const insertServiceRepairJobSchema = createInsertSchema(serviceRepairJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServiceRepairJob = z.infer<typeof insertServiceRepairJobSchema>;
export type ServiceRepairJob = typeof serviceRepairJobs.$inferSelect;

// Repair Request Line Item type (stored as JSON)
export interface RepairRequestLineItem {
  lineNumber: number;
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  amount?: number;
}

// Repair Requests (requests for repair evaluation/assessment)
export const repairRequests = pgTable("repair_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Request identification
  requestNumber: text("request_number"), // Auto-generated (e.g., "RR-265959")
  requestDate: timestamp("request_date").defaultNow(),
  
  // Property information
  propertyId: text("property_id").notNull(),
  propertyName: text("property_name").notNull(),
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  address: text("address"),
  
  // Request details
  issueDescription: text("issue_description").notNull(),
  reportedBy: text("reported_by").notNull(), // service_tech, repair_tech, supervisor, office_staff, customer
  reportedByName: text("reported_by_name"),
  reportedByTechId: text("reported_by_tech_id"),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  
  // Line items (parts/items needed) - stored as JSON
  lineItems: jsonb("line_items").$type<RepairRequestLineItem[]>().default([]),
  
  // Photos
  photos: text("photos").array(),
  
  // Notes sections
  customerNote: text("customer_note"), // Visible on request
  officeNotes: text("office_notes"), // Internal office notes
  memo: text("memo"), // Internal memo
  techNotes: text("tech_notes"), // Technical notes
  notes: text("notes"), // Legacy/general notes field
  
  // Cost tracking
  subtotal: integer("subtotal").default(0), // In cents
  estimatedCost: integer("estimated_cost").default(0), // In cents
  totalAmount: integer("total_amount").default(0), // In cents
  
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, assigned, in_assessment, estimated, completed, cancelled
  
  // Assignment for assessment
  assignedTechId: text("assigned_tech_id"),
  assignedTechName: text("assigned_tech_name"),
  assignedDate: timestamp("assigned_date"),
  scheduledTime: text("scheduled_time"), // e.g., "08:30"
  assignmentNotes: text("assignment_notes"), // Additional instructions for the technician
  
  // Links to estimate
  estimateId: text("estimate_id"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRepairRequestSchema = createInsertSchema(repairRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRepairRequest = z.infer<typeof insertRepairRequestSchema>;
export type RepairRequest = typeof repairRequests.$inferSelect;

// Approval Requests (for repair requests that need approval before proceeding)
export const approvalRequests = pgTable("approval_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Link to repair request
  repairRequestId: text("repair_request_id").notNull(),
  repairRequestNumber: text("repair_request_number"),
  
  // Property info (copied for quick access)
  propertyId: text("property_id").notNull(),
  propertyName: text("property_name").notNull(),
  issueDescription: text("issue_description"),
  
  // Approval details
  estimatedCost: integer("estimated_cost").default(0), // In cents
  approvalRequestedFrom: text("approval_requested_from").notNull(), // supervisor, manager, customer, office_admin
  approvalNotes: text("approval_notes"),
  urgency: text("urgency").notNull().default("standard"), // standard, priority, emergency
  
  // Attachments
  attachments: text("attachments").array(),
  
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, approved, rejected, expired
  approvedBy: text("approved_by"),
  approvedByName: text("approved_by_name"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  // Approval method (how approval was obtained)
  approvalMethod: text("approval_method"), // email, phone_call, text_message, chat
  approvalType: text("approval_type"), // email, verbal
  
  // Repair technician assigned
  repairTechnicianId: text("repair_technician_id"),
  repairTechnicianName: text("repair_technician_name"),
  
  // Confirmation notes (for verbal approvals)
  confirmationNotes: text("confirmation_notes"),
  
  // Request metadata
  requestedBy: text("requested_by"),
  requestedByName: text("requested_by_name"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;

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
  waterBodyType: text("water_body_type").default("Pool"), // Pool, Spa, Fountain, Splash Pad, Wader
  scheduledDate: text("scheduled_date"), // YYYY-MM-DD format
  isCoverage: boolean("is_coverage").default(false), // Coverage stop flag
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

// Equipment Types for PM Tracking
export const PM_EQUIPMENT_TYPES = [
  "Heater",
  "Filter", 
  "Pump",
  "Controller",
  "Salt System",
  "UV System",
  "Ozone",
  "Other",
] as const;

export type PmEquipmentType = typeof PM_EQUIPMENT_TYPES[number];

// Equipment Applications
export const PM_EQUIPMENT_APPLICATIONS = [
  "Pool",
  "Spa",
  "Wader",
  "Splash Pad",
  "Fountain",
  "Other",
] as const;

export type PmEquipmentApplication = typeof PM_EQUIPMENT_APPLICATIONS[number];

// Equipment Brands by Type
export const PM_EQUIPMENT_BRANDS: Record<string, readonly string[]> = {
  heater: ["Raypak", "Pentair", "Hayward", "Jandy", "Laars", "Lochinvar", "Other"],
  filter: ["Pentair", "Hayward", "Jandy", "Waterway", "Sta-Rite", "Other"],
  pump: ["Pentair", "Hayward", "Jandy", "Sta-Rite", "Waterway", "Other"],
  controller: ["Pentair", "Hayward", "Jandy", "Chemtrol", "Other"],
  "salt system": ["Pentair", "Hayward", "Jandy", "AutoPilot", "Other"],
  "uv system": ["Delta UV", "Spectralight", "Other"],
  ozone: ["DEL Ozone", "ClearWater", "Other"],
  other: ["Other"],
};

// Equipment Models by Type
export const PM_EQUIPMENT_MODELS: Record<string, readonly string[]> = {
  heater: ["R207A", "R267A", "R337A", "R407A", "MasterTemp 250", "MasterTemp 400", "H-Series", "Other"],
  filter: ["TR100", "TR140", "TR200", "DE4820", "DE6020", "CL220", "Other"],
  pump: ["IntelliFlo VSF", "IntelliFlo3", "SuperFlo VS", "WhisperFlo", "EcoStar", "Other"],
  controller: ["IntelliChem", "ProLogic", "AquaLink", "Other"],
  "salt system": ["IntelliChlor", "AquaRite", "Other"],
  "uv system": ["E-80", "E-46", "Other"],
  ozone: ["Eclipse", "Solar", "Other"],
  other: ["Other"],
};

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

// Truck Inventory Items
export const TRUCK_INVENTORY_CATEGORIES = [
  "Chemicals",
  "Tools",
  "Parts",
  "Safety Equipment",
  "Cleaning Supplies",
  "Test Equipment",
  "Other",
] as const;

export type TruckInventoryCategory = typeof TRUCK_INVENTORY_CATEGORIES[number];

export const truckInventory = pgTable("truck_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truckId: varchar("truck_id").notNull(),
  truckNumber: integer("truck_number").notNull(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").default("each"),
  minQuantity: integer("min_quantity").default(0),
  maxQuantity: integer("max_quantity"),
  lastRestocked: timestamp("last_restocked"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTruckInventorySchema = createInsertSchema(truckInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTruckInventory = z.infer<typeof insertTruckInventorySchema>;
export type TruckInventory = typeof truckInventory.$inferSelect;

// Properties (Service addresses/locations for field tech sync)
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id"), // Pool Brain PropertyID/AddressID
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  poolCount: integer("pool_count").default(0),
  serviceLevel: text("service_level"),
  status: text("status").default("active"), // active, inactive, lead
  notes: text("notes"),
  gateCode: text("gate_code"),
  accessInstructions: text("access_instructions"),
  // Extended profile fields (QuickBooks-style)
  billingAddress: text("billing_address"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZip: text("billing_zip"),
  primaryContactName: text("primary_contact_name"),
  primaryContactPhone: text("primary_contact_phone"),
  primaryContactEmail: text("primary_contact_email"),
  secondaryContactName: text("secondary_contact_name"),
  secondaryContactPhone: text("secondary_contact_phone"),
  secondaryContactEmail: text("secondary_contact_email"),
  zone: text("zone"), // Service zone/territory
  tags: text("tags").array(), // Multiple tags for categorization
  monthlyRate: integer("monthly_rate"), // cents
  accountBalance: integer("account_balance").default(0), // cents
  lastServiceDate: timestamp("last_service_date"),
  nextServiceDate: timestamp("next_service_date"),
  propertyType: text("property_type"), // residential, commercial, hoa
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Field Entries (Technician submissions from field tech app)
export const fieldEntries = pgTable("field_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeStopId: text("route_stop_id"),
  propertyId: text("property_id"),
  technicianId: text("technician_id"),
  technicianName: text("technician_name"),
  entryType: text("entry_type").notNull(), // service, repair, reading, note
  payload: text("payload"), // JSON data
  submittedAt: timestamp("submitted_at").defaultNow(),
  syncStatus: text("sync_status").default("synced"), // pending, synced, failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFieldEntrySchema = createInsertSchema(fieldEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFieldEntry = z.infer<typeof insertFieldEntrySchema>;
export type FieldEntry = typeof fieldEntries.$inferSelect;

// QuickBooks OAuth Tokens
export const quickbooksTokens = pgTable("quickbooks_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  realmId: text("realm_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQuickbooksTokenSchema = createInsertSchema(quickbooksTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertQuickbooksToken = z.infer<typeof insertQuickbooksTokenSchema>;
export type QuickbooksToken = typeof quickbooksTokens.$inferSelect;

// Invoices (synced with QuickBooks)
export const invoiceStatusEnum = ["draft", "sent", "paid", "overdue", "voided", "partial"] as const;
export type InvoiceStatus = typeof invoiceStatusEnum[number];

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull(), // Format: INV-YY-NNNNN
  customerId: varchar("customer_id"),
  customerName: text("customer_name").notNull(),
  propertyId: varchar("property_id"),
  propertyName: text("property_name"),
  propertyAddress: text("property_address"),
  estimateId: varchar("estimate_id"), // Link to source estimate if applicable
  estimateNumber: text("estimate_number"),
  emergencyId: varchar("emergency_id"), // Link to source emergency if applicable
  woNumber: text("wo_number"), // Work Order number if created from WO
  sourceType: text("source_type"), // work_order, estimate, emergency, office_staff
  
  // People involved
  serviceTechId: text("service_tech_id"),
  serviceTechName: text("service_tech_name"),
  repairTechId: text("repair_tech_id"),
  repairTechName: text("repair_tech_name"),
  sentByUserId: text("sent_by_user_id"),
  sentByUserName: text("sent_by_user_name"),
  
  lineItems: json("line_items").$type<{
    description: string;
    quantity: number;
    rate: number; // in cents
    amount: number; // in cents
  }[]>(),
  subtotal: integer("subtotal").default(0), // in cents
  taxRate: real("tax_rate").default(0),
  taxAmount: integer("tax_amount").default(0), // in cents
  totalAmount: integer("total_amount").default(0), // in cents
  amountPaid: integer("amount_paid").default(0), // in cents
  amountDue: integer("amount_due").default(0), // in cents
  status: text("status").notNull().default("draft"), // draft, sent, paid, overdue, voided, partial
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  quickbooksInvoiceId: text("quickbooks_invoice_id"), // QB invoice ID
  quickbooksDocNumber: text("quickbooks_doc_number"), // QB document number
  quickbooksSyncedAt: timestamp("quickbooks_synced_at"),
  quickbooksSyncStatus: text("quickbooks_sync_status").default("pending"), // pending, synced, failed
  quickbooksSyncError: text("quickbooks_sync_error"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  attachments: text("attachments").array(),
  sentAt: timestamp("sent_at"),
  emailedTo: text("emailed_to"), // Email address invoice was sent to
  emailedAt: timestamp("emailed_at"), // When invoice was emailed
  // Payment tracking from QuickBooks webhooks
  paidAt: timestamp("paid_at"), // When payment was received
  paidAmount: integer("paid_amount"), // Amount paid in cents
  qbPaymentId: text("qb_payment_id"), // QuickBooks Payment ID
  paymentMethod: text("payment_method"), // Credit Card, ACH, Check, etc.
  createdByUserId: varchar("created_by_user_id"),
  createdByName: text("created_by_name"), // Name of user who created the invoice
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Emergencies (Completed but not completed - needs follow-up)
export const emergencies = pgTable("emergencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id"),
  propertyName: text("property_name"),
  propertyAddress: text("property_address"),
  submittedById: varchar("submitted_by_id"),
  submittedByName: text("submitted_by_name"),
  submitterRole: text("submitter_role").notNull(), // service_technician, repair_technician, supervisor, repair_foreman
  description: text("description").notNull(),
  totalAmount: integer("total_amount").default(0), // Amount in cents for the work done
  photos: text("photos").array(),
  originalServiceDate: timestamp("original_service_date"),
  convertedToEstimateId: text("converted_to_estimate_id"), // If converted to estimate
  convertedToInvoiceId: text("converted_to_invoice_id"), // If invoiced directly
  convertedAt: timestamp("converted_at"), // When it was converted
  originalMarkedCompleteAt: timestamp("original_marked_complete_at"),
  status: text("status").notNull().default("pending_review"), // pending_review, in_progress, resolved
  priority: text("priority").default("normal"), // low, normal, high, critical
  resolvedAt: timestamp("resolved_at"),
  resolvedById: varchar("resolved_by_id"),
  resolvedByName: text("resolved_by_name"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmergencySchema = createInsertSchema(emergencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmergency = z.infer<typeof insertEmergencySchema>;
export type Emergency = typeof emergencies.$inferSelect;

// Supervisor Activity (for tracking supervisor actions and performance metrics)
export const supervisorActivity = pgTable("supervisor_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supervisorId: varchar("supervisor_id").notNull(), // FK to technicians with role='supervisor'
  actionType: text("action_type").notNull(), // checked_out, assignment_created, resolved_not_completed, resolved_need_assistance, dismissed
  propertyId: varchar("property_id"), // FK to properties (optional)
  propertyName: text("property_name"),
  propertyAddress: text("property_address"),
  technicianId: varchar("technician_id"), // FK to technicians (optional - tech involved)
  technicianName: text("technician_name"),
  notes: text("notes"),
  photos: text("photos").array(),
  status: text("status").default("completed"), // completed, pending, dismissed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupervisorActivitySchema = createInsertSchema(supervisorActivity).omit({
  id: true,
  createdAt: true,
});

export type InsertSupervisorActivity = z.infer<typeof insertSupervisorActivitySchema>;
export type SupervisorActivity = typeof supervisorActivity.$inferSelect;

// QC Inspections - Office staff assigns property inspections to supervisors
export const qcInspections = pgTable("qc_inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supervisorId: varchar("supervisor_id").notNull(), // FK to technicians with role='supervisor'
  supervisorName: text("supervisor_name"),
  propertyId: varchar("property_id"), // FK to customers/pools
  propertyName: text("property_name").notNull(),
  propertyAddress: text("property_address"),
  title: text("title"), // User-defined title for the inspection
  notes: text("notes"),
  photos: text("photos").array(), // URLs to uploaded images
  status: text("status").default("assigned"), // assigned, in_progress, completed, cancelled
  assignedById: varchar("assigned_by_id"), // FK to technicians/users who assigned it
  assignedByName: text("assigned_by_name"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completionNotes: text("completion_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQcInspectionSchema = createInsertSchema(qcInspections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertQcInspection = z.infer<typeof insertQcInspectionSchema>;
export type QcInspection = typeof qcInspections.$inferSelect;

// Property Technicians - Links properties to their assigned service technicians
export const propertyTechnicians = pgTable("property_technicians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(), // FK to customers (property)
  technicianId: varchar("technician_id").notNull(), // FK to technicians
  technicianName: text("technician_name"), // Cached for display
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedById: varchar("assigned_by_id"), // Who made the assignment
  assignedByName: text("assigned_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPropertyTechnicianSchema = createInsertSchema(propertyTechnicians).omit({
  id: true,
  assignedAt: true,
  createdAt: true,
});

export type InsertPropertyTechnician = z.infer<typeof insertPropertyTechnicianSchema>;
export type PropertyTechnician = typeof propertyTechnicians.$inferSelect;

// Route Overrides - Temporary route changes (sick days, coverage, splits)
// coverageType: 'single_day' (one date), 'extended_cover' (date range), 'split_route' (divide between techs)
export const routeOverrides = pgTable("route_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(), // The date of the override (for single_day) or fallback
  startDate: timestamp("start_date"), // Start of coverage range (for extended_cover)
  endDate: timestamp("end_date"), // End of coverage range (for extended_cover)
  coverageType: text("coverage_type").notNull().default("single_day"), // single_day, extended_cover, split_route
  splitDays: text("split_days").array(), // For split_route: days the covering tech handles (e.g., ["Mon", "Wed", "Fri"])
  propertyId: varchar("property_id").notNull(), // FK to customers (property)
  propertyName: text("property_name"),
  originalTechnicianId: varchar("original_technician_id"), // FK to technicians
  originalTechnicianName: text("original_technician_name"),
  coveringTechnicianId: varchar("covering_technician_id"), // FK to technicians (for single_day/extended)
  coveringTechnicianName: text("covering_technician_name"),
  overrideType: text("override_type").notNull(), // "reassign", "split", "cancel"
  reason: text("reason"), // "Sick", "PTO", "Emergency", "Route Optimization", etc.
  notes: text("notes"),
  active: boolean("active").default(true),
  createdByUserId: varchar("created_by_user_id"),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRouteOverrideSchema = createInsertSchema(routeOverrides).omit({
  id: true,
  createdAt: true,
});

export type InsertRouteOverride = z.infer<typeof insertRouteOverrideSchema>;
export type RouteOverride = typeof routeOverrides.$inferSelect;

// Split Route Items - For split_route overrides, tracks which tech handles which property portion
export const splitRouteItems = pgTable("split_route_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  overrideId: varchar("override_id").notNull(), // FK to route_overrides
  propertyId: varchar("property_id").notNull(), // FK to customers (property)
  propertyName: text("property_name"),
  coveringTechnicianId: varchar("covering_technician_id").notNull(), // FK to technicians
  coveringTechnicianName: text("covering_technician_name"),
  percentageSplit: integer("percentage_split"), // Optional: how much of the route this tech handles
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSplitRouteItemSchema = createInsertSchema(splitRouteItems).omit({
  id: true,
  createdAt: true,
});

export type InsertSplitRouteItem = z.infer<typeof insertSplitRouteItemSchema>;
export type SplitRouteItem = typeof splitRouteItems.$inferSelect;

// Tech Schedules - Daily schedule blocks for technicians (calendar view)
export const techSchedules = pgTable("tech_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  technicianId: varchar("technician_id").notNull(),
  date: timestamp("date").notNull(),
  startTime: text("start_time").default("08:00"), // HH:MM format
  endTime: text("end_time").default("16:00"),
  stopCount: integer("stop_count").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTechScheduleSchema = createInsertSchema(techSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTechSchedule = z.infer<typeof insertTechScheduleSchema>;
export type TechSchedule = typeof techSchedules.$inferSelect;

// Schedule Properties - Properties assigned to a schedule block
export const scheduleProperties = pgTable("schedule_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull(),
  propertyId: varchar("property_id").notNull(),
  propertyName: text("property_name"),
  address: text("address"),
  status: text("status").default("pending"), // pending, in_progress, completed
  completedAt: timestamp("completed_at"),
  estimatedArrival: text("estimated_arrival"), // HH:MM format
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSchedulePropertySchema = createInsertSchema(scheduleProperties).omit({
  id: true,
  createdAt: true,
});

export type InsertScheduleProperty = z.infer<typeof insertSchedulePropertySchema>;
export type ScheduleProperty = typeof scheduleProperties.$inferSelect;

// Tech Coverages - When a tech covers for another
export const techCoverages = pgTable("tech_coverages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalTechId: varchar("original_tech_id").notNull(),
  coveringTechId: varchar("covering_tech_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  propertyId: varchar("property_id"), // Optional: specific property coverage
  propertyName: text("property_name"),
  reason: text("reason"), // Vacation, Sick, Training, etc.
  status: text("status").default("active"), // active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTechCoverageSchema = createInsertSchema(techCoverages).omit({
  id: true,
  createdAt: true,
});

export type InsertTechCoverage = z.infer<typeof insertTechCoverageSchema>;
export type TechCoverage = typeof techCoverages.$inferSelect;

// Tech Time Off - When a tech is on leave
export const techTimeOff = pgTable("tech_time_off", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  technicianId: varchar("technician_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"), // Vacation, Sick, Personal, etc.
  notes: text("notes"),
  coveredByTechId: varchar("covered_by_tech_id"), // Who is covering
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTechTimeOffSchema = createInsertSchema(techTimeOff).omit({
  id: true,
  createdAt: true,
});

export type InsertTechTimeOff = z.infer<typeof insertTechTimeOffSchema>;
export type TechTimeOff = typeof techTimeOff.$inferSelect;

// Service Assignments (tasks assigned to service technicians)
export const serviceAssignments = pgTable("service_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  technicianId: varchar("technician_id").notNull(),
  propertyId: varchar("property_id"),
  propertyName: text("property_name"),
  assignmentType: text("assignment_type").notNull(),
  scheduledDate: text("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time"),
  status: text("status").default("pending"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceAssignmentSchema = createInsertSchema(serviceAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertServiceAssignment = z.infer<typeof insertServiceAssignmentSchema>;
export type ServiceAssignment = typeof serviceAssignments.$inferSelect;

// SMS Messages - Log of sent SMS messages
export const smsMessages = pgTable("sms_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  to: text("to").notNull(),
  from: text("from"),
  body: text("body").notNull(),
  status: text("status").default("pending"),
  twilioSid: text("twilio_sid"),
  errorMessage: text("error_message"),
  technicianId: varchar("technician_id"),
  customerId: varchar("customer_id"),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: varchar("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
});

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({
  id: true,
  twilioSid: true,
  errorMessage: true,
  createdAt: true,
  sentAt: true,
});

export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type SmsMessage = typeof smsMessages.$inferSelect;

// AI Learning - Admin Actions tracking for self-learning AI
export const adminActions = pgTable("admin_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  actionType: text("action_type").notNull(),
  actionCategory: text("action_category").notNull(),
  entityId: varchar("entity_id"),
  entityType: text("entity_type"),
  actionDetails: json("action_details"),
  previousState: json("previous_state"),
  newState: json("new_state"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;
export type AdminAction = typeof adminActions.$inferSelect;

// AI Learning Insights - Patterns and insights learned from admin actions
export const aiLearningInsights = pgTable("ai_learning_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insightType: text("insight_type").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  pattern: json("pattern"),
  confidence: real("confidence").default(0),
  occurrences: integer("occurrences").default(1),
  lastObserved: timestamp("last_observed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAiLearningInsightSchema = createInsertSchema(aiLearningInsights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiLearningInsight = z.infer<typeof insertAiLearningInsightSchema>;
export type AiLearningInsight = typeof aiLearningInsights.$inferSelect;
