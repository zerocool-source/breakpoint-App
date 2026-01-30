import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardCheck, CalendarIcon, User, MapPin, Loader2,
  Wrench, ClipboardList, Building2, Search, X, Activity,
  ChevronLeft, ChevronRight, Camera
} from "lucide-react";
import type { FieldEntry } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ParsedPayload {
  notes?: string;
  readings?: Record<string, any>;
  photos?: string[];
  serviceType?: string;
  propertyName?: string;
  checklist?: Array<{ item: string; checked: boolean }>;
  quickAction?: string;
  bodyOfWater?: string;
  poolName?: string;
  timestamp?: string;
}

interface QcInspection {
  id: string;
  supervisorId: string;
  supervisorName: string;
  propertyId: string | null;
  propertyName: string;
  propertyAddress: string | null;
  title: string;
  notes: string | null;
  photos: string[] | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ServiceRepair {
  id: string;
  propertyId: string | null;
  propertyName: string | null;
  technicianId: string | null;
  technicianName: string | null;
  description: string;
  laborCost: string | null;
  partsCost: string | null;
  totalCost: string | null;
  commissionRate: string | null;
  commissionAmount: string | null;
  serviceDate: string;
  photos: string[] | null;
  status: string;
  referenceNumber: string | null;
  createdAt: string;
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}

interface ActivityItem {
  id: string;
  type: "service_visit" | "repair" | "qc_inspection";
  technicianName: string;
  technicianRole: string;
  propertyName: string;
  date: Date;
  notes: string | null;
  status: string;
  photos: string[];
  title?: string;
  referenceNumber?: string;
  commissionRate?: string;
  commissionAmount?: string;
}

interface PropertyGroup {
  propertyName: string;
  activities: ActivityItem[];
  activitySummary: string;
}

type TeamFilter = "all" | "service" | "repair" | "supervisor";

const ITEMS_PER_PAGE = 10;

function parsePayload(payload: string | null): ParsedPayload {
  if (!payload) return {};
  try {
    return JSON.parse(payload);
  } catch {
    return { notes: payload };
  }
}

function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export default function Visits() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (dateRange.from) params.set("startDate", startOfDay(dateRange.from).toISOString());
    if (dateRange.to) params.set("endDate", endOfDay(dateRange.to).toISOString());
    return params.toString();
  };

  // Fetch visits (field entries)
  const { data: visits = [], isLoading: visitsLoading } = useQuery<FieldEntry[]>({
    queryKey: ["visits", dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/visits?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch visits");
      return response.json();
    },
  });

  // Fetch QC inspections
  const { data: qcInspectionsData, isLoading: qcLoading } = useQuery<{ inspections: QcInspection[] }>({
    queryKey: ["qc-inspections-all"],
    queryFn: async () => {
      const response = await fetch("/api/qc-inspections");
      if (!response.ok) return { inspections: [] };
      return response.json();
    },
  });

  // Fetch service repairs
  const { data: repairsData, isLoading: repairsLoading } = useQuery<{ repairs: ServiceRepair[] }>({
    queryKey: ["service-repairs-all"],
    queryFn: async () => {
      const response = await fetch("/api/tech-ops/service-repairs");
      if (!response.ok) return { repairs: [] };
      return response.json();
    },
  });

  // Fetch technicians for role info
  const { data: techniciansData } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["technicians-stored"],
    queryFn: async () => {
      const response = await fetch("/api/technicians/stored");
      if (!response.ok) return { technicians: [] };
      return response.json();
    },
  });

  const technicians = techniciansData?.technicians || [];
  const qcInspections = qcInspectionsData?.inspections || [];
  const repairs = repairsData?.repairs || [];

  // Build technician role map
  const techRoleMap = useMemo(() => {
    const map = new Map<string, string>();
    technicians.forEach(t => {
      map.set(`${t.firstName} ${t.lastName}`, t.role);
      map.set(t.id, t.role);
    });
    return map;
  }, [technicians]);

  // Transform all data into unified ActivityItems
  const allActivities: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    // Add visits (service technician activities)
    visits.forEach(visit => {
      const payload = parsePayload(visit.payload);
      const role = techRoleMap.get(visit.technicianName || "") || "service";
      items.push({
        id: `visit-${visit.id}`,
        type: "service_visit",
        technicianName: visit.technicianName || "Unknown",
        technicianRole: role,
        propertyName: payload.propertyName || "No property",
        date: new Date(visit.submittedAt || visit.createdAt || new Date()),
        notes: payload.notes || null,
        status: "completed",
        photos: payload.photos || [],
      });
    });

    // Add service repairs (repair technician activities)
    repairs.forEach(repair => {
      items.push({
        id: `repair-${repair.id}`,
        type: "repair",
        technicianName: repair.technicianName || "Unknown",
        technicianRole: "repair",
        propertyName: repair.propertyName || "No property",
        date: new Date(repair.serviceDate || repair.createdAt),
        notes: repair.description,
        status: repair.status,
        photos: repair.photos || [],
        referenceNumber: repair.referenceNumber || undefined,
        commissionRate: repair.commissionRate || undefined,
        commissionAmount: repair.commissionAmount || undefined,
      });
    });

    // Add QC inspections (supervisor activities)
    qcInspections.forEach(insp => {
      items.push({
        id: `qc-${insp.id}`,
        type: "qc_inspection",
        technicianName: insp.supervisorName || "Unknown",
        technicianRole: "supervisor",
        propertyName: insp.propertyName || "No property",
        date: new Date(insp.dueDate || insp.createdAt),
        notes: insp.notes,
        status: insp.status,
        photos: insp.photos || [],
        title: insp.title,
      });
    });

    // Sort by date descending
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [visits, qcInspections, repairs, techRoleMap]);

  // Get unique properties for filter
  const uniqueProperties = useMemo(() => {
    const props = new Set<string>();
    allActivities.forEach(a => {
      if (a.propertyName && a.propertyName !== "No property") {
        props.add(a.propertyName);
      }
    });
    return Array.from(props).sort();
  }, [allActivities]);

  // Count activities by team type
  const teamCounts = useMemo(() => {
    let service = 0, repair = 0, supervisor = 0;
    allActivities.forEach(a => {
      if (a.technicianRole === "service" || a.type === "service_visit") service++;
      else if (a.technicianRole === "repair" || a.type === "repair") repair++;
      else if (a.technicianRole === "supervisor" || a.type === "qc_inspection") supervisor++;
    });
    return { service, repair, supervisor, all: allActivities.length };
  }, [allActivities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return allActivities.filter(activity => {
      // Date filter
      if (dateRange.from && activity.date < startOfDay(dateRange.from)) return false;
      if (dateRange.to && activity.date > endOfDay(dateRange.to)) return false;

      // Property filter
      if (selectedProperty !== "all" && activity.propertyName !== selectedProperty) return false;

      // Type filter
      if (selectedType !== "all" && activity.type !== selectedType) return false;

      // Team filter
      if (teamFilter !== "all") {
        if (teamFilter === "service" && activity.type !== "service_visit") return false;
        if (teamFilter === "repair" && activity.type !== "repair") return false;
        if (teamFilter === "supervisor" && activity.type !== "qc_inspection") return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesProperty = activity.propertyName.toLowerCase().includes(search);
        const matchesTech = activity.technicianName.toLowerCase().includes(search);
        const matchesNotes = activity.notes?.toLowerCase().includes(search) || false;
        const matchesRef = activity.referenceNumber?.toLowerCase().includes(search) || false;
        if (!matchesProperty && !matchesTech && !matchesNotes && !matchesRef) return false;
      }

      return true;
    });
  }, [allActivities, dateRange, selectedProperty, selectedType, teamFilter, searchTerm]);

  // Group activities by property
  const propertyGroups: PropertyGroup[] = useMemo(() => {
    const groups = new Map<string, ActivityItem[]>();
    
    filteredActivities.forEach(activity => {
      const key = activity.propertyName;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(activity);
    });

    return Array.from(groups.entries())
      .map(([propertyName, activities]) => {
        // Build activity summary
        const visits = activities.filter(a => a.type === "service_visit").length;
        const repairsCount = activities.filter(a => a.type === "repair").length;
        const inspections = activities.filter(a => a.type === "qc_inspection").length;
        
        const parts: string[] = [];
        if (visits > 0) parts.push(`${visits} visit${visits !== 1 ? 's' : ''}`);
        if (repairsCount > 0) parts.push(`${repairsCount} repair${repairsCount !== 1 ? 's' : ''}`);
        if (inspections > 0) parts.push(`${inspections} inspection${inspections !== 1 ? 's' : ''}`);
        
        return {
          propertyName,
          activities: activities.sort((a, b) => b.date.getTime() - a.date.getTime()),
          activitySummary: parts.join(', ') || 'No activities',
        };
      })
      .sort((a, b) => a.propertyName.localeCompare(b.propertyName));
  }, [filteredActivities]);

  // Pagination
  const totalPages = Math.ceil(propertyGroups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedGroups = propertyGroups.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const isLoading = visitsLoading || qcLoading || repairsLoading;

  const openImageViewer = (images: string[], startIndex: number = 0) => {
    setSelectedImages(images);
    setCurrentImageIndex(startIndex);
    setImageDialogOpen(true);
  };

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProperty, selectedType, teamFilter, dateRange]);

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-60px)]">
        {/* Header Section */}
        <div className="p-4 border-b bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
            <span className="text-sm text-slate-500">
              {filteredActivities.length} total activities
            </span>
          </div>

          {/* Team Filter Tabs */}
          <div className="flex items-center gap-2">
            <Button
              variant={teamFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTeamFilter("all")}
              className={cn(
                "rounded-full h-8 px-4",
                teamFilter === "all" 
                  ? "bg-[#0077b6] hover:bg-[#005f8f] text-white" 
                  : "bg-white hover:bg-slate-100 border-slate-300"
              )}
              data-testid="filter-team-all"
            >
              All ({teamCounts.all})
            </Button>
            <Button
              variant={teamFilter === "service" ? "default" : "outline"}
              size="sm"
              onClick={() => setTeamFilter("service")}
              className={cn(
                "rounded-full h-8 px-4",
                teamFilter === "service" 
                  ? "bg-[#0077b6] hover:bg-[#005f8f] text-white" 
                  : "bg-white hover:bg-slate-100 border-slate-300"
              )}
              data-testid="filter-team-service"
            >
              Service Technicians ({teamCounts.service})
            </Button>
            <Button
              variant={teamFilter === "repair" ? "default" : "outline"}
              size="sm"
              onClick={() => setTeamFilter("repair")}
              className={cn(
                "rounded-full h-8 px-4",
                teamFilter === "repair" 
                  ? "bg-[#0077b6] hover:bg-[#005f8f] text-white" 
                  : "bg-white hover:bg-slate-100 border-slate-300"
              )}
              data-testid="filter-team-repair"
            >
              Repair Technicians ({teamCounts.repair})
            </Button>
            <Button
              variant={teamFilter === "supervisor" ? "default" : "outline"}
              size="sm"
              onClick={() => setTeamFilter("supervisor")}
              className={cn(
                "rounded-full h-8 px-4",
                teamFilter === "supervisor" 
                  ? "bg-[#0077b6] hover:bg-[#005f8f] text-white" 
                  : "bg-white hover:bg-slate-100 border-slate-300"
              )}
              data-testid="filter-team-supervisor"
            >
              Supervisors ({teamCounts.supervisor})
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by property, technician, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[220px] justify-start" data-testid="button-date-range">
                  <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Property Filter */}
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-[180px]" data-testid="filter-property">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {uniqueProperties.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[160px]" data-testid="filter-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="service_visit">Service Visits</SelectItem>
                <SelectItem value="repair">Repairs</SelectItem>
                <SelectItem value="qc_inspection">QC Inspections</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Activity List - Grouped by Property */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : paginatedGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{searchTerm || selectedProperty !== "all" || selectedType !== "all" || teamFilter !== "all" 
                ? "No activities match your filters" 
                : "No activities yet"}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {paginatedGroups.map((group) => (
                <div key={group.propertyName}>
                  {/* Property Header */}
                  <div 
                    className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-l-4 border-l-[#f59e0b]"
                    data-testid={`property-group-${group.propertyName}`}
                  >
                    <Building2 className="w-5 h-5 text-[#f59e0b]" />
                    <span className="font-semibold text-slate-900">{group.propertyName}</span>
                    <span className="text-sm text-slate-500">({group.activitySummary})</span>
                  </div>
                  
                  {/* Activities List */}
                  {group.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 px-4 py-3 pl-8 hover:bg-slate-50 transition-colors border-b border-slate-100"
                      data-testid={`activity-${activity.id}`}
                    >
                      {/* Type Icon */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        activity.type === "service_visit" && "bg-[#0077b6]/10",
                        activity.type === "repair" && "bg-[#f97316]/10",
                        activity.type === "qc_inspection" && "bg-[#14b8a6]/10"
                      )}>
                        {activity.type === "service_visit" && <Wrench className="w-4 h-4 text-[#0077b6]" />}
                        {activity.type === "repair" && <Wrench className="w-4 h-4 text-[#f97316]" />}
                        {activity.type === "qc_inspection" && <ClipboardList className="w-4 h-4 text-[#14b8a6]" />}
                      </div>
                      
                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {/* Description */}
                            <p className="text-sm text-slate-800 leading-snug">
                              {activity.title || activity.notes || (
                                activity.type === "service_visit" ? "Service Visit" :
                                activity.type === "repair" ? "Repair" : "QC Inspection"
                              )}
                            </p>
                            
                            {/* Meta info */}
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {activity.technicianName}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {formatDateShort(activity.date)}
                              </span>
                              {activity.commissionRate && activity.commissionAmount && (
                                <span className="text-[#22c55e] font-medium">
                                  💰 {activity.commissionRate}% (${parseFloat(activity.commissionAmount).toFixed(2)})
                                </span>
                              )}
                              {activity.photos.length > 0 && (
                                <button
                                  onClick={() => openImageViewer(activity.photos, 0)}
                                  className="flex items-center gap-1 text-[#0077b6] hover:text-[#005f8f]"
                                >
                                  <Camera className="w-3 h-3" />
                                  {activity.photos.length}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Reference number */}
                          {activity.referenceNumber && (
                            <span className="text-xs font-medium text-[#0077b6] shrink-0">
                              {activity.referenceNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Pagination Footer */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Showing {propertyGroups.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + ITEMS_PER_PAGE, propertyGroups.length)} of {propertyGroups.length} properties
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>Photos ({currentImageIndex + 1} of {selectedImages.length})</span>
              <Button variant="ghost" size="icon" onClick={() => setImageDialogOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            {selectedImages.length > 0 && (
              <img
                src={selectedImages[currentImageIndex]}
                alt={`Photo ${currentImageIndex + 1}`}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            )}
            {selectedImages.length > 1 && (
              <div className="flex justify-center gap-2 p-4">
                {selectedImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={cn(
                      "w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                      idx === currentImageIndex ? "border-[#0077b6]" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
