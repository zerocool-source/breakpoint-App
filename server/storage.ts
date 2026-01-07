import { 
  type Settings, type InsertSettings,
  type Alert, type InsertAlert,
  type Workflow, type InsertWorkflow,
  type Technician, type InsertTechnician,
  type Customer, type InsertCustomer,
  type CustomerAddress, type InsertCustomerAddress,
  type Pool, type InsertPool,
  type RouteSchedule, type InsertRouteSchedule,
  type RouteAssignment, type InsertRouteAssignment,
  type ChatMessage, type InsertChatMessage,
  type CompletedAlert, type InsertCompletedAlert,
  type PayPeriod, type InsertPayPeriod,
  type PayrollEntry, type InsertPayrollEntry,
  type ArchivedAlert, type InsertArchivedAlert,
  type Thread, type InsertThread,
  type ThreadMessage, type InsertThreadMessage,
  type PropertyChannel, type InsertPropertyChannel,
  type ChannelMember, type InsertChannelMember,
  type ChannelMessage, type InsertChannelMessage,
  type ChannelReaction, type InsertChannelReaction,
  type ChannelRead, type InsertChannelRead,
  type Estimate, type InsertEstimate,
  type Route, type InsertRoute,
  type RouteStop, type InsertRouteStop,
  type RouteMove, type InsertRouteMove,
  type UnscheduledStop, type InsertUnscheduledStop,
  settings, alerts, workflows, technicians, customers, customerAddresses, customerContacts, pools, routeSchedules, routeAssignments,
  chatMessages, completedAlerts,
  payPeriods, payrollEntries, archivedAlerts, threads, threadMessages,
  propertyChannels, channelMembers, channelMessages, channelReactions, channelReads,
  estimates, routes, routeStops, routeMoves, unscheduledStops
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, inArray, and, ilike, or } from "drizzle-orm";

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

  // Technicians
  getTechnicians(role?: string): Promise<Technician[]>;
  getTechnician(id: string): Promise<Technician | undefined>;
  getTechnicianByExternalId(externalId: string): Promise<Technician | undefined>;
  createTechnician(technician: InsertTechnician): Promise<Technician>;
  updateTechnician(id: string, updates: Partial<InsertTechnician>): Promise<Technician | undefined>;
  deleteTechnician(id: string): Promise<void>;
  upsertTechnician(externalId: string, technician: InsertTechnician): Promise<Technician>;
  clearAllTechnicians(): Promise<void>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByExternalId(externalId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined>;
  upsertCustomer(externalId: string, customer: InsertCustomer): Promise<Customer>;
  clearAllCustomers(): Promise<void>;

  // Customer Addresses
  getCustomerAddresses(customerId: string): Promise<CustomerAddress[]>;
  createCustomerAddress(address: InsertCustomerAddress): Promise<CustomerAddress>;
  upsertCustomerAddress(customerId: string, externalId: string, address: InsertCustomerAddress): Promise<CustomerAddress>;
  deleteCustomer(id: string): Promise<void>;

  // Customer Contacts
  getCustomerContacts(customerId: string): Promise<any[]>;
  createCustomerContact(contact: any): Promise<any>;

  // Pools
  getPoolsByCustomer(customerId: string): Promise<Pool[]>;
  getPool(id: string): Promise<Pool | undefined>;
  getPoolByExternalId(externalId: string): Promise<Pool | undefined>;
  createPool(pool: InsertPool): Promise<Pool>;
  updatePool(id: string, updates: Partial<InsertPool>): Promise<Pool | undefined>;
  upsertPool(externalId: string, pool: InsertPool): Promise<Pool>;
  clearPoolsByCustomer(customerId: string): Promise<void>;

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

  // Threads
  getThreads(): Promise<Thread[]>;
  getThreadByAccountId(accountId: string): Promise<Thread | undefined>;
  getOrCreateThread(accountId: string, accountName: string): Promise<Thread>;
  
  // Thread Messages
  getThreadMessages(threadId: string, options?: { type?: string; search?: string; limit?: number }): Promise<ThreadMessage[]>;
  createThreadMessage(message: InsertThreadMessage): Promise<ThreadMessage>;
  updateThreadMessage(id: string, updates: Partial<InsertThreadMessage>): Promise<ThreadMessage | undefined>;
  deleteThreadMessage(id: string): Promise<void>;
  pinMessage(id: string, pinned: boolean): Promise<ThreadMessage | undefined>;

  // Property Channels
  getPropertyChannels(): Promise<PropertyChannel[]>;
  getPropertyChannel(id: string): Promise<PropertyChannel | undefined>;
  getPropertyChannelByPropertyId(propertyId: string): Promise<PropertyChannel | undefined>;
  createPropertyChannel(channel: InsertPropertyChannel): Promise<PropertyChannel>;
  upsertPropertyChannel(channel: InsertPropertyChannel): Promise<PropertyChannel>;
  updatePropertyChannel(id: string, updates: Partial<InsertPropertyChannel>): Promise<PropertyChannel | undefined>;

  // Channel Members
  getChannelMembers(channelId: string): Promise<ChannelMember[]>;
  addChannelMember(member: InsertChannelMember): Promise<ChannelMember>;
  removeChannelMember(channelId: string, userId: string): Promise<void>;
  isChannelMember(channelId: string, userId: string): Promise<boolean>;

  // Channel Messages
  getChannelMessages(channelId: string, options?: { limit?: number; before?: string; parentMessageId?: string | null }): Promise<ChannelMessage[]>;
  getChannelMessage(id: string): Promise<ChannelMessage | undefined>;
  createChannelMessage(message: InsertChannelMessage): Promise<ChannelMessage>;
  updateChannelMessage(id: string, content: string): Promise<ChannelMessage | undefined>;
  deleteChannelMessage(id: string): Promise<void>;
  pinChannelMessage(id: string, isPinned: boolean): Promise<ChannelMessage | undefined>;
  getThreadReplies(parentMessageId: string): Promise<ChannelMessage[]>;

  // Channel Reactions
  getMessageReactions(messageId: string): Promise<ChannelReaction[]>;
  addReaction(reaction: InsertChannelReaction): Promise<ChannelReaction>;
  removeReaction(messageId: string, userId: string, emoji: string): Promise<void>;

  // Channel Read Receipts
  getChannelRead(channelId: string, userId: string): Promise<ChannelRead | undefined>;
  updateChannelRead(channelId: string, userId: string, messageId?: string): Promise<ChannelRead>;
  getUnreadCounts(userId: string): Promise<{ channelId: string; unreadCount: number }[]>;

  // Estimates
  getEstimates(status?: string): Promise<Estimate[]>;
  getEstimate(id: string): Promise<Estimate | undefined>;
  getEstimatesByProperty(propertyId: string): Promise<Estimate[]>;
  createEstimate(estimate: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: string, updates: Partial<InsertEstimate>): Promise<Estimate | undefined>;
  updateEstimateStatus(id: string, status: string, extras?: Record<string, any>): Promise<Estimate | undefined>;
  deleteEstimate(id: string): Promise<void>;

  // Routes
  getRoutes(dayOfWeek?: number): Promise<Route[]>;
  getRoute(id: string): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: string, updates: Partial<InsertRoute>): Promise<Route | undefined>;
  deleteRoute(id: string): Promise<void>;
  clearAllRoutes(): Promise<void>;
  reorderRoutes(routeIds: string[]): Promise<void>;

  // Route Stops
  getRouteStops(routeId: string): Promise<RouteStop[]>;
  getRouteStop(id: string): Promise<RouteStop | undefined>;
  createRouteStop(stop: InsertRouteStop): Promise<RouteStop>;
  updateRouteStop(id: string, updates: Partial<InsertRouteStop>): Promise<RouteStop | undefined>;
  deleteRouteStop(id: string): Promise<void>;
  reorderRouteStops(stopIds: string[]): Promise<void>;
  moveStopToRoute(stopId: string, newRouteId: string, isPermanent: boolean, moveDate?: Date): Promise<RouteStop | undefined>;

  // Unscheduled Stops
  getUnscheduledStops(): Promise<UnscheduledStop[]>;
  createUnscheduledStop(stop: InsertUnscheduledStop): Promise<UnscheduledStop>;
  deleteUnscheduledStop(id: string): Promise<void>;
  moveUnscheduledToRoute(stopId: string, routeId: string): Promise<RouteStop>;

  // Route Moves
  getRouteMoves(date?: Date): Promise<RouteMove[]>;
  createRouteMove(move: InsertRouteMove): Promise<RouteMove>;
  deleteRouteMove(id: string): Promise<void>;
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

  // Technicians
  async getTechnicians(role?: string): Promise<Technician[]> {
    if (role) {
      return db.select().from(technicians).where(eq(technicians.role, role)).orderBy(technicians.lastName);
    }
    return db.select().from(technicians).orderBy(technicians.lastName);
  }

  async getTechnician(id: string): Promise<Technician | undefined> {
    const result = await db.select().from(technicians).where(eq(technicians.id, id)).limit(1);
    return result[0];
  }

  async getTechnicianByExternalId(externalId: string): Promise<Technician | undefined> {
    const result = await db.select().from(technicians).where(eq(technicians.externalId, externalId)).limit(1);
    return result[0];
  }

  async createTechnician(technician: InsertTechnician): Promise<Technician> {
    const result = await db.insert(technicians).values(technician as any).returning();
    return result[0];
  }

  async updateTechnician(id: string, updates: Partial<InsertTechnician>): Promise<Technician | undefined> {
    const result = await db.update(technicians)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(technicians.id, id))
      .returning();
    return result[0];
  }

  async deleteTechnician(id: string): Promise<void> {
    await db.delete(technicians).where(eq(technicians.id, id));
  }

  async upsertTechnician(externalId: string, technician: InsertTechnician): Promise<Technician> {
    const existing = await this.getTechnicianByExternalId(externalId);
    if (existing) {
      const updated = await this.updateTechnician(existing.id, technician);
      return updated!;
    }
    return this.createTechnician({ ...technician, externalId });
  }

  async clearAllTechnicians(): Promise<void> {
    await db.delete(technicians);
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(customers.name);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return result[0];
  }

  async getCustomerByExternalId(externalId: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.externalId, externalId)).limit(1);
    return result[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(customer).returning();
    return result[0];
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const result = await db.update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return result[0];
  }

  async upsertCustomer(externalId: string, customer: InsertCustomer): Promise<Customer> {
    const existing = await this.getCustomerByExternalId(externalId);
    if (existing) {
      const updated = await this.updateCustomer(existing.id, customer);
      return updated!;
    }
    return this.createCustomer({ ...customer, externalId });
  }

  async clearAllCustomers(): Promise<void> {
    await db.delete(customers);
  }

  // Customer Addresses
  async getCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
    return db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId));
  }

  async createCustomerAddress(address: InsertCustomerAddress): Promise<CustomerAddress> {
    const result = await db.insert(customerAddresses).values(address).returning();
    return result[0];
  }

  async upsertCustomerAddress(customerId: string, externalId: string, address: InsertCustomerAddress): Promise<CustomerAddress> {
    const existing = await db.select().from(customerAddresses)
      .where(and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.externalId, externalId)))
      .limit(1);
    if (existing[0]) {
      const result = await db.update(customerAddresses)
        .set(address)
        .where(eq(customerAddresses.id, existing[0].id))
        .returning();
      return result[0];
    }
    return this.createCustomerAddress({ ...address, customerId, externalId });
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Customer Contacts
  async getCustomerContacts(customerId: string): Promise<any[]> {
    return db.select().from(customerContacts).where(eq(customerContacts.customerId, customerId));
  }

  async createCustomerContact(contact: any): Promise<any> {
    const result = await db.insert(customerContacts).values(contact).returning();
    return result[0];
  }

  // Pools
  async getPoolsByCustomer(customerId: string): Promise<Pool[]> {
    return db.select().from(pools).where(eq(pools.customerId, customerId));
  }

  async getPool(id: string): Promise<Pool | undefined> {
    const result = await db.select().from(pools).where(eq(pools.id, id)).limit(1);
    return result[0];
  }

  async getPoolByExternalId(externalId: string): Promise<Pool | undefined> {
    const result = await db.select().from(pools).where(eq(pools.externalId, externalId)).limit(1);
    return result[0];
  }

  async createPool(pool: InsertPool): Promise<Pool> {
    const result = await db.insert(pools).values(pool).returning();
    return result[0];
  }

  async updatePool(id: string, updates: Partial<InsertPool>): Promise<Pool | undefined> {
    const result = await db.update(pools)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pools.id, id))
      .returning();
    return result[0];
  }

  async upsertPool(externalId: string, pool: InsertPool): Promise<Pool> {
    const existing = await this.getPoolByExternalId(externalId);
    if (existing) {
      const updated = await this.updatePool(existing.id, pool);
      return updated!;
    }
    return this.createPool({ ...pool, externalId });
  }

  async clearPoolsByCustomer(customerId: string): Promise<void> {
    await db.delete(pools).where(eq(pools.customerId, customerId));
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

  async deleteArchivedAlert(alertId: string): Promise<void> {
    await db.delete(archivedAlerts).where(eq(archivedAlerts.alertId, alertId));
  }

  // Threads
  async getThreads(): Promise<Thread[]> {
    return db.select().from(threads).orderBy(desc(threads.updatedAt));
  }

  async getThreadByAccountId(accountId: string): Promise<Thread | undefined> {
    const result = await db.select().from(threads).where(eq(threads.accountId, accountId)).limit(1);
    return result[0];
  }

  async getOrCreateThread(accountId: string, accountName: string): Promise<Thread> {
    const existing = await this.getThreadByAccountId(accountId);
    if (existing) return existing;
    
    const result = await db.insert(threads).values({ accountId, accountName }).returning();
    return result[0];
  }

  // Thread Messages
  async getThreadMessages(threadId: string, options?: { type?: string; search?: string; limit?: number }): Promise<ThreadMessage[]> {
    const conditions = [eq(threadMessages.threadId, threadId)];
    
    if (options?.type) {
      conditions.push(eq(threadMessages.type, options.type));
    }
    
    if (options?.search) {
      conditions.push(ilike(threadMessages.text, `%${options.search}%`));
    }
    
    const baseQuery = db.select().from(threadMessages)
      .where(and(...conditions))
      .orderBy(desc(threadMessages.createdAt));
    
    if (options?.limit) {
      return baseQuery.limit(options.limit);
    }
    
    return baseQuery;
  }

  async createThreadMessage(message: InsertThreadMessage): Promise<ThreadMessage> {
    const result = await db.insert(threadMessages).values({
      threadId: message.threadId,
      authorId: message.authorId,
      authorName: message.authorName,
      type: message.type ?? 'update',
      text: message.text ?? null,
      photoUrls: message.photoUrls ?? [],
      taggedUserIds: message.taggedUserIds ?? [],
      taggedRoles: message.taggedRoles ?? [],
      visibility: message.visibility ?? 'all',
      pinned: message.pinned ?? false
    }).returning();
    
    // Update thread's updatedAt
    await db.update(threads).set({ updatedAt: new Date() }).where(eq(threads.id, message.threadId));
    
    return result[0];
  }

  async updateThreadMessage(id: string, updates: Partial<InsertThreadMessage>): Promise<ThreadMessage | undefined> {
    const updateData: any = {};
    if (updates.text !== undefined) updateData.text = updates.text;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
    if (updates.pinned !== undefined) updateData.pinned = updates.pinned;
    if (updates.photoUrls !== undefined) updateData.photoUrls = updates.photoUrls;
    if (updates.taggedUserIds !== undefined) updateData.taggedUserIds = updates.taggedUserIds;
    if (updates.taggedRoles !== undefined) updateData.taggedRoles = updates.taggedRoles;
    
    const result = await db.update(threadMessages).set(updateData).where(eq(threadMessages.id, id)).returning();
    return result[0];
  }

  async deleteThreadMessage(id: string): Promise<void> {
    await db.delete(threadMessages).where(eq(threadMessages.id, id));
  }

  async pinMessage(id: string, pinned: boolean): Promise<ThreadMessage | undefined> {
    const result = await db.update(threadMessages).set({ pinned }).where(eq(threadMessages.id, id)).returning();
    return result[0];
  }

  // Property Channels
  async getPropertyChannels(): Promise<PropertyChannel[]> {
    return db.select().from(propertyChannels).orderBy(propertyChannels.propertyName);
  }

  async getPropertyChannel(id: string): Promise<PropertyChannel | undefined> {
    const result = await db.select().from(propertyChannels).where(eq(propertyChannels.id, id)).limit(1);
    return result[0];
  }

  async getPropertyChannelByPropertyId(propertyId: string): Promise<PropertyChannel | undefined> {
    const result = await db.select().from(propertyChannels).where(eq(propertyChannels.propertyId, propertyId)).limit(1);
    return result[0];
  }

  async createPropertyChannel(channel: InsertPropertyChannel): Promise<PropertyChannel> {
    const result = await db.insert(propertyChannels).values(channel).returning();
    return result[0];
  }

  async upsertPropertyChannel(channel: InsertPropertyChannel): Promise<PropertyChannel> {
    const existing = await this.getPropertyChannelByPropertyId(channel.propertyId);
    if (existing) {
      const updated = await db
        .update(propertyChannels)
        .set({ ...channel, updatedAt: new Date() })
        .where(eq(propertyChannels.id, existing.id))
        .returning();
      return updated[0];
    }
    return this.createPropertyChannel(channel);
  }

  async updatePropertyChannel(id: string, updates: Partial<InsertPropertyChannel>): Promise<PropertyChannel | undefined> {
    const result = await db
      .update(propertyChannels)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(propertyChannels.id, id))
      .returning();
    return result[0];
  }

  // Channel Members
  async getChannelMembers(channelId: string): Promise<ChannelMember[]> {
    return db.select().from(channelMembers).where(eq(channelMembers.channelId, channelId));
  }

  async addChannelMember(member: InsertChannelMember): Promise<ChannelMember> {
    const existing = await db.select().from(channelMembers)
      .where(and(eq(channelMembers.channelId, member.channelId), eq(channelMembers.userId, member.userId)))
      .limit(1);
    if (existing.length > 0) return existing[0];
    
    const result = await db.insert(channelMembers).values(member).returning();
    return result[0];
  }

  async removeChannelMember(channelId: string, userId: string): Promise<void> {
    await db.delete(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)));
  }

  async isChannelMember(channelId: string, userId: string): Promise<boolean> {
    const result = await db.select().from(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)))
      .limit(1);
    return result.length > 0;
  }

  // Channel Messages
  async getChannelMessages(channelId: string, options?: { limit?: number; before?: string; parentMessageId?: string | null }): Promise<ChannelMessage[]> {
    const conditions = [eq(channelMessages.channelId, channelId)];
    
    // Only get top-level messages by default (not thread replies)
    if (options?.parentMessageId === undefined) {
      // This is a workaround since we can't easily check for null in drizzle conditions
      // We'll filter on the JS side for now
    } else if (options?.parentMessageId === null) {
      // Get only top-level messages
    } else {
      // Get replies to a specific message
      conditions.push(eq(channelMessages.parentMessageId, options.parentMessageId));
    }
    
    const limit = options?.limit || 50;
    
    const results = await db.select().from(channelMessages)
      .where(and(...conditions))
      .orderBy(desc(channelMessages.createdAt))
      .limit(limit);
    
    // Filter for top-level messages if no parentMessageId specified
    if (options?.parentMessageId === undefined || options?.parentMessageId === null) {
      return results.filter(m => !m.parentMessageId).reverse();
    }
    
    return results.reverse();
  }

  async getChannelMessage(id: string): Promise<ChannelMessage | undefined> {
    const result = await db.select().from(channelMessages).where(eq(channelMessages.id, id)).limit(1);
    return result[0];
  }

  async createChannelMessage(message: InsertChannelMessage): Promise<ChannelMessage> {
    const result = await db.insert(channelMessages).values({
      channelId: message.channelId,
      authorId: message.authorId,
      authorName: message.authorName,
      content: message.content,
      parentMessageId: message.parentMessageId ?? null,
      messageType: message.messageType ?? 'text',
      attachments: message.attachments ?? [],
      mentions: message.mentions ?? [],
      isPinned: message.isPinned ?? false
    }).returning();
    
    // Update channel's updatedAt
    await db.update(propertyChannels)
      .set({ updatedAt: new Date() })
      .where(eq(propertyChannels.id, message.channelId));
    
    return result[0];
  }

  async updateChannelMessage(id: string, content: string): Promise<ChannelMessage | undefined> {
    const result = await db.update(channelMessages)
      .set({ content, isEdited: true, updatedAt: new Date() })
      .where(eq(channelMessages.id, id))
      .returning();
    return result[0];
  }

  async deleteChannelMessage(id: string): Promise<void> {
    await db.delete(channelMessages).where(eq(channelMessages.id, id));
  }

  async pinChannelMessage(id: string, isPinned: boolean): Promise<ChannelMessage | undefined> {
    const result = await db.update(channelMessages)
      .set({ isPinned })
      .where(eq(channelMessages.id, id))
      .returning();
    return result[0];
  }

  async getThreadReplies(parentMessageId: string): Promise<ChannelMessage[]> {
    return db.select().from(channelMessages)
      .where(eq(channelMessages.parentMessageId, parentMessageId))
      .orderBy(channelMessages.createdAt);
  }

  // Channel Reactions
  async getMessageReactions(messageId: string): Promise<ChannelReaction[]> {
    return db.select().from(channelReactions).where(eq(channelReactions.messageId, messageId));
  }

  async addReaction(reaction: InsertChannelReaction): Promise<ChannelReaction> {
    // Check if reaction already exists
    const existing = await db.select().from(channelReactions)
      .where(and(
        eq(channelReactions.messageId, reaction.messageId),
        eq(channelReactions.userId, reaction.userId),
        eq(channelReactions.emoji, reaction.emoji)
      ))
      .limit(1);
    
    if (existing.length > 0) return existing[0];
    
    const result = await db.insert(channelReactions).values(reaction).returning();
    return result[0];
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await db.delete(channelReactions)
      .where(and(
        eq(channelReactions.messageId, messageId),
        eq(channelReactions.userId, userId),
        eq(channelReactions.emoji, emoji)
      ));
  }

  // Channel Read Receipts
  async getChannelRead(channelId: string, userId: string): Promise<ChannelRead | undefined> {
    const result = await db.select().from(channelReads)
      .where(and(eq(channelReads.channelId, channelId), eq(channelReads.userId, userId)))
      .limit(1);
    return result[0];
  }

  async updateChannelRead(channelId: string, userId: string, messageId?: string): Promise<ChannelRead> {
    const existing = await this.getChannelRead(channelId, userId);
    
    if (existing) {
      const result = await db.update(channelReads)
        .set({ lastReadAt: new Date(), lastReadMessageId: messageId || existing.lastReadMessageId })
        .where(eq(channelReads.id, existing.id))
        .returning();
      return result[0];
    }
    
    const result = await db.insert(channelReads)
      .values({ channelId, userId, lastReadMessageId: messageId })
      .returning();
    return result[0];
  }

  async getUnreadCounts(userId: string): Promise<{ channelId: string; unreadCount: number }[]> {
    // Get all channels and their read timestamps for this user
    const channels = await this.getPropertyChannels();
    const unreadCounts: { channelId: string; unreadCount: number }[] = [];
    
    for (const channel of channels) {
      const readReceipt = await this.getChannelRead(channel.id, userId);
      const lastReadAt = readReceipt?.lastReadAt || new Date(0);
      
      // Count messages after last read
      const messages = await db.select().from(channelMessages)
        .where(eq(channelMessages.channelId, channel.id));
      
      const unreadCount = messages.filter(m => 
        m.createdAt && m.createdAt > lastReadAt && m.authorId !== userId
      ).length;
      
      if (unreadCount > 0) {
        unreadCounts.push({ channelId: channel.id, unreadCount });
      }
    }
    
    return unreadCounts;
  }

  // Estimates
  async getEstimates(status?: string): Promise<Estimate[]> {
    if (status) {
      return db.select().from(estimates)
        .where(eq(estimates.status, status))
        .orderBy(desc(estimates.createdAt));
    }
    return db.select().from(estimates).orderBy(desc(estimates.createdAt));
  }

  async getEstimate(id: string): Promise<Estimate | undefined> {
    const result = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
    return result[0];
  }

  async getEstimatesByProperty(propertyId: string): Promise<Estimate[]> {
    return db.select().from(estimates)
      .where(eq(estimates.propertyId, propertyId))
      .orderBy(desc(estimates.createdAt));
  }

  async createEstimate(estimate: InsertEstimate): Promise<Estimate> {
    const result = await db.insert(estimates).values(estimate as any).returning();
    return result[0];
  }

  async updateEstimate(id: string, updates: Partial<InsertEstimate>): Promise<Estimate | undefined> {
    const result = await db.update(estimates)
      .set(updates as any)
      .where(eq(estimates.id, id))
      .returning();
    return result[0];
  }

  async updateEstimateStatus(id: string, status: string, extras?: Record<string, any>): Promise<Estimate | undefined> {
    const updateData: any = { status, ...extras };
    
    // Set appropriate timestamp based on status
    if (status === 'pending_approval') {
      updateData.sentForApprovalAt = new Date();
    } else if (status === 'approved') {
      updateData.approvedAt = new Date();
    } else if (status === 'rejected') {
      updateData.rejectedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'invoiced') {
      updateData.invoicedAt = new Date();
    }
    
    const result = await db.update(estimates)
      .set(updateData)
      .where(eq(estimates.id, id))
      .returning();
    return result[0];
  }

  async deleteEstimate(id: string): Promise<void> {
    await db.delete(estimates).where(eq(estimates.id, id));
  }

  // Routes
  async getRoutes(dayOfWeek?: number): Promise<Route[]> {
    if (dayOfWeek !== undefined) {
      return db.select().from(routes)
        .where(eq(routes.dayOfWeek, dayOfWeek))
        .orderBy(routes.sortOrder);
    }
    return db.select().from(routes).orderBy(routes.dayOfWeek, routes.sortOrder);
  }

  async getRoute(id: string): Promise<Route | undefined> {
    const result = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
    return result[0];
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const result = await db.insert(routes).values(route as any).returning();
    return result[0];
  }

  async updateRoute(id: string, updates: Partial<InsertRoute>): Promise<Route | undefined> {
    const result = await db.update(routes)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(routes.id, id))
      .returning();
    return result[0];
  }

  async deleteRoute(id: string): Promise<void> {
    await db.delete(routeStops).where(eq(routeStops.routeId, id));
    await db.delete(routes).where(eq(routes.id, id));
  }

  async clearAllRoutes(): Promise<void> {
    await db.delete(routeStops);
    await db.delete(routes);
  }

  async reorderRoutes(routeIds: string[]): Promise<void> {
    for (let i = 0; i < routeIds.length; i++) {
      await db.update(routes).set({ sortOrder: i }).where(eq(routes.id, routeIds[i]));
    }
  }

  // Route Stops
  async getRouteStops(routeId: string): Promise<RouteStop[]> {
    return db.select().from(routeStops)
      .where(eq(routeStops.routeId, routeId))
      .orderBy(routeStops.sortOrder);
  }

  async getRouteStop(id: string): Promise<RouteStop | undefined> {
    const result = await db.select().from(routeStops).where(eq(routeStops.id, id)).limit(1);
    return result[0];
  }

  async createRouteStop(stop: InsertRouteStop): Promise<RouteStop> {
    const result = await db.insert(routeStops).values(stop as any).returning();
    return result[0];
  }

  async updateRouteStop(id: string, updates: Partial<InsertRouteStop>): Promise<RouteStop | undefined> {
    const result = await db.update(routeStops)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(routeStops.id, id))
      .returning();
    return result[0];
  }

  async deleteRouteStop(id: string): Promise<void> {
    await db.delete(routeStops).where(eq(routeStops.id, id));
  }

  async reorderRouteStops(stopIds: string[]): Promise<void> {
    for (let i = 0; i < stopIds.length; i++) {
      await db.update(routeStops).set({ sortOrder: i }).where(eq(routeStops.id, stopIds[i]));
    }
  }

  async moveStopToRoute(stopId: string, newRouteId: string, isPermanent: boolean, moveDate?: Date): Promise<RouteStop | undefined> {
    const stop = await this.getRouteStop(stopId);
    if (!stop) return undefined;

    if (isPermanent) {
      return this.updateRouteStop(stopId, { routeId: newRouteId });
    } else {
      await db.insert(routeMoves).values({
        stopId,
        originalRouteId: stop.routeId,
        temporaryRouteId: newRouteId,
        moveDate: moveDate || new Date(),
        isPermanent: false,
      } as any);
      return stop;
    }
  }

  // Unscheduled Stops
  async getUnscheduledStops(): Promise<UnscheduledStop[]> {
    return db.select().from(unscheduledStops).orderBy(desc(unscheduledStops.createdAt));
  }

  async createUnscheduledStop(stop: InsertUnscheduledStop): Promise<UnscheduledStop> {
    const result = await db.insert(unscheduledStops).values(stop as any).returning();
    return result[0];
  }

  async deleteUnscheduledStop(id: string): Promise<void> {
    await db.delete(unscheduledStops).where(eq(unscheduledStops.id, id));
  }

  async moveUnscheduledToRoute(stopId: string, routeId: string): Promise<RouteStop> {
    const stop = await db.select().from(unscheduledStops).where(eq(unscheduledStops.id, stopId)).limit(1);
    if (!stop[0]) throw new Error("Unscheduled stop not found");

    const newStop = await this.createRouteStop({
      routeId,
      propertyId: stop[0].propertyId,
      propertyName: stop[0].propertyName,
      customerName: stop[0].customerName,
      address: stop[0].address,
      poolName: stop[0].poolName,
      jobType: stop[0].jobType || "route_stop",
      notes: stop[0].notes,
      estimatedTime: stop[0].estimatedTime || 30,
    });

    await this.deleteUnscheduledStop(stopId);
    return newStop;
  }

  // Route Moves
  async getRouteMoves(date?: Date): Promise<RouteMove[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      return db.select().from(routeMoves);
    }
    return db.select().from(routeMoves);
  }

  async createRouteMove(move: InsertRouteMove): Promise<RouteMove> {
    const result = await db.insert(routeMoves).values(move as any).returning();
    return result[0];
  }

  async deleteRouteMove(id: string): Promise<void> {
    await db.delete(routeMoves).where(eq(routeMoves.id, id));
  }
}

export const storage = new DbStorage();
