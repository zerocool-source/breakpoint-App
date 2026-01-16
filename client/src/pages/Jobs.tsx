import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, User, AlertCircle, CheckCircle2, Loader2, DollarSign, Building2, Wrench, Settings, TrendingUp, Trophy, BarChart3, HardHat, Archive, FileDown, ArrowLeft, RefreshCw, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

import {
  Job,
  JobsData,
  RepairTechData,
  ArchiveContext,
  ArchiveContextType,
  formatPrice,
} from "@/components/jobs/JobTypes";
import {
  exportJobsExcel,
  exportRepairTechsPDF,
  exportSRJobsPDF,
  exportSRAccountsPDF,
} from "@/components/jobs/JobExportFunctions";
import { ExpandableJobCard } from "@/components/jobs/JobCard";
import { SRTechnicianCard } from "@/components/jobs/SRTechnicianCard";
import { RepairTechCard } from "@/components/jobs/RepairTechCard";
import { AccountCard, TechnicianCard } from "@/components/jobs/TechnicianStats";

export default function Jobs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);
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

  interface RepairLineItem {
    type: 'part' | 'labor';
    description: string;
    partNumber?: string;
    quantity: number;
    unitPrice: number;
    extendedPrice: number;
  }
  interface ParsedRepair {
    invoiceNumber?: string;
    items: RepairLineItem[];
    totalParts: number;
    totalLabor: number;
    totalPrice: number;
  }
  interface RepairJob {
    jobId: number;
    title: string;
    status: string;
    isCompleted: boolean;
    scheduledDate: string;
    technicianId: number;
    technicianName: string;
    customerId: number;
    customerName: string;
    officeNotes: string;
    instructions: string;
    parsedRepair: ParsedRepair | null;
    priceExtraction: { prices: number[]; total: number; hasLabor: boolean };
    totalRepairValue: number;
    laborAmount: number;
    partsAmount: number;
  }
  interface RepairsData {
    repairs: RepairJob[];
    summary: {
      totalRepairs: number;
      completedRepairs: number;
      totalLabor: number;
      totalParts: number;
      totalRepairValue: number;
      commission15: number;
    };
  }
  const { data: repairsData } = useQuery<RepairsData>({
    queryKey: ["/api/jobs/repairs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs/repairs");
      if (!res.ok) throw new Error("Failed to fetch repairs");
      return res.json();
    },
    staleTime: 60000,
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
      queryClient.setQueryData(["archivedAlerts", "job"], (old: { archivedIds?: string[] }) => {
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

  const archiveContextValue: ArchiveContextType = {
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
      const template = (job.raw as Record<string, string>)?.Template?.toUpperCase() || "";
      
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
    if (!data?.jobs) return { repairTechs: [], totalJobs: 0, totalValue: 0, topEarner: null as RepairTechData | null, mostJobs: null as RepairTechData | null };

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

    const techMap: Record<string, RepairTechData> = {};

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

  const jobStatusData = useMemo(() => {
    if (!data?.jobs) return { notStartedCount: 0, inProgressCount: 0, notStartedJobs: [], inProgressJobs: [] };
    
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

  const quotesData = useMemo(() => {
    if (!data?.jobs) return { quotesByTech: {} as Record<string, { name: string; total: number; open: number; closed: number; value: number; jobs: Job[] }>, totalQuotes: 0, openQuotes: 0, closedQuotes: 0, totalValue: 0, openQuotesList: [] as Job[], closedQuotesList: [] as Job[] };
    
    const quoteJobs = data.jobs.filter(job => {
      const title = job.title?.toLowerCase() || '';
      const template = (job.raw as Record<string, string>)?.Template?.toLowerCase() || '';
      return title.includes('quote') || title.includes('estimate') || template.includes('quote') || template.includes('estimate');
    });
    
    const quotesByTech: Record<string, { 
      name: string; 
      total: number; 
      open: number; 
      closed: number; 
      value: number;
      jobs: Job[]
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

  const COMMISSION_RATE = 0.15;
  const commissionData = useMemo(() => {
    if (!data?.jobs) return { 
      commissionEligibleJobs: [] as Job[], 
      allSRJobs: [] as Job[],
      totalCommission: 0, 
      byTechnician: {} as Record<string, { name: string; allJobs: Job[]; completedJobs: Job[]; totalValue: number; completedValue: number; commission: number; accounts: Record<string, { name: string; notes: string; jobs: Job[] }> }>,
      byAccount: {} as Record<string, { name: string; notes: string; entryNotes: string; jobs: Job[]; technicians: Set<string>; totalValue: number; completedValue: number; commission: number }>,
      completedCount: 0,
      totalValue: 0,
      allJobsCount: 0
    };
    
    const allSRJobs = data.jobs.filter(job => {
      const title = job.title?.toLowerCase() || '';
      const template = (job.raw as Record<string, string>)?.Template?.toLowerCase() || '';
      return title.includes('sr') || title.includes('service repair') || template.includes('sr') || template.includes('service repair');
    });
    
    const isJobEligible = (job: Job) => {
      const status = job.status?.toLowerCase()?.trim() || '';
      return job.isCompleted === true || 
             status === 'closed' || 
             status === 'completed' || 
             status.includes('closed') || 
             status.includes('complete');
    };
    
    const commissionEligibleJobs = allSRJobs.filter(isJobEligible);
    
    const byTechnician: Record<string, { name: string; allJobs: Job[]; completedJobs: Job[]; totalValue: number; completedValue: number; commission: number; accounts: Record<string, { name: string; notes: string; jobs: Job[] }> }> = {};
    
    const byAccount: Record<string, { name: string; notes: string; entryNotes: string; jobs: Job[]; technicians: Set<string>; totalValue: number; completedValue: number; commission: number }> = {};
    
    allSRJobs.forEach(job => {
      const techName = job.technicianName || 'Unassigned';
      const accountName = job.customerName || 'Unknown';
      const jobNotes = job.notes || '';
      const entryNotes = job.entryNotes || '';
      
      if (!byTechnician[techName]) {
        byTechnician[techName] = { name: techName, allJobs: [], completedJobs: [], totalValue: 0, completedValue: 0, commission: 0, accounts: {} };
      }
      byTechnician[techName].allJobs.push(job);
      byTechnician[techName].totalValue += job.price || 0;
      
      if (!byTechnician[techName].accounts[accountName]) {
        byTechnician[techName].accounts[accountName] = { name: accountName, notes: jobNotes, jobs: [] };
      }
      byTechnician[techName].accounts[accountName].jobs.push(job);
      
      if (isJobEligible(job)) {
        byTechnician[techName].completedJobs.push(job);
        byTechnician[techName].completedValue += job.price || 0;
        byTechnician[techName].commission += (job.price || 0) * COMMISSION_RATE;
      }
      
      if (!byAccount[accountName]) {
        byAccount[accountName] = { name: accountName, notes: jobNotes, entryNotes: entryNotes, jobs: [], technicians: new Set(), totalValue: 0, completedValue: 0, commission: 0 };
      }
      byAccount[accountName].jobs.push(job);
      byAccount[accountName].technicians.add(techName);
      byAccount[accountName].totalValue += job.price || 0;
      if (isJobEligible(job)) {
        byAccount[accountName].completedValue += job.price || 0;
        byAccount[accountName].commission += (job.price || 0) * COMMISSION_RATE;
      }
      if (jobNotes && !byAccount[accountName].notes) byAccount[accountName].notes = jobNotes;
      if (entryNotes && !byAccount[accountName].entryNotes) byAccount[accountName].entryNotes = entryNotes;
    });
    
    const totalValue = allSRJobs.reduce((s, j) => s + (j.price || 0), 0);
    const completedValue = commissionEligibleJobs.reduce((s, j) => s + (j.price || 0), 0);
    const totalCommission = completedValue * COMMISSION_RATE;
    
    return {
      commissionEligibleJobs,
      allSRJobs,
      totalCommission,
      byTechnician,
      byAccount,
      completedCount: commissionEligibleJobs.length,
      totalValue,
      allJobsCount: allSRJobs.length
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
              <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground hover:text-[#0D9488]" data-testid="btn-back">
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
                  className="gap-2 bg-[#22D69A] hover:bg-[#22D69A] text-white border border-emerald-400 shadow-md"
                  data-testid="btn-create-job"
                >
                  <Plus className="w-4 h-4" />
                  Create Job
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-[#0078D4]/40 text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display text-[#0078D4]">Create New Job in Pool Brain</DialogTitle>
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
                        {(customersData?.customers || []).map((c: { id: string | number; name: string }) => (
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
                          {(techniciansData?.technicians || []).map((t: { id: string | number; name: string }) => (
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
                    className="bg-[#0078D4] hover:bg-[#0078D4] text-white"
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
              onClick={() => data && exportJobsExcel(data.jobs, data.technicians, { totalJobs: data.summary.totalJobs, completedJobs: data.summary.completedCount, pendingJobs: data.summary.pendingCount, totalValue: data.summary.totalValue })}
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
              className="px-4 py-2 bg-[#0078D4] hover:bg-[#0078D4] text-white border border-[#0078D4] rounded-lg font-ui text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-[#0078D4]/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0078D4]/30 flex items-center justify-center border border-[#0078D4]/50">
                    <Wrench className="w-5 h-5 text-[#0078D4]" />
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
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-[#FF8000]/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF8000]/30 flex items-center justify-center border border-[#FF8000]/50">
                    <Clock className="w-5 h-5 text-[#D35400]" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="in-progress-count">{jobStatusData.inProgressCount}</p>
                    <p className="text-xs text-slate-400">In Progress</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-[#22D69A]/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#22D69A]/30 flex items-center justify-center border border-emerald-400/50">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="completed-count">{data.summary.completedCount}</p>
                    <p className="text-xs text-slate-400">Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-[#0078D4]/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0078D4]/30 flex items-center justify-center border border-[#0078D4]/50">
                    <Settings className="w-5 h-5 text-[#0078D4]" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="sr-count">{srData.srCount}</p>
                    <p className="text-xs text-slate-400">SR Jobs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-[#17BEBB]/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#17BEBB]/30 flex items-center justify-center border border-purple-400/50">
                    <FileDown className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="quotes-count">{quotesData.totalQuotes}</p>
                    <p className="text-xs text-slate-400">Quotes ({quotesData.openQuotes} open)</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-[#0078D4]/40 shadow-lg">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0078D4]/30 flex items-center justify-center border border-[#0078D4]/50">
                    <DollarSign className="w-5 h-5 text-[#0078D4]" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-ui text-white" data-testid="total-value">{formatPrice(data.summary.totalValue)}</p>
                    <p className="text-xs text-slate-400">Total Value</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="sr" className="w-full">
              <TabsList className="bg-slate-800/80 border border-[#0078D4]/30 flex-wrap shadow-lg">
                <TabsTrigger value="sr" data-testid="tab-sr" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  SR Jobs ({srData.srCount})
                </TabsTrigger>
                <TabsTrigger value="sr-stats" data-testid="tab-sr-stats" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Service Tech Stats
                </TabsTrigger>
                <TabsTrigger value="repair-techs" data-testid="tab-repair-techs" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <HardHat className="w-4 h-4 mr-2" />
                  Repair Techs ({repairTechData.totalJobs})
                </TabsTrigger>
                <TabsTrigger value="accounts" data-testid="tab-accounts" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <Building2 className="w-4 h-4 mr-2" />
                  By Account ({data.summary.accountCount})
                </TabsTrigger>
                <TabsTrigger value="technicians" data-testid="tab-technicians" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <User className="w-4 h-4 mr-2" />
                  By Technician ({data.summary.techsWithJobsCount})
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Completed ({data.summary.completedCount})
                </TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <Clock className="w-4 h-4 mr-2" />
                  Pending ({data.summary.pendingCount})
                </TabsTrigger>
                <TabsTrigger value="quotes" data-testid="tab-quotes" className="data-[state=active]:bg-[#17BEBB] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <FileDown className="w-4 h-4 mr-2" />
                  Quotes ({quotesData.totalQuotes})
                </TabsTrigger>
                <TabsTrigger value="commissions" data-testid="tab-commissions" className="data-[state=active]:bg-[#22D69A] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Commissions
                </TabsTrigger>
                <TabsTrigger value="repairs-extracted" data-testid="tab-repairs-extracted" className="data-[state=active]:bg-[#FF8000] data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white">
                  <Wrench className="w-4 h-4 mr-2" />
                  Repairs ({repairsData?.summary.totalRepairs || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sr" className="mt-4">
                <div className="mb-4 p-4 bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-[#0078D4]/40 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[#0078D4]" />
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
                        className="bg-[#22D69A]/80 text-white border border-emerald-400/50 hover:bg-[#22D69A]/80"
                        data-testid="btn-export-sr-accounts-pdf"
                      >
                        <FileDown className="w-3 h-3 mr-1" />
                        Accounts PDF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowArchived(false)}
                        className={!showArchived ? "bg-[#0078D4] text-white shadow-md" : "bg-slate-700/80 text-slate-300 border border-slate-500/50 hover:bg-slate-600/80"}
                        data-testid="btn-show-active-jobs"
                      >
                        Active ({srData.srCount})
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowArchived(true)}
                        className={showArchived ? "bg-[#0078D4] text-white shadow-md" : "bg-slate-700/80 text-slate-300 border border-slate-500/50 hover:bg-slate-600/80"}
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
                    <span className="text-[#0078D4] font-semibold">{srData.srCount} SR Jobs</span>
                    <span className="text-[#0078D4] font-semibold">{formatPrice(srData.srValue)} Total</span>
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
                      <div className="p-4 bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-[#0078D4]/40 rounded-lg shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-5 h-5 text-[#0078D4]" />
                          <h3 className="font-ui font-semibold text-white">Service Tech Performance Stats</h3>
                        </div>
                        <p className="text-sm text-slate-300">
                          Who does the most SR repairs, what they're working on, and who's making the most money.
                        </p>
                      </div>

                      {topEarner && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-[#FF8000]/50 shadow-lg">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-2">
                                <Trophy className="w-8 h-8 text-[#D35400]" />
                                <div>
                                  <p className="text-xs text-[#D35400] uppercase tracking-wider font-semibold">Top Earner</p>
                                  <p className="text-xl font-ui font-bold text-white">{topEarner.name}</p>
                                </div>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="text-[#D35400] font-semibold">{formatPrice(topEarner.totalValue)}</span>
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
                            <Card key={tech.name} className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-[#0078D4]/40 hover:border-[#0078D4]/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all duration-300 shadow-lg" data-testid={`sr-stat-${tech.name}`}>
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0078D4]/40 to-sky-600/30 flex items-center justify-center border border-[#0078D4]/50 shadow-md">
                                      <span className="text-lg font-bold text-white">#{index + 1}</span>
                                    </div>
                                    <div>
                                      <p className="font-ui text-lg text-white font-semibold">{tech.name}</p>
                                      <p className="text-xs text-[#0078D4]/80">
                                        {tech.completedCount}/{tech.jobCount} completed
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-ui font-bold text-2xl text-white">{formatPrice(tech.totalValue)}</p>
                                    <div className="flex gap-2 mt-1">
                                      <Badge className="bg-[#0078D4]/30 text-sky-200 border-[#0078D4]/50 text-xs shadow-sm">
                                        10%: {formatPrice(tech.commission10)}
                                      </Badge>
                                      <Badge className="bg-sky-600/30 text-[#0078D41A] border-[#0078D4]/50 text-xs shadow-sm">
                                        15%: {formatPrice(tech.commission15)}
                                      </Badge>
                                    </div>
                                  </div>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="mt-3 pt-3 border-t border-[#0078D4]/20">
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
                  <div className="p-4 bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-[#0078D4]/40 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <HardHat className="w-5 h-5 text-[#0078D4]" />
                        <h3 className="font-ui font-semibold text-white">Repair Technicians</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2 text-sm">
                          <span className="text-[#0078D4] font-semibold">{repairTechData.totalJobs} Jobs</span>
                          <span className="text-[#0078D4] font-semibold">{formatPrice(repairTechData.totalValue)} Total</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => exportRepairTechsPDF(repairTechData.repairTechs, MONTHLY_QUOTA)}
                          className="gap-1 bg-[#0078D4] text-white hover:bg-[#0078D4] border-0 shadow-md"
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
                            ? 'bg-[#0078D4] text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]' 
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
                                ? 'bg-[#0078D4] text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]' 
                                : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 border border-slate-500/50'
                            }`}
                            data-testid={`repair-tech-btn-${name}`}
                          >
                            {name}
                            {techData && (
                              <span className="text-xs text-[#0078D4]/80">({techData.jobs.length})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {!selectedRepairTech && repairTechData.topEarner && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-[#FF8000]/50 shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Trophy className="w-8 h-8 text-[#D35400]" />
                            <div>
                              <p className="text-xs text-[#D35400] uppercase tracking-wider font-semibold">Top Earner</p>
                              <p className="text-xl font-ui font-bold text-white">{repairTechData.topEarner.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-[#D35400] font-semibold">{formatPrice(repairTechData.topEarner.totalValue)}</span>
                            <span className="text-slate-300">{repairTechData.topEarner.jobs.length} jobs</span>
                          </div>
                        </CardContent>
                      </Card>
                      {repairTechData.mostJobs && (
                        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-400/50 shadow-lg">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <Wrench className="w-8 h-8 text-slate-300" />
                              <div>
                                <p className="text-xs text-slate-300 uppercase tracking-wider font-semibold">Most Jobs</p>
                                <p className="text-xl font-ui font-bold text-white">{repairTechData.mostJobs.name}</p>
                              </div>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span className="text-slate-200 font-semibold">{repairTechData.mostJobs.jobs.length} jobs</span>
                              <span className="text-slate-400">{formatPrice(repairTechData.mostJobs.totalValue)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  <ScrollArea className="h-[550px]">
                    <div className="space-y-4">
                      {filteredRepairTechs.map(tech => (
                        <RepairTechCard key={tech.name} tech={tech} monthlyQuota={MONTHLY_QUOTA} />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="accounts" className="mt-4">
                <ScrollArea className="h-[650px]">
                  <div className="space-y-4">
                    {data.accounts.map((account) => (
                      <AccountCard key={account.accountId} account={account} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="technicians" className="mt-4">
                <ScrollArea className="h-[650px]">
                  <div className="space-y-4">
                    {data.techsWithJobs.map((tech) => (
                      <TechnicianCard key={tech.techId} tech={tech} />
                    ))}
                    {data.techsWithoutJobs.length > 0 && (
                      <>
                        <div className="flex items-center gap-4 py-2">
                          <div className="flex-1 h-px bg-border/30" />
                          <span className="text-xs text-muted-foreground">Technicians without jobs</span>
                          <div className="flex-1 h-px bg-border/30" />
                        </div>
                        {data.techsWithoutJobs.map((tech) => (
                          <TechnicianCard key={tech.techId} tech={tech} />
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="completed" className="mt-4">
                <ScrollArea className="h-[650px]">
                  <div className="space-y-3">
                    {data.completedJobs.map((job) => (
                      <ExpandableJobCard key={job.jobId} job={job} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pending" className="mt-4">
                <ScrollArea className="h-[650px]">
                  <div className="space-y-3">
                    {data.pendingJobs.map((job) => (
                      <ExpandableJobCard key={job.jobId} job={job} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="quotes" className="mt-4">
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-900/50 to-slate-900/90 border border-purple-400/40 rounded-lg shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileDown className="w-5 h-5 text-purple-400" />
                      <h3 className="font-ui font-semibold text-white">Quotes & Estimates</h3>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-purple-300 font-semibold">{quotesData.totalQuotes} Total</span>
                      <span className="text-emerald-300">{quotesData.openQuotes} Open</span>
                      <span className="text-slate-400">{quotesData.closedQuotes} Closed</span>
                      <span className="text-purple-300 font-semibold">{formatPrice(quotesData.totalValue)} Value</span>
                    </div>
                  </div>
                  <ScrollArea className="h-[550px]">
                    <div className="space-y-3">
                      {quotesData.openQuotesList.length > 0 && (
                        <>
                          <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Open Quotes</h4>
                          {quotesData.openQuotesList.map((job) => (
                            <ExpandableJobCard key={job.jobId} job={job} />
                          ))}
                        </>
                      )}
                      {quotesData.closedQuotesList.length > 0 && (
                        <>
                          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mt-6">Closed Quotes</h4>
                          {quotesData.closedQuotesList.map((job) => (
                            <ExpandableJobCard key={job.jobId} job={job} />
                          ))}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="commissions" className="mt-4">
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-emerald-900/50 to-slate-900/90 border border-emerald-400/40 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-ui font-semibold text-white">Commission Tracking (15%)</h3>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">
                      Only completed or closed SR jobs earn commission. Track progress toward payable amounts.
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span className="text-slate-400">{commissionData.allJobsCount} Total SR Jobs</span>
                      <span className="text-emerald-300 font-semibold">{commissionData.completedCount} Completed</span>
                      <span className="text-emerald-400 font-bold">{formatPrice(commissionData.totalCommission)} Earned</span>
                    </div>
                  </div>
                  <ScrollArea className="h-[550px]">
                    <div className="space-y-4">
                      {Object.values(commissionData.byTechnician)
                        .sort((a, b) => b.commission - a.commission)
                        .map(tech => (
                          <Card key={tech.name} className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-emerald-400/40 shadow-lg">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[#22D69A]/30 flex items-center justify-center border border-emerald-400/50">
                                    <User className="w-5 h-5 text-emerald-400" />
                                  </div>
                                  <div>
                                    <p className="font-ui text-lg font-bold text-white">{tech.name}</p>
                                    <p className="text-xs text-slate-400">
                                      {tech.completedJobs.length}/{tech.allJobs.length} completed
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-ui font-bold text-2xl text-emerald-400">{formatPrice(tech.commission)}</p>
                                  <p className="text-xs text-slate-400">from {formatPrice(tech.completedValue)}</p>
                                </div>
                              </CardTitle>
                            </CardHeader>
                          </Card>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="repairs-extracted" className="mt-4">
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-orange-900/50 to-slate-900/90 border border-orange-400/40 rounded-lg shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="w-5 h-5 text-orange-400" />
                      <h3 className="font-ui font-semibold text-white">Extracted Repairs (from Office Notes)</h3>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">
                      Repairs parsed from office notes with line items, labor, and parts breakdowns.
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span className="text-orange-300 font-semibold">{repairsData?.summary.totalRepairs || 0} Repairs</span>
                      <span className="text-slate-400">Labor: {formatPrice(repairsData?.summary.totalLabor || 0)}</span>
                      <span className="text-slate-400">Parts: {formatPrice(repairsData?.summary.totalParts || 0)}</span>
                      <span className="text-orange-400 font-bold">Total: {formatPrice(repairsData?.summary.totalRepairValue || 0)}</span>
                    </div>
                  </div>
                  <ScrollArea className="h-[550px]">
                    <div className="space-y-3">
                      {(repairsData?.repairs || []).map((repair) => (
                        <Card key={repair.jobId} className="bg-slate-800/60 border-orange-400/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-white">{repair.title}</p>
                                <p className="text-sm text-slate-400">{repair.customerName} • {repair.technicianName}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-orange-400">{formatPrice(repair.totalRepairValue)}</p>
                                <p className="text-xs text-slate-400">
                                  Labor: {formatPrice(repair.laborAmount)} | Parts: {formatPrice(repair.partsAmount)}
                                </p>
                              </div>
                            </div>
                            {repair.parsedRepair?.items && repair.parsedRepair.items.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-600/50">
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Line Items</p>
                                <div className="space-y-1">
                                  {repair.parsedRepair.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-slate-300">
                                        {item.description} {item.partNumber && `(${item.partNumber})`} x{item.quantity}
                                      </span>
                                      <span className="text-white">{formatPrice(item.extendedPrice)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </AppLayout>
    </ArchiveContext.Provider>
  );
}
