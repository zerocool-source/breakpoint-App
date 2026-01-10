import { createContext, useContext } from "react";

export interface JobItem {
  productId: string;
  productName?: string;
  qty: number;
  unitCost: number;
  taxable: number;
}

export interface Job {
  jobId: string;
  title: string;
  description: string;
  status: string;
  isCompleted: boolean;
  scheduledDate: string | null;
  scheduledTime: string | null;
  createdDate: string | null;
  technicianId: string;
  technicianName: string;
  customerId: string;
  customerName: string;
  poolName: string;
  address: string;
  price: number;
  items: JobItem[];
  raw?: Record<string, unknown>;
  officeNotes?: string;
  instructions?: string;
  notes?: string;
  entryNotes?: string;
}

export interface Account {
  accountId: string;
  accountName: string;
  address: string;
  totalJobs: number;
  completedJobs: number;
  totalValue: number;
  jobs: Job[];
}

export interface Technician {
  techId: string;
  name: string;
  phone: string;
  email: string;
  totalJobs: number;
  completedJobs: number;
  totalValue: number;
  commission10: number;
  commission15: number;
  jobs: Job[];
}

export interface JobsData {
  jobs: Job[];
  accounts: Account[];
  technicians: Technician[];
  techsWithJobs: Technician[];
  techsWithoutJobs: Technician[];
  completedJobs: Job[];
  pendingJobs: Job[];
  summary: {
    totalJobs: number;
    completedCount: number;
    pendingCount: number;
    totalValue: number;
    accountCount: number;
    technicianCount: number;
    techsWithJobsCount: number;
  };
}

export interface RepairTechData {
  name: string;
  jobs: Job[];
  totalValue: number;
  completedCount: number;
  commission10: number;
  commission15: number;
  repairTypes: Record<string, { count: number; value: number }>;
  monthlyValue: number;
  dailyValues: Record<number, number>;
  quotaPercent: number;
  daysInMonth: number;
}

export interface ArchiveContextType {
  archivedIds: Set<string>;
  showArchived: boolean;
  archiveJob: (jobId: string) => void;
  unarchiveJob: (jobId: string) => void;
  deleteJob: (jobId: string) => void;
}

export const ArchiveContext = createContext<ArchiveContextType | null>(null);

export function useArchive() {
  const ctx = useContext(ArchiveContext);
  if (!ctx) throw new Error("useArchive must be used within ArchiveContext");
  return ctx;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}
