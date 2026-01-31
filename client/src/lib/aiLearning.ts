import { authStorage } from "./auth";

interface TrackActionParams {
  actionType: string;
  actionCategory: string;
  entityId?: string;
  entityType?: string;
  actionDetails?: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
}

export async function trackAdminAction(params: TrackActionParams): Promise<void> {
  try {
    const user = authStorage.getUser();
    if (!user?.id) return;

    await fetch("/api/ai/track-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        ...params,
      }),
    });
  } catch (error) {
    console.warn("Failed to track admin action:", error);
  }
}

export const ActionTypes = {
  ESTIMATE_CREATED: "estimate_created",
  ESTIMATE_APPROVED: "estimate_approved",
  ESTIMATE_REJECTED: "estimate_rejected",
  ESTIMATE_SCHEDULED: "estimate_scheduled",
  ESTIMATE_COMPLETED: "estimate_completed",
  ESTIMATE_INVOICED: "estimate_invoiced",
  
  TECHNICIAN_ASSIGNED: "technician_assigned",
  TECHNICIAN_CREATED: "technician_created",
  TECHNICIAN_UPDATED: "technician_updated",
  
  EMERGENCY_RESOLVED: "emergency_resolved",
  EMERGENCY_CONVERTED: "emergency_converted",
  
  SERVICE_REPAIR_CREATED: "service_repair_created",
  SERVICE_REPAIR_CONVERTED: "service_repair_converted",
  SERVICE_REPAIR_COMPLETED: "service_repair_completed",
  
  TECH_OPS_REVIEWED: "tech_ops_reviewed",
  TECH_OPS_APPROVED: "tech_ops_approved",
  
  ROUTE_MODIFIED: "route_modified",
  SCHEDULE_CHANGED: "schedule_changed",
  
  CUSTOMER_CONTACTED: "customer_contacted",
  SMS_SENT: "sms_sent",
  EMAIL_SENT: "email_sent",
} as const;

export const ActionCategories = {
  ESTIMATES: "estimates",
  TECHNICIANS: "technicians",
  EMERGENCIES: "emergencies",
  SERVICE_REPAIRS: "service_repairs",
  TECH_OPS: "tech_ops",
  SCHEDULING: "scheduling",
  COMMUNICATION: "communication",
  FLEET: "fleet",
  CUSTOMERS: "customers",
} as const;
