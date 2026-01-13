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
}
