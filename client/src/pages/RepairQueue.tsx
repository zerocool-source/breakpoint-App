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
  Download, X, AlertCircle, Package, Search, Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Image, Camera,
  FileEdit, Send, Paperclip, ExternalLink, Mail, Phone, MessageSquare, Shuffle
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { RepairRequestForm } from "@/components/RepairRequestForm";
import type { ServiceRepairJob, Technician, Emergency, RepairRequest, JobReassignment } from "@shared/schema";

interface WorkOrder {
  id: string;
  estimateNumber: string | null;
  woNumber: string | null;
  propertyId: string;
  propertyName: string;
  customerName: string | null;
  title: string;
  description: string | null;
  totalAmount: number | null;
  status: string;
  repairTechId: string | null;
  repairTechName: string | null;
  createdAt: string;
  completedAt: string | null;
  isUrgent?: boolean;
  beforePhotos?: Array<{ url: string; caption: string }>;
  afterPhotos?: Array<{ url: string; caption: string }>;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20", icon: Clock, label: "Pending" },
  assigned: { color: "bg-[#0077b6]/10 text-[#0077b6] border-[#0077b6]/20", icon: User, label: "Assigned" },
  in_progress: { color: "bg-[#14b8a6]/10 text-[#14b8a6] border-[#14b8a6]/20", icon: Wrench, label: "In Progress" },
  completed: { color: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertTriangle, label: "Cancelled" },
  estimated: { color: "bg-[#14b8a6]/10 text-[#14b8a6] border-[#14b8a6]/20", icon: DollarSign, label: "Estimated" },
  batched: { color: "bg-[#0077b6]/10 text-[#0077b6] border-[#0077b6]/20", icon: Target, label: "Batched" },
  work_order: { color: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20", icon: FileText, label: "Work Order" },
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

  // Fetch repair technicians from stored technicians database
  const { data: repairTechniciansData } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians/stored", "repair"],
    queryFn: async () => {
      const response = await fetch("/api/technicians/stored?role=repair");
      if (!response.ok) throw new Error("Failed to fetch repair technicians");
      return response.json();
    },
  });
  
  const repairTechnicians = repairTechniciansData?.technicians || [];

  const { data: emergencies = [] } = useQuery<Emergency[]>({
    queryKey: ["emergencies"],
    queryFn: async () => {
      const response = await fetch("/api/emergencies");
      if (!response.ok) throw new Error("Failed to fetch emergencies");
      return response.json();
    },
  });

  const { data: jobReassignments = [] } = useQuery<JobReassignment[]>({
    queryKey: ["job-reassignments"],
    queryFn: async () => {
      const response = await fetch("/api/job-reassignments");
      if (!response.ok) throw new Error("Failed to fetch job reassignments");
      return response.json();
    },
  });

  // Fetch repair requests
  const { data: repairRequestsData } = useQuery<{ requests: RepairRequest[] }>({
    queryKey: ["/api/repair-requests"],
    queryFn: async () => {
      const response = await fetch("/api/repair-requests");
      if (!response.ok) throw new Error("Failed to fetch repair requests");
      return response.json();
    },
  });
  const repairRequests = repairRequestsData?.requests || [];
  // Show pending and assigned repair requests in "Repairs Needed" tab (exclude cancelled, estimated, completed)
  const pendingRepairRequests = repairRequests.filter(r => r.status === "pending" || r.status === "assigned");

  // Fetch customers for property dropdown
  const { data: customersData } = useQuery<{ customers: any[] }>({
    queryKey: ["/api/customers/stored"],
    queryFn: async () => {
      const response = await fetch("/api/customers/stored");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  // Fetch work orders (completed estimates without approval)
  const { data: workOrdersData = [] } = useQuery<WorkOrder[]>({
    queryKey: ["work-orders-queue"],
    queryFn: async () => {
      const response = await fetch("/api/estimates");
      if (!response.ok) throw new Error("Failed to fetch estimates");
      const data = await response.json();
      const estimates = data.estimates || [];
      // Work orders are completed estimates without approval
      return estimates
        .filter((e: any) => e.status === "completed" && !e.approvedAt)
        .map((e: any) => ({
          id: e.id,
          estimateNumber: e.estimateNumber,
          woNumber: e.woNumber,
          propertyId: e.propertyId,
          propertyName: e.propertyName,
          customerName: e.customerName,
          title: e.title,
          description: e.description,
          totalAmount: e.totalAmount,
          status: "work_order",
          repairTechId: e.repairTechId,
          repairTechName: e.repairTechName,
          createdAt: e.createdAt,
          completedAt: e.completedAt,
          isUrgent: e.isUrgent,
          beforePhotos: e.beforePhotos,
          afterPhotos: e.afterPhotos,
        }));
    },
    refetchInterval: 30000,
  });
  const workOrders = workOrdersData || [];

  // Create repair request state
  const [showCreateRepairRequestModal, setShowCreateRepairRequestModal] = useState(false);
  
  // Repair request detail panel state
  const [selectedRepairRequest, setSelectedRepairRequest] = useState<RepairRequest | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  
  // Approval request modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalType, setApprovalType] = useState<"email" | "verbal">("verbal");
  const [approvalForm, setApprovalForm] = useState({
    repairTechnicianId: "",
    issueDescription: "",
    estimatedCost: "",
    approvalMethod: "phone_call", // email, phone_call, text_message, chat
    confirmationNotes: "",
    approvedBy: "",
    approvalDateTime: new Date().toISOString().slice(0, 16),
    // Email-specific fields
    emailRecipient: "",
    emailSubject: "",
    emailBody: "",
  });
  
  // Convert to estimate state
  const [showConvertModal, setShowConvertModal] = useState(false);

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
    const grouped: Record<string, { 
      tech: string; 
      techId: string | null;
      repairs: ServiceRepairJob[]; 
      workOrders: WorkOrder[];
      pending: number; 
      inProgress: number; 
      completed: number; 
      workOrderCount: number;
      totalValue: number;
      initials: string;
    }> = {};
    
    // First, add all repair technicians from the database
    repairTechnicians.filter(t => t.active !== false).forEach(tech => {
      const fullName = `${tech.firstName} ${tech.lastName}`;
      const initials = `${tech.firstName?.charAt(0) || ''}${tech.lastName?.charAt(0) || ''}`.toUpperCase();
      grouped[fullName] = { 
        tech: fullName, 
        techId: tech.id,
        repairs: [], 
        workOrders: [],
        pending: 0, 
        inProgress: 0, 
        completed: 0, 
        workOrderCount: 0,
        totalValue: 0,
        initials,
      };
    });
    
    // Add Unassigned bucket
    grouped["Unassigned"] = { 
      tech: "Unassigned", 
      techId: null,
      repairs: [], 
      workOrders: [],
      pending: 0, 
      inProgress: 0, 
      completed: 0, 
      workOrderCount: 0,
      totalValue: 0,
      initials: "UA",
    };
    
    // Now populate with repairs data
    filteredRepairs.forEach(repair => {
      const techName = repair.technicianName || "Unassigned";
      // If tech exists in our list, add to their stats; otherwise add to Unassigned
      const targetGroup = grouped[techName] || grouped["Unassigned"];
      targetGroup.repairs.push(repair);
      targetGroup.totalValue += repair.totalAmount || 0;
      if (repair.status === "pending" || repair.status === "assigned") targetGroup.pending++;
      else if (repair.status === "in_progress") targetGroup.inProgress++;
      else if (repair.status === "completed") targetGroup.completed++;
    });

    // Add work orders to technicians
    workOrders.forEach(wo => {
      const techName = wo.repairTechName || "Unassigned";
      const targetGroup = grouped[techName] || grouped["Unassigned"];
      targetGroup.workOrders.push(wo);
      targetGroup.workOrderCount++;
      targetGroup.totalValue += wo.totalAmount || 0;
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.tech === "Unassigned") return 1;
      if (b.tech === "Unassigned") return -1;
      // Sort by active jobs first, then alphabetically
      const aActive = a.pending + a.inProgress + a.workOrderCount;
      const bActive = b.pending + b.inProgress + b.workOrderCount;
      if (aActive !== bActive) return bActive - aActive;
      return a.tech.localeCompare(b.tech);
    });
  }, [filteredRepairs, repairTechnicians, workOrders]);

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

  // Use repairTechnicians from stored database for assignment dropdown
  const repairTechs = useMemo(() => {
    return repairTechnicians.filter(t => t.active !== false).map(tech => ({
      id: tech.id,
      name: `${tech.firstName} ${tech.lastName}`,
    }));
  }, [repairTechnicians]);

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
    mutationFn: async ({ repairId, estimateId, techId, techName }: { repairId: string; estimateId: string | null; techId: string; techName: string }) => {
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

  // Approval request mutation
  const createApprovalRequestMutation = useMutation({
    mutationFn: async (data: {
      repairRequestId: string;
      repairRequestNumber: string | null;
      propertyId: string;
      propertyName: string;
      issueDescription: string | null;
      estimatedCost: number;
      approvalRequestedFrom: string;
      approvalNotes: string;
      urgency: string;
      attachments: string[];
      status?: string;
      approvedBy?: string;
      approvedByName?: string;
      approvalMethod?: string;
      approvalType?: string;
      repairTechnicianId?: string;
      repairTechnicianName?: string;
      confirmationNotes?: string;
      approvalDateTime?: Date;
    }) => {
      // First create approval request
      const approvalResponse = await fetch("/api/approval-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!approvalResponse.ok) throw new Error("Failed to create approval request");
      const approvalResult = await approvalResponse.json();
      
      // Then convert to estimate
      if (selectedRepairRequest) {
        const estimateResponse = await fetch("/api/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: selectedRepairRequest.propertyId,
            propertyName: selectedRepairRequest.propertyName,
            customerName: selectedRepairRequest.customerName,
            customerEmail: selectedRepairRequest.customerEmail,
            address: selectedRepairRequest.address,
            title: `Repair: ${data.issueDescription?.slice(0, 100) || "Repair Request"}`,
            description: data.issueDescription,
            sourceType: "repair_request",
            sourceRepairRequestId: selectedRepairRequest.id,
            sourceRepairRequestNumber: selectedRepairRequest.requestNumber,
            lineItems: selectedRepairRequest.lineItems || [],
            photos: selectedRepairRequest.photos || [],
            status: data.status === "approved" ? "approved" : "pending_approval",
            totalAmount: data.estimatedCost,
            repairTechnicianId: approvalForm.repairTechnicianId || null,
          }),
        });
        if (!estimateResponse.ok) throw new Error("Failed to create estimate");
        const estimateResult = await estimateResponse.json();
        
        // Update repair request status to converted
        await fetch(`/api/repair-requests/${selectedRepairRequest.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "converted" }),
        });
        
        return { approval: approvalResult, estimate: estimateResult };
      }
      
      return { approval: approvalResult };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/repair-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approval-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      const estimateNumber = result.estimate?.estimateNumber || result.estimate?.id;
      toast({ 
        title: "Approval Logged & Estimate Created", 
        description: estimateNumber 
          ? `Estimate ${estimateNumber} has been created from repair request` 
          : "The repair request has been converted to an estimate"
      });
      setShowApprovalModal(false);
      setApprovalForm({
        repairTechnicianId: "",
        issueDescription: "",
        estimatedCost: "",
        approvalMethod: "phone_call",
        confirmationNotes: "",
        approvedBy: "",
        approvalDateTime: new Date().toISOString().slice(0, 16),
        emailRecipient: "",
        emailSubject: "",
        emailBody: "",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to process approval request", variant: "destructive" });
    },
  });

  // Convert to estimate mutation
  const convertToEstimateMutation = useMutation({
    mutationFn: async (repairRequest: RepairRequest) => {
      const response = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: repairRequest.propertyId,
          propertyName: repairRequest.propertyName,
          customerName: repairRequest.customerName,
          customerEmail: repairRequest.customerEmail,
          address: repairRequest.address,
          title: `Repair: ${repairRequest.issueDescription?.slice(0, 100) || "Repair Request"}`,
          description: repairRequest.issueDescription,
          sourceType: "repair_request",
          sourceRepairRequestId: repairRequest.id,
          sourceRepairRequestNumber: repairRequest.requestNumber,
          photos: repairRequest.photos || [],
          items: (repairRequest.lineItems as any[] || []).map((item, idx) => ({
            lineNumber: idx + 1,
            productService: item.partName || item.description || "Service",
            description: item.description || item.partName || "",
            quantity: item.quantity || 1,
            rate: (item.unitPrice || 0),
            amount: (item.quantity || 1) * (item.unitPrice || 0),
            taxable: false,
          })),
          status: "draft",
        }),
      });
      if (!response.ok) throw new Error("Failed to create estimate");
      const estimate = await response.json();
      
      // Update repair request with link to estimate
      await fetch(`/api/repair-requests/${repairRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "estimated",
          estimateId: estimate.id 
        }),
      });
      
      return estimate;
    },
    onSuccess: (estimate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/repair-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({ 
        title: "Estimate Created", 
        description: `Estimate ${estimate.estimateNumber || estimate.id} has been created from repair request` 
      });
      setShowConvertModal(false);
      setSelectedRepairRequest(null);
      setShowDetailPanel(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to convert to estimate", variant: "destructive" });
    },
  });

  // Mutation for inline assignment of repair requests from table
  const inlineAssignRepairRequestMutation = useMutation({
    mutationFn: async ({ requestId, technicianId, technicianName }: { 
      requestId: string; 
      technicianId: string | null; 
      technicianName: string | null;
    }) => {
      const res = await fetch(`/api/repair-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedTechId: technicianId,
          assignedTechName: technicianName,
          assignedDate: technicianId ? new Date().toISOString().split('T')[0] : null,
          status: technicianId ? "assigned" : "pending",
        }),
      });
      if (!res.ok) throw new Error("Failed to assign repair request");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/repair-requests"] });
      toast({
        title: variables.technicianId ? "Assigned" : "Unassigned",
        description: variables.technicianId 
          ? `Assigned to ${variables.technicianName}` 
          : "Repair request unassigned",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign repair request", variant: "destructive" });
    },
  });

  // Helper functions for repair request actions
  const handleRowClick = (request: RepairRequest) => {
    setSelectedRepairRequest(request);
    setShowDetailPanel(true);
  };

  const handleOpenApprovalModal = (request: RepairRequest, type: "email" | "verbal") => {
    setSelectedRepairRequest(request);
    setApprovalType(type);
    
    // Generate email subject and body if email type
    const emailSubject = `Approval Request: Repair at ${request.propertyName || "Property"}`;
    const emailBody = `Hello,

We are requesting approval for the following repair work:

Property: ${request.propertyName || "N/A"}
Repair Request #: ${request.requestNumber || "N/A"}
Issue: ${request.issueDescription || "N/A"}

Estimated Cost: $[Enter Amount]

Please confirm if you approve this repair to proceed.

Thank you.`;

    setApprovalForm({
      repairTechnicianId: "",
      issueDescription: request.issueDescription || "",
      estimatedCost: "",
      approvalMethod: type === "email" ? "email" : "phone_call",
      confirmationNotes: "",
      approvedBy: "",
      approvalDateTime: new Date().toISOString().slice(0, 16),
      emailRecipient: request.customerEmail || "",
      emailSubject,
      emailBody,
    });
    setShowApprovalModal(true);
  };

  const handleConvertToEstimate = (request: RepairRequest) => {
    setSelectedRepairRequest(request);
    setShowConvertModal(true);
  };

  const submitApprovalAndConvert = () => {
    if (!selectedRepairRequest) return;
    
    // Find the technician name if selected
    const selectedTech = repairTechnicians.find(t => t.id === approvalForm.repairTechnicianId);
    const techName = selectedTech ? `${selectedTech.firstName} ${selectedTech.lastName}` : null;
    
    // Create approval request and convert to estimate
    createApprovalRequestMutation.mutate({
      repairRequestId: selectedRepairRequest.id,
      repairRequestNumber: selectedRepairRequest.requestNumber,
      propertyId: selectedRepairRequest.propertyId,
      propertyName: selectedRepairRequest.propertyName || "",
      issueDescription: approvalForm.issueDescription,
      estimatedCost: Math.round(parseFloat(approvalForm.estimatedCost || "0") * 100),
      approvalRequestedFrom: approvalType === "verbal" ? "verbal" : "email", // Required field
      approvalNotes: approvalForm.confirmationNotes,
      urgency: "standard", // Required field with default
      attachments: [],
      status: approvalType === "verbal" ? "approved" : "pending",
      approvedBy: approvalForm.approvedBy || undefined,
      approvedByName: approvalForm.approvedBy || undefined,
      approvalMethod: approvalForm.approvalMethod,
      approvalType: approvalType,
      repairTechnicianId: approvalForm.repairTechnicianId || undefined,
      repairTechnicianName: techName || undefined,
      confirmationNotes: approvalForm.confirmationNotes || undefined,
      approvalDateTime: approvalForm.approvalDateTime ? new Date(approvalForm.approvalDateTime) : undefined,
    });
  };

  const confirmConvertToEstimate = () => {
    if (!selectedRepairRequest) return;
    convertToEstimateMutation.mutate(selectedRepairRequest);
  };

  const getReportedByLabel = (reportedBy: string, name?: string | null) => {
    const roleLabel = reportedBy === "service_tech" ? "Service Tech" :
      reportedBy === "repair_tech" ? "Repair Tech" :
      reportedBy === "supervisor" ? "Supervisor" :
      reportedBy === "office_staff" ? "Office Staff" :
      reportedBy === "customer" ? "Customer" : reportedBy;
    return name ? `${name} (${roleLabel})` : roleLabel;
  };

  const openReassignModal = (repair: ServiceRepairJob) => {
    setSelectedRepairForReassign(repair);
    setNewTechId("");
    setReassignModalOpen(true);
  };

  const handleReassign = () => {
    if (!selectedRepairForReassign || !newTechId) return;
    const tech = repairTechs.find(t => t.id === newTechId);
    if (!tech) return;
    
    reassignMutation.mutate({
      repairId: selectedRepairForReassign.id,
      estimateId: selectedRepairForReassign.estimateId,
      techId: newTechId,
      techName: tech.name,
    });
  };

  const renderRepairCard = (repair: ServiceRepairJob) => {
    const getStatusBadgeStyle = (status: string | null) => {
      switch (status) {
        case "pending":
        case "assigned":
          return "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20";
        case "in_progress":
          return "bg-[#14b8a6]/10 text-[#14b8a6] border-[#14b8a6]/20";
        case "completed":
          return "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20";
        default:
          return "bg-slate-100 text-slate-600 border-slate-200";
      }
    };
    const statusCfg = statusConfig[repair.status || "pending"] || defaultStatus;
    const StatusIcon = statusCfg.icon;

    return (
      <Card
        key={repair.id}
        className="bg-white shadow-sm rounded-xl hover:shadow-md transition-all"
        data-testid={`repair-item-${repair.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                {repair.jobNumber || "—"}
              </span>
              <Badge className={`${getStatusBadgeStyle(repair.status)} border`}>
                {statusCfg.label}
              </Badge>
            </div>
            <span className="text-lg font-bold text-slate-900">
              {formatCurrency(repair.totalAmount)}
            </span>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm text-slate-700">
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
              <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-xs">
                <FileText className="w-3 h-3 mr-1" />
                From Estimate
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            {repair.status === "in_progress" && (
              <Button
                size="sm"
                variant="outline"
                className="text-[#22c55e] border-[#22c55e] hover:bg-[#22c55e]/10"
                onClick={() => updateStatusMutation.mutate({ id: repair.id, status: "completed" })}
                data-testid={`button-complete-${repair.id}`}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Complete
              </Button>
            )}
            {repair.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                className="text-[#14b8a6] border-[#14b8a6] hover:bg-[#14b8a6]/10"
                onClick={() => updateStatusMutation.mutate({ id: repair.id, status: "in_progress" })}
                data-testid={`button-start-${repair.id}`}
              >
                <Wrench className="w-4 h-4 mr-1" /> Start Work
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-slate-600 border-slate-300 hover:bg-slate-50"
              data-testid={`button-view-${repair.id}`}
            >
              <Eye className="w-4 h-4 mr-1" /> View
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-500 hover:bg-slate-100"
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
        </CardContent>
      </Card>
    );
  };

  const renderTechCard = (techData: { tech: string; techId: string | null; repairs: ServiceRepairJob[]; workOrders: WorkOrder[]; pending: number; inProgress: number; completed: number; workOrderCount: number; totalValue: number; initials: string }) => {
    const totalActive = techData.pending + techData.inProgress + techData.workOrderCount;
    const totalJobs = techData.repairs.length + techData.workOrders.length;
    const completionRate = totalJobs > 0 ? Math.round((techData.completed / totalJobs) * 100) : 0;

    return (
      <Card
        key={techData.tech}
        className={`cursor-pointer transition-all bg-white shadow-sm rounded-xl hover:shadow-md ${selectedTech === techData.tech ? 'ring-2 ring-[#0077b6] shadow-md' : ''}`}
        onClick={() => setSelectedTech(selectedTech === techData.tech ? null : techData.tech)}
        data-testid={`tech-card-${techData.tech.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={techData.tech === "Unassigned" ? "bg-slate-200 text-slate-600" : "bg-[#0077b6] text-white"}>
                {techData.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{techData.tech}</h3>
              <p className="text-xs text-slate-500">{totalActive} active jobs</p>
            </div>
            {totalActive > 0 && (
              <Badge className="bg-[#0077b6]/10 text-[#0077b6] border-[#0077b6]/20 font-semibold">
                {totalActive}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 bg-[#14b8a6]/10 rounded-lg">
              <div className="text-lg font-bold text-[#14b8a6]">{techData.inProgress}</div>
              <div className="text-xs text-slate-500">In Progress</div>
            </div>
            <div className="text-center p-2 rounded-lg">
              <div className="text-lg font-bold text-[#22c55e]">{techData.completed}</div>
              <div className="text-xs text-slate-500">Completed</div>
            </div>
            <div className="text-center p-2 bg-[#f59e0b]/10 rounded-lg">
              <div className="text-lg font-bold text-[#f59e0b]">{techData.workOrderCount}</div>
              <div className="text-xs text-slate-500">Work Orders</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Value:</span>
              <span className="font-semibold text-slate-700">{formatCurrency(techData.totalValue)}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Completion:</span>
                <span className="font-medium text-[#0077b6]">{completionRate}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-[#0077b6] h-2 rounded-full transition-all" 
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
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
          <span className="text-lg font-bold text-slate-900">
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
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
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

  // Horizontal inline filters panel for full-width tables
  const HorizontalFiltersPanel = () => (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>
        
        <div className="flex-1 min-w-[180px] max-w-[220px]">
          <Label className="text-xs text-slate-500 mb-1 block">Property</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search..."
              value={propertySearch}
              onChange={(e) => setPropertySearch(e.target.value)}
              className="pl-7 h-8 text-sm"
              data-testid="input-property-search-inline"
            />
          </div>
        </div>

        <div className="min-w-[160px]">
          <Label className="text-xs text-slate-500 mb-1 block">Repair Tech</Label>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="h-8 text-sm" data-testid="select-tech-filter-inline">
              <SelectValue placeholder="All Techs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {uniqueTechs.map(tech => (
                <SelectItem key={tech} value={tech}>{tech}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[130px]">
          <Label className="text-xs text-slate-500 mb-1 block">From</Label>
          <Input
            type="date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            className="h-8 text-sm"
            data-testid="input-date-from-inline"
          />
        </div>

        <div className="min-w-[130px]">
          <Label className="text-xs text-slate-500 mb-1 block">To</Label>
          <Input
            type="date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            className="h-8 text-sm"
            data-testid="input-date-to-inline"
          />
        </div>

        <div className="min-w-[140px]">
          <Label className="text-xs text-slate-500 mb-1 block">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-sm" data-testid="select-status-filter-inline">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[120px]">
          <Label className="text-xs text-slate-500 mb-1 block">Priority</Label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 text-sm" data-testid="select-priority-filter-inline">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-slate-500 hover:text-slate-700"
            onClick={clearFilters}
            data-testid="button-clear-filters-inline"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6 bg-[#f9fafb] min-h-screen">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0077b6]/10 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#0077b6]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" data-testid="text-heading-repairqueue">Repair Queue</h1>
              <p className="text-slate-500 text-sm">Manage repairs assigned to Repair Techs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="text-[#0077b6] border-[#0077b6] hover:bg-[#0077b6]/10"
              data-testid="button-export"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              className="text-[#f97316] border-[#f97316] hover:bg-[#f97316]/10"
              data-testid="badge-pending-count"
            >
              <Clock className="w-4 h-4 mr-2" />
              {pendingRepairs.length} Pending
            </Button>
            <Button
              variant="outline"
              className="text-[#14b8a6] border-[#14b8a6] hover:bg-[#14b8a6]/10"
              data-testid="badge-inprogress-count"
            >
              <Wrench className="w-4 h-4 mr-2" />
              {inProgressRepairs.length} In Progress
            </Button>
          </div>
        </div>

        {/* Dashboard Metric Cards - QuickBooks Style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="dashboard-metrics">
          {/* Total Jobs */}
          <Card className="bg-white border-l-4 border-l-[#0077b6] shadow-sm">
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-full bg-[#0077b6]/10 flex items-center justify-center mb-3">
                <Target className="w-4 h-4 text-[#0077b6]" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{dashboardMetrics.totalJobs}</div>
              <div className="text-sm text-slate-500">Total Jobs</div>
              <div className="text-xs text-[#0077b6] font-medium mt-1">{formatCurrency(dashboardMetrics.totalValue)}</div>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="bg-white border-l-4 border-l-[#f97316] shadow-sm">
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-full bg-[#f97316]/10 flex items-center justify-center mb-3">
                <Clock className="w-4 h-4 text-[#f97316]" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{dashboardMetrics.pending}</div>
              <div className="text-sm text-slate-500">Pending</div>
              <div className="text-xs text-[#f97316] font-medium mt-1">{formatCurrency(dashboardMetrics.pendingValue)}</div>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card className="bg-white border-l-4 border-l-[#14b8a6] shadow-sm">
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-full bg-[#14b8a6]/10 flex items-center justify-center mb-3">
                <Wrench className="w-4 h-4 text-[#14b8a6]" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{dashboardMetrics.inProgress}</div>
              <div className="text-sm text-slate-500">In Progress</div>
              <div className="text-xs text-[#14b8a6] font-medium mt-1">{formatCurrency(dashboardMetrics.inProgressValue)}</div>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="bg-white border-l-4 border-l-[#22c55e] shadow-sm">
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 flex items-center justify-center mb-3">
                <CheckCircle className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{dashboardMetrics.completed}</div>
              <div className="text-sm text-slate-500">Completed</div>
              <div className="text-xs text-[#22c55e] font-medium mt-1">{formatCurrency(dashboardMetrics.completedValue)}</div>
            </CardContent>
          </Card>

          {/* Active Techs */}
          <Card className="bg-white border-l-4 border-l-slate-400 shadow-sm">
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Users className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{dashboardMetrics.activeTechs}</div>
              <div className="text-sm text-slate-500">Active Techs</div>
              <div className="text-xs text-slate-400 mt-1">with assigned jobs</div>
            </CardContent>
          </Card>

          {/* Avg per Tech */}
          <Card className="bg-white border-l-4 border-l-slate-400 shadow-sm">
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{dashboardMetrics.avgPerTech}</div>
              <div className="text-sm text-slate-500">Avg per Tech</div>
              <div className="text-xs text-slate-400 mt-1">active jobs</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-transparent border-0 p-0 gap-2 flex-wrap">
            <TabsTrigger 
              value="by-tech" 
              data-testid="tab-by-tech"
              className="data-[state=active]:bg-[#0077b6] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:border data-[state=inactive]:border-slate-200 data-[state=inactive]:text-slate-600 rounded-full px-4 py-2 font-medium transition-all shadow-sm"
            >
              <Users className="w-4 h-4 mr-2" /> By Technician
            </TabsTrigger>
            <TabsTrigger 
              value="active-jobs" 
              data-testid="tab-active-jobs"
              className="data-[state=active]:bg-[#0077b6] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:border data-[state=inactive]:border-slate-200 data-[state=inactive]:text-slate-600 rounded-full px-4 py-2 font-medium transition-all shadow-sm"
            >
              <Wrench className="w-4 h-4 mr-2" /> Active Jobs ({pendingRepairs.length + inProgressRepairs.length})
            </TabsTrigger>
            <TabsTrigger 
              value="repairs-needed" 
              data-testid="tab-repairs-needed"
              className="data-[state=active]:bg-[#0077b6] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:border data-[state=inactive]:border-slate-200 data-[state=inactive]:text-slate-600 rounded-full px-4 py-2 font-medium transition-all shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 mr-2" /> Repairs Needed ({pendingRepairRequests.length})
            </TabsTrigger>
            <TabsTrigger 
              value="reassigned" 
              data-testid="tab-reassigned"
              className="data-[state=active]:bg-[#0077b6] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:border data-[state=inactive]:border-slate-200 data-[state=inactive]:text-slate-600 rounded-full px-4 py-2 font-medium transition-all shadow-sm"
            >
              <Shuffle className="w-4 h-4 mr-2" /> Reassigned ({jobReassignments.length})
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              data-testid="tab-completed"
              className="data-[state=active]:bg-[#0077b6] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:border data-[state=inactive]:border-slate-200 data-[state=inactive]:text-slate-600 rounded-full px-4 py-2 font-medium transition-all shadow-sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Completed ({completedRepairs.length})
            </TabsTrigger>
            <TabsTrigger 
              value="estimates-log" 
              data-testid="tab-estimates-log"
              className="data-[state=active]:bg-[#0077b6] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:border data-[state=inactive]:border-slate-200 data-[state=inactive]:text-slate-600 rounded-full px-4 py-2 font-medium transition-all shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2" /> Estimates Log ({estimatesFromRepairs.length})
            </TabsTrigger>
            <TabsTrigger 
              value="emergencies" 
              data-testid="tab-emergencies"
              className="data-[state=active]:bg-[#0077b6] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:border data-[state=inactive]:border-slate-200 data-[state=inactive]:text-slate-600 rounded-full px-4 py-2 font-medium transition-all shadow-sm"
            >
              <AlertCircle className="w-4 h-4 mr-2" /> Emergencies ({emergencies.length})
            </TabsTrigger>
            <TabsTrigger 
              value="parts-ordered" 
              data-testid="tab-parts-ordered"
              className="data-[state=active]:bg-[#0077b6] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:border data-[state=inactive]:border-slate-200 data-[state=inactive]:text-slate-600 rounded-full px-4 py-2 font-medium transition-all shadow-sm"
            >
              <Package className="w-4 h-4 mr-2" /> Parts Ordered
            </TabsTrigger>
          </TabsList>

          <TabsContent value="by-tech" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#0077b6]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <h3 className="font-semibold text-slate-900 mb-3">Repair Technicians</h3>
                  <div className="space-y-3">
                    {repairsByTech.map(renderTechCard)}
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <Card className="bg-white shadow-sm rounded-xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-slate-900">
                          {selectedTech ? `${selectedTech}'s Jobs` : "All Active Jobs"}
                        </CardTitle>
                        <Button
                          onClick={() => setShowCreateRepairRequestModal(true)}
                          className="bg-[#f97316] hover:bg-[#ea580c] text-white"
                          data-testid="button-create-repair-request-header"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Repair Request
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[550px]">
                        {(() => {
                          const techData = selectedTech ? repairsByTech.find(t => t.tech === selectedTech) : null;
                          const activeRepairs = techData 
                            ? techData.repairs.filter(r => r.status !== "completed" && r.status !== "cancelled")
                            : [...pendingRepairs, ...inProgressRepairs];
                          const techWorkOrders = techData ? techData.workOrders : workOrders;
                          
                          // Combine repairs and work orders into unified rows
                          type JobRow = { type: 'repair' | 'work_order'; data: ServiceRepairJob | WorkOrder };
                          const allRows: JobRow[] = [
                            ...activeRepairs.map(r => ({ type: 'repair' as const, data: r })),
                            ...techWorkOrders.map(wo => ({ type: 'work_order' as const, data: wo }))
                          ];

                          if (allRows.length === 0) {
                            return (
                              <div className="py-12 text-center text-slate-500">
                                <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No active jobs</p>
                              </div>
                            );
                          }

                          return (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                  <tr>
                                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Job #</th>
                                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Status</th>
                                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Property</th>
                                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Technician</th>
                                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Date</th>
                                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Description</th>
                                    <th className="text-right text-xs font-semibold text-slate-600 px-4 py-3">Amount</th>
                                    <th className="text-right text-xs font-semibold text-slate-600 px-4 py-3">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allRows.map((row, index) => {
                                    const isWorkOrder = row.type === 'work_order';
                                    const item = row.data;
                                    
                                    if (isWorkOrder) {
                                      const wo = item as WorkOrder;
                                      return (
                                        <tr 
                                          key={`wo-${wo.id}`} 
                                          className={`border-b border-slate-100 hover:bg-[#f59e0b]/5 transition-colors bg-[#f59e0b]/5`}
                                          data-testid={`row-work-order-${wo.id}`}
                                        >
                                          <td className="px-4 py-3">
                                            <span className="font-semibold text-[#f59e0b] text-sm">{wo.woNumber || wo.estimateNumber || "—"}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <Badge className="bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20 border text-xs">
                                              Work Order
                                            </Badge>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-sm text-slate-700 font-medium">{wo.propertyName || "—"}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-sm text-slate-600">{wo.repairTechName || "Unassigned"}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-sm text-slate-500">{formatDate(wo.completedAt || wo.createdAt)}</span>
                                          </td>
                                          <td className="px-4 py-3 max-w-[200px]">
                                            <span className="text-sm text-slate-600 truncate block" title={wo.title || wo.description || ""}>
                                              {wo.title || wo.description || "—"}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <span className="font-semibold text-slate-900">{formatCurrency(wo.totalAmount)}</span>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-[#0077b6] border-[#0077b6] hover:bg-[#0077b6]/10 h-7 px-2 text-xs"
                                                onClick={() => window.location.href = `/estimates?highlight=${wo.id}`}
                                                data-testid={`button-convert-wo-${wo.id}`}
                                              >
                                                <FileText className="w-3 h-3 mr-1" /> View/Convert
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    }

                                    // Regular repair row
                                    const repair = item as ServiceRepairJob;
                                    const statusCfg = statusConfig[repair.status || "pending"] || defaultStatus;
                                    const getRowStatusStyle = (status: string | null) => {
                                      switch (status) {
                                        case "pending":
                                        case "assigned":
                                          return "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20";
                                        case "in_progress":
                                          return "bg-[#14b8a6]/10 text-[#14b8a6] border-[#14b8a6]/20";
                                        case "completed":
                                          return "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20";
                                        default:
                                          return "bg-slate-100 text-slate-600 border-slate-200";
                                      }
                                    };
                                    return (
                                      <tr 
                                        key={repair.id} 
                                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 1 ? 'bg-slate-25' : ''}`}
                                        data-testid={`row-repair-${repair.id}`}
                                      >
                                        <td className="px-4 py-3">
                                          <span className="font-semibold text-slate-900 text-sm">{repair.jobNumber || "—"}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <Badge className={`${getRowStatusStyle(repair.status)} border text-xs`}>
                                            {statusCfg.label}
                                          </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-sm text-slate-700 font-medium">{repair.propertyName || "—"}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-sm text-slate-600">{repair.technicianName || "Unassigned"}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-sm text-slate-500">{formatDate(repair.jobDate)}</span>
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                          <span className="text-sm text-slate-600 truncate block" title={repair.description || ""}>
                                            {repair.description || "—"}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <span className="font-semibold text-slate-900">{formatCurrency(repair.totalAmount)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            {repair.status === "in_progress" && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-[#22c55e] border-[#22c55e] hover:bg-[#22c55e]/10 h-7 px-2 text-xs"
                                                onClick={() => updateStatusMutation.mutate({ id: repair.id, status: "completed" })}
                                                data-testid={`button-complete-row-${repair.id}`}
                                              >
                                                <CheckCircle className="w-3 h-3 mr-1" /> Complete
                                              </Button>
                                            )}
                                            {repair.status === "pending" && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-[#14b8a6] border-[#14b8a6] hover:bg-[#14b8a6]/10 h-7 px-2 text-xs"
                                                onClick={() => updateStatusMutation.mutate({ id: repair.id, status: "in_progress" })}
                                                data-testid={`button-start-row-${repair.id}`}
                                              >
                                                <Wrench className="w-3 h-3 mr-1" /> Start
                                              </Button>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-slate-600 border-slate-300 hover:bg-slate-50 h-7 px-2 text-xs"
                                              data-testid={`button-view-row-${repair.id}`}
                                            >
                                              <Eye className="w-3 h-3 mr-1" /> View
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0"
                                              data-testid={`button-more-row-${repair.id}`}
                                            >
                                              <MoreVertical className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Active Jobs Tab - Shows all jobs currently assigned and not yet completed */}
          <TabsContent value="active-jobs" className="mt-4">
            <HorizontalFiltersPanel />
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#0077b6]" />
              </div>
            ) : filteredRepairs.filter(r => r.status === "pending" || r.status === "in_progress" || r.status === "assigned").length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No active jobs{hasActiveFilters ? " matching filters" : ""}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredRepairs.filter(r => r.status === "pending" || r.status === "in_progress" || r.status === "assigned").map(renderRepairCard)}
              </div>
            )}
          </TabsContent>

          {/* Repairs Needed Tab - Shows repair requests awaiting evaluation */}
          <TabsContent value="repairs-needed" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">Repair Requests</CardTitle>
                  <Button
                    onClick={() => setShowCreateRepairRequestModal(true)}
                    className="bg-[#f97316] hover:bg-[#ea580c] text-white"
                    data-testid="button-create-repair-request-tab"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Repair Request
                  </Button>
                </div>
                <p className="text-sm text-slate-500 mt-1">Repair requests that need to be evaluated before creating an estimate</p>
              </CardHeader>
              <CardContent className="p-0">
                {pendingRepairRequests.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No repair requests pending</p>
                    <Button
                      onClick={() => setShowCreateRepairRequestModal(true)}
                      className="mt-4 bg-[#f97316] hover:bg-[#ea580c] text-white"
                      data-testid="button-empty-create-repair"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create Repair Request
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">RR #</th>
                          <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Property</th>
                          <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Issue Description</th>
                          <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Reported By</th>
                          <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Priority</th>
                          <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Assigned To</th>
                          <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Date</th>
                          <th className="text-right text-xs font-semibold text-slate-600 px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRepairRequests.map((request: RepairRequest, index: number) => (
                            <tr 
                              key={request.id} 
                              className={`border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer ${index % 2 === 1 ? 'bg-slate-25' : ''}`}
                              data-testid={`row-repair-request-${request.id}`}
                              onClick={() => handleRowClick(request)}
                            >
                              <td className="px-4 py-3">
                                <span className="font-semibold text-[#0077b6] text-sm hover:underline">{request.requestNumber || "—"}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-slate-700 font-medium">{request.propertyName || "—"}</span>
                              </td>
                              <td className="px-4 py-3 max-w-[250px]">
                                <span className="text-sm text-slate-600 truncate block" title={request.issueDescription || ""}>
                                  {request.issueDescription || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-slate-600">{getReportedByLabel(request.reportedBy, request.reportedByName)}</span>
                              </td>
                              <td className="px-4 py-3">
                                {request.isUrgent && (
                                  <Badge variant="outline" className="bg-red-600 text-white border-red-600">
                                    Urgent
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <Select
                                  value={request.assignedTechId || "unassigned"}
                                  onValueChange={(value) => {
                                    if (value === "unassigned") {
                                      inlineAssignRepairRequestMutation.mutate({
                                        requestId: request.id,
                                        technicianId: null,
                                        technicianName: null,
                                      });
                                    } else {
                                      const tech = repairTechnicians.find((t: Technician) => t.id.toString() === value);
                                      if (tech) {
                                        inlineAssignRepairRequestMutation.mutate({
                                          requestId: request.id,
                                          technicianId: value,
                                          technicianName: `${tech.firstName} ${tech.lastName}`,
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger 
                                    className={`h-8 text-xs w-[140px] ${request.assignedTechId ? 'border-[#0ea5e9] text-slate-700' : 'border-orange-300 text-orange-600'}`}
                                    data-testid={`select-assigned-tech-${request.id}`}
                                  >
                                    <SelectValue placeholder="Assign">
                                      {request.assignedTechName || "Assign"}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned" className="text-orange-600">Unassigned</SelectItem>
                                    {repairTechnicians.map((tech: Technician) => (
                                      <SelectItem key={tech.id} value={tech.id.toString()}>
                                        {tech.firstName} {tech.lastName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-slate-500">
                                  {request.requestDate ? new Date(request.requestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 
                                   request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="bg-[#f97316] hover:bg-[#f97316]/90 text-white h-7 px-3 text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                        data-testid={`button-send-approval-${request.id}`}
                                      >
                                        <Send className="w-3 h-3 mr-1" /> Send for Approval
                                        <ChevronDown className="w-3 h-3 ml-1" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenApprovalModal(request, "email")}>
                                        <Send className="w-4 h-4 mr-2" /> Send Email for Approval
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleOpenApprovalModal(request, "verbal")}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Log Verbal Approval
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={(e) => e.stopPropagation()}
                                        data-testid={`button-more-${request.id}`}
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleRowClick(request)}>
                                        <Eye className="w-4 h-4 mr-2" /> View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <User className="w-4 h-4 mr-2" /> Assign Technician
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleOpenApprovalModal(request, "email")}>
                                        <Send className="w-4 h-4 mr-2" /> Send Email for Approval
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleOpenApprovalModal(request, "verbal")}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Log Verbal Approval
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reassigned Jobs Tab */}
          <TabsContent value="reassigned" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">Reassigned Jobs</CardTitle>
                  <Badge className="bg-[#0077b6]/10 text-[#0077b6] border-[#0077b6]/20">
                    {jobReassignments.length} Reassignment{jobReassignments.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {jobReassignments.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Shuffle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No reassigned jobs</p>
                    <p className="text-sm">Jobs will appear here when technicians are changed after initial assignment</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b-2 border-slate-200">
                          <TableHead className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Job #</TableHead>
                          <TableHead className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Property</TableHead>
                          <TableHead className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Original Technician</TableHead>
                          <TableHead className="text-left text-xs font-semibold text-slate-600 px-4 py-3">New Technician</TableHead>
                          <TableHead className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Date Reassigned</TableHead>
                          <TableHead className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobReassignments.map((reassignment, index) => (
                          <TableRow 
                            key={reassignment.id} 
                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 1 ? 'bg-slate-25' : ''}`}
                            data-testid={`row-reassignment-${reassignment.id}`}
                          >
                            <TableCell className="px-4 py-3">
                              <span className="font-semibold text-slate-900 text-sm">{reassignment.jobNumber || "—"}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <span className="text-sm text-slate-700 font-medium">{reassignment.propertyName || "—"}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                                    {(reassignment.originalTechName || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-slate-600">{reassignment.originalTechName || "Unassigned"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-[#0077b6] text-white text-xs">
                                    {(reassignment.newTechName || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-[#0077b6] font-medium">{reassignment.newTechName || "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <span className="text-sm text-slate-500">{formatDate(reassignment.reassignedAt)}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3 max-w-[200px]">
                              <span className="text-sm text-slate-600 truncate block" title={reassignment.reason || ""}>
                                {reassignment.reason || "—"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <HorizontalFiltersPanel />
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">Completed Jobs Log</CardTitle>
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
                                <TableCell className="text-right font-semibold text-[#22c55e]">
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
                                      <div className="p-4 bg-[#0077b6]/10">
                                        <div className="flex items-center gap-2 mb-3">
                                          <FileText className="w-5 h-5 text-[#0077b6]" />
                                          <h4 className="font-bold text-sm text-[#0077b6] uppercase tracking-wide">Estimate Details</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Quote Description</p>
                                            <p className="text-sm font-medium text-slate-900">{repair.description || "—"}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Property & Customer</p>
                                            <p className="text-sm font-medium text-slate-900">{repair.propertyName || "—"}</p>
                                            <p className="text-xs text-slate-500">{repair.customerName || "—"}</p>
                                            <p className="text-xs text-slate-400">{repair.address || "—"}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Estimate Date</p>
                                            <p className="text-sm text-slate-900">{formatDate(repair.jobDate)}</p>
                                            <p className="text-xs text-slate-500 mt-1">Created</p>
                                            <p className="text-xs text-slate-400">{formatDateTime(repair.createdAt)}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Service Tech (Reported)</p>
                                            <p className="text-sm text-slate-900">{repair.technicianName || "—"}</p>
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
                                              <span className="font-bold text-[#22c55e]">{formatCurrency(repair.totalAmount)}</span>
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
                                                  className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-[#0077b6]"
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
                                      <div className="p-4 bg-[#22c55e]/10">
                                        <div className="flex items-center gap-2 mb-3">
                                          <CheckCircle className="w-5 h-5 text-[#22c55e]" />
                                          <h4 className="font-bold text-sm text-[#22c55e] uppercase tracking-wide">Completion Details</h4>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Repair Tech(s)</p>
                                            <p className="text-sm font-medium text-slate-900">{repair.technicianName || "Not assigned"}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Date & Time Completed</p>
                                            <p className="text-sm text-slate-900">{formatDateTime(repair.updatedAt)}</p>
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
                                            <p className="text-sm text-slate-900">{repair.technicianName || "Not recorded"}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Completion Notes</p>
                                            <div className="bg-white/50 rounded p-2 border border-slate-200">
                                              <p className="text-sm text-slate-900 whitespace-pre-wrap">{repair.notes || "No notes recorded"}</p>
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
            <HorizontalFiltersPanel />
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">Estimates Log</CardTitle>
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
                                  <TableCell className="text-right font-semibold text-slate-900">
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
                                            <p><span className="text-slate-500">EST#:</span> {estimate.estimateNumber || "—"}</p>
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
            <HorizontalFiltersPanel />
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">Emergencies Log</CardTitle>
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
            <HorizontalFiltersPanel />
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">Parts Orders Log</CardTitle>
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
                    <SelectItem key={tech.id} value={tech.id}>
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

      {/* Create Repair Request Modal */}
      <RepairRequestForm
        open={showCreateRepairRequestModal}
        onOpenChange={setShowCreateRepairRequestModal}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/repair-requests"] });
        }}
      />

      {/* Repair Request Detail Panel */}
      <Sheet open={showDetailPanel} onOpenChange={setShowDetailPanel}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          <SheetHeader className="bg-[#1e3a5f] -mx-6 -mt-6 px-6 py-4 mb-4">
            <SheetTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Repair Request Details
            </SheetTitle>
            <SheetDescription className="text-white/70">
              {selectedRepairRequest?.requestNumber || ""}
            </SheetDescription>
          </SheetHeader>
          
          {selectedRepairRequest && (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="flex-1 bg-[#f97316] hover:bg-[#f97316]/90 text-white"
                      data-testid="button-detail-approval"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send for Approval
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-56">
                    <DropdownMenuItem onClick={() => { setShowDetailPanel(false); handleOpenApprovalModal(selectedRepairRequest, "email"); }}>
                      <Send className="w-4 h-4 mr-2" /> Send Email for Approval
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setShowDetailPanel(false); handleOpenApprovalModal(selectedRepairRequest, "verbal"); }}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Log Verbal Approval
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Basic Info */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">RR #</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedRepairRequest.requestNumber || "—"}</p>
                  </div>
                  {selectedRepairRequest.isUrgent && (
                    <div>
                      <p className="text-xs font-medium text-slate-500">Priority</p>
                      <Badge variant="outline" className="bg-red-600 text-white border-red-600">
                        Urgent
                      </Badge>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Property</p>
                  <p className="text-sm font-medium text-slate-900">{selectedRepairRequest.propertyName}</p>
                  {selectedRepairRequest.address && (
                    <p className="text-xs text-slate-500">{selectedRepairRequest.address}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Reported By</p>
                  <p className="text-sm text-slate-700">{getReportedByLabel(selectedRepairRequest.reportedBy, selectedRepairRequest.reportedByName)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Date</p>
                  <p className="text-sm text-slate-700">
                    {selectedRepairRequest.requestDate ? new Date(selectedRepairRequest.requestDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "—"}
                  </p>
                </div>
              </div>

              {/* Issue Description */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Issue Description</h4>
                <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
                  {selectedRepairRequest.issueDescription || "No description provided"}
                </p>
              </div>

              {/* Office Notes */}
              {selectedRepairRequest.officeNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Office Notes (Internal)
                  </h4>
                  <p className="text-sm text-amber-700">{selectedRepairRequest.officeNotes}</p>
                </div>
              )}

              {/* Photos */}
              {selectedRepairRequest.photos && selectedRepairRequest.photos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Photos ({selectedRepairRequest.photos.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedRepairRequest.photos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                        <img 
                          src={photo} 
                          alt={`Photo ${idx + 1}`} 
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line Items / Parts Needed */}
              {selectedRepairRequest.lineItems && (selectedRepairRequest.lineItems as any[]).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Line Items / Parts Needed
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Item</th>
                          <th className="text-center px-3 py-2 font-medium text-slate-600">Qty</th>
                          <th className="text-right px-3 py-2 font-medium text-slate-600">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedRepairRequest.lineItems as any[]).map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-700">{item.partName || item.description || "Item"}</td>
                            <td className="px-3 py-2 text-center text-slate-600">{item.quantity || 1}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{formatCurrency((item.unitPrice || 0) * 100)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Customer Notes */}
              {selectedRepairRequest.customerNote && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Customer Notes</h4>
                  <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
                    {selectedRepairRequest.customerNote}
                  </p>
                </div>
              )}

              {/* Memo */}
              {selectedRepairRequest.memo && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Memo</h4>
                  <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
                    {selectedRepairRequest.memo}
                  </p>
                </div>
              )}

              {/* Tech Notes */}
              {selectedRepairRequest.techNotes && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Tech Notes</h4>
                  <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
                    {selectedRepairRequest.techNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Approval Request Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-[#1e3a5f] -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
            <DialogTitle className="text-white flex items-center gap-2">
              {approvalType === "email" ? <Mail className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              {approvalType === "email" ? "Send Email for Approval" : "Log Verbal Approval"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {/* Auto-filled fields */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Repair Request #</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedRepairRequest?.requestNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Property</p>
                  <p className="text-sm font-medium text-slate-700">{selectedRepairRequest?.propertyName || "—"}</p>
                </div>
              </div>
            </div>

            {/* Repair Technician */}
            <div>
              <Label htmlFor="repair-tech" className="text-sm font-medium">Repair Technician</Label>
              <Select
                value={approvalForm.repairTechnicianId}
                onValueChange={(value) => setApprovalForm({ ...approvalForm, repairTechnicianId: value })}
              >
                <SelectTrigger className="mt-1" data-testid="select-repair-tech">
                  <SelectValue placeholder="Select repair technician..." />
                </SelectTrigger>
                <SelectContent>
                  {repairTechnicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>{tech.firstName} {tech.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issue Description */}
            <div>
              <Label htmlFor="issue-description" className="text-sm font-medium">Issue Description</Label>
              <Textarea
                id="issue-description"
                value={approvalForm.issueDescription}
                onChange={(e) => setApprovalForm({ ...approvalForm, issueDescription: e.target.value })}
                className="mt-1 min-h-[60px]"
                data-testid="textarea-issue-description"
              />
            </div>

            {/* Estimated Cost */}
            <div>
              <Label htmlFor="estimated-cost" className="text-sm font-medium">Estimated Cost</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="estimated-cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={approvalForm.estimatedCost}
                  onChange={(e) => setApprovalForm({ ...approvalForm, estimatedCost: e.target.value })}
                  className="pl-10"
                  data-testid="input-estimated-cost"
                />
              </div>
            </div>

            {/* Approval Method */}
            <div>
              <Label className="text-sm font-medium">Approval Method</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  type="button"
                  variant={approvalForm.approvalMethod === "email" ? "default" : "outline"}
                  className={approvalForm.approvalMethod === "email" ? "bg-[#0078D4] hover:bg-[#0078D4]/90" : ""}
                  onClick={() => setApprovalForm({ ...approvalForm, approvalMethod: "email" })}
                  data-testid="button-method-email"
                >
                  <Mail className="w-4 h-4 mr-2" /> Email
                </Button>
                <Button
                  type="button"
                  variant={approvalForm.approvalMethod === "phone_call" ? "default" : "outline"}
                  className={approvalForm.approvalMethod === "phone_call" ? "bg-[#0078D4] hover:bg-[#0078D4]/90" : ""}
                  onClick={() => setApprovalForm({ ...approvalForm, approvalMethod: "phone_call" })}
                  data-testid="button-method-phone"
                >
                  <Phone className="w-4 h-4 mr-2" /> Phone Call
                </Button>
                <Button
                  type="button"
                  variant={approvalForm.approvalMethod === "text_message" ? "default" : "outline"}
                  className={approvalForm.approvalMethod === "text_message" ? "bg-[#0078D4] hover:bg-[#0078D4]/90" : ""}
                  onClick={() => setApprovalForm({ ...approvalForm, approvalMethod: "text_message" })}
                  data-testid="button-method-text"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Text Message
                </Button>
                <Button
                  type="button"
                  variant={approvalForm.approvalMethod === "chat" ? "default" : "outline"}
                  className={approvalForm.approvalMethod === "chat" ? "bg-[#0078D4] hover:bg-[#0078D4]/90" : ""}
                  onClick={() => setApprovalForm({ ...approvalForm, approvalMethod: "chat" })}
                  data-testid="button-method-chat"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Chat
                </Button>
              </div>
            </div>

            {/* Email Fields - Only show if email type */}
            {approvalType === "email" && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <Label htmlFor="email-recipient" className="text-sm font-medium">Email Recipient</Label>
                  <Input
                    id="email-recipient"
                    type="email"
                    placeholder="recipient@example.com"
                    value={approvalForm.emailRecipient}
                    onChange={(e) => setApprovalForm({ ...approvalForm, emailRecipient: e.target.value })}
                    className="mt-1"
                    data-testid="input-email-recipient"
                  />
                </div>
                <div>
                  <Label htmlFor="email-subject" className="text-sm font-medium">Email Subject</Label>
                  <Input
                    id="email-subject"
                    value={approvalForm.emailSubject}
                    onChange={(e) => setApprovalForm({ ...approvalForm, emailSubject: e.target.value })}
                    className="mt-1"
                    data-testid="input-email-subject"
                  />
                </div>
                <div>
                  <Label htmlFor="email-body" className="text-sm font-medium">Email Body Preview</Label>
                  <Textarea
                    id="email-body"
                    value={approvalForm.emailBody}
                    onChange={(e) => setApprovalForm({ ...approvalForm, emailBody: e.target.value })}
                    className="mt-1 min-h-[150px] font-mono text-xs"
                    data-testid="textarea-email-body"
                  />
                </div>
              </div>
            )}

            {/* Verbal Approval Fields */}
            {approvalType === "verbal" && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <Label htmlFor="approved-by" className="text-sm font-medium">Approved By</Label>
                  <Input
                    id="approved-by"
                    placeholder="Name of person who approved"
                    value={approvalForm.approvedBy}
                    onChange={(e) => setApprovalForm({ ...approvalForm, approvedBy: e.target.value })}
                    className="mt-1"
                    data-testid="input-approved-by"
                  />
                </div>
                <div>
                  <Label htmlFor="approval-datetime" className="text-sm font-medium">Approval Date/Time</Label>
                  <Input
                    id="approval-datetime"
                    type="datetime-local"
                    value={approvalForm.approvalDateTime}
                    onChange={(e) => setApprovalForm({ ...approvalForm, approvalDateTime: e.target.value })}
                    className="mt-1"
                    data-testid="input-approval-datetime"
                  />
                </div>
              </div>
            )}

            {/* Confirmation Notes */}
            <div>
              <Label htmlFor="confirmation-notes" className="text-sm font-medium">Confirmation Notes</Label>
              <Textarea
                id="confirmation-notes"
                placeholder={approvalType === "verbal" 
                  ? "e.g., Spoke with property manager John Smith, confirmed repair is approved to proceed" 
                  : "Add any additional notes..."}
                value={approvalForm.confirmationNotes}
                onChange={(e) => setApprovalForm({ ...approvalForm, confirmationNotes: e.target.value })}
                className="mt-1 min-h-[80px]"
                data-testid="textarea-confirmation-notes"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowApprovalModal(false)}
              data-testid="button-cancel-approval"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#f97316] hover:bg-[#f97316]/90 text-white"
              onClick={submitApprovalAndConvert}
              disabled={createApprovalRequestMutation.isPending || (approvalType === "verbal" && !approvalForm.approvedBy)}
              data-testid="button-submit-approval"
            >
              {createApprovalRequestMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileEdit className="w-4 h-4 mr-2" />
              )}
              Convert to Estimate & Log Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Estimate Confirmation Modal */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-[#0078D4]" />
              Convert to Estimate
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              This will create a new estimate from repair request <strong>{selectedRepairRequest?.requestNumber}</strong> for:
            </p>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs font-medium text-slate-500">Property</p>
                <p className="text-sm font-semibold text-slate-900">{selectedRepairRequest?.propertyName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Issue</p>
                <p className="text-sm text-slate-700">{selectedRepairRequest?.issueDescription}</p>
              </div>
              {selectedRepairRequest?.lineItems && (selectedRepairRequest.lineItems as any[]).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Line Items</p>
                  <p className="text-sm text-slate-700">{(selectedRepairRequest.lineItems as any[]).length} items will be carried over</p>
                </div>
              )}
              {selectedRepairRequest?.photos && selectedRepairRequest.photos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Photos</p>
                  <p className="text-sm text-slate-700">{selectedRepairRequest.photos.length} photos will be attached</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertModal(false)}
              data-testid="button-cancel-convert"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0078D4] hover:bg-[#0078D4]/90 text-white"
              onClick={confirmConvertToEstimate}
              disabled={convertToEstimateMutation.isPending}
              data-testid="button-confirm-convert"
            >
              {convertToEstimateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileEdit className="w-4 h-4 mr-2" />
              )}
              Create Estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
