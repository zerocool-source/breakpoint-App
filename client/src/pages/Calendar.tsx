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
  "#0078D4", "#FF8000", "#17BEBB", "#22D69A", "#8B5CF6",
  "#F59E0B", "#EC4899", "#14B8A6", "#6366F1", "#EF4444",
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
  const [roleFilter, setRoleFilter] = useState<"service" | "repair" | "supervisor">("service");
  const [activeSeason, setActiveSeason] = useState<"summer" | "winter">("summer");
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showAddCoverageModal, setShowAddCoverageModal] = useState(false);
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

  const { data: techniciansData } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians"],
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

  const technicians = techniciansData?.technicians || [];
  const schedules = schedulesData?.schedules || [];
  const coverages = coveragesData?.coverages || [];
  const timeOffs = timeOffData?.timeOffs || [];
  const customers = customersData?.customers || [];

  const filteredTechnicians = useMemo(() => {
    return technicians.filter((tech) => {
      if (!tech.active) return false;
      if (roleFilter === "service") return tech.role === "service";
      if (roleFilter === "repair") return tech.role === "repair";
      if (roleFilter === "supervisor") return tech.role === "supervisor" || tech.role === "foreman";
      return true;
    });
  }, [technicians, roleFilter]);

  const stats = useMemo(() => {
    const activeTechs = filteredTechnicians.length;
    const totalStops = schedules.reduce((sum, s) => sum + (s.stopCount || 0), 0);
    const activeCoverages = coverages.filter((c) => c.status === "active").length;
    return { activeTechs, totalStops, activeCoverages };
  }, [filteredTechnicians, schedules, coverages]);

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
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#0F172A]" data-testid="text-page-title">Schedule</h1>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateWeek("prev")}
                  data-testid="button-prev-week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[180px] text-center">
                  {formatWeekRange(weekDates)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateWeek("next")}
                  data-testid="button-next-week"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <Button variant="outline" onClick={goToToday} data-testid="button-today">
                Today
              </Button>
              
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  className={cn(
                    "px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors",
                    roleFilter === "service"
                      ? "bg-[#0078D4] text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                  onClick={() => setRoleFilter("service")}
                  data-testid="button-filter-service"
                >
                  <Wrench className="w-4 h-4" />
                  Service
                </button>
                <button
                  className={cn(
                    "px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors border-x border-slate-200",
                    roleFilter === "repair"
                      ? "bg-[#FF8000] text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                  onClick={() => setRoleFilter("repair")}
                  data-testid="button-filter-repair"
                >
                  <Wrench className="w-4 h-4" />
                  Repair
                </button>
                <button
                  className={cn(
                    "px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors",
                    roleFilter === "supervisor"
                      ? "bg-[#17BEBB] text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                  onClick={() => setRoleFilter("supervisor")}
                  data-testid="button-filter-supervisor"
                >
                  <UserCheck className="w-4 h-4" />
                  Supervisors
                </button>
              </div>
              
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  className={cn(
                    "px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors",
                    activeSeason === "summer"
                      ? "bg-[#FF8000] text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                  onClick={() => setActiveSeason("summer")}
                  data-testid="button-season-summer"
                >
                  <Sun className="w-4 h-4" />
                  Summer
                </button>
                <button
                  className={cn(
                    "px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors",
                    activeSeason === "winter"
                      ? "bg-[#0078D4] text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                  onClick={() => setActiveSeason("winter")}
                  data-testid="button-season-winter"
                >
                  <Snowflake className="w-4 h-4" />
                  Winter
                </button>
              </div>
              
              <Button
                className="bg-[#FF8000] hover:bg-[#E67300] text-white"
                onClick={() => setShowAddCoverageModal(true)}
                data-testid="button-add-coverage"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Coverage
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0078D4]/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#0078D4]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{stats.activeTechs}</p>
                  <p className="text-sm text-[#64748B]">Active Techs</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#22D69A]/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#22D69A]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{stats.totalStops}</p>
                  <p className="text-sm text-[#64748B]">Total Stops This Week</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#17BEBB]/10 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-[#17BEBB]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{stats.activeCoverages}</p>
                  <p className="text-sm text-[#64748B]">Active Coverages</p>
                </div>
              </CardContent>
            </Card>
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
            <div className="flex border-b border-slate-200 bg-slate-50">
              <div className="w-[260px] min-w-[260px] px-4 py-3 font-semibold text-sm text-[#64748B] sticky left-0 bg-slate-50 z-10">
                TECHNICIAN
              </div>
              {weekDates.map((date, i) => {
                const isToday = isSameDay(date, today);
                return (
                  <div
                    key={i}
                    className="flex-1 min-w-[120px] px-2 py-3 text-center"
                  >
                    <div className="text-xs font-semibold text-[#64748B]">{DAYS_OF_WEEK[i]}</div>
                    <div
                      className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium mt-1",
                        isToday ? "bg-[#0078D4] text-white" : "text-[#0F172A]"
                      )}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
              <div className="w-[50px] min-w-[50px]"></div>
            </div>
            
            {filteredTechnicians.length === 0 ? (
              <div className="py-12 text-center text-[#64748B]">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No technicians found for this role filter.</p>
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
                    className="flex border-b border-slate-100 hover:bg-slate-50/50 group"
                    data-testid={`row-tech-${tech.id}`}
                  >
                    <div className="w-[260px] min-w-[260px] px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 border-r border-slate-100">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-sm relative"
                          style={{ backgroundColor: techColor }}
                        >
                          {getInitials(tech.firstName, tech.lastName)}
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                              isOnLeaveThisWeek ? "bg-slate-400" : "bg-[#22D69A]"
                            )}
                          ></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">
                              {tech.firstName} {tech.lastName}
                            </p>
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
                    
                    {weekDates.map((date, dayIndex) => {
                      const schedule = getScheduleForTechAndDate(tech.id, date);
                      const coverage = getCoverageForTechAndDate(tech.id, date);
                      const timeOff = getTimeOffForTechAndDate(tech.id, date);
                      const isExpanded = schedule && expandedSchedules.has(schedule.id);

                      if (timeOff) {
                        const coveringTech = getCoveringTechForTimeOff(timeOff);
                        return (
                          <div
                            key={dayIndex}
                            className="flex-1 min-w-[120px] px-2 py-2"
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
                            key={dayIndex}
                            className="flex-1 min-w-[120px] px-2 py-2"
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
                            key={dayIndex}
                            className="flex-1 min-w-[120px] px-2 py-2"
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

                      return (
                        <div
                          key={dayIndex}
                          className="flex-1 min-w-[120px] px-2 py-2 group/cell"
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
    </AppLayout>
  );
}
