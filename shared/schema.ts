import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
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

// Customers / HOAs (from Pool Brain or manual entry)
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  poolCount: integer("pool_count").default(0),
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

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertCompletedAlertSchema = createInsertSchema(completedAlerts).omit({
  id: true,
  completedAt: true,
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

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertCompletedAlert = z.infer<typeof insertCompletedAlertSchema>;
export type CompletedAlert = typeof completedAlerts.$inferSelect;
