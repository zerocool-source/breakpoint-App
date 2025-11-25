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

// Mock Data Generator
export const mockAlerts: Alert[] = [
  {
    id: "ALT-001",
    poolName: "Sunset Resort Main",
    type: "Chemical",
    severity: "Critical",
    message: "Chlorine levels critically low (0.5 ppm)",
    timestamp: new Date().toISOString(),
    status: "Active",
  },
  {
    id: "ALT-002",
    poolName: "Ocean View Complex",
    type: "Equipment",
    severity: "High",
    message: "Pump 2 flow rate deviation detected",
    timestamp: subDays(new Date(), 1).toISOString(),
    status: "Active",
  },
  {
    id: "ALT-003",
    poolName: "Grand Plaza Spa",
    type: "Service",
    severity: "Medium",
    message: "Scheduled maintenance overdue",
    timestamp: subDays(new Date(), 2).toISOString(),
    status: "Resolved",
  },
  {
    id: "ALT-004",
    poolName: "City Center Fountain",
    type: "Leak",
    severity: "High",
    message: "Abnormal water loss detected (200 gal/day)",
    timestamp: subDays(new Date(), 1).toISOString(),
    status: "Active",
  },
];

export const mockPoolMetrics: Record<string, PoolMetric> = {
  "Sunset Resort Main": { ph: 7.2, chlorine: 0.5, alkalinity: 90, temperature: 82, flowRate: 450 },
  "Ocean View Complex": { ph: 7.5, chlorine: 3.0, alkalinity: 110, temperature: 78, flowRate: 320 },
};

export const getMockChemicalUsage = () => {
  return Array.from({ length: 7 }, (_, i) => ({
    day: format(subDays(new Date(), 6 - i), "EEE"),
    usage: Math.floor(Math.random() * 50) + 20,
    optimal: 35,
  }));
};

export const getMockRevenue = () => {
  return Array.from({ length: 6 }, (_, i) => ({
    month: format(subDays(new Date(), (5 - i) * 30), "MMM"),
    revenue: Math.floor(Math.random() * 20000) + 50000,
    expenses: Math.floor(Math.random() * 15000) + 30000,
  }));
};
