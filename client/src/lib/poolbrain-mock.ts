import { format, subDays } from "date-fns";

// Mock Data Types based on screenshots
export interface Alert {
  id: string;
  poolName: string;
  type: "Chemical" | "Equipment" | "Leak" | "Service";
  severity: "Critical" | "High" | "Medium" | "Low";
  message: string;
  timestamp: string;
  status: "Active" | "Resolved";
}

export interface PoolMetric {
  ph: number;
  chlorine: number;
  alkalinity: number;
  temperature: number;
  flowRate: number;
}

// Mock Data Generator - Generic Placeholders
export const mockAlerts: Alert[] = [
  {
    id: "SYS-INIT",
    poolName: "System Initialization",
    type: "Service",
    severity: "Low",
    message: "Waiting for live data stream...",
    timestamp: new Date().toISOString(),
    status: "Active",
  }
];

export const mockPoolMetrics: Record<string, PoolMetric> = {
  // Empty until data is loaded
};

export const getMockChemicalUsage = () => {
  return Array.from({ length: 7 }, (_, i) => ({
    day: format(subDays(new Date(), 6 - i), "EEE"),
    usage: 0,
    optimal: 35,
  }));
};

export const getMockRevenue = () => {
  return Array.from({ length: 6 }, (_, i) => ({
    month: format(subDays(new Date(), (5 - i) * 30), "MMM"),
    revenue: 0,
    expenses: 0,
  }));
};
