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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wrench, Loader2, CheckCircle, Clock, AlertTriangle,
  User, MapPin, DollarSign, Calendar, Eye, Users, TrendingUp, Target, FileText, MoreVertical, CalendarDays,
  Download, X, AlertCircle, Package, Search, Filter
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
      repair.propertyAddress || "",
      repair.technicianName || "Unassigned",
      repair.priority || "normal",
      statusConfig[repair.status || "pending"]?.label || repair.status || "",
      formatDate(repair.jobDate || repair.createdAt),
      repair.status === "completed" ? formatDate(repair.updatedAt) : "",
      (repair.techNotes || "").replace(/,/g, ";").replace(/\n/g, " ")
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <FiltersPanel />
              </div>
              <div className="lg:col-span-3">
                {filteredRepairs.filter(r => r.status === "completed").length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No completed repairs{hasActiveFilters ? " matching filters" : ""}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="max-h-[600px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredRepairs.filter(r => r.status === "completed").map(renderRepairCard)}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="estimates-log" className="mt-4">
            {estimatesFromRepairs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No estimates submitted by repair technicians</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-3">
                  {estimatesFromRepairs.map((estimate: any) => {
                    const statusColors: Record<string, string> = {
                      draft: "bg-slate-100 text-slate-700",
                      pending_approval: "bg-[#FF8000]1A text-[#D35400]",
                      approved: "bg-[#22D69A]1A text-[#22D69A]",
                      rejected: "bg-red-100 text-red-600",
                      needs_scheduling: "bg-[#0078D4]1A text-[#0078D4]",
                      scheduled: "bg-[#17BEBB]1A text-[#0D9488]",
                      completed: "bg-[#22D69A]1A text-[#22D69A]",
                      ready_to_invoice: "bg-amber-100 text-amber-700",
                      invoiced: "bg-purple-100 text-purple-700",
                    };
                    const statusLabels: Record<string, string> = {
                      draft: "Draft",
                      pending_approval: "Pending Approval",
                      approved: "Approved",
                      rejected: "Rejected",
                      needs_scheduling: "Needs Scheduling",
                      scheduled: "Scheduled",
                      completed: "Completed",
                      ready_to_invoice: "Ready to Invoice",
                      invoiced: "Invoiced",
                    };

                    return (
                      <Card key={estimate.id} className="border border-slate-200 hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-[#1E293B] truncate">
                                  {estimate.title || "Untitled Estimate"}
                                </span>
                                <Badge className={`${statusColors[estimate.status] || "bg-slate-100 text-slate-600"} text-xs`}>
                                  {statusLabels[estimate.status] || estimate.status}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {estimate.propertyName || "Unknown Property"}
                                </span>
                                {estimate.repairTechName && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {estimate.repairTechName}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(estimate.createdAt)}
                                </span>
                              </div>
                              {estimate.description && (
                                <p className="text-xs text-slate-600 mt-2 line-clamp-2">{estimate.description}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-semibold text-[#1E293B]">
                                {formatCurrency(estimate.totalAmount)}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-[#0078D4] hover:text-[#0078D4]/80 mt-1"
                                onClick={() => window.location.href = `/estimates?id=${estimate.id}`}
                              >
                                <Eye className="w-3 h-3 mr-1" /> View
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="emergencies" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <FiltersPanel />
              </div>
              <div className="lg:col-span-3">
                {filteredEmergencies.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No emergencies{hasActiveFilters ? " matching filters" : ""}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredEmergencies.map(renderEmergencyRow)}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="parts-ordered" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <FiltersPanel />
              </div>
              <div className="lg:col-span-3">
                <Card>
                  <CardContent className="py-12 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-lg mb-2">Parts Orders Coming Soon</p>
                    <p className="text-sm">This feature will display all parts orders submitted from the Repair Tech App.</p>
                    <p className="text-sm mt-2">Including: part name, property, requested by, order date, status, and processor.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
