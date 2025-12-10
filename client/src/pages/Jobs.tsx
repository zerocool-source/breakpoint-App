import React, { useState, useMemo, createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, User, MapPin, AlertCircle, CheckCircle2, Loader2, DollarSign, Building2, Wrench, ChevronDown, ChevronRight, Settings, Mail, TrendingUp, Trophy, BarChart3, HardHat, AlertTriangle, Archive, ArchiveRestore, Trash2, FileDown, ArrowLeft } from "lucide-react";
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
      <span className="text-secondary font-ui text-sm" data-testid={testId}>
        <span className="animate-pulse font-semibold">⚠ Need Estimate</span>
        {productName && (
          <span className="block text-xs text-secondary/80 mt-0.5">
            → Look up: {productName}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="font-ui font-bold text-primary" data-testid={testId}>
      {formatPrice(price)}
    </span>
  );
}

function ExpandableJobCard({ job }: { job: Job }) {
  const [isOpen, setIsOpen] = useState(false);
  const archive = useContext(ArchiveContext);
  
  const isPastDue = (() => {
    if (job.isCompleted || !job.scheduledDate) return false;
    const scheduled = new Date(job.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled < today;
  })();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`bg-card/50 hover:border-primary/30 transition-colors ${isPastDue ? 'border-red-500/50' : 'border-border/50'}`} data-testid={`job-card-${job.jobId}`}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  job.isCompleted ? 'bg-primary/20' : isPastDue ? 'bg-destructive/20' : 'bg-secondary/20'
                }`}>
                  {job.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : isPastDue ? (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  ) : (
                    <Clock className="w-4 h-4 text-secondary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground" data-testid={`job-title-${job.jobId}`}>
                    {job.title || "Service Job"}
                  </p>
                  <p className="text-sm text-muted-foreground">
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
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">
                    Past Due
                  </Badge>
                )}
                <Badge variant="outline" className={
                  job.isCompleted ? "border-primary/50 text-primary" : isPastDue ? "border-destructive/50 text-destructive" : "border-secondary/50 text-secondary"
                }>
                  {job.status}
                </Badge>
                <span className="text-lg" data-testid={`job-price-${job.jobId}`}>
                  <PriceDisplay price={job.price} productName={job.title} />
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 border-t border-border/30 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Customer</p>
                  <p className="text-sm font-medium text-foreground">{job.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Technician</p>
                  <p className="text-sm font-medium text-foreground">{job.technicianName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Pool</p>
                  <p className="text-sm font-medium text-foreground">{job.poolName || "N/A"}</p>
                </div>
                {job.address && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Service Address</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.address}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Job ID</p>
                  <p className="text-sm font-medium text-foreground">{job.jobId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                  <Badge className={
                    job.isCompleted ? "bg-primary/20 text-primary border-primary/50" : "bg-secondary/20 text-secondary border-secondary/50"
                  }>
                    {job.status}
                  </Badge>
                </div>
                {job.scheduledDate && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Scheduled Date</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(job.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Price</p>
                  <p className="text-lg"><PriceDisplay price={job.price} productName={job.title} /></p>
                </div>
              </div>
            </div>
            {job.description && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Description / Notes</p>
                <p className="text-sm text-foreground bg-background/30 p-3 rounded-lg">{job.description}</p>
              </div>
            )}
            {job.items && job.items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Line Items</p>
                <div className="space-y-2">
                  {job.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-background/30 p-2 rounded">
                      <span>Product #{item.productId}</span>
                      <span>Qty: {item.qty} @ {formatPrice(item.unitCost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {archive && job.isCompleted && (
              <div className="mt-4 pt-4 border-t border-border/30 flex justify-end gap-2">
                {archive.showArchived ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => archive.unarchiveJob(String(job.jobId))}
                      className="gap-1 text-primary border-primary/30 hover:bg-primary/10"
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
                      className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                      data-testid={`btn-delete-${job.jobId}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => archive.archiveJob(String(job.jobId))}
                    className="gap-1 text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
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
      className="flex items-center justify-between py-3 px-4 bg-background/30 rounded-lg border border-border/30 hover:border-primary/30 transition-colors cursor-pointer"
      data-testid={`job-row-${job.jobId}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          job.isCompleted ? 'bg-primary/20' : 'bg-secondary/20'
        }`}>
          {job.isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          ) : (
            <Clock className="w-4 h-4 text-secondary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate" data-testid={`job-title-${job.jobId}`}>
            {job.title || "Service Job"}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
          job.isCompleted ? "border-primary/50 text-primary" : "border-secondary/50 text-secondary"
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
      <div className={`border rounded-lg bg-white overflow-hidden ${readyToInvoice ? 'border-[#0891b2]' : 'border-slate-300'}`}>
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-slate-700" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
            <Building2 className="w-4 h-4 text-[#0891b2]" />
            <span className="font-ui font-medium text-slate-800">{accountName}</span>
            <Badge className="text-xs bg-slate-100 text-slate-600 border-slate-300">
              {jobs.length} jobs
            </Badge>
            {readyToInvoice && (
              <Badge className="bg-[#0891b2] text-white border-[#067997] animate-pulse text-xs">
                Ready to Invoice
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{completedCount}/{jobs.length} done</span>
            <span className={`font-ui font-bold ${readyToInvoice ? 'text-[#0891b2]' : 'text-slate-800'}`}>
              {formatPrice(totalValue)}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-2 border-t border-slate-200">
            {readyToInvoice && (
              <button
                onClick={handleSendInvoice}
                className="w-full mb-3 py-2 px-4 bg-[#0891b2] hover:bg-[#067997] border border-[#067997] rounded-lg text-white font-ui font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
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
      <Card className="bg-white border border-slate-300 hover:border-[#0891b2] transition-colors shadow-sm" data-testid={`sr-tech-${techName}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-700" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                )}
                <div className="w-10 h-10 rounded-full bg-[#0891b2] flex items-center justify-center shadow">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-ui text-lg font-bold text-slate-900">{techName}</p>
                    <Badge className="bg-[#0891b2] text-white border-[#067997]">SR</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Service Repairs (&lt;$500) • {jobsByAccount.length} accounts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge className="bg-slate-800 text-white border-slate-700" data-testid={`sr-commission10-${techName}`}>
                    10%: {formatPrice(commission10)}
                  </Badge>
                  <Badge className="bg-slate-800 text-white border-slate-700" data-testid={`sr-commission15-${techName}`}>
                    15%: {formatPrice(commission15)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-ui font-bold text-xl text-slate-900">
                    {formatPrice(totalValue)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {completedCount}/{jobs.length} complete ({completionPercent}%)
                  </p>
                </div>
              </div>
            </CardTitle>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
              <div 
                className="bg-[#0891b2] h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-slate-200">
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
      <Card className="bg-white border border-slate-300 hover:border-[#0891b2] transition-colors shadow-sm" data-testid={`repair-tech-${tech.name}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-slate-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-700" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                )}
                <div className="w-10 h-10 rounded-full bg-[#0891b2] flex items-center justify-center shadow">
                  <HardHat className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-ui text-lg font-bold text-slate-900">{tech.name}</p>
                  <p className="text-xs text-slate-500">
                    {tech.completedCount}/{tech.jobs.length} completed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge className="bg-slate-800 text-white border-slate-700 text-xs">
                    10%: {formatPrice(tech.commission10)}
                  </Badge>
                  <Badge className="bg-slate-800 text-white border-slate-700 text-xs">
                    15%: {formatPrice(tech.commission15)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-ui font-bold text-2xl text-slate-900">{formatPrice(tech.totalValue)}</p>
                </div>
              </div>
            </CardTitle>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Monthly Quota Progress</span>
                <span className="text-sm font-ui">
                  <span className={tech.quotaPercent >= 100 ? "text-[#0891b2] font-bold" : "text-slate-700"}>
                    {formatPrice(tech.monthlyValue)}
                  </span>
                  <span className="text-slate-500"> / {formatPrice(monthlyQuota)}</span>
                </span>
              </div>
              <Progress 
                value={tech.quotaPercent} 
                className="h-2 bg-slate-200"
              />
              <div className="flex justify-between mt-1">
                <span className={`text-xs font-semibold ${tech.quotaPercent >= 100 ? 'text-[#0891b2]' : 'text-slate-600'}`}>
                  {tech.quotaPercent}%
                </span>
                <span className="text-xs text-slate-500">
                  {tech.quotaPercent >= 100 ? '✓ Quota Met!' : `${formatPrice(monthlyQuota - tech.monthlyValue)} to go`}
                </span>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-slate-200">
            <div className="mt-3 pt-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Daily Activity (1-{tech.daysInMonth})</p>
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
                          ? intensity > 0.7 ? 'bg-[#0891b2] text-white' 
                          : intensity > 0.3 ? 'bg-[#0891b2]/60 text-white' 
                          : 'bg-[#0891b2]/30 text-[#0891b2]'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                      title={hasActivity ? `Day ${day}: ${formatPrice(value)}` : `Day ${day}: No activity`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Repair Types</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(tech.repairTypes).slice(0, 6).map(([type, data]) => (
                  <Badge key={type} variant="outline" className="text-xs border-slate-300 text-slate-700">
                    {type.length > 25 ? type.substring(0, 25) + '...' : type}
                    <span className="ml-1 text-slate-500">({data.count}x, {formatPrice(data.value)})</span>
                  </Badge>
                ))}
                {Object.keys(tech.repairTypes).length > 6 && (
                  <Badge variant="outline" className="text-xs border-slate-300 text-slate-500">
                    +{Object.keys(tech.repairTypes).length - 6} more
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Jobs ({tech.jobs.length})</p>
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
  const [showArchived, setShowArchived] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<JobsData>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const response = await fetch("/api/jobs");
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      return response.json();
    },
    refetchInterval: 60000,
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
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg font-ui text-sm transition-colors"
              data-testid="refresh-jobs-btn"
            >
              Refresh
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground" data-testid="total-jobs-count">{data.summary.totalJobs}</p>
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground" data-testid="completed-count">{data.summary.completedCount}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground" data-testid="pending-count">{data.summary.pendingCount}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-orange-500/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground" data-testid="sr-count">{srData.srCount}</p>
                    <p className="text-sm text-muted-foreground">SR Jobs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground" data-testid="total-value">{formatPrice(data.summary.totalValue)}</p>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="sr" className="w-full">
              <TabsList className="bg-card/50 border border-border/50 flex-wrap">
                <TabsTrigger value="sr" data-testid="tab-sr" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
                  <Settings className="w-4 h-4 mr-2" />
                  SR Jobs ({srData.srCount})
                </TabsTrigger>
                <TabsTrigger value="sr-stats" data-testid="tab-sr-stats" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Service Tech Stats
                </TabsTrigger>
                <TabsTrigger value="repair-techs" data-testid="tab-repair-techs" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <HardHat className="w-4 h-4 mr-2" />
                  Repair Techs ({repairTechData.totalJobs})
                </TabsTrigger>
                <TabsTrigger value="accounts" data-testid="tab-accounts">
                  <Building2 className="w-4 h-4 mr-2" />
                  By Account ({data.summary.accountCount})
                </TabsTrigger>
                <TabsTrigger value="technicians" data-testid="tab-technicians">
                  <User className="w-4 h-4 mr-2" />
                  By Technician ({data.summary.techsWithJobsCount})
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Completed ({data.summary.completedCount})
                </TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">
                  <Clock className="w-4 h-4 mr-2" />
                  Pending ({data.summary.pendingCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sr" className="mt-4">
                <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-orange-400" />
                      <h3 className="font-ui font-semibold text-orange-400">Service Repairs (SR)</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={!showArchived ? "default" : "outline"}
                        onClick={() => setShowArchived(false)}
                        className={!showArchived ? "bg-orange-500 text-white" : "text-orange-400 border-orange-500/30"}
                        data-testid="btn-show-active-jobs"
                      >
                        Active ({srData.srCount})
                      </Button>
                      <Button
                        size="sm"
                        variant={showArchived ? "default" : "outline"}
                        onClick={() => setShowArchived(true)}
                        className={showArchived ? "bg-orange-500 text-white" : "text-orange-400 border-orange-500/30"}
                        data-testid="btn-show-archived-jobs"
                      >
                        <Archive className="w-3 h-3 mr-1" />
                        Archived ({srData.archivedCount})
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {showArchived ? "Archived jobs - click Restore to bring back." : "Small repairs under $500, grouped by technician. Click any job to see full details."}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-orange-400 font-semibold">{srData.srCount} SR Jobs</span>
                    <span className="text-orange-400 font-semibold">{formatPrice(srData.srValue)} Total</span>
                    <span className="text-muted-foreground">{Object.keys(srData.srByTechnician).length} Technicians</span>
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
                          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-400/50 shadow-lg">
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
                                <span className="text-slate-400">{topEarner.jobCount} jobs</span>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-gradient-to-br from-sky-500/20 to-sky-600/10 border-sky-400/50 shadow-lg">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-2">
                                <Wrench className="w-8 h-8 text-sky-400" />
                                <div>
                                  <p className="text-xs text-sky-400 uppercase tracking-wider font-semibold">Most Repairs</p>
                                  <p className="text-xl font-ui font-bold text-white">{mostJobs?.name}</p>
                                </div>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="text-sky-300 font-semibold">{mostJobs?.jobCount} jobs</span>
                                <span className="text-slate-400">{formatPrice(mostJobs?.totalValue || 0)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      <ScrollArea className="h-[550px]">
                        <div className="space-y-4">
                          {techStats.map((tech, index) => (
                            <Card key={tech.name} className="bg-gradient-to-br from-violet-950/40 to-indigo-950/30 border-violet-500/30 hover:border-violet-400/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300" data-testid={`sr-stat-${tech.name}`}>
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center border border-violet-400/30">
                                      <span className="text-lg font-bold text-violet-300">#{index + 1}</span>
                                    </div>
                                    <div>
                                      <p className="font-ui text-lg text-foreground">{tech.name}</p>
                                      <p className="text-xs text-violet-300/70">
                                        {tech.completedCount}/{tech.jobCount} completed
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-ui font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">{formatPrice(tech.totalValue)}</p>
                                    <div className="flex gap-2 mt-1">
                                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs">
                                        10%: {formatPrice(tech.commission10)}
                                      </Badge>
                                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs">
                                        15%: {formatPrice(tech.commission15)}
                                      </Badge>
                                    </div>
                                  </div>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="mt-3 pt-3 border-t border-violet-500/20">
                                  <p className="text-xs text-violet-300/60 uppercase tracking-wider mb-2">Repair Types</p>
                                  <div className="flex flex-wrap gap-2">
                                    {tech.repairTypes.slice(0, 8).map(([type, data]) => (
                                      <Badge key={type} variant="outline" className="text-xs border-violet-400/30 text-violet-200 bg-violet-500/10">
                                        {type.length > 30 ? type.substring(0, 30) + '...' : type}
                                        <span className="ml-1 text-violet-300/60">({data.count}x, {formatPrice(data.value)})</span>
                                      </Badge>
                                    ))}
                                    {tech.repairTypes.length > 8 && (
                                      <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
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
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <HardHat className="w-5 h-5 text-primary" />
                        <h3 className="font-ui font-semibold text-primary">Repair Technicians</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2 text-sm">
                          <span className="text-primary font-semibold">{repairTechData.totalJobs} Jobs</span>
                          <span className="text-primary font-semibold">{formatPrice(repairTechData.totalValue)} Total</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportRepairTechsPDF(repairTechData.repairTechs, MONTHLY_QUOTA)}
                          className="gap-1 text-primary border-primary/30 hover:bg-primary/10"
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
                        className={`px-3 py-1.5 rounded-full font-ui text-sm transition-all ${
                          selectedRepairTech === null 
                            ? 'bg-primary text-white shadow-[0_0_10px_rgba(8,145,178,0.5)]' 
                            : 'bg-primary/20 text-primary/80 hover:bg-primary/30'
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
                            className={`px-3 py-1.5 rounded-full font-ui text-sm transition-all flex items-center gap-2 ${
                              selectedRepairTech === name 
                                ? 'bg-primary text-white shadow-[0_0_10px_rgba(8,145,178,0.5)]' 
                                : 'bg-primary/20 text-primary/80 hover:bg-primary/30'
                            }`}
                            data-testid={`repair-tech-btn-${name}`}
                          >
                            {name}
                            {techData && (
                              <span className="text-xs opacity-75">({techData.jobs.length})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {!selectedRepairTech && repairTechData.topEarner && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Trophy className="w-8 h-8 text-secondary" />
                            <div>
                              <p className="text-xs text-secondary uppercase tracking-wider">Top Earner</p>
                              <p className="text-xl font-ui font-bold text-foreground">{repairTechData.topEarner.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-secondary font-semibold">{formatPrice(repairTechData.topEarner.totalValue)}</span>
                            <span className="text-muted-foreground">{repairTechData.topEarner.jobs.length} jobs</span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Wrench className="w-8 h-8 text-primary" />
                            <div>
                              <p className="text-xs text-primary uppercase tracking-wider">Most Jobs</p>
                              <p className="text-xl font-ui font-bold text-foreground">{repairTechData.mostJobs?.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-primary font-semibold">{repairTechData.mostJobs?.jobs.length} jobs</span>
                            <span className="text-muted-foreground">{formatPrice(repairTechData.mostJobs?.totalValue || 0)}</span>
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
            </Tabs>
          </>
        ) : null}
      </div>
    </AppLayout>
    </ArchiveContext.Provider>
  );
}
