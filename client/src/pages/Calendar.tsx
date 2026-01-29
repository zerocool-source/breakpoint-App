import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Users,
  MapPin,
  RefreshCw,
  ChevronDown,
  Sun,
  Snowflake,
  Wrench,
  UserCheck,
  Search,
  ArrowRight,
  Clock,
  Lock,
  Unlock,
  CalendarDays,
  GitBranch,
  UserPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Technician {
  id: string | number;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
  photoUrl?: string;
  region?: string;
  supervisorId?: string | null;
  routeLocked?: boolean;
  summerVisitDays?: string[];
  winterVisitDays?: string[];
}

interface Supervisor {
  id: string;
  firstName: string;
  lastName: string;
  region?: string | null;
}

interface QcInspection {
  id: string;
  supervisorId: string;
  supervisorName: string | null;
  propertyId: string | null;
  propertyName: string;
  propertyAddress: string | null;
  title: string | null;
  notes: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
}

interface ScheduledRepair {
  id: string;
  propertyName: string;
  title: string;
  status: string;
  scheduledDate: string | null;
  repairTechId: string | null;
  repairTechName: string | null;
}

interface TechPropertyAssignment {
  id: string;
  technicianId: string;
  propertyId: string;
  technicianName: string | null;
  propertyName: string | null;
  address: string | null;
  summerVisitDays: string[] | null;
  winterVisitDays: string[] | null;
  activeSeason: string | null;
}

interface TechSchedule {
  id: string;
  technicianId: string;
  date: string;
  startTime: string;
  endTime: string;
  stopCount: number;
  notes?: string;
  properties?: ScheduleProperty[];
}

interface ScheduleProperty {
  id: string;
  scheduleId: string;
  propertyId: string;
  propertyName: string;
  address: string;
  status: string;
  completedAt?: string;
  estimatedArrival?: string;
  sortOrder: number;
}

interface TechCoverage {
  id: string;
  originalTechId: string;
  coveringTechId: string;
  startDate: string;
  endDate: string;
  propertyId?: string;
  propertyName?: string;
  reason?: string;
  status: string;
}

interface TechTimeOff {
  id: string;
  technicianId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  notes?: string;
  coveredByTechId?: string;
}

interface Customer {
  id: string;
  name: string;
  address?: string;
}

const ROLE_COLORS: Record<string, string> = {
  service: "#0078D4",
  repair: "#FF8000",
  supervisor: "#17BEBB",
  foreman: "#8B5CF6",
};

const TECH_COLORS = [
  "#0077b6", // Ocean Blue
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#22c55e", // Green
  "#6b7280", // Gray
];

const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getWeekDates(baseDate: Date): Date[] {
  const startOfWeek = new Date(baseDate);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);
  
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatWeekRange(dates: Date[]): string {
  if (dates.length < 7) return "";
  const start = dates[0];
  const end = dates[6];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
}

function getTechColor(techId: string | number, index: number): string {
  return TECH_COLORS[index % TECH_COLORS.length];
}

export default function Calendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date();
  
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [viewMode, setViewMode] = useState<"5day" | "7day">("5day");
  const [roleFilter, setRoleFilter] = useState<"service" | "repair" | "supervisor">("service");
  const [activeSeason, setActiveSeason] = useState<"summer" | "winter">("summer");
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());
  const [expandedRouteBlocks, setExpandedRouteBlocks] = useState<Set<string>>(new Set());
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showAddCoverageModal, setShowAddCoverageModal] = useState(false);
  const [showExtendedCoverModal, setShowExtendedCoverModal] = useState(false);
  const [showSplitRouteModal, setShowSplitRouteModal] = useState(false);
  const [showCoverFullRouteModal, setShowCoverFullRouteModal] = useState(false);
  const [selectedRouteData, setSelectedRouteData] = useState<{
    techId: string | number;
    techName: string;
    date: Date;
    properties: TechPropertyAssignment[];
  } | null>(null);
  const [extendedCoverForm, setExtendedCoverForm] = useState({
    fromDate: "",
    toDate: "",
    coveringTechId: "",
    reason: "",
  });
  const [splitRouteForm, setSplitRouteForm] = useState({
    techAId: "",
    techBId: "",
    techAProperties: [] as string[],
    techBProperties: [] as string[],
    reason: "",
  });
  const [coverFullRouteForm, setCoverFullRouteForm] = useState({
    coveringTechId: "",
    reason: "",
  });
  const [routeCoverages, setRouteCoverages] = useState<Map<string, {
    type: 'extended' | 'split' | 'full';
    coveringTechName?: string;
    techAName?: string;
    techBName?: string;
    fromDate?: string;
    toDate?: string;
    date?: string;
    propertyCount?: number;
    propertyNames?: string[];
    techAProperties?: string[];
    techBProperties?: string[];
  }>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState<"all" | "south" | "middle" | "north">("all");
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null);
  const [propertySearchTerm, setPropertySearchTerm] = useState("");
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const propertyDropdownRef = React.useRef<HTMLDivElement>(null);
  const [techsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTechForSchedule, setSelectedTechForSchedule] = useState<Technician | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [scheduleFormData, setScheduleFormData] = useState({
    stopCount: 6,
    startTime: "08:00",
    endTime: "16:00",
    notes: "",
    selectedProperties: [] as string[],
  });

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  // Display dates based on view mode (5-day or 7-day) - includes original weekDates index
  const displayDatesWithIndex = useMemo(() => {
    if (viewMode === "5day") {
      // Show Monday through Friday (indices 1-5)
      return weekDates.slice(1, 6).map((date, i) => ({ date, originalIndex: i + 1 }));
    }
    return weekDates.map((date, i) => ({ date, originalIndex: i }));
  }, [weekDates, viewMode]);

  const displayDaysOfWeek = useMemo(() => {
    if (viewMode === "5day") {
      return DAYS_OF_WEEK.slice(1, 6);
    }
    return DAYS_OF_WEEK;
  }, [viewMode]);

  // Fetch technicians from stored technicians database (syncs with ServiceTechs, RepairQueue, Supervisors pages)
  const { data: techniciansData } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians/stored"],
    queryFn: async () => {
      const res = await fetch("/api/technicians/stored");
      if (!res.ok) return { technicians: [] };
      return res.json();
    },
  });

  // Create supervisor ID to region mapping from technicians data
  // Includes both supervisors and foremen who can have technicians assigned to them
  const supervisorRegionMap = useMemo(() => {
    const map = new Map<string, string>();
    const allTechs = techniciansData?.technicians || [];
    for (const tech of allTechs) {
      // Include supervisors and foremen in the mapping
      if ((tech.role === "supervisor" || tech.role === "foreman") && tech.region) {
        map.set(String(tech.id), tech.region);
      }
    }
    return map;
  }, [techniciansData]);

  // Fetch QC Inspections for supervisors tab
  const { data: qcInspectionsData } = useQuery<{ inspections: QcInspection[] }>({
    queryKey: ["/api/qc-inspections", weekDates[0]?.toISOString()],
    queryFn: async () => {
      const startDate = weekDates[0]?.toISOString().split("T")[0];
      const endDate = weekDates[6]?.toISOString().split("T")[0];
      const res = await fetch(`/api/qc-inspections?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) return { inspections: [] };
      return res.json();
    },
    enabled: weekDates.length === 7 && roleFilter === "supervisor",
  });

  // Fetch scheduled estimates for repair technicians
  const { data: scheduledEstimatesData } = useQuery<{ estimates: ScheduledRepair[] }>({
    queryKey: ["/api/estimates/scheduled", weekDates[0]?.toISOString()],
    queryFn: async () => {
      const startDate = weekDates[0]?.toISOString().split("T")[0];
      const endDate = weekDates[6]?.toISOString().split("T")[0];
      const res = await fetch(`/api/estimates?status=scheduled`);
      if (!res.ok) return { estimates: [] };
      const data = await res.json();
      // Filter by date range
      const filtered = (data.estimates || []).filter((e: any) => {
        if (!e.scheduledDate) return false;
        const schedDate = e.scheduledDate.split("T")[0];
        return schedDate >= startDate && schedDate <= endDate;
      });
      return { estimates: filtered };
    },
    enabled: weekDates.length === 7 && roleFilter === "repair",
  });

  const { data: schedulesData } = useQuery<{ schedules: TechSchedule[] }>({
    queryKey: ["/api/tech-schedules", weekDates[0]?.toISOString(), weekDates[6]?.toISOString()],
    queryFn: async () => {
      const startDate = weekDates[0]?.toISOString().split("T")[0];
      const endDate = weekDates[6]?.toISOString().split("T")[0];
      const res = await fetch(`/api/tech-schedules?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) return { schedules: [] };
      return res.json();
    },
    enabled: weekDates.length === 7,
  });

  const { data: coveragesData } = useQuery<{ coverages: TechCoverage[] }>({
    queryKey: ["/api/tech-coverages", weekDates[0]?.toISOString()],
    queryFn: async () => {
      const startDate = weekDates[0]?.toISOString().split("T")[0];
      const endDate = weekDates[6]?.toISOString().split("T")[0];
      const res = await fetch(`/api/tech-coverages?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) return { coverages: [] };
      return res.json();
    },
    enabled: weekDates.length === 7,
  });

  const { data: timeOffData } = useQuery<{ timeOffs: TechTimeOff[] }>({
    queryKey: ["/api/tech-time-off", weekDates[0]?.toISOString()],
    queryFn: async () => {
      const startDate = weekDates[0]?.toISOString().split("T")[0];
      const endDate = weekDates[6]?.toISOString().split("T")[0];
      const res = await fetch(`/api/tech-time-off?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) return { timeOffs: [] };
      return res.json();
    },
    enabled: weekDates.length === 7,
  });

  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/customers"],
  });

  // Fetch technician property assignments for route display
  const { data: propertyAssignmentsData } = useQuery<{ assignments: TechPropertyAssignment[] }>({
    queryKey: ["/api/technician-properties/calendar"],
    queryFn: async () => {
      const res = await fetch("/api/technician-properties/calendar");
      if (!res.ok) return { assignments: [] };
      return res.json();
    },
  });

  const technicians = techniciansData?.technicians || [];
  const schedules = schedulesData?.schedules || [];
  const coverages = coveragesData?.coverages || [];
  const timeOffs = timeOffData?.timeOffs || [];
  const customers = customersData?.customers || [];
  const qcInspections = qcInspectionsData?.inspections || [];
  const scheduledEstimates = scheduledEstimatesData?.estimates || [];
  const propertyAssignments = propertyAssignmentsData?.assignments || [];

  // Get unique properties for filter dropdown
  const uniqueProperties = useMemo(() => {
    const propsMap = new Map<string, { id: string; name: string }>();
    propertyAssignments.forEach(a => {
      if (a.propertyId && a.propertyName) {
        propsMap.set(a.propertyId, { id: a.propertyId, name: a.propertyName });
      }
    });
    return Array.from(propsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [propertyAssignments]);

  // Filter properties for dropdown search
  const filteredProperties = useMemo(() => {
    if (!propertySearchTerm) return uniqueProperties;
    return uniqueProperties.filter(p => 
      p.name.toLowerCase().includes(propertySearchTerm.toLowerCase())
    );
  }, [uniqueProperties, propertySearchTerm]);

  // Get technician IDs that have the selected property
  const techsWithSelectedProperty = useMemo(() => {
    if (!propertyFilter) return null;
    const techIds = new Set<string>();
    propertyAssignments.forEach(a => {
      if (a.propertyId === propertyFilter) {
        techIds.add(a.technicianId);
      }
    });
    return techIds;
  }, [propertyAssignments, propertyFilter]);

  // Click outside handler for property dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(event.target as Node)) {
        setShowPropertyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mutation to toggle route lock
  const toggleRouteLockMutation = useMutation({
    mutationFn: async ({ techId, locked, techName }: { techId: string; locked: boolean; techName: string }) => {
      const res = await fetch(`/api/technicians/stored/${techId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeLocked: locked }),
      });
      if (!res.ok) throw new Error("Failed to update route lock");
      return res.json();
    },
    onSuccess: (_, { locked, techName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored"] });
      toast({
        title: locked ? "Route Locked" : "Route Unlocked",
        description: locked
          ? `Route locked for ${techName}`
          : `Route unlocked for ${techName}`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update route lock", variant: "destructive" });
    },
  });

  // Get QC inspections for a supervisor and date
  const getQcInspectionsForTechAndDate = (techId: string | number, date: Date): QcInspection[] => {
    const dateStr = date.toISOString().split("T")[0];
    return qcInspections.filter((insp) => {
      if (String(insp.supervisorId) !== String(techId)) return false;
      if (!insp.dueDate) return false;
      return insp.dueDate.startsWith(dateStr);
    });
  };

  // Get scheduled repairs for a repair tech and date
  const getScheduledRepairsForTechAndDate = (techId: string | number, date: Date): ScheduledRepair[] => {
    const dateStr = date.toISOString().split("T")[0];
    return scheduledEstimates.filter((est) => {
      if (String(est.repairTechId) !== String(techId)) return false;
      if (!est.scheduledDate) return false;
      return est.scheduledDate.startsWith(dateStr);
    });
  };

  // Map day of week to visit day codes (SUN=0, MON=1, TUE=2, etc.)
  const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  
  // Get properties for a service technician on a specific day based on their visit days
  const getPropertiesForTechAndDate = (techId: string | number, date: Date): TechPropertyAssignment[] => {
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
    const dayCode = DAY_CODES[dayOfWeek].toLowerCase(); // "mon", "tue", etc.
    const fullDayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const fullDayName = fullDayNames[dayOfWeek];
    
    return propertyAssignments.filter((prop) => {
      if (String(prop.technicianId) !== String(techId)) return false;
      
      // Check if this day is in the visit days
      const visitDays = prop.activeSeason === "winter" 
        ? prop.winterVisitDays 
        : prop.summerVisitDays;
      
      if (!visitDays || visitDays.length === 0) return false;
      
      // Visit days can be stored in various formats: "Mon", "MON", "monday", etc.
      // Normalize to lowercase and check for matches
      const normalizedVisitDays = visitDays.map(d => d.toLowerCase());
      return normalizedVisitDays.includes(dayCode) || normalizedVisitDays.includes(fullDayName);
    });
  };

  const allFilteredTechnicians = useMemo(() => {
    return technicians.filter((tech) => {
      if (!tech.active) return false;
      
      if (roleFilter === "service" && tech.role !== "service") return false;
      if (roleFilter === "repair" && tech.role !== "repair") return false;
      if (roleFilter === "supervisor" && tech.role !== "supervisor" && tech.role !== "foreman") return false;
      
      if (searchTerm) {
        const fullName = `${tech.firstName} ${tech.lastName}`.toLowerCase();
        if (!fullName.includes(searchTerm.toLowerCase())) return false;
      }
      
      // County filter: get technician's county from their supervisor's region
      if (regionFilter !== "all") {
        // For supervisors/foremen, use their own region
        if (tech.role === "supervisor" || tech.role === "foreman") {
          const supervisorRegion = (tech.region || "").toLowerCase();
          // Map "middle" filter to "mid" in database
          const filterRegion = regionFilter === "middle" ? "mid" : regionFilter;
          if (supervisorRegion !== filterRegion) return false;
        } else {
          // For technicians, look up their supervisor's region
          if (!tech.supervisorId) return false; // Unassigned technicians don't appear in county filters
          const supervisorRegion = supervisorRegionMap.get(String(tech.supervisorId)) || "";
          // Map "middle" filter to "mid" in database
          const filterRegion = regionFilter === "middle" ? "mid" : regionFilter;
          if (supervisorRegion.toLowerCase() !== filterRegion) return false;
        }
      }
      
      // Property filter: only show technicians assigned to the selected property
      if (techsWithSelectedProperty && !techsWithSelectedProperty.has(String(tech.id))) {
        return false;
      }
      
      return true;
    });
  }, [technicians, roleFilter, searchTerm, regionFilter, supervisorRegionMap, techsWithSelectedProperty]);
  
  const filteredTechnicians = useMemo(() => {
    const startIndex = (currentPage - 1) * techsPerPage;
    return allFilteredTechnicians.slice(startIndex, startIndex + techsPerPage);
  }, [allFilteredTechnicians, currentPage, techsPerPage]);
  
  const totalPages = Math.ceil(allFilteredTechnicians.length / techsPerPage);
  const totalFilteredCount = allFilteredTechnicians.length;

  const stats = useMemo(() => {
    const activeTechs = allFilteredTechnicians.length;
    const totalStops = schedules.reduce((sum, s) => sum + (s.stopCount || 0), 0);
    const activeCoverages = coverages.filter((c) => c.status === "active").length;
    return { activeTechs, totalStops, activeCoverages };
  }, [allFilteredTechnicians, schedules, coverages]);

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
      return newDate;
    });
  };

  const goToToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    setCurrentWeekStart(d);
  };

  const toggleScheduleExpand = (scheduleId: string) => {
    setExpandedSchedules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(scheduleId)) {
        newSet.delete(scheduleId);
      } else {
        newSet.add(scheduleId);
      }
      return newSet;
    });
  };

  const toggleRouteBlockExpand = (blockKey: string) => {
    setExpandedRouteBlocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(blockKey)) {
        newSet.delete(blockKey);
      } else {
        newSet.add(blockKey);
      }
      return newSet;
    });
  };

  const getScheduleForTechAndDate = (techId: string | number, date: Date): TechSchedule | undefined => {
    const dateStr = date.toISOString().split("T")[0];
    return schedules.find(
      (s) => String(s.technicianId) === String(techId) && s.date?.startsWith(dateStr)
    );
  };

  const getCoverageForTechAndDate = (techId: string | number, date: Date): TechCoverage | undefined => {
    return coverages.find((c) => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return (
        String(c.coveringTechId) === String(techId) &&
        date >= start &&
        date <= end &&
        c.status === "active"
      );
    });
  };

  const getTimeOffForTechAndDate = (techId: string | number, date: Date): TechTimeOff | undefined => {
    return timeOffs.find((t) => {
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      return String(t.technicianId) === String(techId) && date >= start && date <= end;
    });
  };

  const getOriginalTechForCoverage = (coverage: TechCoverage): Technician | undefined => {
    return technicians.find((t) => String(t.id) === String(coverage.originalTechId));
  };

  const getCoveringTechForTimeOff = (timeOff: TechTimeOff): Technician | undefined => {
    if (!timeOff.coveredByTechId) return undefined;
    return technicians.find((t) => String(t.id) === String(timeOff.coveredByTechId));
  };

  const openAddScheduleModal = (tech: Technician) => {
    setSelectedTechForSchedule(tech);
    setSelectedDays([]);
    setScheduleFormData({
      stopCount: 6,
      startTime: "08:00",
      endTime: "16:00",
      notes: "",
      selectedProperties: [],
    });
    setShowAddScheduleModal(true);
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const toggleProperty = (propertyId: string) => {
    setScheduleFormData((prev) => ({
      ...prev,
      selectedProperties: prev.selectedProperties.includes(propertyId)
        ? prev.selectedProperties.filter((p) => p !== propertyId)
        : [...prev.selectedProperties, propertyId],
    }));
  };

  const createScheduleMutation = useMutation({
    mutationFn: async (data: {
      technicianId: string;
      dates: string[];
      startTime: string;
      endTime: string;
      stopCount: number;
      notes: string;
      propertyIds: string[];
    }) => {
      const res = await fetch("/api/tech-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create schedule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tech-schedules"] });
      setShowAddScheduleModal(false);
      toast({ title: "Schedule created", description: "The schedule has been added." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create schedule.", variant: "destructive" });
    },
  });

  const handleCreateSchedule = () => {
    if (!selectedTechForSchedule || selectedDays.length === 0) return;
    
    const dates = selectedDays.map((dayIndex) => weekDates[dayIndex].toISOString().split("T")[0]);
    
    createScheduleMutation.mutate({
      technicianId: String(selectedTechForSchedule.id),
      dates,
      startTime: scheduleFormData.startTime,
      endTime: scheduleFormData.endTime,
      stopCount: scheduleFormData.stopCount,
      notes: scheduleFormData.notes,
      propertyIds: scheduleFormData.selectedProperties,
    });
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#f9fafb]">
        <div className="sticky top-0 z-40 bg-white border-b border-[#e5e7eb] shadow-sm px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#0F172A]" data-testid="text-page-title">Calendar</h1>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-[#e5e7eb]"
                  onClick={() => navigateWeek("prev")}
                  data-testid="button-prev-week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[180px] text-center text-slate-700">
                  {formatWeekRange(weekDates)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-[#e5e7eb]"
                  onClick={() => navigateWeek("next")}
                  data-testid="button-next-week"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <Button 
                variant="outline" 
                onClick={goToToday} 
                className="rounded-full border-[#e5e7eb] px-4"
                data-testid="button-today"
              >
                Today
              </Button>
              
              <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-full">
                <button
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-all rounded-full",
                    viewMode === "5day"
                      ? "bg-white text-slate-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                  onClick={() => setViewMode("5day")}
                  data-testid="button-view-5day"
                >
                  5 Day
                </button>
                <button
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-all rounded-full",
                    viewMode === "7day"
                      ? "bg-white text-slate-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                  onClick={() => setViewMode("7day")}
                  data-testid="button-view-7day"
                >
                  7 Day
                </button>
              </div>
              
              <div className="flex gap-1 p-1 bg-slate-100 rounded-full">
                <button
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium flex items-center gap-2 transition-all rounded-full",
                    roleFilter === "service"
                      ? "bg-[#0077b6] text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:shadow-sm"
                  )}
                  onClick={() => setRoleFilter("service")}
                  data-testid="button-filter-service"
                >
                  <Wrench className="w-4 h-4" />
                  Service
                </button>
                <button
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium flex items-center gap-2 transition-all rounded-full",
                    roleFilter === "repair"
                      ? "bg-[#f97316] text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:shadow-sm"
                  )}
                  onClick={() => setRoleFilter("repair")}
                  data-testid="button-filter-repair"
                >
                  <Wrench className="w-4 h-4" />
                  Repair
                </button>
                <button
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium flex items-center gap-2 transition-all rounded-full",
                    roleFilter === "supervisor"
                      ? "bg-[#0077b6] text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:shadow-sm"
                  )}
                  onClick={() => setRoleFilter("supervisor")}
                  data-testid="button-filter-supervisor"
                >
                  <UserCheck className="w-4 h-4" />
                  Supervisors
                </button>
              </div>
              
              <div className="flex gap-1 p-1 bg-slate-100 rounded-full">
                <button
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium flex items-center gap-2 transition-all rounded-full",
                    activeSeason === "summer"
                      ? "bg-[#f97316] text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:shadow-sm"
                  )}
                  onClick={() => setActiveSeason("summer")}
                  data-testid="button-season-summer"
                >
                  <Sun className="w-4 h-4" />
                  Summer
                </button>
                <button
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium flex items-center gap-2 transition-all rounded-full",
                    activeSeason === "winter"
                      ? "bg-[#0077b6] text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:shadow-sm"
                  )}
                  onClick={() => setActiveSeason("winter")}
                  data-testid="button-season-winter"
                >
                  <Snowflake className="w-4 h-4" />
                  Winter
                </button>
              </div>
              
              <Button
                className="bg-[#f97316] hover:bg-[#ea580c] text-white rounded-full"
                onClick={() => setShowAddCoverageModal(true)}
                data-testid="button-add-coverage"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Coverage
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="shadow-sm border border-[#e5e7eb] rounded-xl bg-white">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0077b6]/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#0077b6]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{stats.activeTechs}</p>
                  <p className="text-sm text-[#64748B]">Active Techs</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border border-[#e5e7eb] rounded-xl bg-white">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{stats.totalStops}</p>
                  <p className="text-sm text-[#64748B]">Total Stops This Week</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border border-[#e5e7eb] rounded-xl bg-white">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-[#f97316]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{stats.activeCoverages}</p>
                  <p className="text-sm text-[#64748B]">Active Coverages</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Coverage Activity Section */}
          <Card className="shadow-sm mb-4" data-testid="card-coverage-activity">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#0F172A] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#17BEBB]" />
                  Coverage Activity
                </h3>
                <span className="text-xs text-[#64748B]">{coverages.length} active</span>
              </div>
              <div className="space-y-2 max-h-[120px] overflow-y-auto">
                {coverages.length > 0 ? (
                  coverages.slice(0, 5).map((coverage) => {
                    const originalTech = technicians.find(t => String(t.id) === String(coverage.originalTechId));
                    const coveringTech = technicians.find(t => String(t.id) === String(coverage.coveringTechId));
                    const startDate = new Date(coverage.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const endDate = new Date(coverage.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <div key={coverage.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg text-sm" data-testid={`coverage-entry-${coverage.id}`}>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-medium text-[#0F172A]">
                            {coveringTech ? `${coveringTech.firstName} ${coveringTech.lastName}` : 'Unknown'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-[#64748B]" />
                          <span className="text-[#64748B]">covering for</span>
                          <span className="font-medium text-[#0F172A]">
                            {originalTech ? `${originalTech.firstName} ${originalTech.lastName}` : 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-[#64748B]" />
                          <span className="text-xs text-[#64748B]">{startDate} - {endDate}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            coverage.status === 'active' ? "bg-green-100 text-green-700" :
                            coverage.status === 'pending' ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-600"
                          )}>
                            {coverage.status}
                          </span>
                        </div>
                        {coverage.propertyName && (
                          <span className="text-xs text-[#64748B] bg-white px-2 py-0.5 rounded border border-slate-200">
                            {coverage.propertyName}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#64748B] text-center py-2">No active coverages this week</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Search and Region Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <Input
                placeholder="Search technicians..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
                data-testid="input-search-tech"
              />
            </div>
            
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  regionFilter === "all"
                    ? "bg-[#0F172A] text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => { setRegionFilter("all"); setCurrentPage(1); }}
                data-testid="button-region-all"
              >
                All
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200",
                  regionFilter === "south"
                    ? "bg-[#22D69A] text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => { setRegionFilter("south"); setCurrentPage(1); }}
                data-testid="button-region-south"
              >
                South
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200",
                  regionFilter === "middle"
                    ? "bg-[#0078D4] text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => { setRegionFilter("middle"); setCurrentPage(1); }}
                data-testid="button-region-middle"
              >
                Middle
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200",
                  regionFilter === "north"
                    ? "bg-[#FF8000] text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => { setRegionFilter("north"); setCurrentPage(1); }}
                data-testid="button-region-north"
              >
                North
              </button>
            </div>
            
            {/* Property Filter Dropdown */}
            <div className="relative" ref={propertyDropdownRef}>
              <button
                onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                  propertyFilter
                    ? "bg-[#fff7ed] border-[#f97316] text-[#f97316]"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
                data-testid="button-property-filter"
              >
                <MapPin className="w-4 h-4" />
                {propertyFilter 
                  ? uniqueProperties.find(p => p.id === propertyFilter)?.name || "Property"
                  : "All Properties"
                }
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showPropertyDropdown && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                  <div className="p-3 border-b border-slate-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search properties..."
                        value={propertySearchTerm}
                        onChange={(e) => setPropertySearchTerm(e.target.value)}
                        className="pl-9 h-9"
                        data-testid="input-property-search"
                      />
                    </div>
                  </div>
                  
                  <ScrollArea className="max-h-64">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setPropertyFilter(null);
                          setShowPropertyDropdown(false);
                          setPropertySearchTerm("");
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                          !propertyFilter
                            ? "bg-[#0077b6] text-white"
                            : "hover:bg-slate-100 text-slate-700"
                        )}
                        data-testid="button-property-all"
                      >
                        All Properties
                      </button>
                      
                      {filteredProperties.map(prop => (
                        <button
                          key={prop.id}
                          onClick={() => {
                            setPropertyFilter(prop.id);
                            setShowPropertyDropdown(false);
                            setPropertySearchTerm("");
                            setCurrentPage(1);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate",
                            propertyFilter === prop.id
                              ? "bg-[#0077b6] text-white"
                              : "hover:bg-slate-100 text-slate-700"
                          )}
                          data-testid={`button-property-${prop.id}`}
                        >
                          {prop.name}
                        </button>
                      ))}
                      
                      {filteredProperties.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">No properties found</p>
                      )}
                    </div>
                  </ScrollArea>
                  
                  {propertyFilter && (
                    <div className="p-2 border-t border-slate-200">
                      <button
                        onClick={() => {
                          setPropertyFilter(null);
                          setShowPropertyDropdown(false);
                          setPropertySearchTerm("");
                          setCurrentPage(1);
                        }}
                        className="w-full text-center px-3 py-2 text-sm text-[#f97316] hover:bg-[#fff7ed] rounded-lg transition-colors font-medium"
                        data-testid="button-clear-property-filter"
                      >
                        Clear Filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Active Property Filter Indicator */}
            {propertyFilter && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#fff7ed] rounded-lg border border-[#f97316]/30">
                <span className="text-sm text-[#f97316]">
                  Filtered by: <span className="font-medium">{uniqueProperties.find(p => p.id === propertyFilter)?.name}</span>
                </span>
                <button
                  onClick={() => {
                    setPropertyFilter(null);
                    setCurrentPage(1);
                  }}
                  className="text-[#f97316] hover:text-[#ea580c]"
                  data-testid="button-clear-filter-indicator"
                >
                  ×
                </button>
              </div>
            )}
            
            <span className="text-sm text-[#64748B]">
              Page {currentPage} of {totalPages} ({totalFilteredCount} technicians)
            </span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-[#64748B]">
            <span className="font-medium">Live Status:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22D69A]"></span>
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
              In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
              Pending
            </span>
            <span className="flex items-center gap-1.5 ml-4">
              <RefreshCw className="w-3.5 h-3.5" />
              Synced with Service Tech App
            </span>
          </div>
        </div>
        
        <div className="px-6 py-4 overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Fixed header - outside scroll area */}
            <div className="flex border-b-2 border-[#005f8f] bg-[#0077b6] shadow-md">
              <div className="w-[260px] min-w-[260px] px-4 py-3 font-semibold text-sm text-white bg-[#0077b6]">
                TECHNICIAN
              </div>
              {displayDatesWithIndex.map(({ date, originalIndex }, i) => {
                const isToday = isSameDay(date, today);
                return (
                  <div
                    key={originalIndex}
                    className="flex-1 min-w-[140px] px-2 py-3 text-center"
                  >
                    <div className="text-xs font-semibold text-white/80">{displayDaysOfWeek[i]}</div>
                    <div
                      className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium mt-1",
                        isToday ? "bg-white text-[#0077b6] font-bold" : "text-white"
                      )}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
              <div className="w-[50px] min-w-[50px]"></div>
            </div>
            
            {/* Scrollable content area */}
            <div className="overflow-y-auto max-h-[calc(100vh-350px)]">
            
            {filteredTechnicians.length === 0 ? (
              <div className="py-12 text-center text-[#64748B]">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No technicians found{searchTerm ? ` matching "${searchTerm}"` : ""}{regionFilter !== "all" ? ` in ${regionFilter} region` : ""}.</p>
                {(searchTerm || regionFilter !== "all") && (
                  <Button 
                    variant="link" 
                    className="mt-2 text-[#0078D4]"
                    onClick={() => { setSearchTerm(""); setRegionFilter("all"); }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              filteredTechnicians.map((tech, techIndex) => {
                const techColor = getTechColor(tech.id, techIndex);
                const isOnLeaveThisWeek = timeOffs.some((t) => {
                  const start = new Date(t.startDate);
                  const end = new Date(t.endDate);
                  return String(t.technicianId) === String(tech.id) &&
                    weekDates.some((d) => d >= start && d <= end);
                });
                const isCoveringThisWeek = coverages.some((c) => {
                  const start = new Date(c.startDate);
                  const end = new Date(c.endDate);
                  return String(c.coveringTechId) === String(tech.id) &&
                    c.status === "active" &&
                    weekDates.some((d) => d >= start && d <= end);
                });

                return (
                  <div
                    key={tech.id}
                    className="flex border-b border-[#e5e7eb] bg-white hover:bg-slate-50 transition-colors group"
                    data-testid={`row-tech-${tech.id}`}
                  >
                    <div className="w-[260px] min-w-[260px] px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-[#e5e7eb]">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-sm relative shadow-sm"
                          style={{ backgroundColor: techColor }}
                        >
                          {getInitials(tech.firstName, tech.lastName)}
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                              isOnLeaveThisWeek ? "bg-slate-400" : "bg-[#22c55e]"
                            )}
                          ></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">
                              {tech.firstName} {tech.lastName}
                            </p>
                            {/* Lock Route Icon with label - only for service technicians */}
                            {tech.role === "service" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRouteLockMutation.mutate({
                                          techId: String(tech.id),
                                          locked: !tech.routeLocked,
                                          techName: `${tech.firstName} ${tech.lastName}`,
                                        });
                                      }}
                                      className={cn(
                                        "flex flex-col items-center px-1.5 py-1 rounded-md transition-all cursor-pointer",
                                        tech.routeLocked
                                          ? "text-[#ef4444] bg-red-50 hover:bg-red-100 shadow-sm"
                                          : "text-[#9ca3af] hover:bg-slate-100"
                                      )}
                                      data-testid={`button-lock-route-${tech.id}`}
                                    >
                                      {tech.routeLocked ? (
                                        <>
                                          <Lock className="w-4 h-4" />
                                          <span className="text-[10px] font-medium leading-tight mt-0.5">Locked</span>
                                        </>
                                      ) : (
                                        <Unlock className="w-4 h-4" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {tech.routeLocked ? "Click to unlock route" : "Click to lock route"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {isOnLeaveThisWeek && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded">
                                ON LEAVE
                              </span>
                            )}
                            {isCoveringThisWeek && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#17BEBB]/10 text-[#17BEBB] rounded flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" />
                                COVERING
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748B] capitalize">{tech.role}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`button-tech-menu-${tech.id}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openAddScheduleModal(tech)}>
                              Add Coverage for Week
                            </DropdownMenuItem>
                            <DropdownMenuItem>Set Time Off</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>View Full Schedule</DropdownMenuItem>
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {displayDatesWithIndex.map(({ date, originalIndex: dayIndex }, displayIndex) => {
                      const schedule = getScheduleForTechAndDate(tech.id, date);
                      const coverage = getCoverageForTechAndDate(tech.id, date);
                      const timeOff = getTimeOffForTechAndDate(tech.id, date);
                      const isExpanded = schedule && expandedSchedules.has(schedule.id);
                      
                      // For supervisors - get QC inspections
                      const qcInspectionsForDay = tech.role === "supervisor" || tech.role === "foreman"
                        ? getQcInspectionsForTechAndDate(tech.id, date)
                        : [];
                      
                      // For repair technicians - get scheduled repairs
                      const scheduledRepairsForDay = tech.role === "repair"
                        ? getScheduledRepairsForTechAndDate(tech.id, date)
                        : [];

                      if (timeOff) {
                        const coveringTech = getCoveringTechForTimeOff(timeOff);
                        return (
                          <div
                            key={displayIndex}
                            className="flex-1 min-w-[140px] px-2 py-2"
                          >
                            <div
                              className="h-full min-h-[80px] rounded-lg p-2"
                              style={{
                                background: "repeating-linear-gradient(135deg, #FEE2E2, #FEE2E2 4px, #FECACA 4px, #FECACA 8px)",
                              }}
                            >
                              <p className="text-xs font-medium text-red-700">On Leave</p>
                              {coveringTech && (
                                <p className="text-[10px] text-red-600 mt-1">
                                  Covered by {getInitials(coveringTech.firstName, coveringTech.lastName)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (schedule) {
                        const completedCount = schedule.properties?.filter((p) => p.status === "completed").length || 0;
                        const totalCount = schedule.properties?.length || schedule.stopCount || 0;

                        return (
                          <div
                            key={displayIndex}
                            className="flex-1 min-w-[140px] px-2 py-2"
                          >
                            <div
                              className={cn(
                                "rounded-lg p-2 cursor-pointer transition-all border-l-[3px]",
                                isExpanded ? "min-h-[200px]" : "min-h-[80px]"
                              )}
                              style={{
                                backgroundColor: `${techColor}15`,
                                borderLeftColor: techColor,
                              }}
                              onClick={() => toggleScheduleExpand(schedule.id)}
                              data-testid={`schedule-block-${schedule.id}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-[#0F172A]">
                                  {totalCount} stops
                                </span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="w-6 h-6">
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>Add Coverage</DropdownMenuItem>
                                    <DropdownMenuItem>Extended Cover</DropdownMenuItem>
                                    <DropdownMenuItem>Split Route</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>Edit Schedule</DropdownMenuItem>
                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <p className="text-[10px] text-[#64748B]">
                                {schedule.startTime} - {schedule.endTime}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="w-2 h-2 rounded-full bg-[#22D69A]"></span>
                                <span className="text-[10px] text-[#64748B]">
                                  {completedCount}/{totalCount}
                                </span>
                              </div>
                              {!isExpanded && (
                                <p className="text-[9px] text-[#64748B] mt-2 flex items-center gap-1">
                                  <ChevronDown className="w-3 h-3" />
                                  Click to view properties
                                </p>
                              )}
                              
                              {isExpanded && schedule.properties && (
                                <div className="mt-3 space-y-2">
                                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                                    <div
                                      className="bg-[#22D69A] h-1.5 rounded-full transition-all"
                                      style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                  {schedule.properties.map((prop) => (
                                    <div key={prop.id} className="flex items-start gap-2 text-[10px]">
                                      <span
                                        className={cn(
                                          "w-2 h-2 rounded-full mt-0.5 shrink-0",
                                          prop.status === "completed"
                                            ? "bg-[#22D69A]"
                                            : prop.status === "in_progress"
                                            ? "bg-[#F59E0B] animate-pulse"
                                            : "bg-slate-300"
                                        )}
                                      ></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[#0F172A] truncate">
                                          {prop.propertyName}
                                        </p>
                                        <p className="text-[#64748B] truncate">{prop.address}</p>
                                        <p className="text-[#64748B]">
                                          {prop.status === "completed"
                                            ? `✓ ${prop.completedAt}`
                                            : prop.status === "in_progress"
                                            ? "● In Progress"
                                            : `ETA ${prop.estimatedArrival || "—"}`}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {coverage && (
                              <div
                                className="mt-2 rounded-lg p-2 border-l-[3px]"
                                style={{
                                  backgroundColor: "#17BEBB15",
                                  borderLeftColor: "#17BEBB",
                                }}
                              >
                                <div className="flex items-center gap-1 text-[10px] font-medium text-[#17BEBB]">
                                  <RefreshCw className="w-3 h-3" />
                                  Covering for{" "}
                                  {(() => {
                                    const orig = getOriginalTechForCoverage(coverage);
                                    return orig
                                      ? getInitials(orig.firstName, orig.lastName)
                                      : "—";
                                  })()}
                                </div>
                                {coverage.propertyName && (
                                  <p className="text-[9px] text-[#64748B] mt-1">
                                    <MapPin className="w-3 h-3 inline mr-1" />
                                    {coverage.propertyName}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (coverage && !schedule) {
                        return (
                          <div
                            key={displayIndex}
                            className="flex-1 min-w-[140px] px-2 py-2"
                          >
                            <div
                              className="min-h-[80px] rounded-lg p-2 border-l-[3px]"
                              style={{
                                backgroundColor: "#17BEBB15",
                                borderLeftColor: "#17BEBB",
                              }}
                            >
                              <div className="flex items-center gap-1 text-xs font-medium text-[#17BEBB]">
                                <RefreshCw className="w-3 h-3" />
                                Covering for{" "}
                                {(() => {
                                  const orig = getOriginalTechForCoverage(coverage);
                                  return orig
                                    ? getInitials(orig.firstName, orig.lastName)
                                    : "—";
                                })()}
                              </div>
                              {coverage.propertyName && (
                                <p className="text-[10px] text-[#64748B] mt-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {coverage.propertyName}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Render QC Inspections for supervisors (always show even without schedule)
                      if ((tech.role === "supervisor" || tech.role === "foreman") && qcInspectionsForDay.length > 0) {
                        return (
                          <div
                            key={displayIndex}
                            className="flex-1 min-w-[140px] px-2 py-2"
                            data-testid={`cell-supervisor-${tech.id}-${dayIndex}`}
                          >
                            <div className="space-y-2">
                              {qcInspectionsForDay.map((insp) => (
                                <div
                                  key={insp.id}
                                  data-testid={`card-qc-inspection-${insp.id}`}
                                  className={cn(
                                    "rounded-lg p-2 border-l-[3px]",
                                    insp.status === "completed"
                                      ? "bg-[#22c55e15] border-l-[#22c55e]"
                                      : insp.status === "in_progress"
                                      ? "bg-[#14b8a615] border-l-[#14b8a6]"
                                      : "bg-[#8B5CF615] border-l-[#8B5CF6]"
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A]">
                                    <UserCheck className="w-3 h-3" />
                                    <span className="truncate" data-testid={`text-qc-title-${insp.id}`}>{insp.title || "QC Inspection"}</span>
                                  </div>
                                  <p className="text-[10px] text-[#64748B] mt-1 truncate flex items-center gap-1" data-testid={`text-qc-property-${insp.id}`}>
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    {insp.propertyName}
                                  </p>
                                  <span
                                    data-testid={`status-qc-${insp.id}`}
                                    className={cn(
                                      "inline-block mt-1.5 px-1.5 py-0.5 text-[9px] font-medium rounded",
                                      insp.status === "completed"
                                        ? "bg-[#22c55e] text-white"
                                        : insp.status === "in_progress"
                                        ? "bg-[#14b8a6] text-white"
                                        : "bg-slate-200 text-slate-600"
                                    )}
                                  >
                                    {insp.status === "completed"
                                      ? "Completed"
                                      : insp.status === "in_progress"
                                      ? "In Progress"
                                      : "Assigned"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Render scheduled repairs for repair technicians (always show even without schedule)
                      if (tech.role === "repair" && scheduledRepairsForDay.length > 0) {
                        return (
                          <div
                            key={displayIndex}
                            className="flex-1 min-w-[140px] px-2 py-2"
                            data-testid={`cell-repair-${tech.id}-${dayIndex}`}
                          >
                            <div className="space-y-2">
                              {scheduledRepairsForDay.map((repair) => (
                                <div
                                  key={repair.id}
                                  data-testid={`card-repair-job-${repair.id}`}
                                  className={cn(
                                    "rounded-lg p-2 border-l-[3px]",
                                    repair.status === "completed"
                                      ? "bg-[#22c55e15] border-l-[#22c55e]"
                                      : repair.status === "in_progress"
                                      ? "bg-[#14b8a615] border-l-[#14b8a6]"
                                      : "bg-[#f9731615] border-l-[#f97316]"
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A]">
                                    <Wrench className="w-3 h-3" />
                                    <span className="truncate" data-testid={`text-repair-title-${repair.id}`}>{repair.title}</span>
                                  </div>
                                  <p className="text-[10px] text-[#64748B] mt-1 truncate flex items-center gap-1" data-testid={`text-repair-property-${repair.id}`}>
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    {repair.propertyName}
                                  </p>
                                  <span
                                    data-testid={`status-repair-${repair.id}`}
                                    className={cn(
                                      "inline-block mt-1.5 px-1.5 py-0.5 text-[9px] font-medium rounded",
                                      repair.status === "completed"
                                        ? "bg-[#22c55e] text-white"
                                        : repair.status === "in_progress"
                                        ? "bg-[#14b8a6] text-white"
                                        : "bg-[#f97316] text-white"
                                    )}
                                  >
                                    {repair.status === "completed"
                                      ? "Completed"
                                      : repair.status === "in_progress"
                                      ? "In Progress"
                                      : "Scheduled"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Render route properties for service technicians based on visit days
                      if (tech.role === "service") {
                        const propertiesForDay = getPropertiesForTechAndDate(tech.id, date);
                        if (propertiesForDay.length > 0) {
                          const routeBlockKey = `${tech.id}-${dayIndex}`;
                          const isRouteExpanded = expandedRouteBlocks.has(routeBlockKey);
                          const routeCoverage = routeCoverages.get(routeBlockKey);
                          return (
                            <div
                              key={displayIndex}
                              className="flex-1 min-w-[140px] px-2 py-2"
                              data-testid={`cell-service-${tech.id}-${dayIndex}`}
                            >
                              <div
                                className={cn(
                                  "rounded-xl bg-white shadow-sm border border-[#e5e7eb] p-2 cursor-pointer transition-all",
                                  isRouteExpanded ? "min-h-[160px]" : "min-h-[80px]",
                                  routeCoverage && "border-l-4 border-l-[#f97316]"
                                )}
                                onClick={() => toggleRouteBlockExpand(routeBlockKey)}
                                data-testid={`route-block-${tech.id}-${dayIndex}`}
                              >
                                {routeCoverage && (
                                  <div className="mb-2 -mx-2 -mt-2 px-2 py-1.5 bg-[#f97316] rounded-t-lg">
                                    {routeCoverage.type === 'extended' && (
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-white uppercase tracking-wide">Extended Coverage</p>
                                        <p className="text-[9px] text-white">
                                          Covered by: <span className="font-bold">{routeCoverage.coveringTechName}</span>
                                        </p>
                                        {routeCoverage.fromDate && routeCoverage.toDate && (
                                          <p className="text-[9px] text-white/90">
                                            Dates: {new Date(routeCoverage.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(routeCoverage.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    {routeCoverage.type === 'split' && (
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-white uppercase tracking-wide">Split Route</p>
                                        <div className="space-y-0.5">
                                          <p className="text-[9px] text-white">
                                            <span className="font-bold">{routeCoverage.techAName}:</span> {routeCoverage.techAProperties?.filter(Boolean).join(', ') || 'None'}
                                          </p>
                                          <p className="text-[9px] text-white">
                                            <span className="font-bold">{routeCoverage.techBName}:</span> {routeCoverage.techBProperties?.filter(Boolean).join(', ') || 'None'}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    {routeCoverage.type === 'full' && (
                                      <div>
                                        <p className="text-[9px] font-bold text-white">Full Day Coverage</p>
                                        <p className="text-[8px] text-white/90 mt-0.5">Covered by: {routeCoverage.coveringTechName}</p>
                                        {routeCoverage.date && (
                                          <p className="text-[8px] text-white/80">Date: {routeCoverage.date}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-[#0F172A]" data-testid={`text-stop-count-${tech.id}-${dayIndex}`}>
                                    {propertiesForDay.length} stops
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    0/{propertiesForDay.length}
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#64748B] flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  08:00 - 16:00
                                </p>
                                <span className="inline-block mt-1.5 px-1.5 py-0.5 text-[9px] font-medium rounded bg-slate-200 text-slate-600">
                                  Pending
                                </span>
                                
                                {isRouteExpanded && (
                                  <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                                    {propertiesForDay.slice(0, 5).map((prop, idx) => {
                                      // For split routes, determine which tech covers this property
                                      let techBadge = null;
                                      if (routeCoverage?.type === 'split') {
                                        const propName = prop.propertyName || '';
                                        if (routeCoverage.techAProperties?.includes(propName)) {
                                          techBadge = <span className="ml-1 px-1 py-0.5 text-[8px] font-medium bg-[#0077b6] text-white rounded">({routeCoverage.techAName?.charAt(0)})</span>;
                                        } else if (routeCoverage.techBProperties?.includes(propName)) {
                                          techBadge = <span className="ml-1 px-1 py-0.5 text-[8px] font-medium bg-[#22c55e] text-white rounded">({routeCoverage.techBName?.charAt(0)})</span>;
                                        }
                                      }
                                      return (
                                        <div key={prop.id} className="flex items-center gap-1 text-[10px] text-[#64748B]">
                                          <span className="w-4 text-center font-medium">{idx + 1}</span>
                                          <MapPin className="w-3 h-3 shrink-0" />
                                          <span className="truncate">{prop.propertyName}</span>
                                          {techBadge}
                                        </div>
                                      );
                                    })}
                                    {propertiesForDay.length > 5 && (
                                      <p className="text-[10px] text-[#0077b6] font-medium">
                                        +{propertiesForDay.length - 5} more
                                      </p>
                                    )}
                                    
                                    <div className="mt-3 pt-2 border-t border-slate-200">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full h-7 text-[10px] text-slate-600 hover:text-[#0077b6] hover:bg-slate-100"
                                            onClick={(e) => e.stopPropagation()}
                                            data-testid={`button-route-actions-${tech.id}-${dayIndex}`}
                                          >
                                            <MoreHorizontal className="w-3 h-3 mr-1" />
                                            Route Actions
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-44" onClick={(e) => e.stopPropagation()}>
                                          <DropdownMenuItem
                                            className="text-xs cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedRouteData({
                                                techId: tech.id,
                                                techName: `${tech.firstName} ${tech.lastName}`,
                                                date,
                                                properties: propertiesForDay,
                                              });
                                              setExtendedCoverForm({
                                                fromDate: date.toISOString().split('T')[0],
                                                toDate: date.toISOString().split('T')[0],
                                                coveringTechId: "",
                                                reason: "",
                                              });
                                              setShowExtendedCoverModal(true);
                                            }}
                                            data-testid={`menu-extended-cover-${tech.id}-${dayIndex}`}
                                          >
                                            <CalendarDays className="w-3.5 h-3.5 mr-2 text-[#0077b6]" />
                                            Extended Cover
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-xs cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedRouteData({
                                                techId: tech.id,
                                                techName: `${tech.firstName} ${tech.lastName}`,
                                                date,
                                                properties: propertiesForDay,
                                              });
                                              setSplitRouteForm({
                                                techAId: "",
                                                techBId: "",
                                                techAProperties: [],
                                                techBProperties: [],
                                                reason: "",
                                              });
                                              setShowSplitRouteModal(true);
                                            }}
                                            data-testid={`menu-split-route-${tech.id}-${dayIndex}`}
                                          >
                                            <GitBranch className="w-3.5 h-3.5 mr-2 text-[#0077b6]" />
                                            Split Route
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-xs cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedRouteData({
                                                techId: tech.id,
                                                techName: `${tech.firstName} ${tech.lastName}`,
                                                date,
                                                properties: propertiesForDay,
                                              });
                                              setCoverFullRouteForm({
                                                coveringTechId: "",
                                                reason: "",
                                              });
                                              setShowCoverFullRouteModal(true);
                                            }}
                                            data-testid={`menu-cover-full-route-${tech.id}-${dayIndex}`}
                                          >
                                            <UserPlus className="w-3.5 h-3.5 mr-2 text-[#0077b6]" />
                                            Cover Full Route
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      }

                      return (
                        <div
                          key={displayIndex}
                          className="flex-1 min-w-[140px] px-2 py-2 group/cell"
                        >
                          <div className="h-full min-h-[80px] border-2 border-dashed border-transparent group-hover/cell:border-slate-200 rounded-lg flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover/cell:opacity-100 transition-opacity"
                              onClick={() => {
                                setSelectedTechForSchedule(tech);
                                setSelectedDays([dayIndex]);
                                setShowAddScheduleModal(true);
                              }}
                            >
                              <Plus className="w-4 h-4 text-slate-400" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="w-[50px] min-w-[50px] flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0078D4]"
                        onClick={() => openAddScheduleModal(tech)}
                        data-testid={`button-add-schedule-${tech.id}`}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 py-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-page-prev"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "min-w-[36px]",
                      currentPage === page && "bg-[#0F172A] text-white"
                    )}
                    data-testid={`button-page-${page}`}
                  >
                    {page}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-page-next"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            </div>
          </div>
        </div>
        
        {coverages.filter((c) => c.status === "active").length > 0 && (
          <div className="px-6 py-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-[#17BEBB]" />
                    <h3 className="font-semibold text-[#0F172A]">Active Coverage This Week</h3>
                  </div>
                  <Button variant="link" className="text-[#0078D4] text-sm">
                    View All →
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {coverages
                    .filter((c) => c.status === "active")
                    .slice(0, 3)
                    .map((coverage) => {
                      const originalTech = getOriginalTechForCoverage(coverage);
                      const coveringTech = technicians.find(
                        (t) => String(t.id) === String(coverage.coveringTechId)
                      );
                      
                      return (
                        <div
                          key={coverage.id}
                          className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                        >
                          {originalTech && (
                            <div className="flex items-center gap-2 opacity-50">
                              <div className="w-10 h-10 rounded-xl bg-slate-300 flex items-center justify-center text-white font-semibold text-sm">
                                {getInitials(originalTech.firstName, originalTech.lastName)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#0F172A]">
                                  {originalTech.firstName} {originalTech.lastName}
                                </p>
                                <p className="text-xs text-[#64748B]">
                                  {coverage.reason || "On Leave"}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex-1 flex items-center justify-center">
                            <div className="w-16 h-px bg-slate-300"></div>
                            <span className="px-2 text-xs text-slate-400">→</span>
                            <div className="w-16 h-px bg-slate-300"></div>
                          </div>
                          
                          {coveringTech && (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm"
                                style={{
                                  backgroundColor: ROLE_COLORS[coveringTech.role] || "#0078D4",
                                }}
                              >
                                {getInitials(coveringTech.firstName, coveringTech.lastName)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#0F172A]">
                                  {coveringTech.firstName} {coveringTech.lastName}
                                </p>
                                <p className="text-xs text-[#64748B]">Covering</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="text-right">
                            {coverage.propertyName && (
                              <p className="text-sm text-[#0F172A]">{coverage.propertyName}</p>
                            )}
                            <p className="text-xs text-[#64748B]">
                              {new Date(coverage.startDate).toLocaleDateString()} -{" "}
                              {new Date(coverage.endDate).toLocaleDateString()}
                            </p>
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-[#22D69A]/10 text-[#22D69A] text-[10px] font-medium rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22D69A]"></span>
                              Active
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <Dialog open={showAddScheduleModal} onOpenChange={setShowAddScheduleModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedTechForSchedule && (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold"
                  style={{
                    backgroundColor:
                      ROLE_COLORS[selectedTechForSchedule.role] || "#0078D4",
                  }}
                >
                  {getInitials(
                    selectedTechForSchedule.firstName,
                    selectedTechForSchedule.lastName
                  )}
                </div>
              )}
              <div>
                <DialogTitle>Add Schedule</DialogTitle>
                {selectedTechForSchedule && (
                  <p className="text-sm text-[#64748B]">
                    {selectedTechForSchedule.firstName}{" "}
                    {selectedTechForSchedule.lastName}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Select Day(s)</Label>
              <div className="flex gap-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
                  <button
                    key={day}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      selectedDays.includes(i + 1)
                        ? "bg-[#0078D4] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                    onClick={() => toggleDay(i + 1)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="stopCount" className="text-sm font-medium">
                Number of Stops
              </Label>
              <Input
                id="stopCount"
                type="number"
                min={1}
                value={scheduleFormData.stopCount}
                onChange={(e) =>
                  setScheduleFormData((prev) => ({
                    ...prev,
                    stopCount: parseInt(e.target.value) || 1,
                  }))
                }
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime" className="text-sm font-medium">
                  Start Time
                </Label>
                <Select
                  value={scheduleFormData.startTime}
                  onValueChange={(value) =>
                    setScheduleFormData((prev) => ({ ...prev, startTime: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["06:00", "07:00", "08:00", "09:00", "10:00"].map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endTime" className="text-sm font-medium">
                  End Time
                </Label>
                <Select
                  value={scheduleFormData.endTime}
                  onValueChange={(value) =>
                    setScheduleFormData((prev) => ({ ...prev, endTime: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["14:00", "15:00", "16:00", "17:00", "18:00"].map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Assign Properties
              </Label>
              <ScrollArea className="h-[150px] border rounded-lg p-2">
                {customers.slice(0, 20).map((customer) => (
                  <label
                    key={customer.id}
                    className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={scheduleFormData.selectedProperties.includes(customer.id)}
                      onCheckedChange={() => toggleProperty(customer.id)}
                    />
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      {customer.address && (
                        <p className="text-xs text-[#64748B]">{customer.address}</p>
                      )}
                    </div>
                  </label>
                ))}
              </ScrollArea>
            </div>
            
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={scheduleFormData.notes}
                onChange={(e) =>
                  setScheduleFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddScheduleModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#FF8000] hover:bg-[#E67300] text-white"
              onClick={handleCreateSchedule}
              disabled={selectedDays.length === 0 || createScheduleMutation.isPending}
            >
              {createScheduleMutation.isPending ? "Adding..." : "Add Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showAddCoverageModal} onOpenChange={setShowAddCoverageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Coverage</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[#64748B]">
              Coverage creation form coming soon. This will allow you to assign a technician to cover for another.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCoverageModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showExtendedCoverModal} onOpenChange={setShowExtendedCoverModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#0077b6]" />
              Extended Cover
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedRouteData && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm font-medium text-[#0F172A]">{selectedRouteData.techName}</p>
                <p className="text-xs text-slate-500">{selectedRouteData.properties.length} stops on this route</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">From Date</Label>
                <Input
                  type="date"
                  value={extendedCoverForm.fromDate}
                  onChange={(e) => setExtendedCoverForm(prev => ({ ...prev, fromDate: e.target.value }))}
                  className="mt-1"
                  data-testid="input-extended-from-date"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">To Date</Label>
                <Input
                  type="date"
                  value={extendedCoverForm.toDate}
                  onChange={(e) => setExtendedCoverForm(prev => ({ ...prev, toDate: e.target.value }))}
                  className="mt-1"
                  data-testid="input-extended-to-date"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Covering Technician</Label>
              <Select
                value={extendedCoverForm.coveringTechId}
                onValueChange={(value) => setExtendedCoverForm(prev => ({ ...prev, coveringTechId: value }))}
              >
                <SelectTrigger className="mt-1" data-testid="select-extended-covering-tech">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians
                    .filter(t => t.role === "service" && t.id !== selectedRouteData?.techId)
                    .map((tech) => (
                      <SelectItem key={String(tech.id)} value={String(tech.id)}>
                        {tech.firstName} {tech.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Reason (Optional)</Label>
              <Textarea
                placeholder="e.g., Vacation, PTO, Training"
                value={extendedCoverForm.reason}
                onChange={(e) => setExtendedCoverForm(prev => ({ ...prev, reason: e.target.value }))}
                className="mt-1"
                rows={2}
                data-testid="input-extended-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendedCoverModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0077b6] hover:bg-[#005f8f] text-white"
              onClick={() => {
                if (selectedRouteData) {
                  const coveringTech = technicians.find(t => String(t.id) === extendedCoverForm.coveringTechId);
                  const routeKey = `${selectedRouteData.techId}-${weekDates.findIndex(d => d.toDateString() === selectedRouteData.date.toDateString())}`;
                  setRouteCoverages(prev => {
                    const newMap = new Map(prev);
                    newMap.set(routeKey, {
                      type: 'extended',
                      coveringTechName: coveringTech ? `${coveringTech.firstName} ${coveringTech.lastName}` : '',
                      fromDate: extendedCoverForm.fromDate,
                      toDate: extendedCoverForm.toDate,
                      propertyCount: selectedRouteData.properties.length,
                      propertyNames: selectedRouteData.properties.map(p => p.propertyName || ''),
                    });
                    return newMap;
                  });
                }
                toast({
                  title: "Coverage Saved",
                  description: `Extended coverage set for ${extendedCoverForm.fromDate} to ${extendedCoverForm.toDate}`,
                });
                setShowExtendedCoverModal(false);
              }}
              disabled={!extendedCoverForm.coveringTechId || !extendedCoverForm.fromDate || !extendedCoverForm.toDate}
              data-testid="button-save-extended-cover"
            >
              Save Coverage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showSplitRouteModal} onOpenChange={setShowSplitRouteModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#0077b6]" />
              Split Route
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedRouteData && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm font-medium text-[#0F172A]">{selectedRouteData.techName}'s Route</p>
                <p className="text-xs text-slate-500">
                  {selectedRouteData.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} - {selectedRouteData.properties.length} stops
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Tech A</Label>
                <Select
                  value={splitRouteForm.techAId}
                  onValueChange={(value) => setSplitRouteForm(prev => ({ ...prev, techAId: value }))}
                >
                  <SelectTrigger className="mt-1" data-testid="select-split-tech-a">
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians
                      .filter(t => t.role === "service" && t.id !== selectedRouteData?.techId && String(t.id) !== splitRouteForm.techBId)
                      .map((tech) => (
                        <SelectItem key={String(tech.id)} value={String(tech.id)}>
                          {tech.firstName} {tech.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Tech B</Label>
                <Select
                  value={splitRouteForm.techBId}
                  onValueChange={(value) => setSplitRouteForm(prev => ({ ...prev, techBId: value }))}
                >
                  <SelectTrigger className="mt-1" data-testid="select-split-tech-b">
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians
                      .filter(t => t.role === "service" && t.id !== selectedRouteData?.techId && String(t.id) !== splitRouteForm.techAId)
                      .map((tech) => (
                        <SelectItem key={String(tech.id)} value={String(tech.id)}>
                          {tech.firstName} {tech.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {selectedRouteData && splitRouteForm.techAId && splitRouteForm.techBId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    Assign to {technicians.find(t => String(t.id) === splitRouteForm.techAId)?.firstName || 'Tech A'}
                  </p>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {selectedRouteData.properties.map((prop) => (
                      <label
                        key={prop.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded cursor-pointer text-xs",
                          splitRouteForm.techAProperties.includes(prop.id) 
                            ? "bg-[#0077b6]/10 border border-[#0077b6]" 
                            : "bg-slate-50 hover:bg-slate-100",
                          splitRouteForm.techBProperties.includes(prop.id) && "opacity-40 pointer-events-none"
                        )}
                      >
                        <Checkbox
                          checked={splitRouteForm.techAProperties.includes(prop.id)}
                          disabled={splitRouteForm.techBProperties.includes(prop.id)}
                          onCheckedChange={(checked) => {
                            setSplitRouteForm(prev => ({
                              ...prev,
                              techAProperties: checked
                                ? [...prev.techAProperties, prop.id]
                                : prev.techAProperties.filter(id => id !== prop.id)
                            }));
                          }}
                        />
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{prop.propertyName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    Assign to {technicians.find(t => String(t.id) === splitRouteForm.techBId)?.firstName || 'Tech B'}
                  </p>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {selectedRouteData.properties.map((prop) => (
                      <label
                        key={prop.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded cursor-pointer text-xs",
                          splitRouteForm.techBProperties.includes(prop.id) 
                            ? "bg-[#0077b6]/10 border border-[#0077b6]" 
                            : "bg-slate-50 hover:bg-slate-100",
                          splitRouteForm.techAProperties.includes(prop.id) && "opacity-40 pointer-events-none"
                        )}
                      >
                        <Checkbox
                          checked={splitRouteForm.techBProperties.includes(prop.id)}
                          disabled={splitRouteForm.techAProperties.includes(prop.id)}
                          onCheckedChange={(checked) => {
                            setSplitRouteForm(prev => ({
                              ...prev,
                              techBProperties: checked
                                ? [...prev.techBProperties, prop.id]
                                : prev.techBProperties.filter(id => id !== prop.id)
                            }));
                          }}
                        />
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{prop.propertyName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label className="text-sm font-medium">Reason (Optional)</Label>
              <Textarea
                placeholder="e.g., Heavy workload, Training new tech"
                value={splitRouteForm.reason}
                onChange={(e) => setSplitRouteForm(prev => ({ ...prev, reason: e.target.value }))}
                className="mt-1"
                rows={2}
                data-testid="input-split-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSplitRouteModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0077b6] hover:bg-[#005f8f] text-white"
              onClick={() => {
                if (selectedRouteData) {
                  const techA = technicians.find(t => String(t.id) === splitRouteForm.techAId);
                  const techB = technicians.find(t => String(t.id) === splitRouteForm.techBId);
                  const routeKey = `${selectedRouteData.techId}-${weekDates.findIndex(d => d.toDateString() === selectedRouteData.date.toDateString())}`;
                  // Get property names for each tech
                  const techAPropertyNames = selectedRouteData.properties
                    .filter(p => splitRouteForm.techAProperties.includes(p.id))
                    .map(p => p.propertyName || '');
                  const techBPropertyNames = selectedRouteData.properties
                    .filter(p => splitRouteForm.techBProperties.includes(p.id))
                    .map(p => p.propertyName || '');
                  setRouteCoverages(prev => {
                    const newMap = new Map(prev);
                    newMap.set(routeKey, {
                      type: 'split',
                      techAName: techA ? `${techA.firstName}` : '',
                      techBName: techB ? `${techB.firstName}` : '',
                      techAProperties: techAPropertyNames,
                      techBProperties: techBPropertyNames,
                    });
                    return newMap;
                  });
                }
                toast({
                  title: "Route Split",
                  description: `Route split between ${splitRouteForm.techAProperties.length} and ${splitRouteForm.techBProperties.length} stops`,
                });
                setShowSplitRouteModal(false);
              }}
              disabled={!splitRouteForm.techAId || !splitRouteForm.techBId || 
                (splitRouteForm.techAProperties.length === 0 && splitRouteForm.techBProperties.length === 0)}
              data-testid="button-split-route"
            >
              Split Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showCoverFullRouteModal} onOpenChange={setShowCoverFullRouteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0077b6]" />
              Cover Full Route
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedRouteData && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm font-medium text-[#0F172A]">{selectedRouteData.techName}'s Route</p>
                <p className="text-xs text-slate-500">
                  {selectedRouteData.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} - {selectedRouteData.properties.length} stops
                </p>
              </div>
            )}
            
            <div>
              <Label className="text-sm font-medium">Covering Technician</Label>
              <Select
                value={coverFullRouteForm.coveringTechId}
                onValueChange={(value) => setCoverFullRouteForm(prev => ({ ...prev, coveringTechId: value }))}
              >
                <SelectTrigger className="mt-1" data-testid="select-cover-full-tech">
                  <SelectValue placeholder="Select technician to cover entire route" />
                </SelectTrigger>
                <SelectContent>
                  {technicians
                    .filter(t => t.role === "service" && t.id !== selectedRouteData?.techId)
                    .map((tech) => (
                      <SelectItem key={String(tech.id)} value={String(tech.id)}>
                        {tech.firstName} {tech.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Reason (Optional)</Label>
              <Textarea
                placeholder="e.g., Sick day, PTO, Training, Personal emergency"
                value={coverFullRouteForm.reason}
                onChange={(e) => setCoverFullRouteForm(prev => ({ ...prev, reason: e.target.value }))}
                className="mt-1"
                rows={2}
                data-testid="input-cover-full-reason"
              />
            </div>
            
            {selectedRouteData && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-blue-700 font-medium mb-1">Stops to be covered:</p>
                <div className="space-y-0.5">
                  {selectedRouteData.properties.slice(0, 4).map((prop, idx) => (
                    <p key={prop.id} className="text-xs text-blue-600 flex items-center gap-1">
                      <span className="w-4">{idx + 1}.</span>
                      {prop.propertyName}
                    </p>
                  ))}
                  {selectedRouteData.properties.length > 4 && (
                    <p className="text-xs text-blue-500 font-medium">
                      +{selectedRouteData.properties.length - 4} more stops
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoverFullRouteModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0077b6] hover:bg-[#005f8f] text-white"
              onClick={() => {
                const coveringTech = technicians.find(t => String(t.id) === coverFullRouteForm.coveringTechId);
                if (selectedRouteData) {
                  const routeKey = `${selectedRouteData.techId}-${weekDates.findIndex(d => d.toDateString() === selectedRouteData.date.toDateString())}`;
                  setRouteCoverages(prev => {
                    const newMap = new Map(prev);
                    newMap.set(routeKey, {
                      type: 'full',
                      coveringTechName: coveringTech ? `${coveringTech.firstName} ${coveringTech.lastName}` : '',
                      date: selectedRouteData.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      propertyCount: selectedRouteData.properties.length,
                    });
                    return newMap;
                  });
                }
                toast({
                  title: "Coverage Assigned",
                  description: `${coveringTech?.firstName} ${coveringTech?.lastName} will cover the full route`,
                });
                setShowCoverFullRouteModal(false);
              }}
              disabled={!coverFullRouteForm.coveringTechId}
              data-testid="button-assign-coverage"
            >
              Assign Coverage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
