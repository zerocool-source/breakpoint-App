import { 
  type Settings, type InsertSettings,
  type Alert, type InsertAlert,
  type Workflow, type InsertWorkflow,
  type Technician, type InsertTechnician,
  type Customer, type InsertCustomer,
  type CustomerAddress, type InsertCustomerAddress,
  type Pool, type InsertPool,
  type Equipment, type InsertEquipment,
  type RouteSchedule, type InsertRouteSchedule,
  type RouteAssignment, type InsertRouteAssignment,
  type ServiceOccurrence, type InsertServiceOccurrence,
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
  type PmServiceType, type InsertPmServiceType,
  type PmIntervalSetting, type InsertPmIntervalSetting,
  type EquipmentPmSchedule, type InsertEquipmentPmSchedule,
  type PmServiceRecord, type InsertPmServiceRecord,
  type FleetTruck, type InsertFleetTruck,
  type FleetMaintenanceRecord, type InsertFleetMaintenanceRecord,
  type TruckInventory, type InsertTruckInventory,
  type Property, type InsertProperty,
  type FieldEntry, type InsertFieldEntry,
  type PropertyBillingContact, type InsertPropertyBillingContact,
  settings, alerts, workflows, technicians, customers, customerAddresses, customerContacts, pools, equipment, routeSchedules, routeAssignments, serviceOccurrences,
  chatMessages, completedAlerts,
  payPeriods, payrollEntries, archivedAlerts, threads, threadMessages,
  propertyChannels, channelMembers, channelMessages, channelReactions, channelReads,
  estimates, routes, routeStops, routeMoves, unscheduledStops,
  pmServiceTypes, pmIntervalSettings, equipmentPmSchedules, pmServiceRecords,
  fleetTrucks, fleetMaintenanceRecords, truckInventory,
  properties, fieldEntries, propertyBillingContacts
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, inArray, and, ilike, or, gte, lte } from "drizzle-orm";

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
  getAllAddressesWithCustomers(): Promise<{ id: string; addressLine1: string | null; city: string | null; state: string | null; zip: string | null; customerName: string }[]>;
  getCustomerAddress(id: string): Promise<CustomerAddress | undefined>;
  createCustomerAddress(address: InsertCustomerAddress): Promise<CustomerAddress>;
  upsertCustomerAddress(customerId: string, externalId: string, address: InsertCustomerAddress): Promise<CustomerAddress>;
  deleteCustomer(id: string): Promise<void>;

  deleteCustomerAddress(id: string): Promise<void>;

  // Customer Contacts
  getCustomerContacts(customerId: string): Promise<any[]>;
  createCustomerContact(contact: any): Promise<any>;
  deleteCustomerContact(id: string): Promise<void>;

  // Route Schedules
  getRouteScheduleByProperty(propertyId: string): Promise<RouteSchedule | undefined>;
  getActiveRouteSchedules(): Promise<RouteSchedule[]>;
  upsertRouteSchedule(propertyId: string, schedule: Partial<InsertRouteSchedule>): Promise<RouteSchedule>;
  updateRouteSchedule(id: string, updates: Partial<InsertRouteSchedule>): Promise<RouteSchedule | undefined>;

  // Service Occurrences
  getServiceOccurrencesByProperty(propertyId: string): Promise<ServiceOccurrence[]>;
  getServiceOccurrencesBySchedule(scheduleId: string): Promise<ServiceOccurrence[]>;
  getUnscheduledOccurrences(startDate: Date, endDate: Date): Promise<ServiceOccurrence[]>;
  getServiceOccurrence(id: string): Promise<ServiceOccurrence | undefined>;
  createServiceOccurrence(occurrence: InsertServiceOccurrence): Promise<ServiceOccurrence>;
  bulkCreateServiceOccurrences(occurrences: InsertServiceOccurrence[]): Promise<ServiceOccurrence[]>;
  updateServiceOccurrenceStatus(id: string, status: string): Promise<ServiceOccurrence | undefined>;
  assignOccurrenceToRoute(id: string, routeId: string, technicianId?: string): Promise<ServiceOccurrence | undefined>;
  unassignOccurrenceFromRoute(id: string): Promise<ServiceOccurrence | undefined>;
  deleteServiceOccurrencesBySchedule(scheduleId: string): Promise<void>;

  // Pools
  getPoolsByCustomer(customerId: string): Promise<Pool[]>;
  getPool(id: string): Promise<Pool | undefined>;
  getPoolByExternalId(externalId: string): Promise<Pool | undefined>;
  createPool(pool: InsertPool): Promise<Pool>;
  updatePool(id: string, updates: Partial<InsertPool>): Promise<Pool | undefined>;
  upsertPool(externalId: string, pool: InsertPool): Promise<Pool>;
  clearPoolsByCustomer(customerId: string): Promise<void>;
  deletePool(id: string): Promise<void>;

  // Equipment
  getEquipmentByCustomer(customerId: string): Promise<Equipment[]>;
  getEquipment(id: string): Promise<Equipment | undefined>;
  createEquipment(equip: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, updates: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  deleteEquipment(id: string): Promise<void>;

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

  // Property Billing Contacts
  getPropertyBillingContacts(propertyId: string): Promise<PropertyBillingContact[]>;
  createPropertyBillingContact(contact: InsertPropertyBillingContact): Promise<PropertyBillingContact>;
  updatePropertyBillingContact(id: string, updates: Partial<InsertPropertyBillingContact>): Promise<PropertyBillingContact | undefined>;
  deletePropertyBillingContact(id: string): Promise<void>;
  getBillingEmailForWorkType(propertyId: string, workType: string): Promise<string | null>;

  // Pool WO Settings
  updatePoolWoSettings(poolId: string, woRequired: boolean, woNotes?: string): Promise<void>;

  // Routes
  getRoutes(dayOfWeek?: number): Promise<Route[]>;
  getRoutesByDateRange(startDate: Date, endDate: Date): Promise<Route[]>;
  getRoute(id: string): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: string, updates: Partial<InsertRoute>): Promise<Route | undefined>;
  deleteRoute(id: string): Promise<void>;
  clearAllRoutes(): Promise<void>;
  reorderRoutes(routeIds: string[]): Promise<void>;

  // Route Stops
  getRouteStops(routeId: string): Promise<RouteStop[]>;
  getRouteAssignedOccurrences(routeId: string): Promise<{ id: string; propertyId: string; date: Date; status: string; customerName: string; addressLine1: string | null; city: string | null; state: string | null; zip: string | null; sortOrder: number }[]>;
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

  // Scheduling Reset
  resetSchedulingData(): Promise<{ routesDeleted: number; stopsDeleted: number; movesDeleted: number; unscheduledDeleted: number; occurrencesDeleted: number; schedulesDeleted: number }>;

  // PM Service Types
  getPmServiceTypes(): Promise<PmServiceType[]>;
  getPmServiceType(id: string): Promise<PmServiceType | undefined>;
  createPmServiceType(type: InsertPmServiceType): Promise<PmServiceType>;
  updatePmServiceType(id: string, updates: Partial<InsertPmServiceType>): Promise<PmServiceType | undefined>;

  // PM Interval Settings
  getPmIntervalSettings(): Promise<PmIntervalSetting[]>;
  getPmIntervalSetting(id: string): Promise<PmIntervalSetting | undefined>;
  getPmIntervalByServiceAndWaterType(serviceTypeId: string, waterType: string): Promise<PmIntervalSetting | undefined>;
  createPmIntervalSetting(setting: InsertPmIntervalSetting): Promise<PmIntervalSetting>;
  updatePmIntervalSetting(id: string, updates: Partial<InsertPmIntervalSetting>): Promise<PmIntervalSetting | undefined>;

  // Equipment PM Schedules
  getEquipmentPmSchedules(status?: string): Promise<EquipmentPmSchedule[]>;
  getEquipmentPmSchedule(id: string): Promise<EquipmentPmSchedule | undefined>;
  getEquipmentPmSchedulesByProperty(propertyId: string): Promise<EquipmentPmSchedule[]>;
  getEquipmentPmSchedulesByEquipment(equipmentId: string): Promise<EquipmentPmSchedule[]>;
  getPmDashboardStats(): Promise<{ overdue: number; dueSoon: number; current: number; paused: number }>;
  createEquipmentPmSchedule(schedule: InsertEquipmentPmSchedule): Promise<EquipmentPmSchedule>;
  updateEquipmentPmSchedule(id: string, updates: Partial<InsertEquipmentPmSchedule>): Promise<EquipmentPmSchedule | undefined>;
  deleteEquipmentPmSchedule(id: string): Promise<void>;
  updateAllPmScheduleStatuses(): Promise<void>;

  // PM Service Records
  getPmServiceRecords(scheduleId: string, limit?: number): Promise<PmServiceRecord[]>;
  getPmServiceRecordsByEquipment(equipmentId: string): Promise<PmServiceRecord[]>;
  getPmServiceRecordsByProperty(propertyId: string): Promise<PmServiceRecord[]>;
  createPmServiceRecord(record: InsertPmServiceRecord): Promise<PmServiceRecord>;

  // PM Seed Data
  seedPmDefaults(): Promise<{ serviceTypesCreated: number; intervalsCreated: number }>;

  // Properties (for Field Tech sync)
  getProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property | undefined>;

  // Route Stops (additional methods for Field Tech sync)
  getAllRouteStops(): Promise<RouteStop[]>;
  getRouteStopsByDate(date: string): Promise<RouteStop[]>;

  // Field Entries (for Field Tech sync)
  getFieldEntries(): Promise<FieldEntry[]>;
  getFieldEntry(id: string): Promise<FieldEntry | undefined>;
  createFieldEntry(entry: InsertFieldEntry): Promise<FieldEntry>;
  updateFieldEntry(id: string, updates: Partial<InsertFieldEntry>): Promise<FieldEntry | undefined>;
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

  async getAllAddressesWithCustomers(): Promise<{ id: string; addressLine1: string | null; city: string | null; state: string | null; zip: string | null; customerName: string }[]> {
    const result = await db
      .select({
        id: customerAddresses.id,
        addressLine1: customerAddresses.addressLine1,
        city: customerAddresses.city,
        state: customerAddresses.state,
        zip: customerAddresses.zip,
        customerName: customers.name,
      })
      .from(customerAddresses)
      .innerJoin(customers, eq(customerAddresses.customerId, customers.id));
    return result;
  }

  async getCustomerAddress(id: string): Promise<CustomerAddress | undefined> {
    const result = await db.select().from(customerAddresses).where(eq(customerAddresses.id, id)).limit(1);
    return result[0];
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

  async deleteCustomerAddress(id: string): Promise<void> {
    await db.delete(customerAddresses).where(eq(customerAddresses.id, id));
  }

  // Customer Contacts
  async getCustomerContacts(customerId: string): Promise<any[]> {
    return db.select().from(customerContacts).where(eq(customerContacts.customerId, customerId));
  }

  async createCustomerContact(contact: any): Promise<any> {
    const result = await db.insert(customerContacts).values(contact).returning();
    return result[0];
  }

  async deleteCustomerContact(id: string): Promise<void> {
    await db.delete(customerContacts).where(eq(customerContacts.id, id));
  }

  // Route Schedules
  async getRouteScheduleByProperty(propertyId: string): Promise<RouteSchedule | undefined> {
    const result = await db.select().from(routeSchedules).where(eq(routeSchedules.propertyId, propertyId)).limit(1);
    return result[0];
  }

  async getActiveRouteSchedules(): Promise<RouteSchedule[]> {
    return db.select().from(routeSchedules).where(eq(routeSchedules.isActive, true));
  }

  async upsertRouteSchedule(propertyId: string, schedule: Partial<InsertRouteSchedule>): Promise<RouteSchedule> {
    const existing = await this.getRouteScheduleByProperty(propertyId);
    if (existing) {
      const result = await db.update(routeSchedules)
        .set({ ...schedule, propertyId, updatedAt: new Date() })
        .where(eq(routeSchedules.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(routeSchedules).values({ ...schedule, propertyId } as InsertRouteSchedule).returning();
    return result[0];
  }

  async updateRouteSchedule(id: string, updates: Partial<InsertRouteSchedule>): Promise<RouteSchedule | undefined> {
    const result = await db.update(routeSchedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(routeSchedules.id, id))
      .returning();
    return result[0];
  }

  // Service Occurrences
  async getServiceOccurrencesByProperty(propertyId: string): Promise<ServiceOccurrence[]> {
    return db.select().from(serviceOccurrences).where(eq(serviceOccurrences.propertyId, propertyId));
  }

  async getServiceOccurrencesBySchedule(scheduleId: string): Promise<ServiceOccurrence[]> {
    return db.select().from(serviceOccurrences).where(eq(serviceOccurrences.sourceScheduleId, scheduleId));
  }

  async getUnscheduledOccurrences(startDate: Date, endDate: Date): Promise<ServiceOccurrence[]> {
    return db.select().from(serviceOccurrences).where(
      and(
        eq(serviceOccurrences.status, "unscheduled"),
        gte(serviceOccurrences.date, startDate),
        lte(serviceOccurrences.date, endDate)
      )
    ).orderBy(serviceOccurrences.date);
  }

  async createServiceOccurrence(occurrence: InsertServiceOccurrence): Promise<ServiceOccurrence> {
    const result = await db.insert(serviceOccurrences).values(occurrence).returning();
    return result[0];
  }

  async bulkCreateServiceOccurrences(occurrences: InsertServiceOccurrence[]): Promise<ServiceOccurrence[]> {
    if (occurrences.length === 0) return [];
    const result = await db.insert(serviceOccurrences).values(occurrences).returning();
    return result;
  }

  async updateServiceOccurrenceStatus(id: string, status: string): Promise<ServiceOccurrence | undefined> {
    const result = await db.update(serviceOccurrences)
      .set({ status })
      .where(eq(serviceOccurrences.id, id))
      .returning();
    return result[0];
  }

  async getServiceOccurrence(id: string): Promise<ServiceOccurrence | undefined> {
    const result = await db.select().from(serviceOccurrences).where(eq(serviceOccurrences.id, id)).limit(1);
    return result[0];
  }

  async assignOccurrenceToRoute(id: string, routeId: string, technicianId?: string): Promise<ServiceOccurrence | undefined> {
    const result = await db.update(serviceOccurrences)
      .set({ 
        status: "scheduled", 
        routeId,
        technicianId: technicianId || null
      })
      .where(eq(serviceOccurrences.id, id))
      .returning();
    return result[0];
  }

  async unassignOccurrenceFromRoute(id: string): Promise<ServiceOccurrence | undefined> {
    const result = await db.update(serviceOccurrences)
      .set({ 
        status: "unscheduled", 
        routeId: null,
        technicianId: null
      })
      .where(eq(serviceOccurrences.id, id))
      .returning();
    return result[0];
  }

  async deleteServiceOccurrencesBySchedule(scheduleId: string): Promise<void> {
    await db.delete(serviceOccurrences).where(eq(serviceOccurrences.sourceScheduleId, scheduleId));
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

  async deletePool(id: string): Promise<void> {
    await db.delete(pools).where(eq(pools.id, id));
  }

  // Equipment
  async getEquipmentByCustomer(customerId: string): Promise<Equipment[]> {
    return db.select().from(equipment).where(eq(equipment.customerId, customerId));
  }

  async getEquipment(id: string): Promise<Equipment | undefined> {
    const result = await db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
    return result[0];
  }

  async createEquipment(equip: InsertEquipment): Promise<Equipment> {
    const result = await db.insert(equipment).values(equip).returning();
    return result[0];
  }

  async updateEquipment(id: string, updates: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const result = await db.update(equipment)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(equipment.id, id))
      .returning();
    return result[0];
  }

  async deleteEquipment(id: string): Promise<void> {
    await db.delete(equipment).where(eq(equipment.id, id));
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
    const values = {
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
    };
    const result = await db.insert(threadMessages).values(values as any).returning();
    
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
    const values = {
      channelId: message.channelId,
      authorId: message.authorId,
      authorName: message.authorName,
      content: message.content,
      parentMessageId: message.parentMessageId ?? null,
      messageType: message.messageType ?? 'text',
      attachments: message.attachments ?? [],
      mentions: message.mentions ?? [],
      isPinned: message.isPinned ?? false
    };
    const result = await db.insert(channelMessages).values(values as any).returning();
    
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

  // Property Billing Contacts
  async getPropertyBillingContacts(propertyId: string): Promise<PropertyBillingContact[]> {
    return db.select().from(propertyBillingContacts)
      .where(eq(propertyBillingContacts.propertyId, propertyId));
  }

  async createPropertyBillingContact(contact: InsertPropertyBillingContact): Promise<PropertyBillingContact> {
    const result = await db.insert(propertyBillingContacts).values(contact as any).returning();
    return result[0];
  }

  async updatePropertyBillingContact(id: string, updates: Partial<InsertPropertyBillingContact>): Promise<PropertyBillingContact | undefined> {
    const result = await db.update(propertyBillingContacts)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(propertyBillingContacts.id, id))
      .returning();
    return result[0];
  }

  async deletePropertyBillingContact(id: string): Promise<void> {
    await db.delete(propertyBillingContacts).where(eq(propertyBillingContacts.id, id));
  }

  async getBillingEmailForWorkType(propertyId: string, workType: string): Promise<string | null> {
    // First try to find specific contact for work type
    const specificResult = await db.select().from(propertyBillingContacts)
      .where(and(
        eq(propertyBillingContacts.propertyId, propertyId),
        eq(propertyBillingContacts.contactType, workType)
      ))
      .limit(1);
    
    if (specificResult[0]?.email) {
      return specificResult[0].email;
    }
    
    // Fall back to primary billing contact
    const primaryResult = await db.select().from(propertyBillingContacts)
      .where(and(
        eq(propertyBillingContacts.propertyId, propertyId),
        eq(propertyBillingContacts.contactType, 'primary')
      ))
      .limit(1);
    
    return primaryResult[0]?.email || null;
  }

  // Pool WO Settings
  async updatePoolWoSettings(poolId: string, woRequired: boolean, woNotes?: string): Promise<void> {
    await db.update(pools)
      .set({ 
        woRequired, 
        woNotes: woNotes || null,
        updatedAt: new Date() 
      } as any)
      .where(eq(pools.id, poolId));
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

  async getRoutesByDateRange(startDate: Date, endDate: Date): Promise<Route[]> {
    return db.select().from(routes).where(
      and(
        gte(routes.date, startDate),
        lte(routes.date, endDate)
      )
    ).orderBy(routes.date, routes.sortOrder);
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

  async getRouteAssignedOccurrences(routeId: string): Promise<{ id: string; propertyId: string; date: Date; status: string; customerName: string; addressLine1: string | null; city: string | null; state: string | null; zip: string | null; sortOrder: number }[]> {
    const result = await db
      .select({
        id: serviceOccurrences.id,
        propertyId: serviceOccurrences.propertyId,
        date: serviceOccurrences.date,
        status: serviceOccurrences.status,
        customerName: customers.name,
        addressLine1: customerAddresses.addressLine1,
        city: customerAddresses.city,
        state: customerAddresses.state,
        zip: customerAddresses.zip,
      })
      .from(serviceOccurrences)
      .innerJoin(customerAddresses, eq(serviceOccurrences.propertyId, customerAddresses.id))
      .innerJoin(customers, eq(customerAddresses.customerId, customers.id))
      .where(eq(serviceOccurrences.routeId, routeId))
      .orderBy(serviceOccurrences.date);
    
    return result.map((r, index) => ({
      ...r,
      status: r.status || "scheduled",
      sortOrder: index + 1
    }));
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

  async resetSchedulingData(): Promise<{ routesDeleted: number; stopsDeleted: number; movesDeleted: number; unscheduledDeleted: number; occurrencesDeleted: number; schedulesDeleted: number }> {
    const stopsResult = await db.delete(routeStops).returning();
    const routesResult = await db.delete(routes).returning();
    const movesResult = await db.delete(routeMoves).returning();
    const unscheduledResult = await db.delete(unscheduledStops).returning();
    const occurrencesResult = await db.delete(serviceOccurrences).returning();
    const schedulesResult = await db.delete(routeSchedules).returning();
    
    return {
      routesDeleted: routesResult.length,
      stopsDeleted: stopsResult.length,
      movesDeleted: movesResult.length,
      unscheduledDeleted: unscheduledResult.length,
      occurrencesDeleted: occurrencesResult.length,
      schedulesDeleted: schedulesResult.length,
    };
  }

  // PM Service Types
  async getPmServiceTypes(): Promise<PmServiceType[]> {
    return db.select().from(pmServiceTypes).orderBy(pmServiceTypes.name);
  }

  async getPmServiceType(id: string): Promise<PmServiceType | undefined> {
    const result = await db.select().from(pmServiceTypes).where(eq(pmServiceTypes.id, id)).limit(1);
    return result[0];
  }

  async createPmServiceType(type: InsertPmServiceType): Promise<PmServiceType> {
    const result = await db.insert(pmServiceTypes).values(type as any).returning();
    return result[0];
  }

  async updatePmServiceType(id: string, updates: Partial<InsertPmServiceType>): Promise<PmServiceType | undefined> {
    const result = await db.update(pmServiceTypes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pmServiceTypes.id, id))
      .returning();
    return result[0];
  }

  // PM Interval Settings
  async getPmIntervalSettings(): Promise<PmIntervalSetting[]> {
    return db.select().from(pmIntervalSettings);
  }

  async getPmIntervalSetting(id: string): Promise<PmIntervalSetting | undefined> {
    const result = await db.select().from(pmIntervalSettings).where(eq(pmIntervalSettings.id, id)).limit(1);
    return result[0];
  }

  async getPmIntervalByServiceAndWaterType(serviceTypeId: string, waterType: string): Promise<PmIntervalSetting | undefined> {
    const result = await db.select().from(pmIntervalSettings)
      .where(and(
        eq(pmIntervalSettings.pmServiceTypeId, serviceTypeId),
        or(eq(pmIntervalSettings.waterType, waterType), eq(pmIntervalSettings.waterType, 'all'))
      ))
      .limit(1);
    return result[0];
  }

  async createPmIntervalSetting(setting: InsertPmIntervalSetting): Promise<PmIntervalSetting> {
    const result = await db.insert(pmIntervalSettings).values(setting as any).returning();
    return result[0];
  }

  async updatePmIntervalSetting(id: string, updates: Partial<InsertPmIntervalSetting>): Promise<PmIntervalSetting | undefined> {
    const result = await db.update(pmIntervalSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pmIntervalSettings.id, id))
      .returning();
    return result[0];
  }

  // Equipment PM Schedules
  async getEquipmentPmSchedules(status?: string): Promise<EquipmentPmSchedule[]> {
    if (status) {
      return db.select().from(equipmentPmSchedules)
        .where(and(eq(equipmentPmSchedules.status, status), eq(equipmentPmSchedules.isActive, true)))
        .orderBy(equipmentPmSchedules.duePriority);
    }
    return db.select().from(equipmentPmSchedules)
      .where(eq(equipmentPmSchedules.isActive, true))
      .orderBy(equipmentPmSchedules.duePriority);
  }

  async getEquipmentPmSchedule(id: string): Promise<EquipmentPmSchedule | undefined> {
    const result = await db.select().from(equipmentPmSchedules).where(eq(equipmentPmSchedules.id, id)).limit(1);
    return result[0];
  }

  async getEquipmentPmSchedulesByProperty(propertyId: string): Promise<EquipmentPmSchedule[]> {
    return db.select().from(equipmentPmSchedules)
      .where(and(eq(equipmentPmSchedules.propertyId, propertyId), eq(equipmentPmSchedules.isActive, true)))
      .orderBy(equipmentPmSchedules.duePriority);
  }

  async getEquipmentPmSchedulesByEquipment(equipmentId: string): Promise<EquipmentPmSchedule[]> {
    return db.select().from(equipmentPmSchedules)
      .where(and(eq(equipmentPmSchedules.equipmentId, equipmentId), eq(equipmentPmSchedules.isActive, true)));
  }

  async getPmDashboardStats(): Promise<{ overdue: number; dueSoon: number; current: number; paused: number }> {
    const all = await db.select().from(equipmentPmSchedules).where(eq(equipmentPmSchedules.isActive, true));
    const stats = { overdue: 0, dueSoon: 0, current: 0, paused: 0 };
    for (const schedule of all) {
      if (schedule.status === 'overdue' || schedule.status === 'critical') stats.overdue++;
      else if (schedule.status === 'due_soon') stats.dueSoon++;
      else if (schedule.status === 'paused') stats.paused++;
      else stats.current++;
    }
    return stats;
  }

  async createEquipmentPmSchedule(schedule: InsertEquipmentPmSchedule): Promise<EquipmentPmSchedule> {
    const result = await db.insert(equipmentPmSchedules).values(schedule as any).returning();
    return result[0];
  }

  async updateEquipmentPmSchedule(id: string, updates: Partial<InsertEquipmentPmSchedule>): Promise<EquipmentPmSchedule | undefined> {
    const result = await db.update(equipmentPmSchedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(equipmentPmSchedules.id, id))
      .returning();
    return result[0];
  }

  async deleteEquipmentPmSchedule(id: string): Promise<void> {
    await db.update(equipmentPmSchedules).set({ isActive: false }).where(eq(equipmentPmSchedules.id, id));
  }

  async updateAllPmScheduleStatuses(): Promise<void> {
    const schedules = await db.select().from(equipmentPmSchedules).where(eq(equipmentPmSchedules.isActive, true));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const schedule of schedules) {
      if (schedule.status === 'paused') continue;

      const nextDue = new Date(schedule.nextDueDate);
      const diffDays = Math.floor((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let newStatus = 'current';
      if (diffDays < -30) newStatus = 'critical';
      else if (diffDays < 0) newStatus = 'overdue';
      else if (diffDays <= 30) newStatus = 'due_soon';

      if (schedule.status !== newStatus || schedule.duePriority !== diffDays) {
        await db.update(equipmentPmSchedules)
          .set({ status: newStatus, duePriority: diffDays, updatedAt: new Date() })
          .where(eq(equipmentPmSchedules.id, schedule.id));
      }
    }
  }

  // PM Service Records
  async getPmServiceRecords(scheduleId: string, limit?: number): Promise<PmServiceRecord[]> {
    const query = db.select().from(pmServiceRecords)
      .where(eq(pmServiceRecords.equipmentPmScheduleId, scheduleId))
      .orderBy(desc(pmServiceRecords.serviceDate));
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async getPmServiceRecordsByEquipment(equipmentId: string): Promise<PmServiceRecord[]> {
    return db.select().from(pmServiceRecords)
      .where(eq(pmServiceRecords.equipmentId, equipmentId))
      .orderBy(desc(pmServiceRecords.serviceDate));
  }

  async getPmServiceRecordsByProperty(propertyId: string): Promise<PmServiceRecord[]> {
    return db.select().from(pmServiceRecords)
      .where(eq(pmServiceRecords.propertyId, propertyId))
      .orderBy(desc(pmServiceRecords.serviceDate));
  }

  async createPmServiceRecord(record: InsertPmServiceRecord): Promise<PmServiceRecord> {
    const result = await db.insert(pmServiceRecords).values(record as any).returning();
    return result[0];
  }

  // PM Seed Data
  async seedPmDefaults(): Promise<{ serviceTypesCreated: number; intervalsCreated: number }> {
    const existingTypes = await this.getPmServiceTypes();
    if (existingTypes.length > 0) {
      return { serviceTypesCreated: 0, intervalsCreated: 0 };
    }

    const serviceTypesData = [
      { name: 'Heater De-soot / Teardown Inspection', category: 'heater', description: 'Clean heater internals, inspect heat exchanger, check ignition system' },
      { name: 'Filter Rejuvenation', category: 'filter', description: 'Deep clean or replace filter media, inspect tank and internals' },
      { name: 'Pump Inspection', category: 'pump', description: 'Check seals, bearings, motor condition, and flow rates' },
      { name: 'Salt Cell Cleaning', category: 'salt_system', description: 'Acid wash salt cell, inspect plates, check output' },
      { name: 'Automation System Check', category: 'automation', description: 'Test all circuits, update firmware, verify sensors' },
    ];

    const createdTypes: PmServiceType[] = [];
    for (const type of serviceTypesData) {
      const created = await this.createPmServiceType(type as InsertPmServiceType);
      createdTypes.push(created);
    }

    const intervalConfigs = [
      { typeName: 'Heater De-soot / Teardown Inspection', intervals: [
        { waterType: 'spa', recommended: 6, min: 4, max: 9 },
        { waterType: 'pool', recommended: 12, min: 9, max: 15 },
        { waterType: 'wader', recommended: 12, min: 9, max: 15 },
      ]},
      { typeName: 'Filter Rejuvenation', intervals: [
        { waterType: 'spa', recommended: 6, min: 4, max: 9 },
        { waterType: 'pool', recommended: 12, min: 8, max: 15 },
        { waterType: 'wader', recommended: 12, min: 8, max: 15 },
      ]},
      { typeName: 'Pump Inspection', intervals: [
        { waterType: 'all', recommended: 12, min: 9, max: 18 },
      ]},
      { typeName: 'Salt Cell Cleaning', intervals: [
        { waterType: 'all', recommended: 3, min: 2, max: 5 },
      ]},
      { typeName: 'Automation System Check', intervals: [
        { waterType: 'all', recommended: 12, min: 9, max: 18 },
      ]},
    ];

    let intervalsCreated = 0;
    for (const config of intervalConfigs) {
      const serviceType = createdTypes.find(t => t.name === config.typeName);
      if (!serviceType) continue;

      for (const interval of config.intervals) {
        await this.createPmIntervalSetting({
          pmServiceTypeId: serviceType.id,
          waterType: interval.waterType,
          recommendedIntervalMonths: interval.recommended,
          minimumIntervalMonths: interval.min,
          maximumIntervalMonths: interval.max,
          warningThresholdDays: 30,
          isActive: true,
        } as InsertPmIntervalSetting);
        intervalsCreated++;
      }
    }

    return { serviceTypesCreated: createdTypes.length, intervalsCreated };
  }

  // Fleet Trucks
  async getFleetTrucks(): Promise<FleetTruck[]> {
    return db.select().from(fleetTrucks).orderBy(fleetTrucks.truckNumber);
  }

  async getFleetTruck(id: string): Promise<FleetTruck | undefined> {
    const result = await db.select().from(fleetTrucks).where(eq(fleetTrucks.id, id));
    return result[0];
  }

  async getFleetTruckByNumber(truckNumber: number): Promise<FleetTruck | undefined> {
    const result = await db.select().from(fleetTrucks).where(eq(fleetTrucks.truckNumber, truckNumber));
    return result[0];
  }

  async createFleetTruck(truck: InsertFleetTruck): Promise<FleetTruck> {
    const result = await db.insert(fleetTrucks).values(truck as any).returning();
    return result[0];
  }

  async updateFleetTruck(id: string, updates: Partial<InsertFleetTruck>): Promise<FleetTruck | undefined> {
    const result = await db.update(fleetTrucks)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(fleetTrucks.id, id))
      .returning();
    return result[0];
  }

  async upsertFleetTruck(truckNumber: number, truck: InsertFleetTruck): Promise<FleetTruck> {
    const existing = await this.getFleetTruckByNumber(truckNumber);
    if (existing) {
      const updated = await this.updateFleetTruck(existing.id, truck);
      return updated!;
    }
    return this.createFleetTruck(truck);
  }

  // Fleet Maintenance Records
  async getFleetMaintenanceRecords(): Promise<FleetMaintenanceRecord[]> {
    return db.select().from(fleetMaintenanceRecords).orderBy(desc(fleetMaintenanceRecords.serviceDate));
  }

  async getFleetMaintenanceRecordsByTruck(truckId: string): Promise<FleetMaintenanceRecord[]> {
    return db.select().from(fleetMaintenanceRecords)
      .where(eq(fleetMaintenanceRecords.truckId, truckId))
      .orderBy(desc(fleetMaintenanceRecords.serviceDate));
  }

  async getFleetMaintenanceRecordsByTruckNumber(truckNumber: number): Promise<FleetMaintenanceRecord[]> {
    return db.select().from(fleetMaintenanceRecords)
      .where(eq(fleetMaintenanceRecords.truckNumber, truckNumber))
      .orderBy(desc(fleetMaintenanceRecords.serviceDate));
  }

  async createFleetMaintenanceRecord(record: InsertFleetMaintenanceRecord): Promise<FleetMaintenanceRecord> {
    const result = await db.insert(fleetMaintenanceRecords).values(record as any).returning();
    return result[0];
  }

  async getLatestMaintenanceByType(truckId: string, serviceType: string): Promise<FleetMaintenanceRecord | undefined> {
    const result = await db.select().from(fleetMaintenanceRecords)
      .where(and(
        eq(fleetMaintenanceRecords.truckId, truckId),
        eq(fleetMaintenanceRecords.serviceType, serviceType)
      ))
      .orderBy(desc(fleetMaintenanceRecords.serviceDate))
      .limit(1);
    return result[0];
  }

  // Truck Inventory
  async getTruckInventory(truckId: string): Promise<TruckInventory[]> {
    return db.select().from(truckInventory)
      .where(eq(truckInventory.truckId, truckId))
      .orderBy(truckInventory.category, truckInventory.itemName);
  }

  async getAllTruckInventory(): Promise<TruckInventory[]> {
    return db.select().from(truckInventory)
      .orderBy(truckInventory.truckNumber, truckInventory.category, truckInventory.itemName);
  }

  async createTruckInventoryItem(item: InsertTruckInventory): Promise<TruckInventory> {
    const result = await db.insert(truckInventory).values(item as any).returning();
    return result[0];
  }

  async updateTruckInventoryItem(id: string, updates: Partial<InsertTruckInventory>): Promise<TruckInventory | undefined> {
    const result = await db.update(truckInventory)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(truckInventory.id, id))
      .returning();
    return result[0];
  }

  async deleteTruckInventoryItem(id: string): Promise<void> {
    await db.delete(truckInventory).where(eq(truckInventory.id, id));
  }

  async getLowStockItems(): Promise<TruckInventory[]> {
    const all = await this.getAllTruckInventory();
    return all.filter(item => item.quantity <= (item.minQuantity || 0));
  }

  // Properties (for Field Tech sync)
  async getProperties(): Promise<Property[]> {
    return db.select().from(properties).orderBy(properties.name);
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0];
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const result = await db.insert(properties).values(property as any).returning();
    return result[0];
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    const result = await db.update(properties)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(properties.id, id))
      .returning();
    return result[0];
  }

  // Route Stops (additional methods for Field Tech sync)
  async getAllRouteStops(): Promise<RouteStop[]> {
    return db.select().from(routeStops).orderBy(routeStops.sortOrder);
  }

  async getRouteStopsByDate(date: string): Promise<RouteStop[]> {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const routesForDate = await db.select().from(routes)
      .where(and(
        gte(routes.date, startOfDay),
        lte(routes.date, endOfDay)
      ));
    
    if (routesForDate.length === 0) {
      return [];
    }
    
    const routeIds = routesForDate.map(r => r.id);
    return db.select().from(routeStops)
      .where(inArray(routeStops.routeId, routeIds))
      .orderBy(routeStops.sortOrder);
  }

  // Field Entries (for Field Tech sync)
  async getFieldEntries(): Promise<FieldEntry[]> {
    return db.select().from(fieldEntries).orderBy(desc(fieldEntries.submittedAt));
  }

  async getFieldEntry(id: string): Promise<FieldEntry | undefined> {
    const result = await db.select().from(fieldEntries).where(eq(fieldEntries.id, id)).limit(1);
    return result[0];
  }

  async createFieldEntry(entry: InsertFieldEntry): Promise<FieldEntry> {
    const result = await db.insert(fieldEntries).values(entry as any).returning();
    return result[0];
  }

  async updateFieldEntry(id: string, updates: Partial<InsertFieldEntry>): Promise<FieldEntry | undefined> {
    const result = await db.update(fieldEntries)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(fieldEntries.id, id))
      .returning();
    return result[0];
  }

  async getFieldEntriesByTechnician(technicianId: string): Promise<FieldEntry[]> {
    return db.select().from(fieldEntries)
      .where(eq(fieldEntries.technicianId, technicianId))
      .orderBy(desc(fieldEntries.submittedAt));
  }
}

export const storage = new DbStorage();
