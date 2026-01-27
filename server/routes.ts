import { createServer } from "node:http";
import { registerAlertRoutes } from "./routes/alerts";
import { registerJobRoutes } from "./routes/jobs";
import { registerCustomerRoutes } from "./routes/customers";
import { registerTechnicianRoutes } from "./routes/technicians";
import { registerChatRoutes } from "./routes/chat";
import { registerFleetRoutes } from "./routes/fleet";
import { registerSchedulingRoutes } from "./routes/scheduling";
import { registerPayrollRoutes } from "./routes/payroll";
import { registerChannelRoutes } from "./routes/channels";
import { registerPmRoutes } from "./routes/pm";
import { registerSyncRoutes } from "./routes/sync";
import { registerPropertyRoutes } from "./routes/properties";
import { registerSettingsRoutes } from "./routes/settings";
import { registerEstimateRoutes } from "./routes/estimates";
import { registerQuickbooksRoutes } from "./routes/quickbooks";
import { registerReportRoutes } from "./routes/reports";
import { registerServiceRepairRoutes } from "./routes/serviceRepairs";
import { registerTechOpsRoutes } from "./routes/techOps";
import { registerDashboardRoutes } from "./routes/dashboard";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerEmergencyRoutes } from "./routes/emergencies";
import { registerEstimateHistoryRoutes } from "./routes/estimateHistory";
import { registerSupervisorActivityRoutes } from "./routes/supervisorActivity";
import { registerQcInspectionRoutes } from "./routes/qcInspections";
import { registerPropertyTechnicianRoutes } from "./routes/propertyTechnicians";
import { registerVendorRoutes } from "./routes/vendors";
import { registerInvoiceRoutes } from "./routes/invoices";
import { registerCalendarRoutes } from "./routes/calendar";
import { registerSmsRoutes } from "./routes/sms";

export async function registerRoutes(app: any) {
  const server = createServer(app);
  setupRoutes(app);
  return server;
}

function setupRoutes(app: any) {
  registerAlertRoutes(app);
  registerJobRoutes(app);
  registerCustomerRoutes(app);
  registerTechnicianRoutes(app);
  registerChatRoutes(app);
  registerFleetRoutes(app);
  registerSchedulingRoutes(app);
  registerPayrollRoutes(app);
  registerChannelRoutes(app);
  registerPmRoutes(app);
  registerSyncRoutes(app);
  registerPropertyRoutes(app);
  registerSettingsRoutes(app);
  registerEstimateRoutes(app);
  registerQuickbooksRoutes(app);
  registerReportRoutes(app);
  registerServiceRepairRoutes(app);
  registerTechOpsRoutes(app);
  registerDashboardRoutes(app);
  registerObjectStorageRoutes(app);
  registerEmergencyRoutes(app);
  registerEstimateHistoryRoutes(app);
  registerSupervisorActivityRoutes(app);
  registerQcInspectionRoutes(app);
  registerPropertyTechnicianRoutes(app);
  registerVendorRoutes(app);
  registerInvoiceRoutes(app);
  registerCalendarRoutes(app);
  registerSmsRoutes(app);
}
