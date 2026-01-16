import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Plus, MapPin, Clock, 
  Trash2, Edit, GripVertical, MoreVertical, 
  Map, List, ChevronLeft, ChevronRight,
  Navigation, Timer, ChevronDown, ChevronUp, Filter, EyeOff, ChevronsDownUp, X
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RouteStop {
  id: string;
  routeId: string;
  propertyId: string;
  propertyName: string;
  customerId: string | null;
  customerName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  poolName: string | null;
  jobType: string | null;
  status: string | null;
  sortOrder: number | null;
  estimatedTime: number | null;
  notes: string | null;
  frequency: string | null;
  lat?: number;
  lng?: number;
}

interface Route {
  id: string;
  name: string;
  dayOfWeek: number;
  color: string;
  technicianId: string | null;
  technicianName: string | null;
  isLocked: boolean | null;
  estimatedDriveTime: number | null;
  estimatedMiles: number | null;
  estimatedOnSiteTime: number | null;
  sortOrder: number | null;
  stops: RouteStop[];
}

interface Customer {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  poolCount: number | null;
}

interface UnscheduledOccurrence {
  id: string;
  propertyId: string;
  date: string;
  status: string;
  propertyName: string;
  customerName: string;
  address: string;
}

const DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const ROUTE_COLORS = [
  "#0891b2", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#ca8a04",
  "#000000", "#6366f1", "#ec4899", "#f97316", "#84cc16"
];

function getInitials(name: string): string {
  if (!name) return "??";
  const parts = name.split(" ").filter(p => p.length > 0);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getWeekDates(weekOffset: number = 0, includeSunday: boolean = false) {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + (weekOffset * 7));
  
  const dates: { date: Date; dayOfWeek: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push({ date: d, dayOfWeek: i + 1 });
  }
  if (includeSunday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    dates.push({ date: sunday, dayOfWeek: 0 });
  }
  return dates;
}

function formatDateRange(dates: { date: Date }[]) {
  if (dates.length === 0) return "";
  const start = dates[0].date;
  const end = dates[dates.length - 1].date;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} - ${end.getDate()} ${months[start.getMonth()]}, ${start.getFullYear()}`;
  } else {
    return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}, ${end.getFullYear()}`;
  }
}

function createMarkerIcon(color: string, number: number) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function DraggableUnscheduledItem({ occurrence, dayOfWeek }: { occurrence: UnscheduledOccurrence; dayOfWeek: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `unscheduled-${occurrence.id}`,
    data: { occurrence, dayOfWeek },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 text-xs py-2 px-3 rounded-md bg-white border border-slate-200 cursor-grab hover:border-blue-400 hover:shadow-sm transition-all mb-1"
      data-testid={`draggable-unscheduled-${occurrence.id}`}
    >
      <GripVertical className="h-3 w-3 text-slate-400 flex-shrink-0" />
      <MapPin className="h-3 w-3 text-slate-500 flex-shrink-0" />
      <div className="flex-1 min-w-0 truncate">
        <span className="font-medium text-slate-700">{occurrence.customerName || occurrence.propertyName}</span>
      </div>
    </div>
  );
}

function DroppableRouteCard({ route, children, dayOfWeek }: { route: Route; children: React.ReactNode; dayOfWeek: number }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `route-${route.id}`,
    data: { route, dayOfWeek, type: "route" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${isOver ? "ring-2 ring-#0078D4 ring-offset-1" : ""}`}
    >
      {children}
    </div>
  );
}

function DroppableUnscheduledArea({ dayOfWeek, children }: { dayOfWeek: number; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `unscheduled-drop-${dayOfWeek}`,
    data: { dayOfWeek, type: "unscheduled" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${isOver ? "ring-2 ring-[#FF8000] bg-[#FF8000]1A" : ""}`}
    >
      {children}
    </div>
  );
}

export default function Scheduling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [dayViewMode, setDayViewMode] = useState<"1day" | "2day" | "week">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [showCreateRouteDialog, setShowCreateRouteDialog] = useState(false);
  const [showCreateStopDialog, setShowCreateStopDialog] = useState(false);
  const [showEditRouteDialog, setShowEditRouteDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<UnscheduledOccurrence | null>(null);
  const [allCollapsed, setAllCollapsed] = useState(true);
  const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(false);
  const [showMapPanel, setShowMapPanel] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  
  const urlParams = new URLSearchParams(window.location.search);
  const filterCustomerId = urlParams.get("customerId");
  const filterCustomerName = urlParams.get("customerName");

  const [newRoute, setNewRoute] = useState({
    name: "",
    color: ROUTE_COLORS[0],
    technicianName: "",
    dayOfWeek: 1,
  });
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  const [newStop, setNewStop] = useState({
    propertyName: "",
    customerName: "",
    address: "",
    poolName: "",
    estimatedTime: 30,
  });

  const { data: allRoutesData, isLoading } = useQuery({
    queryKey: ["all-routes"],
    queryFn: async () => {
      const response = await fetch("/api/routes");
      if (!response.ok) throw new Error("Failed to fetch routes");
      return response.json();
    },
  });

  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) return { customers: [] };
      return response.json();
    },
  });

  const customers = customersData?.customers || [];

  const getDateRange = () => {
    // Get the Monday of the current week as start date
    const today = new Date();
    const currentJsDayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
    const daysSinceMonday = currentJsDayOfWeek === 0 ? 6 : currentJsDayOfWeek - 1;
    const weekStartMonday = new Date(today);
    weekStartMonday.setDate(today.getDate() - daysSinceMonday);
    weekStartMonday.setHours(0, 0, 0, 0);
    
    // End date is Sunday of current week
    const weekEndSunday = new Date(weekStartMonday);
    weekEndSunday.setDate(weekStartMonday.getDate() + 6);
    
    const start = weekStartMonday.toISOString().split("T")[0];
    const end = weekEndSunday.toISOString().split("T")[0];
    return { start, end };
  };

  const dateRange = useMemo(() => getDateRange(), []);

  const { data: unscheduledData } = useQuery<{ occurrences: UnscheduledOccurrence[] }>({
    queryKey: ["unscheduled", dateRange.start, dateRange.end],
    queryFn: async () => {
      const response = await fetch(`/api/unscheduled?start=${dateRange.start}&end=${dateRange.end}`);
      if (!response.ok) return { occurrences: [] };
      return response.json();
    },
  });

  const unscheduledOccurrences = unscheduledData?.occurrences || [];

  const unscheduledByDay = useMemo(() => {
    const grouped: Record<number, UnscheduledOccurrence[]> = {};
    for (const occ of unscheduledOccurrences) {
      // Use getUTCDay() to avoid timezone issues with UTC dates
      const dayOfWeek = new Date(occ.date).getUTCDay();
      if (!grouped[dayOfWeek]) grouped[dayOfWeek] = [];
      grouped[dayOfWeek].push(occ);
    }
    return grouped;
  }, [unscheduledOccurrences]);

  const createRouteMutation = useMutation({
    mutationFn: async (route: any) => {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(route),
      });
      if (!response.ok) throw new Error("Failed to create route");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-routes"] });
      toast({ title: "Route Created", description: "New route has been added." });
      setShowCreateRouteDialog(false);
      setNewRoute({ name: "", color: ROUTE_COLORS[0], technicianName: "", dayOfWeek: 1 });
      setSelectedCustomerIds([]);
    },
  });

  const updateRouteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/routes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update route");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-routes"] });
      setShowEditRouteDialog(false);
    },
  });

  const deleteRouteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/routes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete route");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-routes"] });
      toast({ title: "Route Deleted" });
    },
  });

  const createStopMutation = useMutation({
    mutationFn: async ({ routeId, stop }: { routeId: string; stop: any }) => {
      const response = await fetch(`/api/routes/${routeId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...stop, propertyId: `prop-${Date.now()}` }),
      });
      if (!response.ok) throw new Error("Failed to create stop");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-routes"] });
      toast({ title: "Stop Added" });
      setShowCreateStopDialog(false);
      setNewStop({ propertyName: "", customerName: "", address: "", poolName: "", estimatedTime: 30 });
    },
  });

  const deleteStopMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/route-stops/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete stop");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-routes"] });
    },
  });

  const unassignStopMutation = useMutation({
    mutationFn: async (occurrenceId: string) => {
      const response = await fetch(`/api/occurrences/${occurrenceId}/unassign`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to unassign stop");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-routes"] });
      queryClient.invalidateQueries({ queryKey: ["unscheduled", dateRange.start, dateRange.end] });
      toast({ title: "Stop Unassigned", description: "Visit returned to Route Stops." });
    },
  });

  const assignToRouteMutation = useMutation({
    mutationFn: async ({ occurrenceId, routeId }: { occurrenceId: string; routeId: string }) => {
      const response = await fetch(`/api/occurrences/${occurrenceId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId }),
      });
      if (!response.ok) throw new Error("Failed to assign to route");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unscheduled", dateRange.start, dateRange.end] });
      queryClient.invalidateQueries({ queryKey: ["all-routes"] });
      toast({ title: "Assigned to Route", description: "Visit has been scheduled." });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { occurrence } = event.active.data.current as { occurrence: UnscheduledOccurrence };
    setActiveDragItem(occurrence);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    
    if (!over) return;
    
    const activeData = active.data.current as { occurrence: UnscheduledOccurrence; dayOfWeek: number };
    const overData = over.data.current as { route?: Route; dayOfWeek: number; type: string };
    
    if (!activeData || !overData) return;
    
    if (overData.type === "unscheduled") {
      toast({
        title: "Already Unscheduled",
        description: "This item is already in the unscheduled queue.",
      });
      return;
    }
    
    if (activeData.dayOfWeek !== overData.dayOfWeek) {
      toast({
        title: "Cannot Assign",
        description: "You can only assign to routes on the same day.",
        variant: "destructive",
      });
      return;
    }
    
    if (overData.route) {
      assignToRouteMutation.mutate({
        occurrenceId: activeData.occurrence.id,
        routeId: overData.route.id,
      });
    }
  };

  const allRoutes: Route[] = allRoutesData?.routes || [];

  const hasSundayRoutes = useMemo(() => {
    return allRoutes.some(route => route.dayOfWeek === 0);
  }, [allRoutes]);

  const weekDates = useMemo(() => getWeekDates(weekOffset, hasSundayRoutes), [weekOffset, hasSundayRoutes]);

  const visibleDates = useMemo(() => {
    if (dayViewMode === "week") {
      return weekDates;
    } else if (dayViewMode === "2day") {
      const startIdx = Math.min(selectedDayIndex, weekDates.length - 2);
      return weekDates.slice(startIdx, startIdx + 2);
    } else {
      const idx = Math.min(selectedDayIndex, weekDates.length - 1);
      return [weekDates[idx]];
    }
  }, [dayViewMode, weekDates, selectedDayIndex]);

  const routesByDay = useMemo(() => {
    const grouped: Record<number, Route[]> = {};
    for (let i = 0; i <= 6; i++) {
      grouped[i] = [];
    }
    for (const route of allRoutes) {
      if (grouped[route.dayOfWeek]) {
        grouped[route.dayOfWeek].push(route);
      }
    }
    return grouped;
  }, [allRoutes]);

  const filteredRoutesAllDays = useMemo(() => {
    if (!filterCustomerName && !filterCustomerId) return null;
    
    const matchingRoutesByDay: Record<number, Route[]> = {};
    let firstMatchDay: number | null = null;
    
    for (let day = 0; day <= 6; day++) {
      const routes = routesByDay[day] || [];
      const filteredRoutes = routes.map(route => ({
        ...route,
        stops: route.stops.filter(stop => {
          if (filterCustomerName) {
            return stop.customerName?.toLowerCase() === filterCustomerName.toLowerCase();
          }
          return false;
        }),
      })).filter(route => route.stops.length > 0);
      
      if (filteredRoutes.length > 0) {
        matchingRoutesByDay[day] = filteredRoutes;
        if (firstMatchDay === null) firstMatchDay = day;
      }
    }
    
    return { matchingRoutesByDay, firstMatchDay };
  }, [routesByDay, filterCustomerName, filterCustomerId]);

  const defaultCenter: [number, number] = [33.75, -117.15];
  
  useEffect(() => {
    if (filterCustomerName && filteredRoutesAllDays) {
      const allRouteIds = Object.values(filteredRoutesAllDays.matchingRoutesByDay).flat().map(r => r.id);
      setExpandedRoutes(new Set(allRouteIds));
    }
  }, [filterCustomerName, filteredRoutesAllDays]);

  const toggleRouteExpanded = (routeId: string) => {
    const newExpanded = new Set(expandedRoutes);
    if (newExpanded.has(routeId)) {
      newExpanded.delete(routeId);
    } else {
      newExpanded.add(routeId);
    }
    setExpandedRoutes(newExpanded);
  };

  const toggleAllRoutes = () => {
    if (allCollapsed) {
      const allIds = allRoutes.map(r => r.id);
      setExpandedRoutes(new Set(allIds));
    } else {
      setExpandedRoutes(new Set());
    }
    setAllCollapsed(!allCollapsed);
  };

  const totalUnscheduled = unscheduledOccurrences.length;

  return (
    <AppLayout>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col h-full bg-slate-100 -m-6 min-h-[calc(100vh-80px)]">
          {/* Pool Brain Style Header Bar */}
          <div className="bg-[#0F1B33] px-4 py-3 flex items-center justify-between flex-shrink-0">
            {/* Left Section - Date Navigation */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setWeekOffset(w => w - 1)}
                className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                data-testid="btn-prev-week"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-white font-medium text-sm" data-testid="date-range-text">
                {formatDateRange(weekDates)}
              </span>
              <button 
                onClick={() => setWeekOffset(w => w + 1)}
                className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                data-testid="btn-next-week"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Center Section - View Toggle & Filter */}
            <div className="flex items-center gap-3">
              <div className="flex bg-[#1C2A4B] rounded-md p-0.5">
                {(["1day", "2day", "week"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDayViewMode(mode)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      dayViewMode === mode 
                        ? "bg-white text-[#0F1B33]" 
                        : "text-white/70 hover:text-white"
                    }`}
                    data-testid={`btn-${mode}`}
                  >
                    {mode === "1day" ? "1 Day" : mode === "2day" ? "2 Day" : "Week"}
                  </button>
                ))}
              </div>

              <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1C2A4B] rounded-md text-white/70 hover:text-white text-xs font-medium transition-colors">
                <Filter className="h-3.5 w-3.5" />
                FILTER OFF
                <ChevronDown className="h-3 w-3" />
              </button>

              {filterCustomerName && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0078D4] rounded-md text-white text-xs">
                  <span>Filtering: {filterCustomerName}</span>
                  <Link href="/scheduling">
                    <button className="hover:text-white/80">×</button>
                  </Link>
                </div>
              )}
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowCreateRouteDialog(true)}
                className="bg-[#0078D4] hover:bg-[#0078D4] text-white text-xs font-medium h-8"
                data-testid="btn-new-route"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                NEW ROUTE
              </Button>

              <button 
                className="flex items-center gap-1.5 px-3 py-1.5 text-white/70 hover:text-white text-xs font-medium transition-colors"
                onClick={() => setExpandedRoutes(new Set())}
              >
                <EyeOff className="h-3.5 w-3.5" />
                Hide All
              </button>

              <button 
                className="flex items-center gap-1.5 px-3 py-1.5 text-white/70 hover:text-white text-xs font-medium transition-colors"
                onClick={toggleAllRoutes}
              >
                <ChevronsDownUp className="h-3.5 w-3.5" />
                {allCollapsed ? "Expand All" : "Collapse All"}
              </button>

              <div className="h-5 w-px bg-white/20 mx-1" />

              <Popover open={showUnscheduledPanel} onOpenChange={setShowUnscheduledPanel}>
                <PopoverTrigger asChild>
                  <button 
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#FF8000]/20 border border-[#FF8000]/40 rounded-md text-[#FF8000] hover:bg-[#FF8000]/30 text-xs font-medium transition-colors"
                    data-testid="btn-unscheduled"
                  >
                    <div className="w-2 h-2 bg-[#FF8000] rounded-full animate-pulse" />
                    {totalUnscheduled} Route Stops
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-80 p-0 bg-white shadow-xl border border-slate-200" 
                  align="end"
                  sideOffset={8}
                  disablePortal={true}
                >
                  <div className="p-3 bg-[#FF8000]1A border-b border-[#FF8000]33 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#FF8000] rounded-full animate-pulse" />
                      <h3 className="font-semibold text-amber-800 text-sm">Unscheduled Stops</h3>
                      <span className="bg-[#FF8000] text-white text-xs px-2 py-0.5 rounded-full">{totalUnscheduled}</span>
                    </div>
                    <button 
                      onClick={() => setShowUnscheduledPanel(false)}
                      className="text-[#FF8000] hover:text-amber-800 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    <div className="p-3 space-y-3">
                      {Object.entries(unscheduledByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([dayKey, occurrences]) => {
                        const dayOfWeek = Number(dayKey);
                        const dayInfo = DAYS[dayOfWeek];
                        return (
                          <div key={dayKey}>
                            <div className="text-xs font-medium text-slate-500 mb-2">{dayInfo.label}</div>
                            {occurrences.map((occ) => (
                              <DraggableUnscheduledItem key={occ.id} occurrence={occ} dayOfWeek={dayOfWeek} />
                            ))}
                          </div>
                        );
                      })}
                      {totalUnscheduled === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          No unscheduled stops
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Map toggle only visible in 1-day view */}
              {dayViewMode === "1day" && (
                <button 
                  onClick={() => setShowMapPanel(!showMapPanel)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    showMapPanel 
                      ? "bg-[#0078D4]/20 border border-[#0078D4]/40 text-blue-400" 
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Map className="h-3.5 w-3.5" />
                  {showMapPanel ? "Hide Map" : "Show Map"}
                </button>
              )}

              <div className="flex bg-[#1C2A4B] rounded-md p-0.5">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "list" ? "bg-white text-[#0F1B33]" : "text-white/70 hover:text-white"
                  }`}
                  data-testid="btn-list-view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "map" ? "bg-white text-[#0F1B33]" : "text-white/70 hover:text-white"
                  }`}
                  data-testid="btn-map-view"
                >
                  <Map className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          {viewMode === "list" ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Main area with day columns and optional side map */}
              <div className={`flex overflow-hidden ${dayViewMode === "week" ? "flex-1" : "flex-1"}`}>
                {/* Left side: Day Columns */}
                <div className={`flex flex-col overflow-hidden ${dayViewMode === "1day" && showMapPanel ? "w-[40%]" : "flex-1"}`}>
                {/* Day Navigation for 1-day and 2-day views */}
                {dayViewMode !== "week" && (
                  <div className="bg-[#0F1B33] px-4 py-2 flex items-center justify-between border-b border-[#2A3A5B]">
                    <button 
                      onClick={() => setSelectedDayIndex(Math.max(0, selectedDayIndex - 1))}
                      disabled={selectedDayIndex === 0}
                      className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      data-testid="btn-prev-day"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-white/80 text-xs font-medium">
                      {dayViewMode === "1day" ? "Single Day View" : "2 Day View"}
                    </span>
                    <button 
                      onClick={() => setSelectedDayIndex(Math.min(weekDates.length - (dayViewMode === "2day" ? 2 : 1), selectedDayIndex + 1))}
                      disabled={selectedDayIndex >= weekDates.length - (dayViewMode === "2day" ? 2 : 1)}
                      className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      data-testid="btn-next-day"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Day Column Headers */}
                <div className={`grid bg-[#1C2A4B] ${
                  dayViewMode === "week" 
                    ? (hasSundayRoutes ? "grid-cols-7" : "grid-cols-6") 
                    : dayViewMode === "2day" 
                      ? "grid-cols-2" 
                      : "grid-cols-1"
                }`}>
                  {visibleDates.map(({ date, dayOfWeek }) => {
                    const isToday = new Date().toDateString() === date.toDateString();
                    const dayName = DAYS[dayOfWeek].label;
                    const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getDate()}`;
                    
                    return (
                      <div 
                        key={dayOfWeek} 
                        className={`px-4 py-3 border-r border-[#2A3A5B] last:border-r-0 ${isToday ? "bg-[#2A3A5B]" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">{dateStr}</span>
                          <span className="text-white/60 text-sm">{dayName}</span>
                          {isToday && (
                            <span className="ml-auto text-[10px] bg-[#0078D4] text-white px-1.5 py-0.5 rounded font-medium">
                              TODAY
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Day Columns with Cards */}
                <div className={`grid h-[calc(100%-52px)] overflow-hidden ${
                  dayViewMode === "week" 
                    ? (hasSundayRoutes ? "grid-cols-7" : "grid-cols-6") 
                    : dayViewMode === "2day" 
                      ? "grid-cols-2" 
                      : "grid-cols-1"
                }`}>
                  {visibleDates.map(({ date, dayOfWeek }) => {
                  const dayRoutesForColumn = filterCustomerName && filteredRoutesAllDays
                    ? filteredRoutesAllDays.matchingRoutesByDay[dayOfWeek] || []
                    : routesByDay[dayOfWeek] || [];
                  const dayUnscheduled = unscheduledByDay[dayOfWeek] || [];

                  return (
                    <div key={dayOfWeek} className="border-r border-slate-200 last:border-r-0 flex flex-col bg-slate-50 overflow-hidden">
                      {/* Scrollable Route Cards - Unscheduled items only appear in Route Stops popover */}
                      <ScrollArea className="flex-1">
                        <div className="p-2 space-y-2 pl-[0px] pr-[0px] pt-[0px] pb-[0px]">
                          {dayRoutesForColumn.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">
                              No routes scheduled
                            </div>
                          ) : (
                            dayRoutesForColumn.map((route) => {
                              const isExpanded = expandedRoutes.has(route.id);
                              const initials = getInitials(route.technicianName || route.name);
                              // Only show scheduled stops on route cards (not unscheduled)
                              const scheduledStops = route.stops.filter((s: any) => s.status !== "unscheduled");
                              const totalTime = scheduledStops.reduce((a: number, s: any) => a + (s.estimatedTime || 30), 0);
                              const stopCount = scheduledStops.length;
                              const miles = route.estimatedMiles || Math.round(stopCount * 3.5);
                              const driveTime = route.estimatedDriveTime || Math.round(stopCount * 8);
                              const hasActivity = stopCount > 0;

                              return (
                                <DroppableRouteCard key={route.id} route={route} dayOfWeek={dayOfWeek}>
                                  <div 
                                    className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                                    style={{ borderLeft: `4px solid ${route.color}` }}
                                    onClick={() => toggleRouteExpanded(route.id)}
                                    data-testid={`route-card-${route.id}`}
                                  >
                                    {/* Card Content - Fixed Height */}
                                    <div className="p-3 min-h-[100px] flex flex-col justify-between">
                                      <div className="flex items-start gap-3">
                                        {/* Circular Avatar */}
                                        <div 
                                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                          style={{ backgroundColor: route.color }}
                                        >
                                          {initials}
                                        </div>
                                        
                                        {/* Route Info */}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                          <h3 
                                            className="font-semibold text-[#1F6FEB] text-sm leading-tight hover:underline cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleRouteExpanded(route.id);
                                            }}
                                          >
                                            {route.name}
                                          </h3>
                                          <p className="text-xs text-[#6C7A96] mt-0.5">
                                            {route.technicianName || "Unassigned"}
                                          </p>
                                        </div>
                                        
                                        {/* Stop Count & Menu */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <div 
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                            style={{ backgroundColor: route.color }}
                                          >
                                            {stopCount}
                                          </div>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                              <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                                                <MoreVertical className="h-4 w-4" />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRoute(route);
                                                  setNewRoute({
                                                    name: route.name,
                                                    color: route.color,
                                                    technicianName: route.technicianName || "",
                                                    dayOfWeek: route.dayOfWeek,
                                                  });
                                                  setShowEditRouteDialog(true);
                                                }}
                                              >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit Route
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRoute(route);
                                                  setShowCreateStopDialog(true);
                                                }}
                                              >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Stop
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (confirm("Delete this route?")) {
                                                    deleteRouteMutation.mutate(route.id);
                                                  }
                                                }}
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Route
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                      
                                      {/* Stats Row */}
                                      <div className="flex items-center gap-4 text-[11px] text-[#6C7A96] mt-3 pt-2 border-t border-slate-100">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {formatTime(totalTime)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Navigation className="h-3 w-3" />
                                          {miles.toFixed(1)} mi
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Timer className="h-3 w-3" />
                                          {formatTime(driveTime)}
                                        </span>
                                        <button 
                                          className="ml-auto text-slate-400 hover:text-slate-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRouteExpanded(route.id);
                                          }}
                                        >
                                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Optional: Progress bar for routes with activity */}
                                    {hasActivity && (
                                      <div className="h-1 bg-slate-100">
                                        <div 
                                          className="h-full bg-[#0078D4]" 
                                          style={{ width: `${Math.min(100, stopCount * 10)}%` }}
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Expanded Stops List - Only show scheduled stops */}
                                    {isExpanded && (
                                      <div className="border-t bg-slate-50">
                                        <div className="divide-y divide-slate-100">
                                          {scheduledStops.length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-xs">
                                              No stops assigned to this route
                                            </div>
                                          ) : (
                                            scheduledStops.map((stop: any, idx: number) => (
                                              <div 
                                                key={stop.id}
                                                className="p-3 bg-white hover:bg-slate-50 flex items-start gap-3"
                                                data-testid={`stop-${stop.id}`}
                                              >
                                                <div 
                                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                  style={{ backgroundColor: route.color }}
                                                >
                                                  {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-medium text-[#1F6FEB] text-sm hover:underline cursor-pointer">
                                                    {stop.customerName || stop.propertyName}
                                                  </p>
                                                  {stop.poolName && stop.poolName !== stop.propertyName && (
                                                    <p className="text-xs text-slate-600 mt-0.5">{stop.poolName}</p>
                                                  )}
                                                  <p className="text-xs text-[#6C7A96] mt-0.5">
                                                    {stop.address}
                                                    {stop.city && `, ${stop.city}`}
                                                    {stop.state && `, ${stop.state}`}
                                                    {stop.zip && ` ${stop.zip}`}
                                                  </p>
                                                </div>
                                                <button
                                                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm("Remove this stop from route?")) {
                                                      unassignStopMutation.mutate(stop.id);
                                                    }
                                                  }}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                        <div className="p-2 border-t border-slate-100 bg-white">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="w-full text-xs h-8 text-[#0078D4] hover:text-[#0078D4] hover:bg-[#0078D4]1A"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedRoute(route);
                                              setShowCreateStopDialog(true);
                                            }}
                                          >
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            Add Stop
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </DroppableRouteCard>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
              </div>

              {/* Right side: Map ONLY for 1-day view */}
              {dayViewMode === "1day" && showMapPanel && (
                <div className="flex-1 min-h-0 rounded-lg overflow-hidden shadow-sm border border-slate-200 m-2">
                  <MapContainer
                    center={defaultCenter}
                    zoom={10}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {visibleDates.flatMap(({ dayOfWeek }) => {
                      const dayRoutes = filterCustomerName && filteredRoutesAllDays
                        ? filteredRoutesAllDays.matchingRoutesByDay[dayOfWeek] || []
                        : routesByDay[dayOfWeek] || [];
                      
                      return dayRoutes.map((route, routeIndex) => {
                        const routeCoords: [number, number][] = route.stops.map((stop, stopIndex) => {
                          const baseLat = 33.7 + (routeIndex * 0.15);
                          const baseLng = -117.3 - (routeIndex * 0.15);
                          const lat = stop.lat || (baseLat + (stopIndex * 0.02));
                          const lng = stop.lng || (baseLng + (stopIndex * 0.025));
                          return [lat, lng] as [number, number];
                        });

                        return (
                          <React.Fragment key={route.id}>
                            {routeCoords.length > 1 && (
                              <Polyline
                                positions={routeCoords}
                                pathOptions={{ 
                                  color: route.color, 
                                  weight: 3,
                                  opacity: 0.7
                                }}
                              />
                            )}
                            {route.stops.map((stop, stopIndex) => (
                              <Marker
                                key={stop.id}
                                position={routeCoords[stopIndex]}
                                icon={createMarkerIcon(route.color, stopIndex + 1)}
                              >
                                <Popup>
                                  <div className="p-1">
                                    <p className="font-semibold">{stop.customerName || stop.propertyName}</p>
                                    {stop.poolName && (
                                      <p className="text-sm text-slate-600">{stop.poolName}</p>
                                    )}
                                    {stop.address && (
                                      <p className="text-xs text-slate-500">{stop.address}</p>
                                    )}
                                    <p className="text-xs mt-1">
                                      Stop #{stopIndex + 1} on {route.name}
                                    </p>
                                  </div>
                                </Popup>
                              </Marker>
                            ))}
                          </React.Fragment>
                        );
                      });
                    })}
                  </MapContainer>
                </div>
              )}
              </div>

            </div>
          ) : (
            /* Map View */
            (<div className="flex-1 flex gap-4 p-4 overflow-hidden">
              <div className="w-72 flex-shrink-0 space-y-2 overflow-auto bg-white rounded-lg p-3 shadow-sm">
                <h3 className="font-semibold text-slate-700 text-sm mb-3">
                  All Routes ({allRoutes.length})
                </h3>
                {allRoutes.map((route) => (
                  <div 
                    key={route.id} 
                    className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: route.color, borderLeftWidth: 4 }}
                    onClick={() => toggleRouteExpanded(route.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: route.color }}
                      >
                        {getInitials(route.technicianName || route.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[#1F6FEB] truncate">{route.name}</p>
                        <p className="text-xs text-[#6C7A96]">{route.stops.length} stops</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex-1 rounded-lg overflow-hidden shadow-sm">
                <MapContainer
                  center={defaultCenter}
                  zoom={10}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {allRoutes.map((route, routeIndex) => {
                    const routeCoords: [number, number][] = route.stops.map((stop, stopIndex) => {
                      const baseLat = 33.7 + (routeIndex * 0.15);
                      const baseLng = -117.3 - (routeIndex * 0.15);
                      const lat = stop.lat || (baseLat + (stopIndex * 0.02));
                      const lng = stop.lng || (baseLng + (stopIndex * 0.025));
                      return [lat, lng] as [number, number];
                    });

                    return (
                      <React.Fragment key={route.id}>
                        {routeCoords.length > 1 && (
                          <Polyline
                            positions={routeCoords}
                            pathOptions={{ 
                              color: route.color, 
                              weight: 3,
                              opacity: 0.7
                            }}
                          />
                        )}
                        {route.stops.map((stop, stopIndex) => (
                          <Marker
                            key={stop.id}
                            position={routeCoords[stopIndex]}
                            icon={createMarkerIcon(route.color, stopIndex + 1)}
                          >
                            <Popup>
                              <div className="p-1">
                                <p className="font-semibold">{stop.customerName || stop.propertyName}</p>
                                {stop.poolName && (
                                  <p className="text-sm text-slate-600">{stop.poolName}</p>
                                )}
                                {stop.address && (
                                  <p className="text-xs text-slate-500">{stop.address}</p>
                                )}
                                <p className="text-xs mt-1">
                                  Stop #{stopIndex + 1} on {route.name}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
              </div>
            </div>)
          )}

          {/* Create Route Dialog */}
          <Dialog open={showCreateRouteDialog} onOpenChange={setShowCreateRouteDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Route</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Route Name</Label>
                  <Input
                    value={newRoute.name}
                    onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                    placeholder="e.g., Alan Repairs Wed"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Technician Name</Label>
                  <Input
                    value={newRoute.technicianName}
                    onChange={(e) => setNewRoute({ ...newRoute, technicianName: e.target.value })}
                    placeholder="e.g., Alan Bateman"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <div className="flex gap-1 flex-wrap">
                    {DAYS.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={newRoute.dayOfWeek === day.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewRoute({ ...newRoute, dayOfWeek: day.value })}
                        className={newRoute.dayOfWeek === day.value ? "bg-[#0078D4] hover:bg-[#0078D4]" : ""}
                      >
                        {day.short}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Route Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {ROUTE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newRoute.color === color ? "border-slate-900 ring-2 ring-offset-2 ring-slate-400 scale-110" : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewRoute({ ...newRoute, color })}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Add Customers (Optional)</Label>
                  <Select
                    value=""
                    onValueChange={(customerId) => {
                      if (customerId && !selectedCustomerIds.includes(customerId)) {
                        setSelectedCustomerIds([...selectedCustomerIds, customerId]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customers..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers
                        .filter(c => !selectedCustomerIds.includes(c.id))
                        .map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedCustomerIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedCustomerIds.map((id) => {
                        const customer = customers.find(c => c.id === id);
                        return (
                          <span 
                            key={id} 
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#0078D4]1A text-[#0078D4] text-xs rounded-full"
                          >
                            {customer?.name || "Unknown"}
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerIds(selectedCustomerIds.filter(cid => cid !== id))}
                              className="hover:text-red-600"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateRouteDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createRouteMutation.mutate({ ...newRoute, customerIds: selectedCustomerIds })}
                  disabled={!newRoute.name}
                  className="bg-[#0078D4] hover:bg-[#0078D4]"
                >
                  Create Route
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Route Dialog */}
          <Dialog open={showEditRouteDialog} onOpenChange={setShowEditRouteDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Route</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Route Name</Label>
                  <Input
                    value={newRoute.name}
                    onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Technician Name</Label>
                  <Input
                    value={newRoute.technicianName}
                    onChange={(e) => setNewRoute({ ...newRoute, technicianName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Route Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {ROUTE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newRoute.color === color ? "border-slate-900 ring-2 ring-offset-2 ring-slate-400 scale-110" : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewRoute({ ...newRoute, color })}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditRouteDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedRoute && updateRouteMutation.mutate({
                    id: selectedRoute.id,
                    updates: { name: newRoute.name, color: newRoute.color, technicianName: newRoute.technicianName }
                  })}
                  className="bg-[#0078D4] hover:bg-[#0078D4]"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Stop Dialog */}
          <Dialog open={showCreateStopDialog} onOpenChange={setShowCreateStopDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Stop to {selectedRoute?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer / HOA Name</Label>
                  <Input
                    value={newStop.customerName}
                    onChange={(e) => setNewStop({ ...newStop, customerName: e.target.value })}
                    placeholder="e.g., SUNDANCE NORTH HOA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pool Name *</Label>
                  <Input
                    value={newStop.poolName}
                    onChange={(e) => setNewStop({ ...newStop, poolName: e.target.value, propertyName: e.target.value })}
                    placeholder="e.g., Tioga - Main Pool"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={newStop.address}
                    onChange={(e) => setNewStop({ ...newStop, address: e.target.value })}
                    placeholder="e.g., 1380 Mary Lane, Beaumont, CA 92223"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Time (minutes)</Label>
                  <Input
                    type="number"
                    value={newStop.estimatedTime}
                    onChange={(e) => setNewStop({ ...newStop, estimatedTime: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateStopDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedRoute && createStopMutation.mutate({ routeId: selectedRoute.id, stop: newStop })}
                  disabled={!newStop.poolName}
                  className="bg-[#0078D4] hover:bg-[#0078D4]"
                >
                  Add Stop
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeDragItem && (
              <div className="flex items-center gap-2 text-xs py-2 px-3 rounded-md bg-white border-2 border-blue-400 shadow-lg cursor-grabbing">
                <GripVertical className="h-3 w-3 text-blue-400 flex-shrink-0" />
                <MapPin className="h-3 w-3 text-[#0078D4] flex-shrink-0" />
                <span className="font-medium">{activeDragItem.customerName || activeDragItem.propertyName}</span>
              </div>
            )}
          </DragOverlay>
        </div>
      </DndContext>
    </AppLayout>
  );
}
