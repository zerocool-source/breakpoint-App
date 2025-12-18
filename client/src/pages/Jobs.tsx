import React, { useState, useMemo, createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, User, MapPin, AlertCircle, CheckCircle2, Loader2, DollarSign, Building2, Wrench, ChevronDown, ChevronRight, Settings, Mail, TrendingUp, Trophy, BarChart3, HardHat, AlertTriangle, Archive, ArchiveRestore, Trash2, FileDown, ArrowLeft, RefreshCw, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function exportJobsExcel(jobs: any[], technicians: any[], summary: any) {
  const now = new Date();
  
  const summaryData = [
    { Metric: "Total Jobs", Value: summary.totalJobs },
    { Metric: "Completed Jobs", Value: summary.completedJobs },
    { Metric: "Pending Jobs", Value: summary.pendingJobs },
    { Metric: "Total Value", Value: summary.totalValue },
    { Metric: "Total Technicians", Value: technicians.length },
  ];
  
  const jobsData = jobs.map((j: any) => ({
    "Job ID": j.jobId,
    "Title": j.title,
    "Customer": j.customerName || "N/A",
    "Pool": j.poolName || "N/A",
    "Address": j.address || "N/A",
    "Technician": j.technicianName || "Unassigned",
    "Price": j.price || 0,
    "Status": j.isCompleted ? "Completed" : "Pending",
    "Scheduled Date": j.scheduledDate ? new Date(j.scheduledDate).toLocaleDateString() : "N/A",
    "Created Date": j.createdDate ? new Date(j.createdDate).toLocaleDateString() : "N/A"
  }));
  
  const techData = technicians.map((t: any) => ({
    "Technician ID": t.techId,
    "Name": t.name,
    "Phone": t.phone || "N/A",
    "Email": t.email || "N/A"
  }));
  
  const wb = XLSX.utils.book_new();
  
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
  
  const wsJobs = XLSX.utils.json_to_sheet(jobsData);
  XLSX.utils.book_append_sheet(wb, wsJobs, "All Jobs");
  
  const wsTechs = XLSX.utils.json_to_sheet(techData);
  XLSX.utils.book_append_sheet(wb, wsTechs, "Technicians");
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `jobs-report-${now.toISOString().split('T')[0]}.xlsx`);
}

function exportRepairTechsPDF(repairTechs: any[], monthlyQuota: number) {
  const doc = new jsPDF();
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  doc.setFontSize(20);
  doc.setTextColor(8, 145, 178);
  doc.text("Repair Technician Performance Report", 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, 28);
  doc.text(`Monthly Quota: $${monthlyQuota.toLocaleString()}`, 14, 35);
  
  const tableData = repairTechs.map(tech => [
    tech.name,
    tech.jobs.length.toString(),
    `$${tech.totalValue.toLocaleString()}`,
    `$${tech.monthlyValue?.toLocaleString() || '0'}`,
    `${tech.quotaPercent || 0}%`,
    `$${tech.commission10?.toLocaleString() || '0'}`,
    `$${tech.commission15?.toLocaleString() || '0'}`
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['Technician', 'Jobs', 'Total Value', 'This Month', 'Quota %', '10% Comm', '15% Comm']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [8, 145, 178], textColor: 255 },
    styles: { fontSize: 9 }
  });

  let yPos = (doc as any).lastAutoTable?.finalY + 15 || 100;
  
  repairTechs.forEach(tech => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(8, 145, 178);
    doc.text(tech.name, 14, yPos);
    yPos += 8;
    
    const jobsData = tech.jobs.slice(0, 10).map((job: any) => [
      job.title?.substring(0, 30) || 'N/A',
      job.customerName?.substring(0, 25) || 'N/A',
      `$${job.price?.toLocaleString() || '0'}`,
      job.isCompleted ? 'Complete' : 'Pending',
      job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : 'N/A'
    ]);
    
    if (jobsData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Job Title', 'Customer', 'Price', 'Status', 'Date']],
        body: jobsData,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], textColor: 255 },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
      });
      yPos = (doc as any).lastAutoTable?.finalY + 15 || yPos + 50;
    }
  });

  doc.save(`repair-techs-report-${now.toISOString().split('T')[0]}.pdf`);
}

function exportSRJobsPDF(srJobs: any[]) {
  const doc = new jsPDF();
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Group jobs by technician
  const jobsByTech: Record<string, any[]> = {};
  srJobs.forEach(job => {
    const techName = job.technicianName || "Unassigned";
    if (!jobsByTech[techName]) {
      jobsByTech[techName] = [];
    }
    jobsByTech[techName].push(job);
  });
  
  // Calculate tech stats
  const techStats = Object.entries(jobsByTech).map(([name, jobs]) => {
    const totalValue = jobs.reduce((sum, j) => sum + (j.price || 0), 0);
    const completedCount = jobs.filter(j => j.isCompleted).length;
    return {
      name,
      jobs,
      totalValue,
      completedCount,
      jobCount: jobs.length
    };
  }).sort((a, b) => b.totalValue - a.totalValue);
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(8, 145, 178);
  doc.text("SR Jobs - Technician Report", 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, 28);
  doc.text(`Total SR Jobs: ${srJobs.length} | Total Value: $${srJobs.reduce((s, j) => s + (j.price || 0), 0).toLocaleString()}`, 14, 35);
  
  // Summary table
  const summaryData = techStats.map(tech => [
    tech.name,
    tech.jobCount.toString(),
    `${tech.completedCount}/${tech.jobCount}`,
    `$${tech.totalValue.toLocaleString()}`,
    `$${Math.round(tech.totalValue * 0.10).toLocaleString()}`,
    `$${Math.round(tech.totalValue * 0.15).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['Technician', 'Total Jobs', 'Completed', 'Total Value', '10% Comm', '15% Comm']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [8, 145, 178], textColor: 255 },
    styles: { fontSize: 9 }
  });

  let yPos = (doc as any).lastAutoTable?.finalY + 15 || 100;
  
  // Detail pages for each tech
  techStats.forEach(tech => {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(8, 145, 178);
    doc.text(`${tech.name} - ${tech.jobCount} jobs ($${tech.totalValue.toLocaleString()})`, 14, yPos);
    yPos += 8;
    
    const jobsData = tech.jobs.map((job: any) => [
      job.title?.substring(0, 35) || 'SR Job',
      job.customerName?.substring(0, 20) || 'N/A',
      `$${(job.price || 0).toLocaleString()}`,
      job.isCompleted ? 'Complete' : 'Pending',
      job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : 'N/A'
    ]);
    
    if (jobsData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Job Title', 'Customer', 'Price', 'Status', 'Date']],
        body: jobsData,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], textColor: 255 },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
      });
      yPos = (doc as any).lastAutoTable?.finalY + 15 || yPos + 50;
    }
  });

  doc.save(`sr-jobs-report-${now.toISOString().split('T')[0]}.pdf`);
}

function exportSRAccountsPDF(srByTechnician: Record<string, any[]>) {
  const doc = new jsPDF();
  const now = new Date();
  
  // Commission rate (10% default - can be adjusted)
  const COMMISSION_RATE = 0.10;
  
  // Collect ALL SR jobs and group by account
  const allJobs: any[] = [];
  Object.values(srByTechnician).forEach(jobs => {
    allJobs.push(...jobs);
  });
  
  // Group by account (customer)
  // IMPORTANT: Commission is only counted for COMPLETED jobs
  const accountsMap: Record<string, { jobs: any[]; totalValue: number; totalCommission: number; completedCount: number; technicians: Set<string>; techCommissions: Record<string, number> }> = {};
  allJobs.forEach((job: any) => {
    const accountName = job.customerName || "Unknown";
    const isJobCompleted = job.isCompleted === true;
    // Only calculate commission for completed jobs
    const jobCommission = isJobCompleted ? (job.price || 0) * COMMISSION_RATE : 0;
    const techName = job.technicianName || 'Unassigned';
    
    if (!accountsMap[accountName]) {
      accountsMap[accountName] = { jobs: [], totalValue: 0, totalCommission: 0, completedCount: 0, technicians: new Set(), techCommissions: {} };
    }
    // Store commission as 0 for non-completed jobs, actual value for completed
    accountsMap[accountName].jobs.push({ ...job, commission: jobCommission, earnedCommission: isJobCompleted });
    accountsMap[accountName].totalValue += job.price || 0;
    // Only add to total commission if job is completed
    if (isJobCompleted) {
      accountsMap[accountName].totalCommission += jobCommission;
    }
    if (isJobCompleted) accountsMap[accountName].completedCount++;
    if (job.technicianName) accountsMap[accountName].technicians.add(job.technicianName);
    
    // Track commission per technician - ONLY for completed jobs
    if (!accountsMap[accountName].techCommissions[techName]) {
      accountsMap[accountName].techCommissions[techName] = 0;
    }
    if (isJobCompleted) {
      accountsMap[accountName].techCommissions[techName] += jobCommission;
    }
  });
  
  const accounts = Object.entries(accountsMap)
    .map(([name, data]) => ({
      name,
      ...data,
      technicianList: Array.from(data.technicians).join(", "),
      jobCount: data.jobs.length,
      readyToInvoice: data.completedCount === data.jobs.length && data.jobs.length > 0,
      over500: data.totalValue >= 500
    }))
    .sort((a, b) => b.totalValue - a.totalValue);
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(8, 145, 178);
  doc.text("SR Jobs - Account Invoice Report", 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, 28);
  
  const totalValue = allJobs.reduce((s, j) => s + (j.price || 0), 0);
  // Only count commission from COMPLETED jobs
  const completedJobs = allJobs.filter(j => j.isCompleted === true);
  const completedValue = completedJobs.reduce((s, j) => s + (j.price || 0), 0);
  const totalCommission = completedValue * COMMISSION_RATE;
  const readyAccounts = accounts.filter(a => a.readyToInvoice);
  const readyValue = readyAccounts.reduce((s, a) => s + a.totalValue, 0);
  const over500Count = accounts.filter(a => a.over500).length;
  
  doc.text(`${accounts.length} Accounts | ${allJobs.length} Jobs | $${totalValue.toLocaleString()} Total`, 14, 35);
  doc.text(`$${readyValue.toLocaleString()} Ready to Invoice | ${over500Count} accounts over $500`, 14, 42);
  doc.setTextColor(16, 185, 129);
  doc.text(`Tech Commissions (${(COMMISSION_RATE * 100).toFixed(0)}% on ${completedJobs.length} completed): $${totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, 49);
  
  let yPos = 59;
  
  // For each account
  accounts.forEach(account => {
    // Check page space - need room for header + at least one row
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }
    
    // Account header with badges
    doc.setFontSize(12);
    doc.setTextColor(8, 145, 178);
    doc.text(account.name, 14, yPos);
    
    // Status badges
    let badgeX = 14 + doc.getTextWidth(account.name) + 5;
    
    if (account.over500) {
      doc.setFillColor(220, 38, 38);
      doc.roundedRect(badgeX, yPos - 4, 22, 6, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255);
      doc.text("OVER $500", badgeX + 2, yPos);
      badgeX += 25;
    }
    
    if (account.readyToInvoice) {
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(badgeX, yPos - 4, 28, 6, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255);
      doc.text("READY TO INVOICE", badgeX + 2, yPos);
    }
    
    yPos += 6;
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`${account.jobCount} jobs | ${account.completedCount}/${account.jobCount} done | $${account.totalValue.toLocaleString()} | Commission: $${account.totalCommission.toFixed(2)}`, 14, yPos);
    yPos += 5;
    
    // Show commission breakdown by technician
    const techCommissionText = Object.entries(account.techCommissions)
      .map(([tech, comm]) => `${tech}: $${(comm as number).toFixed(2)}`)
      .join(' | ');
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129);
    doc.text(`Tech Commissions: ${techCommissionText}`, 14, yPos);
    yPos += 6;
    
    // Jobs table with full details including commission and products/services
    const jobsData: any[] = [];
    
    account.jobs.forEach((job: any) => {
      // Format products/services list
      const items = job.items || [];
      const productsText = items.length > 0 
        ? items.map((item: any) => `${item.productName || 'Item'} (${item.qty}x $${(item.unitCost || 0).toFixed(2)})`).join('; ')
        : 'No items';
      
      jobsData.push([
        job.title || 'SR Job',
        job.technicianName || 'Unassigned',
        productsText.substring(0, 60) + (productsText.length > 60 ? '...' : ''),
        `$${(job.price || 0).toLocaleString()}`,
        `$${(job.commission || 0).toFixed(2)}`,
        job.isCompleted ? 'Complete' : (job.status || 'Pending')
      ]);
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [['Repair Title', 'Technician', 'Products/Services', 'Price', 'Commission', 'Status']],
      body: jobsData,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7 },
      styles: { fontSize: 6, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 55 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 }
      },
      didParseCell: (data: any) => {
        if (data.column.index === 5 && data.cell.raw === 'Complete') {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = 'bold';
        }
        // Highlight commission column in green
        if (data.column.index === 4 && data.section === 'body') {
          data.cell.styles.textColor = [16, 185, 129];
        }
        // Style products column
        if (data.column.index === 2 && data.section === 'body') {
          data.cell.styles.textColor = [100, 100, 100];
          data.cell.styles.fontSize = 5;
        }
      },
      margin: { left: 14, right: 14 }
    });
    
    yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 30;
  });
  
  doc.save(`sr-accounts-invoice-report-${now.toISOString().split('T')[0]}.pdf`);
}

interface ArchiveContext {
  archivedIds: Set<string>;
  showArchived: boolean;
  archiveJob: (jobId: string) => void;
  unarchiveJob: (jobId: string) => void;
  deleteJob: (jobId: string) => void;
}

const ArchiveContext = createContext<ArchiveContext | null>(null);

function useArchive() {
  const ctx = useContext(ArchiveContext);
  if (!ctx) throw new Error("useArchive must be used within ArchiveContext");
  return ctx;
}

interface Job {
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
  items: { productId: string; qty: number; unitCost: number; taxable: number }[];
  raw?: any;
}

interface Account {
  accountId: string;
  accountName: string;
  address: string;
  totalJobs: number;
  completedJobs: number;
  totalValue: number;
  jobs: Job[];
}

interface Technician {
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

interface JobsData {
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

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function PriceDisplay({ price, productName, testId }: { price: number; productName?: string; testId?: string }) {
  if (!price || price === 0) {
    return (
      <span className="text-amber-400 font-ui text-sm" data-testid={testId}>
        <span className="animate-pulse font-semibold">⚠ Need Estimate</span>
        {productName && (
          <span className="block text-xs text-amber-400/80 mt-0.5">
            → Look up: {productName}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="font-ui font-bold text-sky-300" data-testid={testId}>
      {formatPrice(price)}
    </span>
  );
}

function ExpandableJobCard({ job }: { job: Job }) {
  const [isOpen, setIsOpen] = useState(false);
  const archive = useContext(ArchiveContext);
  
  const isPastDue = (() => {
    const isClosed = job.status?.toLowerCase() === 'closed';
    if (job.isCompleted || isClosed || !job.scheduledDate) return false;
    const scheduled = new Date(job.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled < today;
  })();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`bg-slate-800/60 hover:border-sky-400/50 transition-all duration-200 ${isPastDue ? 'border-red-500/50' : 'border-slate-600/50'}`} data-testid={`job-card-${job.jobId}`}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-sky-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  job.isCompleted ? 'bg-sky-500/30' : isPastDue ? 'bg-red-500/30' : 'bg-amber-500/30'
                }`}>
                  {job.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  ) : isPastDue ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-white" data-testid={`job-title-${job.jobId}`}>
                    {job.title || "Service Job"}
                  </p>
                  <p className="text-sm text-slate-400">
                    {job.customerName} • {job.technicianName}
                  </p>
                  {isPastDue && (
                    <p className="text-xs text-red-400 font-semibold animate-pulse mt-1">
                      ⚠ Did not do repair - needs rescheduling
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isPastDue && (
                  <Badge className="bg-red-500/30 text-red-300 border-red-500/50 animate-pulse">
                    Past Due
                  </Badge>
                )}
                <Badge variant="outline" className={
                  job.isCompleted ? "border-sky-400/50 text-sky-300" : isPastDue ? "border-red-500/50 text-red-400" : "border-amber-500/50 text-amber-400"
                }>
                  {job.status}
                </Badge>
                <span className="text-lg text-white font-semibold" data-testid={`job-price-${job.jobId}`}>
                  <PriceDisplay price={job.price} productName={job.title} />
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 border-t border-slate-600/50 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Customer</p>
                  <p className="text-sm font-medium text-white">{job.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Technician</p>
                  <p className="text-sm font-medium text-white">{job.technicianName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Pool</p>
                  <p className="text-sm font-medium text-white">{job.poolName || "N/A"}</p>
                </div>
                {job.address && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Service Address</p>
                    <p className="text-sm font-medium text-white flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-sky-400" />
                      {job.address}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Job ID</p>
                  <p className="text-sm font-medium text-white">{job.jobId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Status</p>
                  <Badge className={
                    job.isCompleted ? "bg-sky-500/30 text-sky-300 border-sky-400/50" : "bg-amber-500/30 text-amber-300 border-amber-400/50"
                  }>
                    {job.status}
                  </Badge>
                </div>
                {job.scheduledDate && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Scheduled Date</p>
                    <p className="text-sm font-medium text-white flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-sky-400" />
                      {new Date(job.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Price</p>
                  <p className="text-lg"><PriceDisplay price={job.price} productName={job.title} /></p>
                </div>
              </div>
            </div>
            {job.description && (
              <div className="mt-4 pt-4 border-t border-slate-600/50">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Description / Notes</p>
                <p className="text-sm text-slate-200 bg-slate-700/50 p-3 rounded-lg">{job.description}</p>
              </div>
            )}
            {job.items && job.items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-600/50">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Line Items</p>
                <div className="space-y-2">
                  {job.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-slate-700/50 p-2 rounded text-slate-200">
                      <span>Product #{item.productId}</span>
                      <span>Qty: {item.qty} @ {formatPrice(item.unitCost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {archive && (
              <div className="mt-4 pt-4 border-t border-slate-600/50 flex justify-end gap-2">
                {archive.showArchived ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => archive.unarchiveJob(String(job.jobId))}
                      className="gap-1 bg-sky-500 text-white hover:bg-sky-400 shadow-md"
                      data-testid={`btn-unarchive-${job.jobId}`}
                    >
                      <ArchiveRestore className="w-3 h-3" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Permanently delete this job? This cannot be undone.")) {
                          archive.deleteJob(String(job.jobId));
                        }
                      }}
                      className="gap-1 text-red-400 border-red-500/50 hover:bg-red-500/20"
                      data-testid={`btn-delete-${job.jobId}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => archive.archiveJob(String(job.jobId))}
                    className="gap-1 bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50 shadow-sm"
                    data-testid={`btn-archive-${job.jobId}`}
                  >
                    <Archive className="w-3 h-3" />
                    Archive Job
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function JobRow({ job, onClick }: { job: Job; onClick?: () => void }) {
  return (
    <div 
      className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-600/50 hover:border-sky-400/50 transition-colors cursor-pointer"
      data-testid={`job-row-${job.jobId}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          job.isCompleted ? 'bg-sky-500/30' : 'bg-amber-500/30'
        }`}>
          {job.isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          ) : (
            <Clock className="w-4 h-4 text-amber-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate" data-testid={`job-title-${job.jobId}`}>
            {job.title || "Service Job"}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {job.scheduledDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(job.scheduledDate).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {job.technicianName}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <Badge variant="outline" className={
          job.isCompleted ? "border-sky-400/50 text-sky-300" : "border-amber-400/50 text-amber-400"
        }>
          {job.isCompleted ? "Complete" : "Pending"}
        </Badge>
        <span className="min-w-[80px] text-right" data-testid={`job-price-${job.jobId}`}>
          <PriceDisplay price={job.price} productName={job.title} />
        </span>
      </div>
    </div>
  );
}

function AccountCard({ account }: { account: Account }) {
  const completionPercent = account.totalJobs > 0 
    ? Math.round((account.completedJobs / account.totalJobs) * 100) 
    : 0;

  return (
    <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors" data-testid={`account-card-${account.accountId}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-ui text-lg text-foreground" data-testid={`account-name-${account.accountId}`}>
                {account.accountName}
              </p>
              {account.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {account.address.substring(0, 50)}...
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-ui font-bold text-xl text-primary" data-testid={`account-value-${account.accountId}`}>
              {formatPrice(account.totalValue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {account.completedJobs}/{account.totalJobs} complete ({completionPercent}%)
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full bg-background/30 rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <div className="space-y-2">
          {account.jobs.map((job) => (
            <ExpandableJobCard key={job.jobId} job={job} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TechnicianCard({ tech }: { tech: Technician }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const completionPercent = tech.totalJobs > 0 
    ? Math.round((tech.completedJobs / tech.totalJobs) * 100) 
    : 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={`bg-card/50 border-border/50 hover:border-primary/30 transition-colors ${tech.totalJobs === 0 ? 'opacity-60' : ''}`} data-testid={`tech-card-${tech.techId}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {tech.totalJobs > 0 ? (
                  isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )
                ) : null}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tech.totalJobs > 0 ? 'bg-primary/20' : 'bg-muted/20'
                }`}>
                  <User className={`w-5 h-5 ${tech.totalJobs > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-ui text-lg text-foreground" data-testid={`tech-name-${tech.techId}`}>
                    {tech.name}
                  </p>
                  {(tech.phone || tech.email) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tech.phone || tech.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/50" data-testid={`tech-commission10-${tech.techId}`}>
                    10%: {formatPrice(tech.commission10 || 0)}
                  </Badge>
                  <Badge className="bg-primary/20 text-primary border-primary/50" data-testid={`tech-commission15-${tech.techId}`}>
                    15%: {formatPrice(tech.commission15 || 0)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-ui font-bold text-xl text-primary" data-testid={`tech-value-${tech.techId}`}>
                    {formatPrice(tech.totalValue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tech.totalJobs} jobs ({completionPercent}% done)
                  </p>
                </div>
              </div>
            </CardTitle>
            {tech.totalJobs > 0 && (
              <div className="w-full bg-background/30 rounded-full h-2 mt-3">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {tech.totalJobs > 0 && (
              <div className="space-y-2 border-t border-border/30 pt-4">
                {tech.jobs.map((job) => (
                  <ExpandableJobCard key={job.jobId} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
        {tech.totalJobs === 0 && (
          <CardContent className="pt-0">
            <p className="text-center text-muted-foreground/60 py-4 text-sm">
              No jobs assigned
            </p>
          </CardContent>
        )}
      </Card>
    </Collapsible>
  );
}

function SRAccountSubfolder({ accountName, jobs }: { accountName: string; jobs: Job[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const completedCount = jobs.filter(j => j.isCompleted).length;
  const totalValue = jobs.reduce((sum, j) => sum + j.price, 0);
  const readyToInvoice = totalValue >= 500;

  const handleSendInvoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    const jobDetails = jobs.map(j => `• ${j.title}: ${formatPrice(j.price)}`).join('%0D%0A');
    const subject = encodeURIComponent(`Invoice Ready: ${accountName} - SR Repairs Total ${formatPrice(totalValue)}`);
    const body = encodeURIComponent(
      `Invoice Summary for ${accountName}\n\n` +
      `Total Amount: ${formatPrice(totalValue)}\n` +
      `Completed: ${completedCount}/${jobs.length} jobs\n\n` +
      `Job Details:\n` +
      jobs.map(j => `• ${j.title}: ${formatPrice(j.price)} - ${j.isCompleted ? 'Complete' : 'Pending'}`).join('\n') +
      `\n\nPlease process this invoice at your earliest convenience.`
    );
    window.open(`https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`border rounded-lg bg-slate-700/50 overflow-hidden ${readyToInvoice ? 'border-sky-400' : 'border-slate-600/50'}`}>
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-slate-600/50 transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-sky-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-sky-300" />
            )}
            <Building2 className="w-4 h-4 text-sky-400" />
            <span className="font-ui font-medium text-white">{accountName}</span>
            <Badge className="text-xs bg-slate-600/50 text-slate-300 border-slate-500/50">
              {jobs.length} jobs
            </Badge>
            {readyToInvoice && (
              <Badge className="bg-sky-500 text-white border-sky-400 animate-pulse text-xs shadow-sm">
                Ready to Invoice
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">{completedCount}/{jobs.length} done</span>
            <span className={`font-ui font-bold ${readyToInvoice ? 'text-sky-300' : 'text-white'}`}>
              {formatPrice(totalValue)}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-2 border-t border-slate-600/50">
            {readyToInvoice && (
              <button
                onClick={handleSendInvoice}
                className="w-full mb-3 py-2 px-4 bg-sky-500 hover:bg-sky-400 border border-sky-400 rounded-lg text-white font-ui font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-md"
                data-testid={`send-invoice-${accountName}`}
              >
                <Mail className="w-4 h-4" />
                Send Invoice ({formatPrice(totalValue)})
              </button>
            )}
            {jobs.map((job) => (
              <ExpandableJobCard key={job.jobId} job={job} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SRTechnicianCard({ techName, jobs }: { techName: string; jobs: Job[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const completedCount = jobs.filter(j => j.isCompleted).length;
  const totalValue = jobs.reduce((sum, j) => sum + j.price, 0);
  const completionPercent = jobs.length > 0 ? Math.round((completedCount / jobs.length) * 100) : 0;
  const commission10 = Math.round(totalValue * 0.10 * 100) / 100;
  const commission15 = Math.round(totalValue * 0.15 * 100) / 100;

  const jobsByAccount = useMemo(() => {
    const grouped: Record<string, Job[]> = {};
    jobs.forEach(job => {
      const accountName = job.customerName || "Unknown Account";
      if (!grouped[accountName]) {
        grouped[accountName] = [];
      }
      grouped[accountName].push(job);
    });
    return Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  }, [jobs]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-sky-400/40 hover:border-sky-300/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all duration-300 shadow-lg" data-testid={`sr-tech-${techName}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-slate-800/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-sky-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-sky-300" />
                )}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/40 to-sky-600/30 flex items-center justify-center border border-sky-400/50 shadow-md">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-ui text-lg font-bold text-white">{techName}</p>
                    <Badge className="bg-sky-500 text-white border-sky-400 shadow-sm">SR</Badge>
                  </div>
                  <p className="text-xs text-sky-300/80 mt-0.5">
                    Service Repairs (&lt;$500) • {jobsByAccount.length} accounts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge className="bg-sky-500/30 text-sky-200 border-sky-400/50 text-xs shadow-sm" data-testid={`sr-commission10-${techName}`}>
                    10%: {formatPrice(commission10)}
                  </Badge>
                  <Badge className="bg-sky-600/30 text-sky-100 border-sky-300/50 text-xs shadow-sm" data-testid={`sr-commission15-${techName}`}>
                    15%: {formatPrice(commission15)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-ui font-bold text-xl text-white">
                    {formatPrice(totalValue)}
                  </p>
                  <p className="text-xs text-sky-300/80">
                    {completedCount}/{jobs.length} complete ({completionPercent}%)
                  </p>
                </div>
              </div>
            </CardTitle>
            <div className="w-full bg-slate-600 rounded-full h-2 mt-3">
              <div 
                className="bg-sky-400 h-2 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-sky-400/20">
            <div className="space-y-3 pt-4">
              {jobsByAccount.map(([accountName, accountJobs]) => (
                <SRAccountSubfolder key={accountName} accountName={accountName} jobs={accountJobs} />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface RepairTechData {
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

function RepairTechCard({ tech, monthlyQuota }: { tech: RepairTechData; monthlyQuota: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-sky-400/40 hover:border-sky-300/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all duration-300 shadow-lg" data-testid={`repair-tech-${tech.name}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-slate-800/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-sky-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-sky-300" />
                )}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/40 to-sky-600/30 flex items-center justify-center border border-sky-400/50 shadow-md">
                  <HardHat className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-ui text-lg font-bold text-white">{tech.name}</p>
                  <p className="text-xs text-sky-300/80">
                    {tech.completedCount}/{tech.jobs.length} completed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge className="bg-sky-500/30 text-sky-200 border-sky-400/50 text-xs shadow-sm">
                    10%: {formatPrice(tech.commission10)}
                  </Badge>
                  <Badge className="bg-sky-600/30 text-sky-100 border-sky-300/50 text-xs shadow-sm">
                    15%: {formatPrice(tech.commission15)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-ui font-bold text-2xl text-white">{formatPrice(tech.totalValue)}</p>
                </div>
              </div>
            </CardTitle>
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Monthly Quota Progress</span>
                <span className="text-sm font-ui">
                  <span className={tech.quotaPercent >= 100 ? "text-sky-400 font-bold" : "text-slate-200"}>
                    {formatPrice(tech.monthlyValue)}
                  </span>
                  <span className="text-slate-500"> / {formatPrice(monthlyQuota)}</span>
                </span>
              </div>
              <Progress 
                value={tech.quotaPercent} 
                className="h-2 bg-slate-600"
              />
              <div className="flex justify-between mt-1">
                <span className={`text-xs font-semibold ${tech.quotaPercent >= 100 ? 'text-sky-400' : 'text-slate-300'}`}>
                  {tech.quotaPercent}%
                </span>
                <span className="text-xs text-slate-400">
                  {tech.quotaPercent >= 100 ? '✓ Quota Met!' : `${formatPrice(monthlyQuota - tech.monthlyValue)} to go`}
                </span>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-sky-400/20">
            <div className="mt-3 pt-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Daily Activity (1-{tech.daysInMonth})</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {Array.from({ length: tech.daysInMonth }, (_, i) => i + 1).map(day => {
                  const value = tech.dailyValues[day] || 0;
                  const hasActivity = value > 0;
                  const intensity = hasActivity ? Math.min(1, value / 1000) : 0;
                  return (
                    <div
                      key={day}
                      className={`w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold transition-colors ${
                        hasActivity 
                          ? intensity > 0.7 ? 'bg-sky-500 text-white' 
                          : intensity > 0.3 ? 'bg-sky-500/60 text-white' 
                          : 'bg-sky-500/30 text-sky-300'
                          : 'bg-slate-700 text-slate-500'
                      }`}
                      title={hasActivity ? `Day ${day}: ${formatPrice(value)}` : `Day ${day}: No activity`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Repair Types</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(tech.repairTypes).slice(0, 6).map(([type, data]) => (
                  <Badge key={type} variant="outline" className="text-xs border-slate-500/50 text-slate-200 bg-slate-700/50">
                    {type.length > 25 ? type.substring(0, 25) + '...' : type}
                    <span className="ml-1 text-slate-400">({data.count}x, {formatPrice(data.value)})</span>
                  </Badge>
                ))}
                {Object.keys(tech.repairTypes).length > 6 && (
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                    +{Object.keys(tech.repairTypes).length - 6} more
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Jobs ({tech.jobs.length})</p>
              <div className="space-y-2">
                {tech.jobs.map((job) => (
                  <ExpandableJobCard key={job.jobId} job={job} />
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function Jobs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    customerId: "",
    technicianId: "",
    title: "",
    description: "",
    scheduledDate: "",
    priority: "Normal"
  });

  const { data: customersData } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: techniciansData } = useQuery({
    queryKey: ["/api/technicians"],
    queryFn: async () => {
      const res = await fetch("/api/technicians");
      if (!res.ok) throw new Error("Failed to fetch technicians");
      return res.json();
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (jobData: typeof newJob) => {
      const res = await fetch("/api/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create job");
      }
      return res.json();
    },
    onSuccess: () => {
      setCreateJobOpen(false);
      setNewJob({ customerId: "", technicianId: "", title: "", description: "", scheduledDate: "", priority: "Normal" });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery<JobsData>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const response = await fetch("/api/jobs");
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      return response.json();
    },
    refetchInterval: 60000,
    staleTime: 0,
  });

  const { data: archivedData = { archivedIds: [] } } = useQuery({
    queryKey: ["archivedAlerts", "job"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/archived?type=job");
      return res.json();
    },
  });

  const archivedIds = new Set<string>((archivedData.archivedIds || []).map(String));

  const archiveMutation = useMutation({
    mutationFn: async ({ jobId, archive }: { jobId: string; archive: boolean }) => {
      if (archive) {
        const res = await fetch(`/api/alerts/${jobId}/archive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "job" }),
        });
        if (!res.ok) throw new Error("Failed to archive job");
        return res.json();
      } else {
        const res = await fetch(`/api/alerts/${jobId}/archive`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to unarchive job");
        return res.json();
      }
    },
    onMutate: async ({ jobId, archive }) => {
      await queryClient.cancelQueries({ queryKey: ["archivedAlerts", "job"] });
      const previousData = queryClient.getQueryData(["archivedAlerts", "job"]);
      queryClient.setQueryData(["archivedAlerts", "job"], (old: any) => {
        const currentIds = new Set<string>((old?.archivedIds || []).map(String));
        if (archive) {
          currentIds.add(jobId);
        } else {
          currentIds.delete(jobId);
        }
        return { archivedIds: Array.from(currentIds) };
      });
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["archivedAlerts", "job"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedAlerts", "job"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/alerts/${jobId}/permanent`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedAlerts", "job"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const archiveContextValue: ArchiveContext = {
    archivedIds,
    showArchived,
    archiveJob: (jobId: string) => archiveMutation.mutate({ jobId, archive: true }),
    unarchiveJob: (jobId: string) => archiveMutation.mutate({ jobId, archive: false }),
    deleteJob: (jobId: string) => deleteMutation.mutate(jobId),
  };

  const srData = useMemo(() => {
    if (!data?.jobs) return { srJobs: [], srByTechnician: {}, srCount: 0, srValue: 0, archivedCount: 0 };

    const allSrJobs = data.jobs.filter(job => {
      const title = job.title?.toUpperCase() || "";
      const template = job.raw?.Template?.toUpperCase() || "";
      
      const isSR = (
        title.startsWith("SR ") ||
        title.startsWith("SR-") ||
        title.startsWith("SR:") ||
        title.startsWith("\"SR\"") ||
        title.startsWith("(SR)") ||
        title.includes(" SR ") ||
        title.includes(" SR-") ||
        title.includes("(SR)") ||
        title.includes("\"SR\"") ||
        title === "SR" ||
        /\bSR\d/.test(title) ||
        title.includes("SERVICE REPAIR") ||
        template.includes("S.T") ||
        template.includes("REPAIR")
      );
      
      return isSR && job.price < 500;
    });

    const archivedSrJobs = allSrJobs.filter(job => archivedIds.has(String(job.jobId)));
    const srJobs = showArchived ? archivedSrJobs : allSrJobs.filter(job => !archivedIds.has(String(job.jobId)));

    const srByTechnician: Record<string, Job[]> = {};
    srJobs.forEach(job => {
      const techName = job.technicianName || "Unassigned";
      if (!srByTechnician[techName]) {
        srByTechnician[techName] = [];
      }
      srByTechnician[techName].push(job);
    });

    const srValue = srJobs.reduce((sum, j) => sum + j.price, 0);

    return { srJobs, srByTechnician, srCount: srJobs.length, srValue, archivedCount: archivedSrJobs.length };
  }, [data?.jobs, archivedIds, showArchived]);

  const MONTHLY_QUOTA = 27000;
  
  const repairTechData = useMemo(() => {
    if (!data?.jobs) return { repairTechs: [], totalJobs: 0, totalValue: 0, topEarner: null, mostJobs: null };

    const REPAIR_TECH_NAMES = new Set([
      "Alan Bateman",
      "Don Johnson", 
      "Jose Puente",
      "Matt Cummins",
      "Rick Jacobs",
      "Vit Kruml"
    ]);

    const repairJobs = data.jobs.filter(job => REPAIR_TECH_NAMES.has(job.technicianName));
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const techMap: Record<string, {
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
    }> = {};

    repairJobs.forEach(job => {
      const name = job.technicianName;
      if (!techMap[name]) {
        techMap[name] = {
          name,
          jobs: [],
          totalValue: 0,
          completedCount: 0,
          commission10: 0,
          commission15: 0,
          repairTypes: {},
          monthlyValue: 0,
          dailyValues: {},
          quotaPercent: 0,
          daysInMonth
        };
      }
      techMap[name].jobs.push(job);
      techMap[name].totalValue += job.price;
      if (job.isCompleted) techMap[name].completedCount++;
      
      const jobDate = job.scheduledDate ? new Date(job.scheduledDate) : (job.createdDate ? new Date(job.createdDate) : null);
      if (jobDate && jobDate.getMonth() === currentMonth && jobDate.getFullYear() === currentYear) {
        const day = jobDate.getDate();
        techMap[name].monthlyValue += job.price;
        techMap[name].dailyValues[day] = (techMap[name].dailyValues[day] || 0) + job.price;
      }
      
      const repairType = job.title || "Other";
      if (!techMap[name].repairTypes[repairType]) {
        techMap[name].repairTypes[repairType] = { count: 0, value: 0 };
      }
      techMap[name].repairTypes[repairType].count++;
      techMap[name].repairTypes[repairType].value += job.price;
    });

    Object.values(techMap).forEach(tech => {
      tech.commission10 = Math.round(tech.totalValue * 0.10 * 100) / 100;
      tech.commission15 = Math.round(tech.totalValue * 0.15 * 100) / 100;
      tech.quotaPercent = Math.min(100, Math.round((tech.monthlyValue / MONTHLY_QUOTA) * 100));
    });

    const repairTechs = Object.values(techMap).sort((a, b) => b.totalValue - a.totalValue);
    const totalJobs = repairJobs.length;
    const totalValue = repairJobs.reduce((sum, j) => sum + j.price, 0);
    const topEarner = repairTechs[0] || null;
    const mostJobs = [...repairTechs].sort((a, b) => b.jobs.length - a.jobs.length)[0] || null;

    return { repairTechs, totalJobs, totalValue, topEarner, mostJobs };
  }, [data?.jobs]);

  // Job status tracking (Not Started / In Progress)
  const jobStatusData = useMemo(() => {
    if (!data?.jobs) return { notStartedCount: 0, inProgressCount: 0, notStartedJobs: [], inProgressJobs: [] };
    
    // Define explicit status mappings for clarity
    const NOT_STARTED_STATUSES = new Set(['not started', 'new', 'open']);
    const IN_PROGRESS_STATUSES = new Set(['in progress', 'in-progress', 'started', 'working', 'active']);
    
    const notStartedJobs = data.jobs.filter(job => {
      if (job.isCompleted) return false;
      const status = job.status?.toLowerCase()?.trim() || '';
      return NOT_STARTED_STATUSES.has(status);
    });
    
    const inProgressJobs = data.jobs.filter(job => {
      if (job.isCompleted) return false;
      const status = job.status?.toLowerCase()?.trim() || '';
      return IN_PROGRESS_STATUSES.has(status) || status.includes('progress');
    });
    
    return {
      notStartedCount: notStartedJobs.length,
      inProgressCount: inProgressJobs.length,
      notStartedJobs,
      inProgressJobs
    };
  }, [data?.jobs]);

  // Quotes tracking by repair tech
  const quotesData = useMemo(() => {
    if (!data?.jobs) return { quotesByTech: {}, totalQuotes: 0, openQuotes: 0, closedQuotes: 0, totalValue: 0, openQuotesList: [], closedQuotesList: [] };
    
    // Filter for quote jobs
    const quoteJobs = data.jobs.filter(job => {
      const title = job.title?.toLowerCase() || '';
      const template = job.raw?.Template?.toLowerCase() || '';
      return title.includes('quote') || title.includes('estimate') || template.includes('quote') || template.includes('estimate');
    });
    
    const quotesByTech: Record<string, { 
      name: string; 
      total: number; 
      open: number; 
      closed: number; 
      value: number;
      jobs: typeof quoteJobs 
    }> = {};
    
    quoteJobs.forEach(job => {
      const techName = job.technicianName || 'Unassigned';
      if (!quotesByTech[techName]) {
        quotesByTech[techName] = { name: techName, total: 0, open: 0, closed: 0, value: 0, jobs: [] };
      }
      quotesByTech[techName].total++;
      quotesByTech[techName].value += job.price || 0;
      quotesByTech[techName].jobs.push(job);
      
      const isClosed = job.isCompleted || job.status?.toLowerCase() === 'closed' || job.status?.toLowerCase() === 'completed';
      if (isClosed) {
        quotesByTech[techName].closed++;
      } else {
        quotesByTech[techName].open++;
      }
    });
    
    const openQuotesList = quoteJobs.filter(j => !j.isCompleted && j.status?.toLowerCase() !== 'closed' && j.status?.toLowerCase() !== 'completed');
    const closedQuotesList = quoteJobs.filter(j => j.isCompleted || j.status?.toLowerCase() === 'closed' || j.status?.toLowerCase() === 'completed');
    
    return { 
      quotesByTech, 
      totalQuotes: quoteJobs.length, 
      openQuotes: openQuotesList.length, 
      closedQuotes: closedQuotesList.length,
      openQuotesList,
      closedQuotesList,
      totalValue: quoteJobs.reduce((s, j) => s + (j.price || 0), 0)
    };
  }, [data?.jobs]);

  // Commission tracking - SR jobs that are completed and earning commissions
  const COMMISSION_RATE = 0.10;
  const commissionData = useMemo(() => {
    if (!data?.jobs) return { 
      completedSRJobs: [], 
      totalCommission: 0, 
      byTechnician: {} as Record<string, { name: string; jobs: any[]; totalValue: number; commission: number }>,
      completedCount: 0,
      totalValue: 0
    };
    
    // Filter for SR jobs that are COMPLETED (earning commission)
    const completedSRJobs = data.jobs.filter(job => {
      const title = job.title?.toLowerCase() || '';
      const template = job.raw?.Template?.toLowerCase() || '';
      const isSR = title.includes('sr') || title.includes('service repair') || template.includes('sr') || template.includes('service repair');
      return isSR && job.isCompleted === true;
    });
    
    // Group by technician
    const byTechnician: Record<string, { name: string; jobs: any[]; totalValue: number; commission: number }> = {};
    completedSRJobs.forEach(job => {
      const techName = job.technicianName || 'Unassigned';
      if (!byTechnician[techName]) {
        byTechnician[techName] = { name: techName, jobs: [], totalValue: 0, commission: 0 };
      }
      byTechnician[techName].jobs.push(job);
      byTechnician[techName].totalValue += job.price || 0;
      byTechnician[techName].commission += (job.price || 0) * COMMISSION_RATE;
    });
    
    const totalValue = completedSRJobs.reduce((s, j) => s + (j.price || 0), 0);
    const totalCommission = totalValue * COMMISSION_RATE;
    
    return {
      completedSRJobs,
      totalCommission,
      byTechnician,
      completedCount: completedSRJobs.length,
      totalValue
    };
  }, [data?.jobs]);

  const [selectedRepairTech, setSelectedRepairTech] = useState<string | null>(null);
  
  const filteredRepairTechs = useMemo(() => {
    if (!selectedRepairTech) return repairTechData.repairTechs;
    return repairTechData.repairTechs.filter(t => t.name === selectedRepairTech);
  }, [selectedRepairTech, repairTechData.repairTechs]);

  return (
    <ArchiveContext.Provider value={archiveContextValue}>
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground hover:text-cyan-400" data-testid="btn-back">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-display font-bold tracking-wider text-foreground" data-testid="jobs-title">
              JOBS & SCHEDULING
            </h1>
            <p className="text-muted-foreground font-ui mt-1">
              Jobs grouped by account, technician, and SR repairs with full details
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 shadow-md"
                  data-testid="btn-create-job"
                >
                  <Plus className="w-4 h-4" />
                  Create Job
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-sky-400/40 text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display text-sky-400">Create New Job in Pool Brain</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Fill in the details below to create a new repair or service job.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer" className="text-slate-300">Customer *</Label>
                    <Select value={newJob.customerId} onValueChange={(v) => setNewJob(prev => ({ ...prev, customerId: v }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="select-customer">
                        <SelectValue placeholder="Select a customer..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {(customersData?.customers || []).map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)} className="text-white hover:bg-slate-700">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-slate-300">Job Title *</Label>
                    <Input
                      id="title"
                      value={newJob.title}
                      onChange={(e) => setNewJob(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. SR Pump Repair"
                      className="bg-slate-800 border-slate-600 text-white"
                      data-testid="input-job-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-slate-300">Description</Label>
                    <Textarea
                      id="description"
                      value={newJob.description}
                      onChange={(e) => setNewJob(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the work to be done..."
                      className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
                      data-testid="input-job-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="technician" className="text-slate-300">Assign Technician</Label>
                      <Select value={newJob.technicianId} onValueChange={(v) => setNewJob(prev => ({ ...prev, technicianId: v }))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="select-technician">
                          <SelectValue placeholder="Optional..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {(techniciansData?.technicians || []).map((t: any) => (
                            <SelectItem key={t.id} value={String(t.id)} className="text-white hover:bg-slate-700">
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority" className="text-slate-300">Priority</Label>
                      <Select value={newJob.priority} onValueChange={(v) => setNewJob(prev => ({ ...prev, priority: v }))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="select-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="Low" className="text-white hover:bg-slate-700">Low</SelectItem>
                          <SelectItem value="Normal" className="text-white hover:bg-slate-700">Normal</SelectItem>
                          <SelectItem value="High" className="text-white hover:bg-slate-700">High</SelectItem>
                          <SelectItem value="Urgent" className="text-white hover:bg-slate-700">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate" className="text-slate-300">Scheduled Date</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={newJob.scheduledDate}
                      onChange={(e) => setNewJob(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white"
                      data-testid="input-scheduled-date"
                    />
                  </div>
                  {createJobMutation.error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/40 rounded text-red-300 text-sm">
                      {(createJobMutation.error as Error).message}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateJobOpen(false)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createJobMutation.mutate(newJob)}
                    disabled={!newJob.customerId || !newJob.title || createJobMutation.isPending}
                    className="bg-sky-500 hover:bg-sky-400 text-white"
                    data-testid="btn-submit-job"
                  >
                    {createJobMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Job"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => data && exportJobsExcel(data.jobs, data.technicians, data.summary)}
              disabled={!data}
              className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
              data-testid="btn-export-excel"
            >
              <FileDown className="w-4 h-4" />
              Export Excel
            </Button>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
                refetch();
              }}
              disabled={isFetching}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white border border-sky-400 rounded-lg font-ui text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              data-testid="refresh-jobs-btn"
            >
              {isFetching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync with Pool Brain
                </>
              )}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="flex items-center gap-3 p-6">
              <AlertCircle className="w-6 h-6 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Failed to load jobs</p>
                <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
              </div>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-sky-400/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/30 flex items-center justify-center border border-sky-400/50">
                    <Wrench className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="total-jobs-count">{data.summary.totalJobs}</p>
                    <p className="text-xs text-slate-400">Total Jobs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-red-500/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center border border-red-400/50">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="not-started-count">{jobStatusData.notStartedCount}</p>
                    <p className="text-xs text-slate-400">Not Started</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-amber-500/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center border border-amber-400/50">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="in-progress-count">{jobStatusData.inProgressCount}</p>
                    <p className="text-xs text-slate-400">In Progress</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-emerald-500/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center border border-emerald-400/50">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="completed-count">{data.summary.completedCount}</p>
                    <p className="text-xs text-slate-400">Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-sky-400/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/30 flex items-center justify-center border border-sky-400/50">
                    <Settings className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="sr-count">{srData.srCount}</p>
                    <p className="text-xs text-slate-400">SR Jobs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-purple-500/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center border border-purple-400/50">
                    <FileDown className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="quotes-count">{quotesData.totalQuotes}</p>
                    <p className="text-xs text-slate-400">Quotes ({quotesData.openQuotes} open)</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-sky-400/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/30 flex items-center justify-center border border-sky-400/50">
                    <DollarSign className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="total-value">{formatPrice(data.summary.totalValue)}</p>
                    <p className="text-xs text-slate-400">Total Value</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="sr" className="w-full">
              <TabsList className="bg-slate-800/80 border border-sky-400/30 flex-wrap shadow-lg">
                <TabsTrigger value="sr" data-testid="tab-sr" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  SR Jobs ({srData.srCount})
                </TabsTrigger>
                <TabsTrigger value="sr-stats" data-testid="tab-sr-stats" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Service Tech Stats
                </TabsTrigger>
                <TabsTrigger value="repair-techs" data-testid="tab-repair-techs" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <HardHat className="w-4 h-4 mr-2" />
                  Repair Techs ({repairTechData.totalJobs})
                </TabsTrigger>
                <TabsTrigger value="accounts" data-testid="tab-accounts" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <Building2 className="w-4 h-4 mr-2" />
                  By Account ({data.summary.accountCount})
                </TabsTrigger>
                <TabsTrigger value="technicians" data-testid="tab-technicians" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <User className="w-4 h-4 mr-2" />
                  By Technician ({data.summary.techsWithJobsCount})
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Completed ({data.summary.completedCount})
                </TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <Clock className="w-4 h-4 mr-2" />
                  Pending ({data.summary.pendingCount})
                </TabsTrigger>
                <TabsTrigger value="quotes" data-testid="tab-quotes" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <FileDown className="w-4 h-4 mr-2" />
                  Quotes ({quotesData.totalQuotes})
                </TabsTrigger>
                <TabsTrigger value="commissions" data-testid="tab-commissions" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Commissions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sr" className="mt-4">
                <div className="mb-4 p-4 bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-sky-400/40 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-sky-400" />
                      <h3 className="font-ui font-semibold text-white">Service Repairs (SR)</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => exportSRJobsPDF(srData.srJobs)}
                        className="bg-slate-700/80 text-slate-300 border border-slate-500/50 hover:bg-slate-600/80"
                        data-testid="btn-export-sr-pdf"
                      >
                        <FileDown className="w-3 h-3 mr-1" />
                        Tech PDF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => exportSRAccountsPDF(srData.srByTechnician)}
                        className="bg-emerald-600/80 text-white border border-emerald-400/50 hover:bg-emerald-500/80"
                        data-testid="btn-export-sr-accounts-pdf"
                      >
                        <FileDown className="w-3 h-3 mr-1" />
                        Accounts PDF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowArchived(false)}
                        className={!showArchived ? "bg-sky-500 text-white shadow-md" : "bg-slate-700/80 text-slate-300 border border-slate-500/50 hover:bg-slate-600/80"}
                        data-testid="btn-show-active-jobs"
                      >
                        Active ({srData.srCount})
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowArchived(true)}
                        className={showArchived ? "bg-sky-500 text-white shadow-md" : "bg-slate-700/80 text-slate-300 border border-slate-500/50 hover:bg-slate-600/80"}
                        data-testid="btn-show-archived-jobs"
                      >
                        <Archive className="w-3 h-3 mr-1" />
                        Archived ({srData.archivedCount})
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">
                    {showArchived ? "Archived jobs - click Restore to bring back." : "Small repairs under $500, grouped by technician. Click any job to see full details."}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-sky-300 font-semibold">{srData.srCount} SR Jobs</span>
                    <span className="text-sky-300 font-semibold">{formatPrice(srData.srValue)} Total</span>
                    <span className="text-slate-400">{Object.keys(srData.srByTechnician).length} Technicians</span>
                  </div>
                </div>
                <ScrollArea className="h-[650px]">
                  {Object.keys(srData.srByTechnician).length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No SR jobs found
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(srData.srByTechnician)
                        .sort((a, b) => b[1].length - a[1].length)
                        .map(([techName, jobs]) => (
                          <SRTechnicianCard key={techName} techName={techName} jobs={jobs} />
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="sr-stats" className="mt-4">
                {(() => {
                  const techStats = Object.entries(srData.srByTechnician).map(([name, jobs]) => {
                    const totalValue = jobs.reduce((sum, j) => sum + j.price, 0);
                    const completedCount = jobs.filter(j => j.isCompleted).length;
                    const repairTypes: Record<string, { count: number; value: number }> = {};
                    jobs.forEach(job => {
                      const type = job.title || "Other";
                      if (!repairTypes[type]) repairTypes[type] = { count: 0, value: 0 };
                      repairTypes[type].count++;
                      repairTypes[type].value += job.price;
                    });
                    return {
                      name,
                      jobCount: jobs.length,
                      completedCount,
                      totalValue,
                      commission10: totalValue * 0.10,
                      commission15: totalValue * 0.15,
                      repairTypes: Object.entries(repairTypes).sort((a, b) => b[1].count - a[1].count),
                    };
                  }).sort((a, b) => b.totalValue - a.totalValue);

                  const topEarner = techStats[0];
                  const mostJobs = [...techStats].sort((a, b) => b.jobCount - a.jobCount)[0];

                  return (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-sky-400/40 rounded-lg shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-5 h-5 text-sky-400" />
                          <h3 className="font-ui font-semibold text-white">Service Tech Performance Stats</h3>
                        </div>
                        <p className="text-sm text-slate-300">
                          Who does the most SR repairs, what they're working on, and who's making the most money.
                        </p>
                      </div>

                      {topEarner && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-400/50 shadow-lg">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-2">
                                <Trophy className="w-8 h-8 text-amber-400" />
                                <div>
                                  <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Top Earner</p>
                                  <p className="text-xl font-ui font-bold text-white">{topEarner.name}</p>
                                </div>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="text-amber-300 font-semibold">{formatPrice(topEarner.totalValue)}</span>
                                <span className="text-slate-300">{topEarner.jobCount} jobs</span>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-400/50 shadow-lg">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-2">
                                <Wrench className="w-8 h-8 text-slate-300" />
                                <div>
                                  <p className="text-xs text-slate-300 uppercase tracking-wider font-semibold">Most Repairs</p>
                                  <p className="text-xl font-ui font-bold text-white">{mostJobs?.name}</p>
                                </div>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="text-slate-200 font-semibold">{mostJobs?.jobCount} jobs</span>
                                <span className="text-slate-400">{formatPrice(mostJobs?.totalValue || 0)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      <ScrollArea className="h-[550px]">
                        <div className="space-y-4">
                          {techStats.map((tech, index) => (
                            <Card key={tech.name} className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-sky-400/40 hover:border-sky-300/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all duration-300 shadow-lg" data-testid={`sr-stat-${tech.name}`}>
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/40 to-sky-600/30 flex items-center justify-center border border-sky-400/50 shadow-md">
                                      <span className="text-lg font-bold text-white">#{index + 1}</span>
                                    </div>
                                    <div>
                                      <p className="font-ui text-lg text-white font-semibold">{tech.name}</p>
                                      <p className="text-xs text-sky-300/80">
                                        {tech.completedCount}/{tech.jobCount} completed
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-ui font-bold text-2xl text-white">{formatPrice(tech.totalValue)}</p>
                                    <div className="flex gap-2 mt-1">
                                      <Badge className="bg-sky-500/30 text-sky-200 border-sky-400/50 text-xs shadow-sm">
                                        10%: {formatPrice(tech.commission10)}
                                      </Badge>
                                      <Badge className="bg-sky-600/30 text-sky-100 border-sky-300/50 text-xs shadow-sm">
                                        15%: {formatPrice(tech.commission15)}
                                      </Badge>
                                    </div>
                                  </div>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="mt-3 pt-3 border-t border-sky-400/20">
                                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Repair Types</p>
                                  <div className="flex flex-wrap gap-2">
                                    {tech.repairTypes.slice(0, 8).map(([type, data]) => (
                                      <Badge key={type} variant="outline" className="text-xs border-slate-500/50 text-slate-200 bg-slate-700/50">
                                        {type.length > 30 ? type.substring(0, 30) + '...' : type}
                                        <span className="ml-1 text-slate-400">({data.count}x, {formatPrice(data.value)})</span>
                                      </Badge>
                                    ))}
                                    {tech.repairTypes.length > 8 && (
                                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                        +{tech.repairTypes.length - 8} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="repair-techs" className="mt-4">
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-sky-400/40 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <HardHat className="w-5 h-5 text-sky-400" />
                        <h3 className="font-ui font-semibold text-white">Repair Technicians</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2 text-sm">
                          <span className="text-sky-300 font-semibold">{repairTechData.totalJobs} Jobs</span>
                          <span className="text-sky-300 font-semibold">{formatPrice(repairTechData.totalValue)} Total</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => exportRepairTechsPDF(repairTechData.repairTechs, MONTHLY_QUOTA)}
                          className="gap-1 bg-sky-500 text-white hover:bg-sky-400 border-0 shadow-md"
                          data-testid="btn-export-repair-techs-pdf"
                        >
                          <FileDown className="w-3 h-3" />
                          Export PDF
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedRepairTech(null)}
                        className={`px-3 py-1.5 rounded-full font-ui text-sm transition-all shadow-sm ${
                          selectedRepairTech === null 
                            ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]' 
                            : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 border border-slate-500/50'
                        }`}
                        data-testid="repair-tech-all"
                      >
                        All Techs
                      </button>
                      {["Alan Bateman", "Don Johnson", "Jose Puente", "Matt Cummins", "Rick Jacobs", "Vit Kruml"].map(name => {
                        const techData = repairTechData.repairTechs.find(t => t.name === name);
                        return (
                          <button
                            key={name}
                            onClick={() => setSelectedRepairTech(name)}
                            className={`px-3 py-1.5 rounded-full font-ui text-sm transition-all flex items-center gap-2 shadow-sm ${
                              selectedRepairTech === name 
                                ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]' 
                                : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 border border-slate-500/50'
                            }`}
                            data-testid={`repair-tech-btn-${name}`}
                          >
                            {name}
                            {techData && (
                              <span className="text-xs text-sky-300/80">({techData.jobs.length})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {!selectedRepairTech && repairTechData.topEarner && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-400/50 shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Trophy className="w-8 h-8 text-amber-400" />
                            <div>
                              <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Top Earner</p>
                              <p className="text-xl font-ui font-bold text-white">{repairTechData.topEarner.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-amber-300 font-semibold">{formatPrice(repairTechData.topEarner.totalValue)}</span>
                            <span className="text-slate-300">{repairTechData.topEarner.jobs.length} jobs</span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-400/50 shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Wrench className="w-8 h-8 text-slate-300" />
                            <div>
                              <p className="text-xs text-slate-300 uppercase tracking-wider font-semibold">Most Jobs</p>
                              <p className="text-xl font-ui font-bold text-white">{repairTechData.mostJobs?.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-slate-200 font-semibold">{repairTechData.mostJobs?.jobs.length} jobs</span>
                            <span className="text-slate-400">{formatPrice(repairTechData.mostJobs?.totalValue || 0)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <ScrollArea className="h-[550px]">
                    <div className="space-y-4">
                      {repairTechData.repairTechs.length === 0 ? (
                        <Card className="bg-card/50 border-border/50">
                          <CardContent className="p-8 text-center text-muted-foreground">
                            No jobs found for repair technicians
                          </CardContent>
                        </Card>
                      ) : (
                        filteredRepairTechs.map((tech) => (
                          <RepairTechCard key={tech.name} tech={tech} monthlyQuota={MONTHLY_QUOTA} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="accounts" className="mt-4">
                <ScrollArea className="h-[700px]">
                  {data.accounts.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No accounts with jobs found
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {data.accounts.map((account) => (
                        <AccountCard key={account.accountId || account.accountName} account={account} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="technicians" className="mt-4">
                <ScrollArea className="h-[700px]">
                  {data.techsWithJobs.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No technicians with jobs found
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {data.techsWithJobs.map((tech) => (
                        <TechnicianCard key={tech.techId || tech.name} tech={tech} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="completed" className="mt-4">
                <ScrollArea className="h-[700px]">
                  {data.completedJobs.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4 text-secondary" />
                        <p>No completed jobs yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {data.completedJobs.map((job) => (
                        <ExpandableJobCard key={job.jobId} job={job} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pending" className="mt-4">
                <ScrollArea className="h-[700px]">
                  {data.pendingJobs.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <p>All jobs are completed!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {data.pendingJobs.map((job) => (
                        <ExpandableJobCard key={job.jobId} job={job} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="quotes" className="mt-4">
                <div className="mb-4 p-4 bg-gradient-to-r from-purple-900/40 to-slate-900/90 border border-purple-400/40 rounded-lg shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileDown className="w-5 h-5 text-purple-400" />
                    <h3 className="font-ui font-semibold text-white">Quotes Tracking</h3>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">
                    Track quotes and estimates by repair technician. See who's generating quotes and how many are still open.
                  </p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-purple-300 font-semibold">{quotesData.totalQuotes} Total Quotes</span>
                    <span className="text-amber-300 font-semibold">{quotesData.openQuotes} Open</span>
                    <span className="text-emerald-300 font-semibold">{quotesData.closedQuotes} Closed</span>
                    <span className="text-sky-300 font-semibold">{formatPrice(quotesData.totalValue)} Value</span>
                  </div>
                </div>
                
                <ScrollArea className="h-[600px]">
                  {quotesData.totalQuotes === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <FileDown className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
                        <p>No quotes found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {/* All Open Quotes Section */}
                      <div>
                        <h4 className="text-lg font-ui font-semibold text-amber-300 mb-3 flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          All Open Quotes ({quotesData.openQuotes})
                        </h4>
                        {quotesData.openQuotesList.length === 0 ? (
                          <Card className="bg-slate-800/50 border-slate-600/50">
                            <CardContent className="p-4 text-center text-slate-400">
                              No open quotes
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="space-y-2">
                            {quotesData.openQuotesList.map((job: any) => (
                              <Card key={job.jobId} className="bg-gradient-to-br from-amber-900/30 to-slate-900/80 border-amber-400/40 shadow-md">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-4 h-4 text-amber-400" />
                                        <span className="font-semibold text-white">{job.title || 'Quote'}</span>
                                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/50 text-xs">
                                          Open
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span>{job.customerName || 'N/A'}</span>
                                        <span>Tech: {job.technicianName || 'Unassigned'}</span>
                                        {job.scheduledDate && (
                                          <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xl font-bold text-purple-300">{formatPrice(job.price || 0)}</span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Quotes by Technician Section */}
                      <div>
                        <h4 className="text-lg font-ui font-semibold text-purple-300 mb-3 flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Quotes by Technician
                        </h4>
                        <div className="space-y-4">
                          {Object.values(quotesData.quotesByTech)
                            .sort((a, b) => b.total - a.total)
                            .map(tech => (
                              <Card key={tech.name} className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-purple-400/40 shadow-lg">
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center border border-purple-400/50">
                                        <User className="w-5 h-5 text-purple-400" />
                                      </div>
                                      <div>
                                        <CardTitle className="text-lg font-ui text-white">{tech.name}</CardTitle>
                                        <p className="text-sm text-slate-400">{tech.total} quotes | {formatPrice(tech.value)} total value</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/50">
                                        {tech.open} Open
                                      </Badge>
                                      <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                                        {tech.closed} Closed
                                      </Badge>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-2">
                                  <div className="space-y-2">
                                    {tech.jobs.slice(0, 5).map((job: any) => (
                                      <div key={job.jobId} className="flex items-center justify-between p-2 bg-slate-700/50 rounded border border-slate-600/50">
                                        <div className="flex items-center gap-2">
                                          {job.isCompleted || job.status?.toLowerCase() === 'closed' ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                          ) : (
                                            <Clock className="w-4 h-4 text-amber-400" />
                                          )}
                                          <span className="text-sm text-white">{job.title || 'Quote'}</span>
                                          <span className="text-xs text-slate-400">- {job.customerName || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold text-purple-300">{formatPrice(job.price || 0)}</span>
                                          {job.scheduledDate && (
                                            <span className="text-xs text-slate-400">{new Date(job.scheduledDate).toLocaleDateString()}</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {tech.jobs.length > 5 && (
                                      <p className="text-xs text-slate-400 text-center mt-2">
                                        + {tech.jobs.length - 5} more quotes
                                      </p>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="commissions" className="mt-4">
                <div className="mb-4 p-4 bg-gradient-to-r from-emerald-900/40 to-slate-900/90 border border-emerald-400/40 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-ui font-semibold text-white">Commission Payout - Completed SR Jobs</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          exportSRAccountsPDF(srData.srByTechnician);
                        }}
                        className="bg-emerald-600/80 text-white border border-emerald-400/50 hover:bg-emerald-500/80"
                        data-testid="btn-export-commission-pdf"
                      >
                        <FileDown className="w-3 h-3 mr-1" />
                        Export PDF
                      </Button>
                      <Button
                        size="sm"
                        disabled={isArchiving || commissionData.completedCount === 0}
                        onClick={async () => {
                          // Archive all completed SR jobs for monthly reset
                          setIsArchiving(true);
                          try {
                            const jobIds = commissionData.completedSRJobs.map(job => job.jobId?.toString() || '').filter(Boolean);
                            for (const jobId of jobIds) {
                              await fetch(`/api/alerts/${jobId}/archive`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ archive: true })
                              });
                            }
                            await queryClient.invalidateQueries({ queryKey: ["archivedAlerts", "job"] });
                            await queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
                            toast({
                              title: "Jobs Archived",
                              description: `${jobIds.length} completed SR jobs have been archived for monthly payout reset.`,
                            });
                          } catch (error) {
                            toast({
                              title: "Archive Failed",
                              description: "Failed to archive some jobs. Please try again.",
                              variant: "destructive",
                            });
                          } finally {
                            setIsArchiving(false);
                          }
                        }}
                        className="bg-red-600/80 text-white border border-red-400/50 hover:bg-red-500/80"
                        data-testid="btn-archive-paid-jobs"
                      >
                        {isArchiving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                        Archive Paid Jobs ({commissionData.completedCount})
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">
                    Only completed SR jobs earn commissions ({(COMMISSION_RATE * 100).toFixed(0)}% rate). Jobs not started or in progress are excluded. Archive paid jobs after monthly payout to reset.
                  </p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-emerald-300 font-semibold">{commissionData.completedCount} Completed Jobs</span>
                    <span className="text-sky-300 font-semibold">{formatPrice(commissionData.totalValue)} Total Value</span>
                    <span className="text-amber-300 font-semibold">{formatPrice(commissionData.totalCommission)} Total Commission</span>
                  </div>
                </div>
                
                <ScrollArea className="h-[600px]">
                  {commissionData.completedCount === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 text-emerald-400/50" />
                        <p>No completed SR jobs earning commissions</p>
                        <p className="text-sm mt-2">Complete SR jobs to see them here</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {/* Commission by Technician */}
                      {Object.values(commissionData.byTechnician)
                        .sort((a, b) => b.commission - a.commission)
                        .map(tech => (
                          <Card key={tech.name} className="bg-gradient-to-br from-emerald-900/30 to-slate-900/80 border-emerald-400/40 shadow-lg">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center border border-emerald-400/50">
                                    <User className="w-5 h-5 text-emerald-400" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg font-ui text-white">{tech.name}</CardTitle>
                                    <p className="text-sm text-slate-400">{tech.jobs.length} completed jobs</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-emerald-300">{formatPrice(tech.commission)}</p>
                                  <p className="text-xs text-slate-400">Commission ({(COMMISSION_RATE * 100).toFixed(0)}% of {formatPrice(tech.totalValue)})</p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                              <div className="space-y-2">
                                {tech.jobs.map((job: any) => (
                                  <div key={job.jobId} className="flex items-center justify-between p-2 bg-slate-700/50 rounded border border-slate-600/50">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                      <span className="text-sm text-white">{job.title || 'SR Job'}</span>
                                      <span className="text-xs text-slate-400">- {job.customerName || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm text-slate-400">{formatPrice(job.price || 0)}</span>
                                      <span className="text-sm font-semibold text-emerald-300">{formatPrice((job.price || 0) * COMMISSION_RATE)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </AppLayout>
    </ArchiveContext.Provider>
  );
}
