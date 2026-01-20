import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wrench, Loader2, CheckCircle, Clock, AlertTriangle,
  User, MapPin, DollarSign, Calendar, Eye, Users, TrendingUp, Target, FileText, MoreVertical, CalendarDays,
  Download, X, AlertCircle, Package, Search, Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Image, Camera
} from "lucide-react";
import type { ServiceRepairJob, Technician, Emergency } from "@shared/schema";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-[#FF8000]1A text-[#D35400] border-[#FF8000]33", icon: Clock, label: "Pending" },
  assigned: { color: "bg-[#0078D4]1A text-[#0078D4] border-[#0078D4]33", icon: User, label: "Assigned" },
  in_progress: { color: "bg-[#17BEBB]1A text-[#0D9488] border-[#17BEBB]33", icon: Wrench, label: "In Progress" },
  completed: { color: "bg-[#22D69A]1A text-[#22D69A] border-[#22D69A]33", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertTriangle, label: "Cancelled" },
  estimated: { color: "bg-[#17BEBB]1A text-[#0D9488] border-[#17BEBB]33", icon: DollarSign, label: "Estimated" },
  batched: { color: "bg-[#0078D4]1A text-[#0078D4] border-[#0078D4]33", icon: Target, label: "Batched" },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: "bg-slate-100 text-slate-600", label: "Low" },
  normal: { color: "bg-blue-100 text-blue-600", label: "Normal" },
  high: { color: "bg-orange-100 text-orange-600", label: "High" },
  urgent: { color: "bg-red-100 text-red-600", label: "Urgent" },
  critical: { color: "bg-red-200 text-red-700", label: "Critical" },
};

const defaultStatus = { color: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock, label: "Unknown" };

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "$0.00";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function RepairQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("by-tech");
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedRepairForReassign, setSelectedRepairForReassign] = useState<ServiceRepairJob | null>(null);
  const [newTechId, setNewTechId] = useState<string>("");

  // Filter states
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [propertySearch, setPropertySearch] = useState<string>("");

  // Table states for sorting and pagination
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [tableSearch, setTableSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const { data: repairs = [], isLoading } = useQuery<ServiceRepairJob[]>({
    queryKey: ["service-repairs"],
    queryFn: async () => {
      const response = await fetch("/api/service-repairs");
      if (!response.ok) throw new Error("Failed to fetch repairs");
      return response.json();
    },
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["technicians"],
    queryFn: async () => {
      const response = await fetch("/api/technicians?role=repair_tech");
      if (!response.ok) throw new Error("Failed to fetch technicians");
      return response.json();
    },
  });

  const { data: emergencies = [] } = useQuery<Emergency[]>({
    queryKey: ["emergencies"],
    queryFn: async () => {
      const response = await fetch("/api/emergencies");
      if (!response.ok) throw new Error("Failed to fetch emergencies");
      return response.json();
    },
  });

  // Get unique properties for filter dropdown
  const uniqueProperties = useMemo(() => {
    const props = new Set<string>();
    repairs.forEach(r => r.propertyName && props.add(r.propertyName));
    return Array.from(props).sort();
  }, [repairs]);

  // Filtered properties based on search
  const filteredProperties = useMemo(() => {
    if (!propertySearch) return uniqueProperties;
    return uniqueProperties.filter(p => 
      p.toLowerCase().includes(propertySearch.toLowerCase())
    );
  }, [uniqueProperties, propertySearch]);

  // Get unique technicians for filter dropdown
  const uniqueTechs = useMemo(() => {
    const techs = new Set<string>();
    repairs.forEach(r => r.technicianName && techs.add(r.technicianName));
    return Array.from(techs).sort();
  }, [repairs]);

  // Apply all filters to repairs
  const filteredRepairs = useMemo(() => {
    return repairs.filter(repair => {
      // Property filter
      if (propertyFilter && repair.propertyName !== propertyFilter) {
        return false;
      }
      // Tech filter
      if (techFilter !== "all" && repair.technicianName !== techFilter) {
        return false;
      }
      // Status filter - treat "pending" filter as including both "pending" and "assigned" statuses
      if (statusFilter !== "all") {
        if (statusFilter === "pending") {
          if (repair.status !== "pending" && repair.status !== "assigned") return false;
        } else if (repair.status !== statusFilter) {
          return false;
        }
      }
      // Date range filter
      if (dateFromFilter) {
        const repairDate = new Date(repair.jobDate || repair.createdAt || "");
        const fromDate = new Date(dateFromFilter);
        if (repairDate < fromDate) return false;
      }
      if (dateToFilter) {
        const repairDate = new Date(repair.jobDate || repair.createdAt || "");
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999);
        if (repairDate > toDate) return false;
      }
      return true;
    });
  }, [repairs, propertyFilter, techFilter, statusFilter, dateFromFilter, dateToFilter]);

  // Filter emergencies - map repair status filters to emergency statuses
  const filteredEmergencies = useMemo(() => {
    return emergencies.filter(emergency => {
      if (propertyFilter && emergency.propertyName !== propertyFilter) return false;
      // Map repair status filter to emergency status filter
      if (statusFilter !== "all") {
        // Emergency statuses: pending_review, in_progress, resolved
        // Map repair statuses to emergency statuses
        const statusMapping: Record<string, string[]> = {
          pending: ["pending_review"],
          assigned: ["pending_review"],
          in_progress: ["in_progress"],
          completed: ["resolved"],
        };
        const mappedStatuses = statusMapping[statusFilter] || [];
        if (mappedStatuses.length > 0 && !mappedStatuses.includes(emergency.status)) {
          return false;
        }
      }
      if (priorityFilter !== "all" && emergency.priority !== priorityFilter) return false;
      if (dateFromFilter) {
        const date = new Date(emergency.createdAt || "");
        if (date < new Date(dateFromFilter)) return false;
      }
      if (dateToFilter) {
        const date = new Date(emergency.createdAt || "");
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999);
        if (date > toDate) return false;
      }
      return true;
    });
  }, [emergencies, propertyFilter, statusFilter, priorityFilter, dateFromFilter, dateToFilter]);

  const clearFilters = () => {
    setPropertyFilter("");
    setTechFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setPropertySearch("");
  };

  const hasActiveFilters = propertyFilter || techFilter !== "all" || dateFromFilter || dateToFilter || statusFilter !== "all" || priorityFilter !== "all";

  // Derive status-specific arrays from filtered repairs
  const pendingRepairs = useMemo(() => 
    filteredRepairs.filter(r => r.status === "pending" || r.status === "assigned"), 
    [filteredRepairs]
  );
  const inProgressRepairs = useMemo(() => 
    filteredRepairs.filter(r => r.status === "in_progress"), 
    [filteredRepairs]
  );
  const completedRepairs = useMemo(() => 
    filteredRepairs.filter(r => r.status === "completed"), 
    [filteredRepairs]
  );

  // Export functionality
  const exportToCSV = () => {
    const dataToExport = filteredRepairs;
    
    const headers = [
      "Job Title",
      "Property Name",
      "Address",
      "Assigned Tech",
      "Priority",
      "Status",
      "Date Assigned",
      "Date Completed",
      "Notes"
    ];

    const rows = dataToExport.map(repair => [
      repair.description || repair.jobNumber || "",
      repair.propertyName || "",
      repair.address || "",
      repair.technicianName || "Unassigned",
      "normal",
      statusConfig[repair.status || "pending"]?.label || repair.status || "",
      formatDate(repair.jobDate || repair.createdAt),
      repair.status === "completed" ? formatDate(repair.updatedAt) : "",
      (repair.notes || "").replace(/,/g, ";").replace(/\n/g, " ")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `repair_queue_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({ title: "Export Complete", description: `Exported ${dataToExport.length} repair jobs to CSV` });
  };

  const repairsByTech = useMemo(() => {
    const grouped: Record<string, { tech: string; repairs: ServiceRepairJob[]; pending: number; inProgress: number; completed: number; totalValue: number }> = {};
    
    filteredRepairs.forEach(repair => {
      const techName = repair.technicianName || "Unassigned";
      if (!grouped[techName]) {
        grouped[techName] = { tech: techName, repairs: [], pending: 0, inProgress: 0, completed: 0, totalValue: 0 };
      }
      grouped[techName].repairs.push(repair);
      grouped[techName].totalValue += repair.totalAmount || 0;
      if (repair.status === "pending" || repair.status === "assigned") grouped[techName].pending++;
      else if (repair.status === "in_progress") grouped[techName].inProgress++;
      else if (repair.status === "completed") grouped[techName].completed++;
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.tech === "Unassigned") return 1;
      if (b.tech === "Unassigned") return -1;
      return (b.pending + b.inProgress) - (a.pending + a.inProgress);
    });
  }, [filteredRepairs]);

  const dashboardMetrics = useMemo(() => {
    // Compute filtered status arrays inline to avoid dependency issues
    const pending = filteredRepairs.filter(r => r.status === "pending" || r.status === "assigned");
    const inProgress = filteredRepairs.filter(r => r.status === "in_progress");
    const completed = filteredRepairs.filter(r => r.status === "completed");
    
    const totalValue = filteredRepairs.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const pendingValue = pending.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const inProgressValue = inProgress.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const completedValue = completed.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const activeTechs = repairsByTech.filter(t => t.tech !== "Unassigned" && (t.pending > 0 || t.inProgress > 0)).length;
    const avgPerTech = activeTechs > 0 ? (pending.length + inProgress.length) / activeTechs : 0;

    return {
      totalJobs: filteredRepairs.length,
      pending: pending.length,
      inProgress: inProgress.length,
      completed: completed.length,
      totalValue,
      pendingValue,
      inProgressValue,
      completedValue,
      activeTechs,
      avgPerTech: Math.round(avgPerTech * 10) / 10,
    };
  }, [filteredRepairs, repairsByTech]);

  // Sort toggle function
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Sort indicator component
  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ChevronDown className="w-4 h-4 opacity-30" />;
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  // Sorted and paginated completed repairs with search
  const sortedCompletedRepairs = useMemo(() => {
    let sorted = completedRepairs.filter(r => {
      if (!tableSearch) return true;
      const search = tableSearch.toLowerCase();
      return (r.propertyName?.toLowerCase().includes(search) ||
              r.description?.toLowerCase().includes(search) ||
              r.technicianName?.toLowerCase().includes(search) ||
              r.notes?.toLowerCase().includes(search));
    });

    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortColumn) {
        case "date":
          aVal = new Date(a.updatedAt || a.createdAt || 0).getTime();
          bVal = new Date(b.updatedAt || b.createdAt || 0).getTime();
          break;
        case "property":
          aVal = a.propertyName || "";
          bVal = b.propertyName || "";
          break;
        case "tech":
          aVal = a.technicianName || "";
          bVal = b.technicianName || "";
          break;
        case "value":
          aVal = a.totalAmount || 0;
          bVal = b.totalAmount || 0;
          break;
        default:
          aVal = a.updatedAt || a.createdAt || "";
          bVal = b.updatedAt || b.createdAt || "";
      }
      if (typeof aVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [completedRepairs, tableSearch, sortColumn, sortDirection]);

  const paginatedCompletedRepairs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCompletedRepairs.slice(start, start + pageSize);
  }, [sortedCompletedRepairs, currentPage, pageSize]);

  const completedTotalPages = Math.ceil(sortedCompletedRepairs.length / pageSize);

  // Sorted and paginated emergencies with search
  const sortedEmergencies = useMemo(() => {
    let sorted = filteredEmergencies.filter(e => {
      if (!tableSearch) return true;
      const search = tableSearch.toLowerCase();
      return (e.propertyName?.toLowerCase().includes(search) ||
              e.description?.toLowerCase().includes(search) ||
              e.submittedByName?.toLowerCase().includes(search) ||
              e.resolutionNotes?.toLowerCase().includes(search));
    });

    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortColumn) {
        case "date":
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        case "property":
          aVal = a.propertyName || "";
          bVal = b.propertyName || "";
          break;
        case "priority":
          const priorityOrder = { critical: 4, urgent: 3, high: 2, normal: 1, low: 0 };
          aVal = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bVal = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        default:
          aVal = a.createdAt || "";
          bVal = b.createdAt || "";
      }
      if (typeof aVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [filteredEmergencies, tableSearch, sortColumn, sortDirection]);

  const paginatedEmergencies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEmergencies.slice(start, start + pageSize);
  }, [sortedEmergencies, currentPage, pageSize]);

  const emergenciesTotalPages = Math.ceil(sortedEmergencies.length / pageSize);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/service-repairs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({ title: "Status Updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const { data: repairTechs = [] } = useQuery<any[]>({
    queryKey: ["repair-technicians"],
    queryFn: async () => {
      const response = await fetch("/api/technicians/repair");
      if (!response.ok) throw new Error("Failed to fetch repair technicians");
      return response.json();
    },
  });

  const { data: estimates = [] } = useQuery<any[]>({
    queryKey: ["estimates-for-repair-queue"],
    queryFn: async () => {
      const response = await fetch("/api/estimates");
      if (!response.ok) throw new Error("Failed to fetch estimates");
      const data = await response.json();
      return data.estimates || [];
    },
  });

  const estimatesFromRepairs = useMemo(() => {
    return estimates
      .filter((e: any) => e.sourceServiceRepairId || e.repairTechName)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [estimates]);

  // Sorted and paginated estimates with search
  const sortedEstimates = useMemo(() => {
    let sorted = estimatesFromRepairs.filter((e: any) => {
      if (!tableSearch) return true;
      const search = tableSearch.toLowerCase();
      return (e.propertyName?.toLowerCase().includes(search) ||
              e.title?.toLowerCase().includes(search) ||
              e.repairTechName?.toLowerCase().includes(search) ||
              e.description?.toLowerCase().includes(search));
    });

    sorted.sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      switch (sortColumn) {
        case "date":
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        case "property":
          aVal = a.propertyName || "";
          bVal = b.propertyName || "";
          break;
        case "value":
          aVal = a.totalAmount || 0;
          bVal = b.totalAmount || 0;
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        default:
          aVal = a.createdAt || "";
          bVal = b.createdAt || "";
      }
      if (typeof aVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [estimatesFromRepairs, tableSearch, sortColumn, sortDirection]);

  const paginatedEstimates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEstimates.slice(start, start + pageSize);
  }, [sortedEstimates, currentPage, pageSize]);

  const estimatesTotalPages = Math.ceil(sortedEstimates.length / pageSize);

  // Export functions for each tab
  const exportCompletedToCSV = () => {
    const headers = ["Date Completed", "Property Name", "Job Description", "Repair Tech", "Total Value", "Notes"];
    const rows = sortedCompletedRepairs.map(r => [
      formatDate(r.updatedAt),
      r.propertyName || "",
      r.description || "",
      r.technicianName || "",
      formatCurrency(r.totalAmount),
      (r.notes || "").replace(/,/g, ";").replace(/\n/g, " ")
    ]);
    downloadCSV("completed_jobs", headers, rows);
  };

  const exportEmergenciesToCSV = () => {
    const headers = ["Date Submitted", "Property Name", "Description", "Submitted By", "Role", "Priority", "Status", "Resolution Notes", "Resolved By", "Date Resolved"];
    const rows = sortedEmergencies.map(e => [
      formatDate(e.createdAt),
      e.propertyName || "",
      (e.description || "").replace(/,/g, ";").replace(/\n/g, " "),
      e.submittedByName || "",
      e.submitterRole || "",
      e.priority || "normal",
      e.status || "",
      (e.resolutionNotes || "").replace(/,/g, ";").replace(/\n/g, " "),
      e.resolvedByName || "",
      formatDate(e.resolvedAt)
    ]);
    downloadCSV("emergencies", headers, rows);
  };

  const exportEstimatesToCSV = () => {
    const headers = ["Date Submitted", "Property Name", "Title", "Submitted By", "Line Items", "Total Amount", "Status", "Source"];
    const rows = sortedEstimates.map((e: any) => [
      formatDate(e.createdAt),
      e.propertyName || "",
      e.title || "",
      e.repairTechName || e.createdByTechName || "",
      (e.items?.length || 0).toString(),
      formatCurrency(e.totalAmount),
      e.status || "",
      e.sourceType || "office_staff"
    ]);
    downloadCSV("estimates", headers, rows);
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "Export Complete", description: `Exported ${rows.length} records to CSV` });
  };

  // Reset state when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setTableSearch("");
    setExpandedRow(null);
    setSortColumn("date");
    setSortDirection("desc");
  };

  const reassignMutation = useMutation({
    mutationFn: async ({ repairId, estimateId, techId, techName }: { repairId: string; estimateId: string | null; techId: number; techName: string }) => {
      const repairResponse = await fetch(`/api/service-repairs/${repairId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: techId, technicianName: techName }),
      });
      if (!repairResponse.ok) throw new Error("Failed to update repair");
      
      if (estimateId) {
        const estimateResponse = await fetch(`/api/estimates/${estimateId}/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repairTechId: techId, repairTechName: techName }),
        });
        if (!estimateResponse.ok) throw new Error("Failed to update estimate");
      }
      return repairResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      setReassignModalOpen(false);
      setSelectedRepairForReassign(null);
      setNewTechId("");
      toast({ title: "Job Reassigned", description: "Technician updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reassign job", variant: "destructive" });
    },
  });

  const moveToNeedsSchedulingMutation = useMutation({
    mutationFn: async ({ repairId, estimateId }: { repairId: string; estimateId: string | null }) => {
      const repairResponse = await fetch(`/api/service-repairs/${repairId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: null, technicianName: null, status: "pending" }),
      });
      if (!repairResponse.ok) throw new Error("Failed to update repair");
      
      if (estimateId) {
        const estimateResponse = await fetch(`/api/estimates/${estimateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            status: "needs_scheduling",
            repairTechId: null, 
            repairTechName: null, 
            scheduledDate: null 
          }),
        });
        if (!estimateResponse.ok) throw new Error("Failed to update estimate");
      }
      return repairResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({ title: "Moved to Needs Scheduling", description: "Job is now unassigned and awaiting scheduling" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to move job", variant: "destructive" });
    },
  });

  const openReassignModal = (repair: ServiceRepairJob) => {
    setSelectedRepairForReassign(repair);
    setNewTechId("");
    setReassignModalOpen(true);
  };

  const handleReassign = () => {
    if (!selectedRepairForReassign || !newTechId) return;
    const tech = repairTechs.find(t => t.id.toString() === newTechId);
    if (!tech) return;
    
    reassignMutation.mutate({
      repairId: selectedRepairForReassign.id,
      estimateId: selectedRepairForReassign.estimateId,
      techId: parseInt(newTechId),
      techName: tech.name,
    });
  };

  const renderRepairCard = (repair: ServiceRepairJob) => {
    const statusCfg = statusConfig[repair.status || "pending"] || defaultStatus;
    const StatusIcon = statusCfg.icon;

    return (
      <div
        key={repair.id}
        className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all"
        data-testid={`repair-item-${repair.id}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#0078D4]">
              {repair.jobNumber || "—"}
            </span>
            <Badge className={statusCfg.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusCfg.label}
            </Badge>
          </div>
          <span className="text-lg font-bold text-[#1E293B]">
            {formatCurrency(repair.totalAmount)}
          </span>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{repair.propertyName || "No property"}</span>
          </div>
          {repair.technicianName && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="w-4 h-4 text-slate-400" />
              <span>{repair.technicianName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{formatDate(repair.jobDate)}</span>
          </div>
        </div>

        {repair.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{repair.description}</p>
        )}

        {repair.estimateId && (
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-[#0078D4]1A text-[#0078D4] border-[#0078D4]33 text-xs">
              <FileText className="w-3 h-3 mr-1" />
              From Estimate
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          {repair.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              className="text-[#0078D4] hover:text-[#0078D4] hover:bg-[#0078D4]1A"
              onClick={() => updateStatusMutation.mutate({ id: repair.id, status: "in_progress" })}
              data-testid={`button-start-${repair.id}`}
            >
              <Wrench className="w-4 h-4 mr-1" /> Start Work
            </Button>
          )}
          {repair.status === "in_progress" && (
            <Button
              size="sm"
              variant="outline"
              className="text-[#22D69A] hover:text-[#22D69A] hover:bg-[#22D69A]1A"
              onClick={() => updateStatusMutation.mutate({ id: repair.id, status: "completed" })}
              data-testid={`button-complete-${repair.id}`}
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Complete
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            data-testid={`button-view-${repair.id}`}
          >
            <Eye className="w-4 h-4 mr-1" /> View
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                data-testid={`button-more-${repair.id}`}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openReassignModal(repair)}>
                <Users className="w-4 h-4 mr-2" />
                Reassign to Another Tech
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => moveToNeedsSchedulingMutation.mutate({ 
                  repairId: repair.id, 
                  estimateId: repair.estimateId 
                })}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Move to Needs Scheduling
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const renderTechCard = (techData: { tech: string; repairs: ServiceRepairJob[]; pending: number; inProgress: number; completed: number; totalValue: number }) => {
    const totalActive = techData.pending + techData.inProgress;
    const completionRate = techData.repairs.length > 0 ? Math.round((techData.completed / techData.repairs.length) * 100) : 0;

    return (
      <Card
        key={techData.tech}
        className={`cursor-pointer transition-all hover:shadow-lg ${selectedTech === techData.tech ? 'ring-2 ring-[#0078D4] shadow-lg' : ''}`}
        onClick={() => setSelectedTech(selectedTech === techData.tech ? null : techData.tech)}
        data-testid={`tech-card-${techData.tech.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={techData.tech === "Unassigned" ? "bg-slate-200 text-slate-600" : "bg-[#0078D4] text-white"}>
                {getInitials(techData.tech)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#1E293B] truncate">{techData.tech}</h3>
              <p className="text-xs text-slate-500">{totalActive} active jobs</p>
            </div>
            {totalActive > 0 && (
              <Badge className="bg-[#FF8000]/10 text-[#D35400] border-[#FF8000]/20">
                {totalActive}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-[#FF8000]1A rounded-lg">
              <div className="text-lg font-bold text-[#D35400]">{techData.pending}</div>
              <div className="text-xs text-[#D35400]">Pending</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-[#0D9488]">{techData.inProgress}</div>
              <div className="text-xs text-[#0D9488]">In Progress</div>
            </div>
            <div className="text-center p-2 bg-[#22D69A]1A rounded-lg">
              <div className="text-lg font-bold text-[#22D69A]">{techData.completed}</div>
              <div className="text-xs text-[#22D69A]">Completed</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Value</span>
              <span className="font-semibold text-[#1E293B]">{formatCurrency(techData.totalValue)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Completion</span>
              <span className="font-medium text-[#22D69A]">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmergencyRow = (emergency: Emergency) => {
    const priorityCfg = priorityConfig[emergency.priority || "normal"] || priorityConfig.normal;
    const emergencyStatusConfig: Record<string, { color: string; label: string }> = {
      pending_review: { color: "bg-orange-100 text-orange-600", label: "Pending Review" },
      in_progress: { color: "bg-blue-100 text-blue-600", label: "In Progress" },
      resolved: { color: "bg-green-100 text-green-600", label: "Resolved" },
    };
    const statusCfg = emergencyStatusConfig[emergency.status] || emergencyStatusConfig.pending_review;

    return (
      <div
        key={emergency.id}
        className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all"
        data-testid={`emergency-item-${emergency.id}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <Badge className={priorityCfg.color}>
              {priorityCfg.label}
            </Badge>
            <Badge className={statusCfg.color}>
              {statusCfg.label}
            </Badge>
          </div>
          <span className="text-lg font-bold text-[#1E293B]">
            {formatCurrency(emergency.totalAmount)}
          </span>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{emergency.propertyName || "No property"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="w-4 h-4 text-slate-400" />
            <span>Submitted by: {emergency.submittedByName || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{formatDateTime(emergency.createdAt)}</span>
          </div>
        </div>

        {emergency.description && (
          <p className="text-sm text-slate-600 line-clamp-2">{emergency.description}</p>
        )}
      </div>
    );
  };

  // Filters panel component
  const FiltersPanel = () => (
    <Card className="bg-white border border-slate-200 shadow-sm sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-[#1E293B] flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Property</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search properties..."
              value={propertySearch}
              onChange={(e) => setPropertySearch(e.target.value)}
              className="pl-8 mb-2"
              data-testid="input-property-search"
            />
          </div>
          <Select value={propertyFilter || "all"} onValueChange={(val) => setPropertyFilter(val === "all" ? "" : val)}>
            <SelectTrigger data-testid="select-property-filter">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {filteredProperties.map(prop => (
                <SelectItem key={prop} value={prop}>{prop}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Repair Tech</Label>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger data-testid="select-tech-filter">
              <SelectValue placeholder="All Technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {uniqueTechs.map(tech => (
                <SelectItem key={tech} value={tech}>{tech}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Date Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-500">From</Label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">To</Label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="select-status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending (incl. Assigned)</SelectItem>
              <SelectItem value="assigned">Assigned Only</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Priority</Label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger data-testid="select-priority-filter">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={clearFilters}
            data-testid="button-clear-filters"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#FF8000]/10 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#D35400]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading-repairqueue">Repair Queue</h1>
              <p className="text-slate-500 text-sm">Manage repairs assigned to Repair Techs</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="text-[#0078D4] border-[#0078D4] hover:bg-[#0078D4]/10"
              data-testid="button-export"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FF8000]1A rounded-lg border border-[#FF8000]33" data-testid="badge-pending-count">
              <Clock className="w-4 h-4 text-[#D35400]" />
              <span className="text-sm font-medium text-[#D35400]">{pendingRepairs.length} Pending</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-[#17BEBB]33" data-testid="badge-inprogress-count">
              <Wrench className="w-4 h-4 text-[#0D9488]" />
              <span className="text-sm font-medium text-[#0D9488]">{inProgressRepairs.length} In Progress</span>
            </div>
          </div>
        </div>

        {/* Dashboard Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" data-testid="dashboard-metrics">
          <Card className="bg-gradient-to-br from-[#0078D4] to-[#3B82F6] text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">Total Jobs</span>
              </div>
              <div className="text-2xl font-bold">{dashboardMetrics.totalJobs}</div>
              <div className="text-xs opacity-80">{formatCurrency(dashboardMetrics.totalValue)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#FF8000] to-[#FF8000] text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">Pending</span>
              </div>
              <div className="text-2xl font-bold">{dashboardMetrics.pending}</div>
              <div className="text-xs opacity-80">{formatCurrency(dashboardMetrics.pendingValue)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#17BEBB] to-[#17BEBB] text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">In Progress</span>
              </div>
              <div className="text-2xl font-bold">{dashboardMetrics.inProgress}</div>
              <div className="text-xs opacity-80">{formatCurrency(dashboardMetrics.inProgressValue)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#22D69A] to-[#22D69A] text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">Completed</span>
              </div>
              <div className="text-2xl font-bold">{dashboardMetrics.completed}</div>
              <div className="text-xs opacity-80">{formatCurrency(dashboardMetrics.completedValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#0078D4]" />
                <span className="text-sm text-slate-600">Active Techs</span>
              </div>
              <div className="text-2xl font-bold text-[#1E293B]">{dashboardMetrics.activeTechs}</div>
              <div className="text-xs text-slate-500">with assigned jobs</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[#D35400]" />
                <span className="text-sm text-slate-600">Avg per Tech</span>
              </div>
              <div className="text-2xl font-bold text-[#1E293B]">{dashboardMetrics.avgPerTech}</div>
              <div className="text-xs text-slate-500">active jobs</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="by-tech" data-testid="tab-by-tech">
              <Users className="w-4 h-4 mr-2" /> By Technician
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingRepairs.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" data-testid="tab-in-progress">
              In Progress ({inProgressRepairs.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed ({completedRepairs.length})
            </TabsTrigger>
            <TabsTrigger value="estimates-log" data-testid="tab-estimates-log">
              <FileText className="w-4 h-4 mr-2" /> Estimates Log ({estimatesFromRepairs.length})
            </TabsTrigger>
            <TabsTrigger value="emergencies" data-testid="tab-emergencies">
              <AlertCircle className="w-4 h-4 mr-2" /> Emergencies ({emergencies.length})
            </TabsTrigger>
            <TabsTrigger value="parts-ordered" data-testid="tab-parts-ordered">
              <Package className="w-4 h-4 mr-2" /> Parts Ordered
            </TabsTrigger>
          </TabsList>

          <TabsContent value="by-tech" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#0078D4]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <h3 className="font-semibold text-[#1E293B] mb-3">Repair Technicians</h3>
                  <div className="space-y-3">
                    {repairsByTech.map(renderTechCard)}
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-[#1E293B]">
                        {selectedTech ? `${selectedTech}'s Jobs` : "All Active Jobs"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[550px]">
                        {(selectedTech 
                          ? repairsByTech.find(t => t.tech === selectedTech)?.repairs.filter(r => r.status !== "completed" && r.status !== "cancelled") || []
                          : [...pendingRepairs, ...inProgressRepairs]
                        ).length === 0 ? (
                          <div className="py-12 text-center text-slate-500">
                            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No active jobs</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                            {(selectedTech 
                              ? repairsByTech.find(t => t.tech === selectedTech)?.repairs.filter(r => r.status !== "completed" && r.status !== "cancelled") || []
                              : [...pendingRepairs, ...inProgressRepairs]
                            ).map(renderRepairCard)}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Two-column layout for filtered views */}
          <TabsContent value="pending" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <FiltersPanel />
              </div>
              <div className="lg:col-span-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0078D4]" />
                  </div>
                ) : filteredRepairs.filter(r => r.status === "pending" || r.status === "assigned").length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No pending repairs{hasActiveFilters ? " matching filters" : ""}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredRepairs.filter(r => r.status === "pending" || r.status === "assigned").map(renderRepairCard)}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="in_progress" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <FiltersPanel />
              </div>
              <div className="lg:col-span-3">
                {filteredRepairs.filter(r => r.status === "in_progress").length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                      <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No repairs in progress{hasActiveFilters ? " matching filters" : ""}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredRepairs.filter(r => r.status === "in_progress").map(renderRepairCard)}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-[#1E293B]">Completed Jobs Log</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search jobs..."
                        value={tableSearch}
                        onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                        className="pl-8 w-64"
                        data-testid="input-completed-search"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={exportCompletedToCSV} data-testid="button-export-completed">
                      <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sortedCompletedRepairs.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No completed repairs{tableSearch ? " matching search" : ""}</p>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("date")}>
                              <div className="flex items-center gap-1">Date Completed <SortIcon column="date" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("property")}>
                              <div className="flex items-center gap-1">Property <SortIcon column="property" /></div>
                            </TableHead>
                            <TableHead>Job Description</TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("tech")}>
                              <div className="flex items-center gap-1">Repair Tech <SortIcon column="tech" /></div>
                            </TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Photos</TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort("value")}>
                              <div className="flex items-center justify-end gap-1">Total Value <SortIcon column="value" /></div>
                            </TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedCompletedRepairs.map((repair) => (
                            <React.Fragment key={repair.id}>
                              <TableRow 
                                className="cursor-pointer hover:bg-slate-50" 
                                onClick={() => setExpandedRow(expandedRow === repair.id ? null : repair.id)}
                                data-testid={`row-completed-${repair.id}`}
                              >
                                <TableCell className="font-medium">{formatDate(repair.updatedAt)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span className="truncate max-w-[150px]">{repair.propertyName || "—"}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="truncate max-w-[200px] block">{repair.description || "—"}</span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    {repair.technicianName || "—"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="truncate max-w-[150px] block text-slate-500 text-xs">
                                    {repair.notes ? repair.notes.substring(0, 50) + (repair.notes.length > 50 ? "..." : "") : "—"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {repair.photos && repair.photos.length > 0 ? (
                                    <div className="flex items-center gap-1">
                                      <Camera className="w-4 h-4 text-slate-400" />
                                      <span className="text-xs text-slate-500">{repair.photos.length}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-[#22D69A]">
                                  {formatCurrency(repair.totalAmount)}
                                </TableCell>
                                <TableCell>
                                  {expandedRow === repair.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </TableCell>
                              </TableRow>
                              {expandedRow === repair.id && (
                                <TableRow>
                                  <TableCell colSpan={8} className="p-0">
                                    <div className="flex flex-col">
                                      {/* Section 1: Estimate Details - Light Blue Tint */}
                                      <div className="p-4" style={{ backgroundColor: "#0078D41A" }}>
                                        <div className="flex items-center gap-2 mb-3">
                                          <FileText className="w-5 h-5 text-[#0078D4]" />
                                          <h4 className="font-bold text-sm text-[#0078D4] uppercase tracking-wide">Estimate Details</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Quote Description</p>
                                            <p className="text-sm font-medium text-[#1E293B]">{repair.description || "—"}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Property & Customer</p>
                                            <p className="text-sm font-medium text-[#1E293B]">{repair.propertyName || "—"}</p>
                                            <p className="text-xs text-slate-500">{repair.customerName || "—"}</p>
                                            <p className="text-xs text-slate-400">{repair.address || "—"}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Estimate Date</p>
                                            <p className="text-sm text-[#1E293B]">{formatDate(repair.jobDate)}</p>
                                            <p className="text-xs text-slate-500 mt-1">Created</p>
                                            <p className="text-xs text-slate-400">{formatDateTime(repair.createdAt)}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Service Tech (Reported)</p>
                                            <p className="text-sm text-[#1E293B]">{repair.technicianName || "—"}</p>
                                          </div>
                                        </div>

                                        {/* Line Items Table */}
                                        {repair.items && repair.items.length > 0 && (
                                          <div className="mb-4">
                                            <p className="text-xs text-slate-500 mb-2 font-medium">Line Items</p>
                                            <div className="bg-white rounded border overflow-hidden">
                                              <table className="w-full text-xs">
                                                <thead className="bg-slate-100">
                                                  <tr>
                                                    <th className="text-left px-2 py-1.5 font-medium">Product/Service</th>
                                                    <th className="text-left px-2 py-1.5 font-medium">SKU</th>
                                                    <th className="text-center px-2 py-1.5 font-medium">Qty</th>
                                                    <th className="text-right px-2 py-1.5 font-medium">Rate</th>
                                                    <th className="text-right px-2 py-1.5 font-medium">Amount</th>
                                                    <th className="text-center px-2 py-1.5 font-medium">Tax</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {repair.items.map((item: any, idx: number) => (
                                                    <tr key={idx} className="border-t">
                                                      <td className="px-2 py-1.5">{item.productService || item.description || "—"}</td>
                                                      <td className="px-2 py-1.5 text-slate-500">{item.sku || "—"}</td>
                                                      <td className="px-2 py-1.5 text-center">{item.quantity || 1}</td>
                                                      <td className="px-2 py-1.5 text-right">{formatCurrency(item.rate * 100)}</td>
                                                      <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(item.amount * 100)}</td>
                                                      <td className="px-2 py-1.5 text-center">{item.taxable ? "Yes" : "No"}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}

                                        {/* Totals */}
                                        <div className="flex justify-end mb-4">
                                          <div className="bg-white rounded border p-3 min-w-[220px]">
                                            <div className="flex justify-between text-xs mb-1">
                                              <span className="text-slate-500">Subtotal:</span>
                                              <span className="font-medium">{formatCurrency((repair.partsAmount || 0) + (repair.laborAmount || 0))}</span>
                                            </div>
                                            <div className="flex justify-between text-xs mb-1">
                                              <span className="text-slate-500">Tax (estimated):</span>
                                              <span className="font-medium">{formatCurrency(Math.round(((repair.partsAmount || 0) + (repair.laborAmount || 0)) * 0.0875))}</span>
                                            </div>
                                            <div className="flex justify-between text-xs border-t pt-1 mt-1">
                                              <span className="font-semibold">Total:</span>
                                              <span className="font-bold text-[#22D69A]">{formatCurrency(repair.totalAmount)}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Job Photos */}
                                        <div>
                                          <p className="text-xs text-slate-500 mb-2 font-medium">Attached Photos</p>
                                          {repair.photos && repair.photos.length > 0 ? (
                                            <div className="flex gap-2 flex-wrap">
                                              {repair.photos.map((photo, idx) => (
                                                <img 
                                                  key={idx} 
                                                  src={photo} 
                                                  alt={`Estimate Photo ${idx + 1}`}
                                                  className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-[#0078D4]"
                                                  onClick={(e) => { e.stopPropagation(); setPhotoPreviewUrl(photo); }}
                                                />
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-slate-400 italic">No photos attached</p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Divider */}
                                      <div className="h-1 bg-slate-300" />

                                      {/* Section 2: Completion Details - Light Green Tint */}
                                      <div className="p-4" style={{ backgroundColor: "#22D69A1A" }}>
                                        <div className="flex items-center gap-2 mb-3">
                                          <CheckCircle className="w-5 h-5 text-[#22D69A]" />
                                          <h4 className="font-bold text-sm text-[#22D69A] uppercase tracking-wide">Completion Details</h4>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Repair Tech(s)</p>
                                            <p className="text-sm font-medium text-[#1E293B]">{repair.technicianName || "Not assigned"}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Date & Time Completed</p>
                                            <p className="text-sm text-[#1E293B]">{formatDateTime(repair.updatedAt)}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Time Spent</p>
                                            <p className="text-sm text-slate-400 italic">Not recorded</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Lock-box Confirmed</p>
                                            <p className="text-sm text-slate-400 italic">Not recorded</p>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Technicians Present</p>
                                            <p className="text-sm text-[#1E293B]">{repair.technicianName || "Not recorded"}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Completion Notes</p>
                                            <div className="bg-white/50 rounded p-2 border border-slate-200">
                                              <p className="text-sm text-[#1E293B] whitespace-pre-wrap">{repair.notes || "No notes recorded"}</p>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Completion Photos */}
                                        <div>
                                          <p className="text-xs text-slate-500 mb-2 font-medium">Completion Photos (After Work)</p>
                                          <div className="bg-white/50 rounded p-3 border border-slate-200 text-center">
                                            <Camera className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                            <p className="text-xs text-slate-400 italic">Completion photos not yet available</p>
                                            <p className="text-xs text-slate-300 mt-1">Feature coming soon from Field Tech App</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {completedTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-slate-500">
                          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedCompletedRepairs.length)} of {sortedCompletedRepairs.length} results
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm">Page {currentPage} of {completedTotalPages}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(completedTotalPages, p + 1))}
                            disabled={currentPage === completedTotalPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estimates-log" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-[#1E293B]">Estimates Log</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search estimates..."
                        value={tableSearch}
                        onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                        className="pl-8 w-64"
                        data-testid="input-estimates-search"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={exportEstimatesToCSV} data-testid="button-export-estimates">
                      <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sortedEstimates.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No estimates{tableSearch ? " matching search" : " submitted by repair technicians"}</p>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("date")}>
                              <div className="flex items-center gap-1">Date Submitted <SortIcon column="date" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("property")}>
                              <div className="flex items-center gap-1">Property <SortIcon column="property" /></div>
                            </TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Submitted By</TableHead>
                            <TableHead>Line Items</TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("status")}>
                              <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                            </TableHead>
                            <TableHead>Photos</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort("value")}>
                              <div className="flex items-center justify-end gap-1">Total <SortIcon column="value" /></div>
                            </TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedEstimates.map((estimate: any) => {
                            const statusColors: Record<string, string> = {
                              draft: "bg-slate-100 text-slate-700",
                              pending_approval: "bg-orange-100 text-orange-600",
                              approved: "bg-green-100 text-green-600",
                              rejected: "bg-red-100 text-red-600",
                              needs_scheduling: "bg-blue-100 text-blue-600",
                              scheduled: "bg-teal-100 text-teal-600",
                              completed: "bg-green-100 text-green-600",
                              ready_to_invoice: "bg-amber-100 text-amber-700",
                              invoiced: "bg-purple-100 text-purple-700",
                            };
                            const statusLabels: Record<string, string> = {
                              draft: "Draft",
                              pending_approval: "Pending",
                              approved: "Approved",
                              rejected: "Rejected",
                              needs_scheduling: "Needs Sched.",
                              scheduled: "Scheduled",
                              completed: "Completed",
                              ready_to_invoice: "Ready Invoice",
                              invoiced: "Invoiced",
                            };
                            const sourceLabels: Record<string, string> = {
                              office_staff: "Office",
                              repair_tech: "Repair Tech",
                              service_tech: "Service Tech",
                              emergency: "Emergency",
                            };

                            return (
                              <React.Fragment key={estimate.id}>
                                <TableRow 
                                  className="cursor-pointer hover:bg-slate-50" 
                                  onClick={() => setExpandedRow(expandedRow === estimate.id ? null : estimate.id)}
                                  data-testid={`row-estimate-${estimate.id}`}
                                >
                                  <TableCell className="font-medium">{formatDate(estimate.createdAt)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      <span className="truncate max-w-[120px]">{estimate.propertyName || "—"}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="truncate max-w-[150px] block">{estimate.title || "Untitled"}</span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-slate-400" />
                                      {estimate.repairTechName || estimate.createdByTechName || "—"}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{estimate.items?.length || 0}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={statusColors[estimate.status] || "bg-slate-100 text-slate-600"}>
                                      {statusLabels[estimate.status] || estimate.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {estimate.photos && estimate.photos.length > 0 ? (
                                      <div className="flex items-center gap-1">
                                        <Camera className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs text-slate-500">{estimate.photos.length}</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-xs text-slate-500">{sourceLabels[estimate.sourceType] || "Office"}</span>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-[#1E293B]">
                                    {formatCurrency(estimate.totalAmount)}
                                  </TableCell>
                                  <TableCell>
                                    {expandedRow === estimate.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </TableCell>
                                </TableRow>
                                {expandedRow === estimate.id && (
                                  <TableRow>
                                    <TableCell colSpan={10} className="bg-slate-50 p-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <h4 className="font-semibold text-sm mb-2">Estimate Details</h4>
                                          <div className="space-y-1 text-sm">
                                            <p><span className="text-slate-500">Estimate #:</span> {estimate.estimateNumber || "—"}</p>
                                            <p><span className="text-slate-500">Customer:</span> {estimate.customerName || "—"}</p>
                                            <p><span className="text-slate-500">Address:</span> {estimate.address || "—"}</p>
                                          </div>
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-sm mb-2">Description</h4>
                                          <p className="text-sm text-slate-600">{estimate.description || "No description"}</p>
                                        </div>
                                      </div>
                                      {estimate.photos && estimate.photos.length > 0 && (
                                        <div className="mt-4">
                                          <h4 className="font-semibold text-sm mb-2">Photos ({estimate.photos.length})</h4>
                                          <div className="flex gap-2 flex-wrap">
                                            {estimate.photos.map((photo: string, idx: number) => (
                                              <img 
                                                key={idx} 
                                                src={photo} 
                                                alt={`Photo ${idx + 1}`}
                                                className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                                onClick={(e) => { e.stopPropagation(); setPhotoPreviewUrl(photo); }}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      <div className="mt-4 flex justify-end">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => { e.stopPropagation(); window.location.href = `/estimates?id=${estimate.id}`; }}
                                        >
                                          <Eye className="w-4 h-4 mr-1" /> View Full Estimate
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {estimatesTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-slate-500">
                          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedEstimates.length)} of {sortedEstimates.length} results
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm">Page {currentPage} of {estimatesTotalPages}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(estimatesTotalPages, p + 1))}
                            disabled={currentPage === estimatesTotalPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emergencies" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-[#1E293B]">Emergencies Log</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search emergencies..."
                        value={tableSearch}
                        onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                        className="pl-8 w-64"
                        data-testid="input-emergencies-search"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={exportEmergenciesToCSV} data-testid="button-export-emergencies">
                      <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sortedEmergencies.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No emergencies{tableSearch ? " matching search" : ""}</p>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("date")}>
                              <div className="flex items-center gap-1">Date Submitted <SortIcon column="date" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("property")}>
                              <div className="flex items-center gap-1">Property <SortIcon column="property" /></div>
                            </TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Submitted By</TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("priority")}>
                              <div className="flex items-center gap-1">Priority <SortIcon column="priority" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("status")}>
                              <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                            </TableHead>
                            <TableHead>Photos</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedEmergencies.map((emergency) => {
                            const priorityCfg = priorityConfig[emergency.priority || "normal"] || priorityConfig.normal;
                            const emergencyStatusConfig: Record<string, { color: string; label: string }> = {
                              pending_review: { color: "bg-orange-100 text-orange-600", label: "Pending Review" },
                              in_progress: { color: "bg-blue-100 text-blue-600", label: "In Progress" },
                              resolved: { color: "bg-green-100 text-green-600", label: "Resolved" },
                            };
                            const statusCfg = emergencyStatusConfig[emergency.status] || emergencyStatusConfig.pending_review;

                            return (
                              <React.Fragment key={emergency.id}>
                                <TableRow 
                                  className="cursor-pointer hover:bg-slate-50" 
                                  onClick={() => setExpandedRow(expandedRow === emergency.id ? null : emergency.id)}
                                  data-testid={`row-emergency-${emergency.id}`}
                                >
                                  <TableCell className="font-medium">{formatDate(emergency.createdAt)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      <span className="truncate max-w-[150px]">{emergency.propertyName || "—"}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="truncate max-w-[200px] block">{emergency.description?.substring(0, 60) || "—"}{emergency.description && emergency.description.length > 60 ? "..." : ""}</span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="text-sm">{emergency.submittedByName || "—"}</span>
                                      <span className="text-xs text-slate-500 capitalize">{emergency.submitterRole?.replace(/_/g, " ") || "—"}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={priorityCfg.color}>{priorityCfg.label}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {emergency.photos && emergency.photos.length > 0 ? (
                                      <div className="flex items-center gap-1">
                                        <Camera className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs text-slate-500">{emergency.photos.length}</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {expandedRow === emergency.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </TableCell>
                                </TableRow>
                                {expandedRow === emergency.id && (
                                  <TableRow>
                                    <TableCell colSpan={8} className="bg-slate-50 p-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <h4 className="font-semibold text-sm mb-2">Full Details</h4>
                                          <div className="space-y-1 text-sm">
                                            <p><span className="text-slate-500">Address:</span> {emergency.propertyAddress || "—"}</p>
                                            <p><span className="text-slate-500">Submitted:</span> {formatDateTime(emergency.createdAt)}</p>
                                            <p><span className="text-slate-500">Total Amount:</span> {formatCurrency(emergency.totalAmount)}</p>
                                            {emergency.status === "resolved" && (
                                              <>
                                                <p><span className="text-slate-500">Resolved By:</span> {emergency.resolvedByName || "—"}</p>
                                                <p><span className="text-slate-500">Resolved At:</span> {formatDateTime(emergency.resolvedAt)}</p>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-sm mb-2">Description</h4>
                                          <p className="text-sm text-slate-600 mb-3">{emergency.description || "No description"}</p>
                                          {emergency.resolutionNotes && (
                                            <>
                                              <h4 className="font-semibold text-sm mb-2">Resolution Notes</h4>
                                              <p className="text-sm text-slate-600">{emergency.resolutionNotes}</p>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      {emergency.photos && emergency.photos.length > 0 && (
                                        <div className="mt-4">
                                          <h4 className="font-semibold text-sm mb-2">Photos ({emergency.photos.length})</h4>
                                          <div className="flex gap-2 flex-wrap">
                                            {emergency.photos.map((photo, idx) => (
                                              <img 
                                                key={idx} 
                                                src={photo} 
                                                alt={`Photo ${idx + 1}`}
                                                className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                                onClick={(e) => { e.stopPropagation(); setPhotoPreviewUrl(photo); }}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {emergenciesTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-slate-500">
                          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedEmergencies.length)} of {sortedEmergencies.length} results
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm">Page {currentPage} of {emergenciesTotalPages}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(emergenciesTotalPages, p + 1))}
                            disabled={currentPage === emergenciesTotalPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parts-ordered" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-[#1E293B]">Parts Orders Log</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search parts..."
                        className="pl-8 w-64"
                        disabled
                        data-testid="input-parts-search"
                      />
                    </div>
                    <Button variant="outline" size="sm" disabled data-testid="button-export-parts">
                      <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Date Requested</TableHead>
                        <TableHead>Property Name</TableHead>
                        <TableHead>Part Name/Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed By</TableHead>
                        <TableHead>Date Received</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={9} className="py-12 text-center text-slate-500">
                          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium text-lg mb-2">Parts Orders Coming Soon</p>
                          <p className="text-sm">This feature will display all parts orders submitted from the Repair Tech App.</p>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {photoPreviewUrl && (
        <Dialog open={!!photoPreviewUrl} onOpenChange={() => setPhotoPreviewUrl(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Photo Preview</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img 
                src={photoPreviewUrl} 
                alt="Full size preview" 
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPhotoPreviewUrl(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Job</Label>
              <p className="text-sm text-slate-600">
                {selectedRepairForReassign?.description || "No description"}
              </p>
              <p className="text-xs text-slate-400">
                Currently assigned to: {selectedRepairForReassign?.technicianName || "Unassigned"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Select New Technician</Label>
              <Select value={newTechId} onValueChange={setNewTechId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician..." />
                </SelectTrigger>
                <SelectContent>
                  {repairTechs.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id.toString()}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReassign}
              disabled={!newTechId || reassignMutation.isPending}
            >
              {reassignMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reassigning...
                </>
              ) : (
                "Reassign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
