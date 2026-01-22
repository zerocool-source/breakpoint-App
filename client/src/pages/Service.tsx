import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Wind, AlertTriangle, AlertCircle, Clock, CheckCircle, MapPin, User, Calendar,
  RefreshCw, Image as ImageIcon, PlayCircle, FileText, Building2, Eye, Archive, 
  DollarSign, Download, ChevronLeft, ChevronRight, X, Percent, Search, ChevronDown,
  ChevronUp, Shield, Wrench, Users, XCircle
} from "lucide-react";
import type { TechOpsEntry, Emergency } from "@shared/schema";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  pending_review: { label: "Pending Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200", icon: PlayCircle },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
  dismissed: { label: "Dismissed", color: "bg-slate-100 text-slate-600 border-slate-200", icon: XCircle },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-600 border-slate-200", icon: FileText },
};

const positionTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  service_technician: { label: "Service Tech", color: "bg-blue-100 text-blue-700", icon: User },
  supervisor: { label: "Supervisor", color: "bg-purple-100 text-purple-700", icon: Shield },
  repair_technician: { label: "Repair Tech", color: "bg-orange-100 text-orange-700", icon: Wrench },
};

const issueTypeConfig: Record<string, { label: string; color: string }> = {
  equipment_problem: { label: "Equipment Problem", color: "bg-orange-100 text-orange-700" },
  safety_concern: { label: "Safety Concern", color: "bg-red-100 text-red-700" },
  access_issue: { label: "Access Issue", color: "bg-amber-100 text-amber-700" },
  customer_complaint: { label: "Customer Complaint", color: "bg-purple-100 text-purple-700" },
  other: { label: "Other", color: "bg-slate-100 text-slate-600" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "High", color: "bg-amber-100 text-amber-700" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700" },
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function Service() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("windy");
  const [selectedEntry, setSelectedEntry] = useState<TechOpsEntry | null>(null);
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  
  // Windy Day filters
  const [windyPropertyFilter, setWindyPropertyFilter] = useState<string>("all");
  const [windyTechFilter, setWindyTechFilter] = useState<string>("all");
  const [windyPositionFilter, setWindyPositionFilter] = useState<string>("all");
  const [windyStatusFilter, setWindyStatusFilter] = useState<string>("all");
  const [windyDateFrom, setWindyDateFrom] = useState<string>("");
  const [windyDateTo, setWindyDateTo] = useState<string>("");
  
  // Report Issues filters
  const [issuesPropertySearch, setIssuesPropertySearch] = useState<string>("");
  const [issuesPositionFilter, setIssuesPositionFilter] = useState<string>("all");
  const [issuesTechFilter, setIssuesTechFilter] = useState<string>("all");
  const [issuesDateFrom, setIssuesDateFrom] = useState<string>("");
  const [issuesDateTo, setIssuesDateTo] = useState<string>("");
  const [issuesStatusFilter, setIssuesStatusFilter] = useState<string>("all");
  const [issuesPriorityFilter, setIssuesPriorityFilter] = useState<string>("all");
  const [issuesTypeFilter, setIssuesTypeFilter] = useState<string>("all");
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  
  // Emergencies filters
  const [emergenciesPropertySearch, setEmergenciesPropertySearch] = useState<string>("");
  const [emergenciesPositionFilter, setEmergenciesPositionFilter] = useState<string>("all");
  const [emergenciesTechFilter, setEmergenciesTechFilter] = useState<string>("all");
  const [emergenciesDateFrom, setEmergenciesDateFrom] = useState<string>("");
  const [emergenciesDateTo, setEmergenciesDateTo] = useState<string>("");
  const [emergenciesStatusFilter, setEmergenciesStatusFilter] = useState<string>("all");
  const [emergenciesPriorityFilter, setEmergenciesPriorityFilter] = useState<string>("all");
  
  // Review modal state
  const [reviewModalEntry, setReviewModalEntry] = useState<TechOpsEntry | null>(null);
  const [reviewPhotoIndex, setReviewPhotoIndex] = useState(0);
  
  // Confirm invoice dialog state
  const [invoiceConfirmEntry, setInvoiceConfirmEntry] = useState<TechOpsEntry | null>(null);
  
  // Emergency invoice confirmation state
  const [emergencyInvoiceConfirm, setEmergencyInvoiceConfirm] = useState<Emergency | null>(null);

  // Fetch Windy Day Clean Up entries
  const { data: windyEntries = [], isLoading: windyLoading, refetch: refetchWindy } = useQuery({
    queryKey: ["tech-ops-windy-day"],
    queryFn: async () => {
      const res = await fetch("/api/tech-ops?entryType=windy_day_cleanup");
      if (!res.ok) throw new Error("Failed to fetch windy day entries");
      return res.json();
    },
  });

  // Fetch Report Issues entries
  const { data: issueEntries = [], isLoading: issuesLoading, refetch: refetchIssues } = useQuery({
    queryKey: ["tech-ops-report-issue"],
    queryFn: async () => {
      const res = await fetch("/api/tech-ops?entryType=report_issue");
      if (!res.ok) throw new Error("Failed to fetch report issues");
      return res.json();
    },
  });

  // Fetch Emergencies
  const { data: emergencies = [], isLoading: emergenciesLoading, refetch: refetchEmergencies } = useQuery<Emergency[]>({
    queryKey: ["emergencies"],
    queryFn: async () => {
      const res = await fetch("/api/emergencies");
      if (!res.ok) throw new Error("Failed to fetch emergencies");
      return res.json();
    },
  });

  const updateTechOpsMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/tech-ops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops-windy-day"] });
      queryClient.invalidateQueries({ queryKey: ["tech-ops-report-issue"] });
      toast({ title: "Status updated" });
    },
  });

  const updateEmergencyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/emergencies/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergencies"] });
      toast({ title: "Emergency status updated" });
      setSelectedEmergency(null);
    },
  });

  const convertEmergencyToEstimateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/emergencies/${id}/convert-to-estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to convert to estimate");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["emergencies"] });
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({ 
        title: "Converted to Estimate", 
        description: `Emergency has been converted to EST#${data.estimate?.estimateNumber || ""}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const invoiceEmergencyDirectlyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/emergencies/${id}/invoice-directly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergencies"] });
      toast({ title: "Invoice Sent", description: "Emergency has been marked as invoiced" });
      setEmergencyInvoiceConfirm(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Get unique properties and technicians for filters
  const uniqueWindyProperties = useMemo(() => {
    const props = new Set<string>();
    (windyEntries as TechOpsEntry[]).forEach(entry => {
      if (entry.propertyName) props.add(entry.propertyName);
    });
    return Array.from(props).sort();
  }, [windyEntries]);

  const uniqueWindyTechs = useMemo(() => {
    const techs = new Set<string>();
    (windyEntries as TechOpsEntry[]).forEach(entry => {
      if (entry.technicianName) techs.add(entry.technicianName);
    });
    return Array.from(techs).sort();
  }, [windyEntries]);

  // Get unique technicians for issues filters
  const uniqueIssueTechs = useMemo(() => {
    const techs = new Set<string>();
    (issueEntries as TechOpsEntry[]).forEach(entry => {
      if (entry.technicianName) techs.add(entry.technicianName);
    });
    return Array.from(techs).sort();
  }, [issueEntries]);

  // Get unique technicians for emergencies filters
  const uniqueEmergencyTechs = useMemo(() => {
    const techs = new Set<string>();
    emergencies.forEach(entry => {
      if (entry.submittedByName) techs.add(entry.submittedByName);
    });
    return Array.from(techs).sort();
  }, [emergencies]);

  // Filter issues entries
  const filteredIssueEntries = useMemo(() => {
    let entries = issueEntries as TechOpsEntry[];
    if (issuesPropertySearch.trim()) {
      const search = issuesPropertySearch.toLowerCase();
      entries = entries.filter(e => 
        (e.propertyName || "").toLowerCase().includes(search) ||
        (e.issueTitle || "").toLowerCase().includes(search)
      );
    }
    if (issuesPositionFilter !== "all") {
      entries = entries.filter(e => e.positionType === issuesPositionFilter);
    }
    if (issuesTechFilter !== "all") {
      entries = entries.filter(e => e.technicianName === issuesTechFilter);
    }
    if (issuesStatusFilter !== "all") {
      entries = entries.filter(e => e.status === issuesStatusFilter);
    }
    if (issuesPriorityFilter !== "all") {
      entries = entries.filter(e => e.priority === issuesPriorityFilter);
    }
    if (issuesTypeFilter !== "all") {
      entries = entries.filter(e => e.issueType === issuesTypeFilter);
    }
    if (issuesDateFrom) {
      const fromDate = new Date(issuesDateFrom);
      entries = entries.filter(e => e.createdAt && new Date(e.createdAt) >= fromDate);
    }
    if (issuesDateTo) {
      const toDate = new Date(issuesDateTo);
      toDate.setHours(23, 59, 59, 999);
      entries = entries.filter(e => e.createdAt && new Date(e.createdAt) <= toDate);
    }
    return [...entries].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [issueEntries, issuesPropertySearch, issuesPositionFilter, issuesTechFilter, 
      issuesStatusFilter, issuesPriorityFilter, issuesTypeFilter, issuesDateFrom, issuesDateTo]);

  // Filter emergencies
  const filteredEmergencies = useMemo(() => {
    let entries = emergencies;
    if (emergenciesPropertySearch.trim()) {
      const search = emergenciesPropertySearch.toLowerCase();
      entries = entries.filter(e => 
        (e.propertyName || "").toLowerCase().includes(search)
      );
    }
    if (emergenciesPositionFilter !== "all") {
      entries = entries.filter(e => e.submittedByRole === emergenciesPositionFilter);
    }
    if (emergenciesTechFilter !== "all") {
      entries = entries.filter(e => e.submittedByName === emergenciesTechFilter);
    }
    if (emergenciesStatusFilter !== "all") {
      entries = entries.filter(e => e.status === emergenciesStatusFilter);
    }
    if (emergenciesPriorityFilter !== "all") {
      entries = entries.filter(e => e.priority === emergenciesPriorityFilter);
    }
    if (emergenciesDateFrom) {
      const fromDate = new Date(emergenciesDateFrom);
      entries = entries.filter(e => e.createdAt && new Date(e.createdAt) >= fromDate);
    }
    if (emergenciesDateTo) {
      const toDate = new Date(emergenciesDateTo);
      toDate.setHours(23, 59, 59, 999);
      entries = entries.filter(e => e.createdAt && new Date(e.createdAt) <= toDate);
    }
    return [...entries].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [emergencies, emergenciesPropertySearch, emergenciesPositionFilter, emergenciesTechFilter,
      emergenciesStatusFilter, emergenciesPriorityFilter, emergenciesDateFrom, emergenciesDateTo]);

  // Filter and group windy entries
  const filteredWindyEntries = useMemo(() => {
    let entries = windyEntries as TechOpsEntry[];
    if (windyPropertyFilter !== "all") {
      entries = entries.filter(e => e.propertyName === windyPropertyFilter);
    }
    if (windyTechFilter !== "all") {
      entries = entries.filter(e => e.technicianName === windyTechFilter);
    }
    return entries;
  }, [windyEntries, windyPropertyFilter, windyTechFilter]);

  // Group filtered windy entries by property
  const windyByProperty = useMemo(() => {
    const groups: Record<string, TechOpsEntry[]> = {};
    filteredWindyEntries.forEach(entry => {
      const key = entry.propertyName || "Unknown Property";
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredWindyEntries]);

  // Stats
  const pendingWindy = (windyEntries as TechOpsEntry[]).filter(e => e.status === "pending").length;
  const pendingIssues = (issueEntries as TechOpsEntry[]).filter(e => e.status === "pending").length;
  const pendingEmergencies = emergencies.filter(e => e.status === "pending_review").length;

  const handleRefresh = () => {
    refetchWindy();
    refetchIssues();
    refetchEmergencies();
  };

  // Handle dismiss (archive) action
  const handleDismiss = (entry: TechOpsEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTechOpsMutation.mutate({ id: entry.id, status: "archived" });
  };

  // Handle send as invoice action
  const handleSendAsInvoice = (entry: TechOpsEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoiceConfirmEntry(entry);
  };

  const confirmSendAsInvoice = () => {
    if (invoiceConfirmEntry) {
      updateTechOpsMutation.mutate(
        { id: invoiceConfirmEntry.id, status: "completed" },
        {
          onSuccess: () => {
            toast({ title: "Invoice sent", description: `Windy day cleanup for ${invoiceConfirmEntry.propertyName} marked as invoiced.` });
            setInvoiceConfirmEntry(null);
          }
        }
      );
    }
  };

  // Handle review action
  const handleReview = (entry: TechOpsEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setReviewModalEntry(entry);
    setReviewPhotoIndex(0);
  };

  // Export report function
  const handleExportReport = () => {
    const entries = filteredWindyEntries;
    
    // Group by technician for summary
    const techSummary: Record<string, { jobs: number; totalAmount: number; totalCommission: number }> = {};
    
    let csvContent = "Property,Technician,Date,Job Amount,Commission %,Commission Amount\n";
    
    entries.forEach(entry => {
      const jobAmount = entry.partsCost || 0;
      const commissionRate = 15; // Default commission rate
      const commissionAmount = Math.round(jobAmount * commissionRate / 100);
      
      const techName = entry.technicianName || "Unknown";
      if (!techSummary[techName]) {
        techSummary[techName] = { jobs: 0, totalAmount: 0, totalCommission: 0 };
      }
      techSummary[techName].jobs += 1;
      techSummary[techName].totalAmount += jobAmount;
      techSummary[techName].totalCommission += commissionAmount;
      
      csvContent += `"${entry.propertyName || "Unknown"}","${techName}","${format(new Date(entry.createdAt || new Date()), "MM/dd/yyyy")}","${formatCurrency(jobAmount)}","${commissionRate}%","${formatCurrency(commissionAmount)}"\n`;
    });
    
    // Add blank line and summary
    csvContent += "\n\nTechnician Summary\n";
    csvContent += "Technician,Total Jobs,Total Amount,Total Commission\n";
    Object.entries(techSummary).forEach(([tech, summary]) => {
      csvContent += `"${tech}","${summary.jobs}","${formatCurrency(summary.totalAmount)}","${formatCurrency(summary.totalCommission)}"\n`;
    });
    
    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `windy_day_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    
    toast({ title: "Report exported", description: "Windy day report has been downloaded." });
  };

  const isLoading = windyLoading || issuesLoading || emergenciesLoading;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Wind className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Service Center</h1>
              <p className="text-sm text-slate-500">Manage windy day cleanups, issues, and emergencies</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
            data-testid="button-refresh-service"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Wind className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{(windyEntries as TechOpsEntry[]).length}</p>
                <p className="text-sm text-slate-500">Windy Day Cleanups</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pendingWindy}</p>
                <p className="text-sm text-slate-500">Pending Cleanups</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{(issueEntries as TechOpsEntry[]).length}</p>
                <p className="text-sm text-slate-500">Reported Issues</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{emergencies.length}</p>
                <p className="text-sm text-slate-500">Emergencies</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="windy" className="data-[state=active]:bg-white gap-2">
              <Wind className="w-4 h-4" />
              Windy Day Clean Up ({(windyEntries as TechOpsEntry[]).length})
            </TabsTrigger>
            <TabsTrigger value="issues" className="data-[state=active]:bg-white gap-2">
              <AlertTriangle className="w-4 h-4" />
              Report Issues ({(issueEntries as TechOpsEntry[]).length})
            </TabsTrigger>
            <TabsTrigger value="emergencies" className="data-[state=active]:bg-white gap-2">
              <AlertCircle className="w-4 h-4" />
              Emergencies ({emergencies.length})
            </TabsTrigger>
          </TabsList>

          {/* Windy Day Clean Up Tab */}
          <TabsContent value="windy" className="mt-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wind className="w-5 h-5 text-orange-600" />
                    Windy Day Clean Up
                  </CardTitle>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select value={windyPropertyFilter} onValueChange={setWindyPropertyFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-windy-property">
                        <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="All Properties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Properties</SelectItem>
                        {uniqueWindyProperties.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={windyTechFilter} onValueChange={setWindyTechFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-windy-tech">
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="All Technicians" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Technicians</SelectItem>
                        {uniqueWindyTechs.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportReport}
                      className="gap-2"
                      data-testid="button-export-windy-report"
                    >
                      <Download className="w-4 h-4" />
                      Export Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {windyLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : windyByProperty.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <Wind className="w-12 h-12 mb-3 opacity-50" />
                    <p>No windy day cleanup entries found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-450px)]">
                    <div className="space-y-4 pr-4">
                      {windyByProperty.map(([propertyName, entries]) => (
                        <div key={propertyName} className="border rounded-lg overflow-hidden">
                          <div className="bg-orange-50 p-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-orange-600" />
                              <span className="font-semibold text-slate-900">{propertyName}</span>
                              <Badge variant="outline" className="text-xs">{entries.length} entries</Badge>
                            </div>
                          </div>
                          <div className="divide-y">
                            {entries.map(entry => {
                              const statusInfo = statusConfig[entry.status || "pending"] || statusConfig.pending;
                              return (
                                <div
                                  key={entry.id}
                                  className="p-4 hover:bg-slate-50 transition-colors"
                                  data-testid={`card-windy-${entry.id}`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <Badge className={cn("text-xs", statusInfo.color)}>
                                          {statusInfo.label}
                                        </Badge>
                                        {entry.priority && entry.priority !== "normal" && (
                                          <Badge className={cn("text-xs", priorityConfig[entry.priority]?.color)}>
                                            {priorityConfig[entry.priority]?.label}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-600 mb-2">{entry.description || "Windy day cleanup"}</p>
                                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                        <span className="flex items-center gap-1 font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded">
                                          <User className="w-3 h-3" />
                                          {entry.technicianName}
                                        </span>
                                        <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                                          <Percent className="w-3 h-3" />
                                          15% Commission
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {formatDate(entry.createdAt)}
                                        </span>
                                        {entry.photos && entry.photos.length > 0 && (
                                          <span className="flex items-center gap-1">
                                            <ImageIcon className="w-3 h-3" />
                                            {entry.photos.length}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {entry.partsCost && entry.partsCost > 0 && (
                                        <span className="font-bold text-emerald-600 mr-2">{formatCurrency(entry.partsCost)}</span>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={(e) => handleReview(entry, e)}
                                        data-testid={`button-review-${entry.id}`}
                                      >
                                        <Eye className="w-3 h-3" />
                                        Review
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 text-slate-600 border-slate-200 hover:bg-slate-100"
                                        onClick={(e) => handleDismiss(entry, e)}
                                        data-testid={`button-dismiss-${entry.id}`}
                                      >
                                        <Archive className="w-3 h-3" />
                                        Dismiss
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={(e) => handleSendAsInvoice(entry, e)}
                                        data-testid={`button-invoice-${entry.id}`}
                                      >
                                        <DollarSign className="w-3 h-3" />
                                        Send as Invoice
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Issues Tab */}
          <TabsContent value="issues" className="mt-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-purple-600" />
                    Report Issues
                    <Badge variant="secondary" className="ml-2">{filteredIssueEntries.length}</Badge>
                  </CardTitle>
                </div>
                {/* Filter Bar */}
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search property or issue title..."
                        value={issuesPropertySearch}
                        onChange={(e) => setIssuesPropertySearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-issues-search"
                      />
                    </div>
                    <Select value={issuesPositionFilter} onValueChange={setIssuesPositionFilter}>
                      <SelectTrigger className="w-[160px]" data-testid="select-issues-position">
                        <Users className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        <SelectItem value="service_technician">Service Tech</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="repair_technician">Repair Tech</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={issuesTechFilter} onValueChange={setIssuesTechFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-issues-tech">
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Technician" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Technicians</SelectItem>
                        {uniqueIssueTechs.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={issuesStatusFilter} onValueChange={setIssuesStatusFilter}>
                      <SelectTrigger className="w-[140px]" data-testid="select-issues-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={issuesPriorityFilter} onValueChange={setIssuesPriorityFilter}>
                      <SelectTrigger className="w-[130px]" data-testid="select-issues-priority">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={issuesTypeFilter} onValueChange={setIssuesTypeFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-issues-type">
                        <SelectValue placeholder="Issue Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="equipment_problem">Equipment Problem</SelectItem>
                        <SelectItem value="safety_concern">Safety Concern</SelectItem>
                        <SelectItem value="access_issue">Access Issue</SelectItem>
                        <SelectItem value="customer_complaint">Customer Complaint</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <Input
                        type="date"
                        value={issuesDateFrom}
                        onChange={(e) => setIssuesDateFrom(e.target.value)}
                        className="w-[140px]"
                        placeholder="From"
                        data-testid="input-issues-date-from"
                      />
                      <span className="text-slate-400">to</span>
                      <Input
                        type="date"
                        value={issuesDateTo}
                        onChange={(e) => setIssuesDateTo(e.target.value)}
                        className="w-[140px]"
                        placeholder="To"
                        data-testid="input-issues-date-to"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIssuesPropertySearch("");
                        setIssuesPositionFilter("all");
                        setIssuesTechFilter("all");
                        setIssuesStatusFilter("all");
                        setIssuesPriorityFilter("all");
                        setIssuesTypeFilter("all");
                        setIssuesDateFrom("");
                        setIssuesDateTo("");
                      }}
                      data-testid="button-issues-clear-filters"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {issuesLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : filteredIssueEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <AlertTriangle className="w-12 h-12 mb-3 opacity-50" />
                    <p>No reported issues found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-500px)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Property / Issue</TableHead>
                          <TableHead>Reported By</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIssueEntries.map(entry => {
                          const statusInfo = statusConfig[entry.status || "pending"] || statusConfig.pending;
                          const prioInfo = priorityConfig[entry.priority || "normal"] || priorityConfig.normal;
                          const posInfo = positionTypeConfig[entry.positionType || "service_technician"] || positionTypeConfig.service_technician;
                          const typeInfo = issueTypeConfig[entry.issueType || "other"] || issueTypeConfig.other;
                          const isExpanded = expandedIssueId === entry.id;
                          
                          return (
                            <React.Fragment key={entry.id}>
                              <TableRow 
                                className="cursor-pointer hover:bg-slate-50"
                                onClick={() => setExpandedIssueId(isExpanded ? null : entry.id)}
                                data-testid={`row-issue-${entry.id}`}
                              >
                                <TableCell>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{entry.propertyName || "Unknown Property"}</div>
                                  <div className="text-sm text-slate-500 truncate max-w-[200px]">
                                    {entry.issueTitle || entry.description?.substring(0, 50) || "No description"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn("text-xs", posInfo.color)}>
                                      {posInfo.label}
                                    </Badge>
                                    <span className="text-sm">{entry.technicianName}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn("text-xs", statusInfo.color)}>
                                    {statusInfo.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn("text-xs", prioInfo.color)}>
                                    {prioInfo.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {typeInfo.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-slate-500">
                                  {format(new Date(entry.createdAt || new Date()), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {entry.photos && entry.photos.length > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        <ImageIcon className="w-3 h-3 mr-1" />
                                        {entry.photos.length}
                                      </Badge>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEntry(entry);
                                        setPhotoIndex(0);
                                      }}
                                      data-testid={`button-view-issue-${entry.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="bg-slate-50">
                                  <TableCell colSpan={8} className="p-4">
                                    <div className="space-y-4">
                                      {/* Full Description */}
                                      <div>
                                        <h4 className="font-medium text-sm text-slate-700 mb-1">Description</h4>
                                        <p className="text-sm text-slate-600 bg-white p-3 rounded border">
                                          {entry.description || "No description provided"}
                                        </p>
                                      </div>
                                      
                                      {/* Photos */}
                                      {entry.photos && entry.photos.length > 0 && (
                                        <div>
                                          <h4 className="font-medium text-sm text-slate-700 mb-2">Photos ({entry.photos.length})</h4>
                                          <div className="flex gap-2 flex-wrap">
                                            {entry.photos.map((photo, idx) => (
                                              <img
                                                key={idx}
                                                src={photo}
                                                alt={`Issue photo ${idx + 1}`}
                                                className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                                data-testid={`img-issue-photo-${entry.id}-${idx}`}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedEntry(entry);
                                                  setPhotoIndex(idx);
                                                }}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Resolution Info */}
                                      {(entry.resolvedBy || entry.resolutionNotes) && (
                                        <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
                                          <h4 className="font-medium text-sm text-emerald-700 mb-1">Resolution</h4>
                                          {entry.resolvedBy && (
                                            <p className="text-sm text-emerald-600">
                                              <span className="font-medium">Resolved by:</span> {entry.resolvedBy}
                                              {entry.resolvedAt && ` on ${format(new Date(entry.resolvedAt), "MMM d, yyyy 'at' h:mm a")}`}
                                            </p>
                                          )}
                                          {entry.resolutionNotes && (
                                            <p className="text-sm text-emerald-600 mt-1">{entry.resolutionNotes}</p>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Action Buttons */}
                                      <div className="flex gap-2 pt-2 border-t">
                                        {entry.status !== "resolved" && entry.status !== "dismissed" && (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-1"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateTechOpsMutation.mutate({ id: entry.id, status: "in_progress" });
                                              }}
                                              data-testid={`button-start-issue-${entry.id}`}
                                            >
                                              <PlayCircle className="w-3 h-3" />
                                              Start Working
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="default"
                                              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateTechOpsMutation.mutate({ id: entry.id, status: "resolved" });
                                              }}
                                              data-testid={`button-resolve-issue-${entry.id}`}
                                            >
                                              <CheckCircle className="w-3 h-3" />
                                              Mark Resolved
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-1 text-slate-600"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateTechOpsMutation.mutate({ id: entry.id, status: "dismissed" });
                                              }}
                                              data-testid={`button-dismiss-issue-${entry.id}`}
                                            >
                                              <XCircle className="w-3 h-3" />
                                              Dismiss
                                            </Button>
                                          </>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEntry(entry);
                                            setPhotoIndex(0);
                                          }}
                                          data-testid={`button-full-details-${entry.id}`}
                                        >
                                          <Eye className="w-3 h-3 mr-1" />
                                          Full Details
                                        </Button>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergencies Tab */}
          <TabsContent value="emergencies" className="mt-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Emergencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {emergenciesLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : emergencies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
                    <p>No emergencies found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-3 pr-4">
                      {emergencies.map(emergency => {
                        const statusInfo = statusConfig[emergency.status || "pending_review"] || statusConfig.pending_review;
                        const prioInfo = priorityConfig[emergency.priority || "normal"] || priorityConfig.normal;
                        return (
                          <div
                            key={emergency.id}
                            className={cn(
                              "p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border-l-4",
                              emergency.priority === "critical" || emergency.priority === "urgent" 
                                ? "border-l-red-500" 
                                : "border-l-amber-500"
                            )}
                            onClick={() => setSelectedEmergency(emergency)}
                            data-testid={`card-emergency-${emergency.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="font-semibold text-slate-900">{emergency.propertyName}</h3>
                                  <Badge className={cn("text-xs", statusInfo.color)}>
                                    {statusInfo.label}
                                  </Badge>
                                  <Badge className={cn("text-xs", prioInfo.color)}>
                                    {prioInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 mb-2">{emergency.description}</p>
                                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {emergency.submittedByName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(emergency.createdAt)}
                                  </span>
                                  {emergency.photos && emergency.photos.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" />
                                      {emergency.photos.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {emergency.totalAmount && emergency.totalAmount > 0 && (
                                  <span className="font-bold text-red-600 mr-2">{formatCurrency(emergency.totalAmount)}</span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    convertEmergencyToEstimateMutation.mutate(emergency.id);
                                  }}
                                  disabled={!!emergency.convertedToEstimateId || !!emergency.convertedToInvoiceId}
                                  data-testid={`button-convert-estimate-${emergency.id}`}
                                >
                                  <FileText className="w-3 h-3" />
                                  Convert to Estimate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-slate-600 border-slate-200 hover:bg-slate-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateEmergencyMutation.mutate({ id: emergency.id, status: "resolved" });
                                  }}
                                  data-testid={`button-dismiss-emergency-${emergency.id}`}
                                >
                                  <Archive className="w-3 h-3" />
                                  Dismiss
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmergencyInvoiceConfirm(emergency);
                                  }}
                                  disabled={!!emergency.convertedToInvoiceId || !!emergency.convertedToEstimateId}
                                  data-testid={`button-invoice-emergency-${emergency.id}`}
                                >
                                  <DollarSign className="w-3 h-3" />
                                  Send Invoice
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* TechOps Entry Detail Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntry?.entryType === "windy_day_cleanup" ? (
                <><Wind className="w-5 h-5 text-orange-600" /> Windy Day Cleanup Details</>
              ) : (
                <><AlertTriangle className="w-5 h-5 text-purple-600" /> Report Issue Details</>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Property</p>
                  <p className="font-medium">{selectedEntry.propertyName || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Submitted By</p>
                  <p className="font-medium">{selectedEntry.technicianName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{formatDate(selectedEntry.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={cn("text-xs", statusConfig[selectedEntry.status || "pending"]?.color)}>
                    {statusConfig[selectedEntry.status || "pending"]?.label}
                  </Badge>
                </div>
              </div>

              {selectedEntry.description && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Description</p>
                  <p className="p-3 bg-slate-50 rounded-lg border">{selectedEntry.description}</p>
                </div>
              )}

              {selectedEntry.notes && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Notes</p>
                  <p className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800">
                    {selectedEntry.notes}
                  </p>
                </div>
              )}

              {selectedEntry.partsCost && selectedEntry.partsCost > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Parts Cost</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(selectedEntry.partsCost)}</p>
                </div>
              )}

              {selectedEntry.photos && selectedEntry.photos.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Photos ({selectedEntry.photos.length})</p>
                  <div className="relative">
                    <img
                      src={selectedEntry.photos[photoIndex]}
                      alt={`Photo ${photoIndex + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    {selectedEntry.photos.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {selectedEntry.photos.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPhotoIndex(idx)}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              idx === photoIndex ? "bg-white" : "bg-white/50"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedEntry.status === "pending" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      updateTechOpsMutation.mutate({ id: selectedEntry.id, status: "completed" });
                      setSelectedEntry(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Completed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateTechOpsMutation.mutate({ id: selectedEntry.id, status: "reviewed" });
                      setSelectedEntry(null);
                    }}
                  >
                    Mark Reviewed
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEntry(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Detail Modal */}
      <Dialog open={!!selectedEmergency} onOpenChange={() => setSelectedEmergency(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Emergency Details
            </DialogTitle>
          </DialogHeader>
          {selectedEmergency && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Property</p>
                  <p className="font-medium">{selectedEmergency.propertyName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Submitted By</p>
                  <p className="font-medium">{selectedEmergency.submittedByName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{formatDate(selectedEmergency.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={cn("text-xs", statusConfig[selectedEmergency.status || "pending_review"]?.color)}>
                    {statusConfig[selectedEmergency.status || "pending_review"]?.label}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Description</p>
                <p className="p-3 bg-red-50 rounded-lg border border-red-200">{selectedEmergency.description}</p>
              </div>

              {selectedEmergency.totalAmount && selectedEmergency.totalAmount > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total Amount</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(selectedEmergency.totalAmount)}</p>
                </div>
              )}

              {selectedEmergency.resolutionNotes && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Resolution Notes</p>
                  <p className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800">
                    {selectedEmergency.resolutionNotes}
                  </p>
                </div>
              )}

              {selectedEmergency.photos && selectedEmergency.photos.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Photos ({selectedEmergency.photos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedEmergency.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedEmergency.status === "pending_review" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => updateEmergencyMutation.mutate({ id: selectedEmergency.id, status: "in_progress" })}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start Working
                  </Button>
                  <Button
                    onClick={() => updateEmergencyMutation.mutate({ id: selectedEmergency.id, status: "resolved" })}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </Button>
                </div>
              )}

              {selectedEmergency.status === "in_progress" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => updateEmergencyMutation.mutate({ id: selectedEmergency.id, status: "resolved" })}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEmergency(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Windy Day Review Modal */}
      <Dialog open={!!reviewModalEntry} onOpenChange={() => setReviewModalEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-orange-600" />
              Windy Day Cleanup Details
            </DialogTitle>
            <DialogDescription>
              Full submission details and attached photos
            </DialogDescription>
          </DialogHeader>
          {reviewModalEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Property</p>
                  <p className="font-medium text-slate-900">{reviewModalEntry.propertyName || "Unknown Property"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Submitted By</p>
                  <p className="font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded inline-block">
                    {reviewModalEntry.technicianName || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date/Time</p>
                  <p className="font-medium">{formatDate(reviewModalEntry.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={cn("text-xs", statusConfig[reviewModalEntry.status || "pending"]?.color)}>
                    {statusConfig[reviewModalEntry.status || "pending"]?.label}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Description</p>
                <p className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  {reviewModalEntry.description || "No description provided"}
                </p>
              </div>

              {reviewModalEntry.partsCost && reviewModalEntry.partsCost > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Job Amount</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(reviewModalEntry.partsCost)}</p>
                </div>
              )}

              {/* Photo Gallery */}
              {reviewModalEntry.photos && reviewModalEntry.photos.length > 0 ? (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Photos ({reviewModalEntry.photos.length})</p>
                  <div className="relative">
                    <img
                      src={reviewModalEntry.photos[reviewPhotoIndex]}
                      alt={`Photo ${reviewPhotoIndex + 1}`}
                      className="w-full h-72 object-cover rounded-lg border"
                    />
                    {reviewModalEntry.photos.length > 1 && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute left-2 top-1/2 -translate-y-1/2"
                          onClick={() => setReviewPhotoIndex(prev => prev > 0 ? prev - 1 : reviewModalEntry.photos!.length - 1)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setReviewPhotoIndex(prev => prev < reviewModalEntry.photos!.length - 1 ? prev + 1 : 0)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {reviewModalEntry.photos.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setReviewPhotoIndex(idx)}
                              className={cn(
                                "w-2.5 h-2.5 rounded-full transition-all",
                                idx === reviewPhotoIndex ? "bg-white shadow-lg" : "bg-white/50"
                              )}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Thumbnail strip */}
                  {reviewModalEntry.photos.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                      {reviewModalEntry.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Thumbnail ${idx + 1}`}
                          onClick={() => setReviewPhotoIndex(idx)}
                          className={cn(
                            "w-16 h-16 object-cover rounded cursor-pointer border-2 transition-all",
                            idx === reviewPhotoIndex ? "border-orange-500" : "border-transparent opacity-70 hover:opacity-100"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                  <p className="text-slate-500">No photos attached</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {reviewModalEntry.status === "pending" && (
                  <>
                    <Button
                      onClick={() => {
                        updateTechOpsMutation.mutate({ id: reviewModalEntry.id, status: "completed" });
                        setReviewModalEntry(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Completed
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateTechOpsMutation.mutate({ id: reviewModalEntry.id, status: "archived" });
                        setReviewModalEntry(null);
                      }}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Dismiss
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewModalEntry(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Confirmation Dialog */}
      <AlertDialog open={!!invoiceConfirmEntry} onOpenChange={() => setInvoiceConfirmEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send as Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send this windy day cleanup as an invoice?
              {invoiceConfirmEntry && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <p><strong>Property:</strong> {invoiceConfirmEntry.propertyName}</p>
                  <p><strong>Technician:</strong> {invoiceConfirmEntry.technicianName}</p>
                  {invoiceConfirmEntry.partsCost && invoiceConfirmEntry.partsCost > 0 && (
                    <p><strong>Amount:</strong> {formatCurrency(invoiceConfirmEntry.partsCost)}</p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSendAsInvoice}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Emergency Invoice Confirmation Dialog */}
      <AlertDialog open={!!emergencyInvoiceConfirm} onOpenChange={() => setEmergencyInvoiceConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send an invoice for this emergency?
              {emergencyInvoiceConfirm && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p><strong>Property:</strong> {emergencyInvoiceConfirm.propertyName}</p>
                  <p><strong>Submitted By:</strong> {emergencyInvoiceConfirm.submittedByName}</p>
                  <p className="text-sm text-slate-600 mt-2">{emergencyInvoiceConfirm.description}</p>
                  {emergencyInvoiceConfirm.totalAmount && emergencyInvoiceConfirm.totalAmount > 0 && (
                    <p className="mt-2"><strong>Amount:</strong> <span className="text-red-600 font-bold">{formatCurrency(emergencyInvoiceConfirm.totalAmount)}</span></p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (emergencyInvoiceConfirm) {
                  invoiceEmergencyDirectlyMutation.mutate(emergencyInvoiceConfirm.id);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
