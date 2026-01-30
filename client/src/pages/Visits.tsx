import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardCheck, CalendarIcon, User, MapPin, Loader2,
  Image as ImageIcon, Wrench, ClipboardList, CheckCircle2, Clock,
  Search, ChevronRight, X, Activity
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

interface ServiceAssignment {
  id: string;
  technicianId: string;
  technicianName: string | null;
  propertyId: string | null;
  propertyName: string | null;
  assignmentType: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
  type: "service_visit" | "repair" | "qc_inspection" | "assignment";
  technicianName: string;
  technicianRole: string;
  propertyName: string;
  date: Date;
  notes: string | null;
  status: string;
  photos: string[];
  title?: string;
}

const activityTypeConfig: Record<string, { label: string; bgColor: string; textColor: string; borderColor: string; icon: any }> = {
  service_visit: { 
    label: "Service Visit", 
    bgColor: "bg-[#0077b6]/10", 
    textColor: "text-[#0077b6]", 
    borderColor: "border-[#0077b6]",
    icon: Wrench 
  },
  repair: { 
    label: "Repair", 
    bgColor: "bg-[#f97316]/10", 
    textColor: "text-[#f97316]", 
    borderColor: "border-[#f97316]",
    icon: Wrench 
  },
  qc_inspection: { 
    label: "QC Inspection", 
    bgColor: "bg-[#14b8a6]/10", 
    textColor: "text-[#14b8a6]", 
    borderColor: "border-[#14b8a6]",
    icon: ClipboardList 
  },
  assignment: { 
    label: "Assignment", 
    bgColor: "bg-[#22c55e]/10", 
    textColor: "text-[#22c55e]", 
    borderColor: "border-[#22c55e]",
    icon: CheckCircle2 
  },
};

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  completed: { label: "Completed", bgColor: "bg-[#22c55e]", textColor: "text-white" },
  in_progress: { label: "In Progress", bgColor: "bg-[#f59e0b]", textColor: "text-white" },
  pending: { label: "Pending", bgColor: "bg-slate-400", textColor: "text-white" },
  assigned: { label: "Pending", bgColor: "bg-slate-400", textColor: "text-white" },
};

function parsePayload(payload: string | null): ParsedPayload {
  if (!payload) return {};
  try {
    return JSON.parse(payload);
  } catch {
    return { notes: payload };
  }
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy h:mm a");
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
  const [selectedTech, setSelectedTech] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
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

  // Fetch service assignments
  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery<{ assignments: ServiceAssignment[] }>({
    queryKey: ["service-assignments-all"],
    queryFn: async () => {
      const response = await fetch("/api/service-assignments");
      if (!response.ok) return { assignments: [] };
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
  const assignments = assignmentsData?.assignments || [];

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

    // Add visits
    visits.forEach(visit => {
      const payload = parsePayload(visit.payload);
      items.push({
        id: `visit-${visit.id}`,
        type: visit.entryType === "repair" ? "repair" : "service_visit",
        technicianName: visit.technicianName || "Unknown",
        technicianRole: techRoleMap.get(visit.technicianName || "") || "service",
        propertyName: payload.propertyName || "No property",
        date: new Date(visit.submittedAt || visit.createdAt),
        notes: payload.notes || null,
        status: "completed",
        photos: payload.photos || [],
      });
    });

    // Add QC inspections
    qcInspections.forEach(insp => {
      items.push({
        id: `qc-${insp.id}`,
        type: "qc_inspection",
        technicianName: insp.supervisorName || "Unknown",
        technicianRole: "supervisor",
        propertyName: insp.propertyName || "No property",
        date: new Date(insp.dueDate || insp.createdAt),
        notes: insp.notes,
        status: insp.status === "completed" ? "completed" : insp.status === "in_progress" ? "in_progress" : "pending",
        photos: insp.photos || [],
        title: insp.title,
      });
    });

    // Add service assignments
    assignments.forEach(assign => {
      items.push({
        id: `assign-${assign.id}`,
        type: "assignment",
        technicianName: assign.technicianName || "Unknown",
        technicianRole: techRoleMap.get(assign.technicianId) || "service",
        propertyName: assign.propertyName || "No property",
        date: new Date(assign.scheduledDate),
        notes: assign.notes,
        status: assign.status === "completed" ? "completed" : assign.status === "in_progress" ? "in_progress" : "pending",
        photos: [],
      });
    });

    // Sort by date descending
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [visits, qcInspections, assignments, techRoleMap]);

  // Get unique properties and technicians for filters
  const uniqueProperties = useMemo(() => {
    const props = new Set<string>();
    allActivities.forEach(a => {
      if (a.propertyName && a.propertyName !== "No property") {
        props.add(a.propertyName);
      }
    });
    return Array.from(props).sort();
  }, [allActivities]);

  const uniqueTechs = useMemo(() => {
    const techs = new Set<string>();
    allActivities.forEach(a => {
      if (a.technicianName && a.technicianName !== "Unknown") {
        techs.add(a.technicianName);
      }
    });
    return Array.from(techs).sort();
  }, [allActivities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return allActivities.filter(activity => {
      // Date filter
      if (dateRange.from && activity.date < startOfDay(dateRange.from)) return false;
      if (dateRange.to && activity.date > endOfDay(dateRange.to)) return false;

      // Property filter
      if (selectedProperty !== "all" && activity.propertyName !== selectedProperty) return false;

      // Technician filter
      if (selectedTech !== "all" && activity.technicianName !== selectedTech) return false;

      // Type filter
      if (selectedType !== "all" && activity.type !== selectedType) return false;

      // Status filter
      if (selectedStatus !== "all" && activity.status !== selectedStatus) return false;

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesProperty = activity.propertyName.toLowerCase().includes(search);
        const matchesTech = activity.technicianName.toLowerCase().includes(search);
        const matchesNotes = activity.notes?.toLowerCase().includes(search) || false;
        if (!matchesProperty && !matchesTech && !matchesNotes) return false;
      }

      return true;
    });
  }, [allActivities, dateRange, selectedProperty, selectedTech, selectedType, selectedStatus, searchTerm]);

  const isLoading = visitsLoading || qcLoading || assignmentsLoading;

  const openImageViewer = (images: string[], startIndex: number = 0) => {
    setSelectedImages(images);
    setCurrentImageIndex(startIndex);
    setImageDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; color: string }> = {
      service: { label: "Service Tech", color: "bg-[#0077b6]/10 text-[#0077b6]" },
      repair: { label: "Repair Tech", color: "bg-[#f97316]/10 text-[#f97316]" },
      supervisor: { label: "Supervisor", color: "bg-[#8b5cf6]/10 text-[#8b5cf6]" },
      foreman: { label: "Foreman", color: "bg-[#8b5cf6]/10 text-[#8b5cf6]" },
    };
    const config = roleConfig[role] || roleConfig.service;
    return <Badge className={cn("text-[10px] font-medium", config.color)}>{config.label}</Badge>;
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0077b6] to-[#00a8e8] flex items-center justify-center shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading-activity">Activity Log</h1>
              <p className="text-slate-500 text-sm">All service visits, repairs, and inspections across all properties</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#0F172A]">{filteredActivities.length}</div>
            <div className="text-sm text-slate-500">total activities</div>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9" data-testid="button-date-range">
                    <CalendarIcon className="w-4 h-4" />
                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
                <SelectTrigger className="w-[180px] h-9" data-testid="filter-property">
                  <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {uniqueProperties.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Technician Filter */}
              <Select value={selectedTech} onValueChange={setSelectedTech}>
                <SelectTrigger className="w-[180px] h-9" data-testid="filter-technician">
                  <User className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="All Technicians" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Technicians</SelectItem>
                  {uniqueTechs.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[160px] h-9" data-testid="filter-type">
                  <ClipboardCheck className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="service_visit">Service Visits</SelectItem>
                  <SelectItem value="repair">Repairs</SelectItem>
                  <SelectItem value="qc_inspection">QC Inspections</SelectItem>
                  <SelectItem value="assignment">Assignments</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px] h-9" data-testid="filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by property, technician, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#0077b6]" />
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No activities found</p>
                <p className="text-sm mt-1">Try adjusting your filters or check back later</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-320px)]">
                <div className="divide-y divide-slate-100">
                  {filteredActivities.map((activity) => {
                    const typeConfig = activityTypeConfig[activity.type];
                    const TypeIcon = typeConfig.icon;
                    const statusCfg = statusConfig[activity.status] || statusConfig.pending;

                    return (
                      <div
                        key={activity.id}
                        className="p-4 hover:bg-slate-50 transition-colors"
                        data-testid={`activity-${activity.id}`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Type Icon */}
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2",
                            typeConfig.bgColor,
                            typeConfig.borderColor
                          )}>
                            <TypeIcon className={cn("w-6 h-6", typeConfig.textColor)} />
                          </div>
                          
                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            {/* Type Label & Status */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={cn("text-sm font-semibold", typeConfig.textColor)}>
                                {activity.title || typeConfig.label}
                              </span>
                              <Badge className={cn("text-[10px]", statusCfg.bgColor, statusCfg.textColor)}>
                                {statusCfg.label}
                              </Badge>
                            </div>

                            {/* Technician & Role */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-sm font-medium text-slate-700">{activity.technicianName}</span>
                              {getRoleBadge(activity.technicianRole)}
                            </div>

                            {/* Property & Date */}
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {activity.propertyName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDateTime(activity.date)}
                              </span>
                            </div>

                            {/* Notes */}
                            {activity.notes && (
                              <p className="text-sm text-slate-600 line-clamp-2">{activity.notes}</p>
                            )}
                          </div>

                          {/* Right Side - Photos & Actions */}
                          <div className="flex items-center gap-3 shrink-0">
                            {activity.photos.length > 0 && (
                              <button
                                onClick={() => openImageViewer(activity.photos, 0)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                              >
                                <ImageIcon className="w-4 h-4 text-slate-500" />
                                <span className="text-xs font-medium text-slate-600">{activity.photos.length}</span>
                              </button>
                            )}
                            <Button variant="ghost" size="sm" className="text-[#0077b6] hover:text-[#005f8f]">
                              View Details
                              <ChevronRight className="w-4 h-4 ml-1" />
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
