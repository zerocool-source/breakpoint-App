import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { 
  FileText, Loader2, Wrench, Building2, User, Calendar as CalendarIcon, 
  Plus, Trash2, Search, SortAsc, SortDesc, MapPin, Clock, Image, X,
  ChevronLeft, ChevronRight
} from "lucide-react";

interface ServiceRepairJob {
  id: string;
  jobNumber: string;
  propertyId: string;
  propertyName: string;
  address: string | null;
  technicianId: string | null;
  technicianName: string | null;
  description: string;
  notes: string | null;
  photos: string[] | null;
  laborAmount: number;
  partsAmount: number;
  totalAmount: number;
  status: string;
  jobDate: string;
  estimateId: string | null;
  invoiceId: string | null;
  createdAt: string;
  batchedAt: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]" },
  selected: { label: "Selected", color: "bg-blue-100 text-blue-700 border-blue-200" },
  estimated: { label: "Estimated", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  invoiced: { label: "Invoiced", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "—";
  }
}

function generateJobNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SR-${year}-${random}`;
}

const emptyJobForm = {
  propertyName: "",
  technicianName: "",
  description: "",
  laborAmount: "",
  partsAmount: "",
  notes: "",
};

type SortOption = "newest" | "oldest" | "sr_asc" | "sr_desc";
type DateRangeOption = "all" | "today" | "week" | "month" | "custom";

export default function ServiceRepairs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRepairs, setSelectedRepairs] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeOption>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const { data: serviceRepairsData, isLoading } = useQuery({
    queryKey: ["service-repairs"],
    queryFn: async () => {
      const response = await fetch("/api/service-repairs?maxAmount=50000");
      if (!response.ok) throw new Error("Failed to fetch service repairs");
      return response.json();
    },
    refetchInterval: 10000,
  });

  const serviceRepairs: ServiceRepairJob[] = serviceRepairsData || [];
  
  // Extract unique technicians and properties for filters
  const uniqueTechnicians = useMemo(() => {
    const techs = new Set<string>();
    serviceRepairs.forEach(r => {
      if (r.technicianName) techs.add(r.technicianName);
    });
    return Array.from(techs).sort();
  }, [serviceRepairs]);
  
  const uniqueProperties = useMemo(() => {
    const props = new Map<string, string>();
    serviceRepairs.forEach(r => {
      if (r.propertyId && r.propertyName) {
        props.set(r.propertyId, r.propertyName);
      }
    });
    return Array.from(props.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [serviceRepairs]);
  
  // Filter and sort logic
  const filteredAndSortedRepairs = useMemo(() => {
    let filtered = [...serviceRepairs];
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    // Search filter (SR# or property name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.jobNumber.toLowerCase().includes(query) ||
        r.propertyName.toLowerCase().includes(query)
      );
    }
    
    // Technician filter
    if (technicianFilter !== "all") {
      filtered = filtered.filter(r => r.technicianName === technicianFilter);
    }
    
    // Property filter
    if (propertyFilter !== "all") {
      filtered = filtered.filter(r => r.propertyId === propertyFilter);
    }
    
    // Date range filter
    if (dateRangeFilter !== "all") {
      const now = new Date();
      let startDate: Date | null = null;
      
      switch (dateRangeFilter) {
        case "today":
          startDate = startOfDay(now);
          break;
        case "week":
          startDate = subDays(now, 7);
          break;
        case "month":
          startDate = subDays(now, 30);
          break;
      }
      
      if (startDate) {
        filtered = filtered.filter(r => {
          const jobDate = new Date(r.jobDate || r.createdAt);
          return isAfter(jobDate, startDate!);
        });
      }
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "sr_asc":
          return a.jobNumber.localeCompare(b.jobNumber);
        case "sr_desc":
          return b.jobNumber.localeCompare(a.jobNumber);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [serviceRepairs, statusFilter, searchQuery, technicianFilter, propertyFilter, dateRangeFilter, sortOption]);

  // Group repairs by property for container view
  const repairsByProperty = useMemo(() => {
    const grouped = new Map<string, { propertyId: string; propertyName: string; address: string; repairs: ServiceRepairJob[] }>();
    
    filteredAndSortedRepairs.forEach(repair => {
      const key = repair.propertyId || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, {
          propertyId: repair.propertyId,
          propertyName: repair.propertyName || 'Unknown Property',
          address: repair.address || '',
          repairs: []
        });
      }
      grouped.get(key)!.repairs.push(repair);
    });
    
    return Array.from(grouped.values()).sort((a, b) => a.propertyName.localeCompare(b.propertyName));
  }, [filteredAndSortedRepairs]);
  
  const statusCounts = {
    all: serviceRepairs.length,
    pending: serviceRepairs.filter(r => r.status === 'pending').length,
    selected: serviceRepairs.filter(r => r.status === 'selected').length,
    estimated: serviceRepairs.filter(r => r.status === 'estimated').length,
    invoiced: serviceRepairs.filter(r => r.status === 'invoiced').length,
  };

  const toggleRepairSelection = (id: string) => {
    setSelectedRepairs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const selectAllRepairs = () => {
    const pendingIds = filteredAndSortedRepairs.filter(r => r.status === 'pending').map(r => r.id);
    setSelectedRepairs(new Set(pendingIds));
  };
  
  const clearRepairSelection = () => {
    setSelectedRepairs(new Set());
  };
  
  const openLightbox = (photos: string[], index: number) => {
    setLightboxImages(photos);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  
  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  const batchToEstimateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch("/api/service-repairs/batch-to-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error("Failed to batch to estimate");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["service-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      clearRepairSelection();
      toast({
        title: "Estimate Created",
        description: `Created estimate from ${data.updatedJobCount} service repair(s)`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create estimate from repairs",
        variant: "destructive",
      });
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (job: any) => {
      const response = await fetch("/api/service-repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      if (!response.ok) throw new Error("Failed to create service repair job");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-repairs"] });
      setShowAddDialog(false);
      setJobForm(emptyJobForm);
      toast({
        title: "Job Created",
        description: "Service repair job has been added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create service repair job",
        variant: "destructive",
      });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/service-repairs/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete service repair job");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-repairs"] });
      toast({
        title: "Job Deleted",
        description: "Service repair job has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete service repair job",
        variant: "destructive",
      });
    },
  });

  const handleAddJob = () => {
    const laborCents = Math.round(parseFloat(jobForm.laborAmount || "0") * 100);
    const partsCents = Math.round(parseFloat(jobForm.partsAmount || "0") * 100);
    const totalCents = laborCents + partsCents;
    
    createJobMutation.mutate({
      jobNumber: generateJobNumber(),
      propertyId: `prop-${Date.now()}`,
      propertyName: jobForm.propertyName,
      technicianName: jobForm.technicianName,
      description: jobForm.description,
      laborAmount: laborCents,
      partsAmount: partsCents,
      totalAmount: totalCents,
      notes: jobForm.notes,
      status: "pending",
    });
  };

  const selectedTotal = Array.from(selectedRepairs).reduce((sum, id) => {
    const repair = serviceRepairs.find(r => r.id === id);
    return sum + (repair?.totalAmount || 0);
  }, 0);

  const pendingInSelection = Array.from(selectedRepairs).filter(id => {
    const repair = serviceRepairs.find(r => r.id === id);
    return repair?.status === 'pending';
  });

  const clearAllFilters = () => {
    setSearchQuery("");
    setTechnicianFilter("all");
    setPropertyFilter("all");
    setDateRangeFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchQuery || technicianFilter !== "all" || propertyFilter !== "all" || dateRangeFilter !== "all" || statusFilter !== "all";

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Service Repairs</h1>
            <p className="text-[#64748B]">
              Manage Code Canvas service repair submissions
              <span className="ml-2 font-medium text-[#4169E1]">
                ({filteredAndSortedRepairs.length} of {serviceRepairs.length} repairs)
              </span>
            </p>
          </div>
          <Button 
            className="bg-[#F97316] hover:bg-[#EA580C]"
            onClick={() => setShowAddDialog(true)}
            data-testid="button-add-job"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Job
          </Button>
        </div>

        {/* Search and Filters Bar */}
        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search Input */}
              <div className="flex-1 min-w-[250px]">
                <Label className="text-xs text-slate-500 mb-1 block">Search by SR# or Property</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search SR-2025-0001 or property name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              
              {/* Date Range Filter */}
              <div className="w-[150px]">
                <Label className="text-xs text-slate-500 mb-1 block">Date Range</Label>
                <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as DateRangeOption)}>
                  <SelectTrigger data-testid="select-date-range">
                    <SelectValue placeholder="All dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Technician Filter */}
              <div className="w-[180px]">
                <Label className="text-xs text-slate-500 mb-1 block">Technician</Label>
                <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                  <SelectTrigger data-testid="select-technician">
                    <SelectValue placeholder="All technicians" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Technicians</SelectItem>
                    {uniqueTechnicians.map(tech => (
                      <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Property Filter */}
              <div className="w-[200px]">
                <Label className="text-xs text-slate-500 mb-1 block">Property</Label>
                <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                  <SelectTrigger data-testid="select-property">
                    <SelectValue placeholder="All properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {uniqueProperties.map(prop => (
                      <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sort */}
              <div className="w-[160px]">
                <Label className="text-xs text-slate-500 mb-1 block">Sort By</Label>
                <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                  <SelectTrigger data-testid="select-sort">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="sr_asc">SR# (A-Z)</SelectItem>
                    <SelectItem value="sr_desc">SR# (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-slate-500">
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Tabs */}
        <div className="flex gap-2 border-b pb-2">
          {Object.entries(statusCounts).map(([key, count]) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "ghost"}
              size="sm"
              className={statusFilter === key ? "bg-[#4169E1]" : ""}
              onClick={() => setStatusFilter(key)}
              data-testid={`tab-${key}`}
            >
              {key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1)}
              <Badge variant="secondary" className="ml-2 text-xs">
                {count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Batch Actions Bar */}
        {selectedRepairs.size > 0 && pendingInSelection.length > 0 && (
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Checkbox
              checked={selectedRepairs.size === filteredAndSortedRepairs.filter(r => r.status === 'pending').length}
              onCheckedChange={(checked) => checked ? selectAllRepairs() : clearRepairSelection()}
              data-testid="checkbox-select-all-repairs"
            />
            <span className="text-sm text-slate-600">
              {selectedRepairs.size} selected
            </span>
            <span className="text-sm font-semibold text-[#1E293B]">
              Total: {formatCurrency(selectedTotal)}
            </span>
            <Button 
              size="sm" 
              className="bg-[#4169E1] hover:bg-[#1E40AF] ml-auto"
              onClick={() => batchToEstimateMutation.mutate(pendingInSelection)}
              disabled={batchToEstimateMutation.isPending}
              data-testid="button-batch-to-estimate"
            >
              {batchToEstimateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-1" />
              )}
              Create Estimate ({pendingInSelection.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={clearRepairSelection}>
              Clear
            </Button>
          </div>
        )}

        {/* Service Repair Cards - Grouped by Property */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
          </div>
        ) : filteredAndSortedRepairs.length === 0 ? (
          <div className="text-center py-12 text-[#64748B]">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No service repairs found</p>
            <p className="text-sm mt-2">
              {hasActiveFilters 
                ? "Try adjusting your filters or search query" 
                : "Service repairs will appear here when submitted from Code Canvas"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-6">
              {repairsByProperty.map((propertyGroup) => (
                <Card 
                  key={propertyGroup.propertyId} 
                  className="bg-white border border-slate-200 shadow-sm"
                  data-testid={`property-container-${propertyGroup.propertyId}`}
                >
                  <CardHeader className="pb-3 bg-slate-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F97316] flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-[#1E293B]">
                            {propertyGroup.propertyName}
                          </CardTitle>
                          {propertyGroup.address && (
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {propertyGroup.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-[#4169E1] text-white">
                        {propertyGroup.repairs.length} {propertyGroup.repairs.length === 1 ? 'Repair' : 'Repairs'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {propertyGroup.repairs.map((repair) => {
                        const config = statusConfig[repair.status] || statusConfig.pending;
                        const photos = repair.photos || [];
                        
                        return (
                          <div 
                            key={repair.id} 
                            className={`border-l-4 rounded-lg p-4 transition-all ${
                              selectedRepairs.has(repair.id) 
                                ? "border-l-[#4169E1] bg-blue-50/50" 
                                : "border-l-[#F97316] bg-slate-50 hover:bg-slate-100"
                            }`}
                            data-testid={`card-repair-${repair.id}`}
                          >
                            <div className="flex gap-4">
                              {/* Checkbox for pending items */}
                              {repair.status === 'pending' && (
                                <div className="pt-1">
                                  <Checkbox
                                    checked={selectedRepairs.has(repair.id)}
                                    onCheckedChange={() => toggleRepairSelection(repair.id)}
                                    data-testid={`checkbox-repair-${repair.id}`}
                                  />
                                </div>
                              )}
                              
                              {/* Main Content */}
                              <div className="flex-1 space-y-3">
                                {/* Header Row: SR# prominent */}
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge 
                                      className="text-lg font-bold px-3 py-1 bg-[#4169E1] text-white"
                                      data-testid={`badge-sr-${repair.jobNumber}`}
                                    >
                                      {repair.jobNumber}
                                    </Badge>
                                    <Badge className={`${config.color} border`}>
                                      {config.label}
                                    </Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => deleteJobMutation.mutate(repair.id)}
                                    disabled={deleteJobMutation.isPending}
                                    data-testid={`button-delete-${repair.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                
                                {/* Technician & Timestamp */}
                                <div className="flex items-center gap-6 text-sm text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-400" />
                                    <span>{repair.technicianName || "Unassigned"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span>{formatDateTime(repair.jobDate || repair.createdAt)}</span>
                                  </div>
                                </div>
                                
                                {/* Description */}
                                {repair.description && (
                                  <div className="text-slate-700">
                                    <p className="font-medium text-sm text-slate-500 mb-1">Description</p>
                                    <p>{repair.description}</p>
                                  </div>
                                )}
                                
                                {/* Notes */}
                                {repair.notes && (
                                  <div className="text-slate-600 text-sm bg-amber-50 p-2 rounded border border-amber-100">
                                    <p className="font-medium text-amber-700 mb-1">Notes</p>
                                    <p>{repair.notes}</p>
                                  </div>
                                )}
                                
                                {/* Photos Gallery */}
                                {photos.length > 0 && (
                                  <div>
                                    <p className="font-medium text-sm text-slate-500 mb-2 flex items-center gap-1">
                                      <Image className="w-4 h-4" />
                                      Attached Photos ({photos.length})
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                      {photos.map((photo, idx) => (
                                        <div
                                          key={idx}
                                          className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-[#F97316] transition-all"
                                          onClick={() => openLightbox(photos, idx)}
                                          data-testid={`photo-${repair.id}-${idx}`}
                                        >
                                          <img
                                            src={photo}
                                            alt={`Repair photo ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Amounts */}
                                <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
                                  <div className="text-sm">
                                    <span className="text-slate-500">Labor:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(repair.laborAmount)}</span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-slate-500">Parts:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(repair.partsAmount)}</span>
                                  </div>
                                  <div className="text-sm font-bold text-[#4169E1] ml-auto">
                                    Total: {formatCurrency(repair.totalAmount)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6" />
          </Button>
          
          {lightboxImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev > 0 ? prev - 1 : lightboxImages.length - 1));
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev < lightboxImages.length - 1 ? prev + 1 : 0));
                }}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}
          
          <img
            src={lightboxImages[lightboxIndex]}
            alt={`Photo ${lightboxIndex + 1} of ${lightboxImages.length}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="absolute bottom-4 text-white text-sm">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
        </div>
      )}

      {/* Add Job Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#F97316]" />
              Add Service Repair Job
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="propertyName">Property Name *</Label>
              <Input
                id="propertyName"
                value={jobForm.propertyName}
                onChange={(e) => setJobForm({ ...jobForm, propertyName: e.target.value })}
                placeholder="e.g., Sunset Palms HOA"
                data-testid="input-property-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="technicianName">Technician Name</Label>
              <Input
                id="technicianName"
                value={jobForm.technicianName}
                onChange={(e) => setJobForm({ ...jobForm, technicianName: e.target.value })}
                placeholder="e.g., Mike Rodriguez"
                data-testid="input-technician-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                placeholder="Describe the repair work performed..."
                rows={3}
                data-testid="input-description"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="laborAmount">Labor ($)</Label>
                <Input
                  id="laborAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={jobForm.laborAmount}
                  onChange={(e) => setJobForm({ ...jobForm, laborAmount: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-labor-amount"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="partsAmount">Parts ($)</Label>
                <Input
                  id="partsAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={jobForm.partsAmount}
                  onChange={(e) => setJobForm({ ...jobForm, partsAmount: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-parts-amount"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={jobForm.notes}
                onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
                data-testid="input-notes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-[#F97316] hover:bg-[#EA580C]"
              onClick={handleAddJob}
              disabled={!jobForm.propertyName || !jobForm.description || createJobMutation.isPending}
              data-testid="button-save-job"
            >
              {createJobMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
