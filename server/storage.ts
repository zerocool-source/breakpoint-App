import { 
  type Settings, type InsertSettings,
  type Alert, type InsertAlert,
  type Workflow, type InsertWorkflow,
  type Customer, type InsertCustomer,
  type ChatMessage, type InsertChatMessage,
  type CompletedAlert, type InsertCompletedAlert,
  type PayPeriod, type InsertPayPeriod,
  type PayrollEntry, type InsertPayrollEntry,
  type ArchivedAlert, type InsertArchivedAlert,
  settings, alerts, workflows, customers, chatMessages, completedAlerts,
  payPeriods, payrollEntries, archivedAlerts
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, inArray, and } from "drizzle-orm";

export interface IStorage {
  // Settings
  getSettings(): Promise<Settings | undefined>;
  updateSettings(data: Partial<InsertSettings>): Promise<Settings>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlertStatus(id: string, status: string): Promise<Alert | undefined>;

  // Workflows
  getWorkflows(): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflowStatus(id: string, status: string): Promise<Workflow | undefined>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Chat
  getChatHistory(limit?: number): Promise<ChatMessage[]>;
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatHistory(): Promise<void>;

  // Completed Alerts
  getCompletedAlerts(): Promise<CompletedAlert[]>;
  getCompletedAlertIds(): Promise<string[]>;
  markAlertCompleted(alertId: string, category: string): Promise<CompletedAlert>;
  unmarkAlertCompleted(alertId: string): Promise<void>;
  isAlertCompleted(alertId: string): Promise<boolean>;

  // Pay Periods
  getPayPeriods(): Promise<PayPeriod[]>;
  getPayPeriod(id: string): Promise<PayPeriod | undefined>;
  createPayPeriod(period: InsertPayPeriod): Promise<PayPeriod>;
  updatePayPeriodStatus(id: string, status: string): Promise<PayPeriod | undefined>;

  // Payroll Entries
  getPayrollEntries(payPeriodId?: string): Promise<PayrollEntry[]>;
  getPayrollEntriesByTechnician(technicianId: string, payPeriodId?: string): Promise<PayrollEntry[]>;
  createPayrollEntry(entry: InsertPayrollEntry): Promise<PayrollEntry>;
  deletePayrollEntry(id: string): Promise<void>;

  // Archived Alerts
  getArchivedAlerts(alertType?: string): Promise<ArchivedAlert[]>;
  getArchivedAlertIds(alertType?: string): Promise<string[]>;
  archiveAlert(alertId: string, alertType: string): Promise<ArchivedAlert>;
  unarchiveAlert(alertId: string): Promise<void>;
  isAlertArchived(alertId: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // Settings
  async getSettings(): Promise<Settings | undefined> {
    const result = await db.select().from(settings).limit(1);
    return result[0];
  }

  async updateSettings(data: Partial<InsertSettings>): Promise<Settings> {
    const existing = await this.getSettings();
    
    if (existing) {
      const updated = await db
        .update(settings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(settings.id, existing.id))
        .returning();
      return updated[0];
    } else {
      const created = await db.insert(settings).values(data).returning();
      return created[0];
    }
  }

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    return db.select().from(alerts).orderBy(desc(alerts.timestamp));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await db.insert(alerts).values(alert).returning();
    return result[0];
  }

  async updateAlertStatus(id: string, status: string): Promise<Alert | undefined> {
    const result = await db
      .update(alerts)
      .set({ status })
      .where(eq(alerts.id, id))
      .returning();
    return result[0];
  }

  // Workflows
  async getWorkflows(): Promise<Workflow[]> {
    return db.select().from(workflows).orderBy(desc(workflows.createdAt));
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const result = await db.insert(workflows).values(workflow).returning();
    return result[0];
  }

  async updateWorkflowStatus(id: string, status: string): Promise<Workflow | undefined> {
    const result = await db
      .update(workflows)
      .set({ status })
      .where(eq(workflows.id, id))
      .returning();
    return result[0];
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(customers.name);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(customer).returning();
    return result[0];
  }

  // Chat
  async getChatHistory(limit: number = 50): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);
  }

  async addChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(message).returning();
    return result[0];
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    return this.addChatMessage(message);
  }

  async clearChatHistory(): Promise<void> {
    await db.delete(chatMessages);
  }

  // Completed Alerts
  async getCompletedAlerts(): Promise<CompletedAlert[]> {
    return db.select().from(completedAlerts).orderBy(desc(completedAlerts.completedAt));
  }

  async getCompletedAlertIds(): Promise<string[]> {
    const results = await db.select({ alertId: completedAlerts.alertId }).from(completedAlerts);
    return results.map(r => r.alertId);
  }

  async markAlertCompleted(alertId: string, category: string): Promise<CompletedAlert> {
    try {
      const result = await db
        .insert(completedAlerts)
        .values({ alertId, category })
        .onConflictDoNothing({ target: completedAlerts.alertId })
        .returning();
      
      if (result.length > 0) {
        return result[0];
      }
      
      const existing = await db.select().from(completedAlerts).where(eq(completedAlerts.alertId, alertId)).limit(1);
      return existing[0];
    } catch (error: any) {
      if (error.code === '23505') {
        const existing = await db.select().from(completedAlerts).where(eq(completedAlerts.alertId, alertId)).limit(1);
        return existing[0];
      }
      throw error;
    }
  }

  async unmarkAlertCompleted(alertId: string): Promise<void> {
    await db.delete(completedAlerts).where(eq(completedAlerts.alertId, alertId));
  }

  async isAlertCompleted(alertId: string): Promise<boolean> {
    const result = await db.select().from(completedAlerts).where(eq(completedAlerts.alertId, alertId)).limit(1);
    return result.length > 0;
  }

  // Pay Periods
  async getPayPeriods(): Promise<PayPeriod[]> {
    return db.select().from(payPeriods).orderBy(desc(payPeriods.endDate));
  }

  async getPayPeriod(id: string): Promise<PayPeriod | undefined> {
    const result = await db.select().from(payPeriods).where(eq(payPeriods.id, id)).limit(1);
    return result[0];
  }

  async createPayPeriod(period: InsertPayPeriod): Promise<PayPeriod> {
    const result = await db.insert(payPeriods).values(period).returning();
    return result[0];
  }

  async updatePayPeriodStatus(id: string, status: string): Promise<PayPeriod | undefined> {
    const result = await db
      .update(payPeriods)
      .set({ status })
      .where(eq(payPeriods.id, id))
      .returning();
    return result[0];
  }

  // Payroll Entries
  async getPayrollEntries(payPeriodId?: string): Promise<PayrollEntry[]> {
    if (payPeriodId) {
      return db.select().from(payrollEntries)
        .where(eq(payrollEntries.payPeriodId, payPeriodId))
        .orderBy(desc(payrollEntries.createdAt));
    }
    return db.select().from(payrollEntries).orderBy(desc(payrollEntries.createdAt));
  }

  async getPayrollEntriesByTechnician(technicianId: string, payPeriodId?: string): Promise<PayrollEntry[]> {
    if (payPeriodId) {
      return db.select().from(payrollEntries)
        .where(and(
          eq(payrollEntries.technicianId, technicianId),
          eq(payrollEntries.payPeriodId, payPeriodId)
        ))
        .orderBy(desc(payrollEntries.createdAt));
    }
    return db.select().from(payrollEntries)
      .where(eq(payrollEntries.technicianId, technicianId))
      .orderBy(desc(payrollEntries.createdAt));
  }

  async createPayrollEntry(entry: InsertPayrollEntry): Promise<PayrollEntry> {
    const result = await db.insert(payrollEntries).values(entry).returning();
    return result[0];
  }

  async deletePayrollEntry(id: string): Promise<void> {
    await db.delete(payrollEntries).where(eq(payrollEntries.id, id));
  }

  // Archived Alerts
  async getArchivedAlerts(alertType?: string): Promise<ArchivedAlert[]> {
    if (alertType) {
      return db.select().from(archivedAlerts)
        .where(eq(archivedAlerts.alertType, alertType))
        .orderBy(desc(archivedAlerts.archivedAt));
    }
    return db.select().from(archivedAlerts).orderBy(desc(archivedAlerts.archivedAt));
  }

  async getArchivedAlertIds(alertType?: string): Promise<string[]> {
    const query = alertType 
      ? db.select({ alertId: archivedAlerts.alertId }).from(archivedAlerts).where(eq(archivedAlerts.alertType, alertType))
      : db.select({ alertId: archivedAlerts.alertId }).from(archivedAlerts);
    const results = await query;
    return results.map(r => r.alertId);
  }

  async archiveAlert(alertId: string, alertType: string): Promise<ArchivedAlert> {
    try {
      const result = await db
        .insert(archivedAlerts)
        .values({ alertId, alertType })
        .onConflictDoNothing({ target: archivedAlerts.alertId })
        .returning();
      
      if (result.length > 0) {
        return result[0];
      }
      
      const existing = await db.select().from(archivedAlerts).where(eq(archivedAlerts.alertId, alertId)).limit(1);
      return existing[0];
    } catch (error: any) {
      if (error.code === '23505') {
        const existing = await db.select().from(archivedAlerts).where(eq(archivedAlerts.alertId, alertId)).limit(1);
        return existing[0];
      }
      throw error;
    }
  }

  async unarchiveAlert(alertId: string): Promise<void> {
    await db.delete(archivedAlerts).where(eq(archivedAlerts.alertId, alertId));
  }

  async isAlertArchived(alertId: string): Promise<boolean> {
    const result = await db.select().from(archivedAlerts).where(eq(archivedAlerts.alertId, alertId)).limit(1);
    return result.length > 0;
  }
}

export const storage = new DbStorage();
