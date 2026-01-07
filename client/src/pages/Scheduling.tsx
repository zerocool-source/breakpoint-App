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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus, MapPin, Clock, Truck, 
  Trash2, Edit, GripVertical, Lock, Unlock, MoreVertical, 
  Download, Loader2, Map, List, Search,
  Navigation, Timer, ChevronDown, ChevronRight, Play
} from "lucide-react";
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
  { value: 0, label: "Sunday", short: "SUN" },
  { value: 1, label: "Monday", short: "MON" },
  { value: 2, label: "Tuesday", short: "TUE" },
  { value: 3, label: "Wednesday", short: "WED" },
  { value: 4, label: "Thursday", short: "THU" },
  { value: 5, label: "Friday", short: "FRI" },
  { value: 6, label: "Saturday", short: "SAT" },
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
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}hr ${mins}min` : `${hours}hr`;
}

function getDateForDay(dayOfWeek: number): string {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = dayOfWeek - currentDay;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return `${String(targetDate.getMonth() + 1).padStart(2, "0")}/${String(targetDate.getDate()).padStart(2, "0")}`;
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

export default function Scheduling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [dayViewMode, setDayViewMode] = useState<"1day" | "2day" | "week">("1day");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 1);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [showCreateRouteDialog, setShowCreateRouteDialog] = useState(false);
  const [showCreateStopDialog, setShowCreateStopDialog] = useState(false);
  const [showEditRouteDialog, setShowEditRouteDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const filterCustomerId = urlParams.get("customerId");
  const filterCustomerName = urlParams.get("customerName");

  const [newRoute, setNewRoute] = useState({
    name: "",
    color: ROUTE_COLORS[0],
    technicianName: "",
    dayOfWeek: 1,
    date: new Date().toISOString().split("T")[0],
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

  // Get the date range for the next 7 days
  const getDateRange = () => {
    const today = new Date();
    const start = today.toISOString().split("T")[0];
    const end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
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
    const grouped: Record<string, UnscheduledOccurrence[]> = {};
    for (const occ of unscheduledOccurrences) {
      const dateKey = new Date(occ.date).toISOString().split("T")[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(occ);
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
      setNewRoute({ name: "", color: ROUTE_COLORS[0], technicianName: "", dayOfWeek: 1, date: new Date().toISOString().split("T")[0] });
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

  const importFromPoolBrainMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/routes/import-from-poolbrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearExisting: true }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import routes");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-routes"] });
      toast({ title: "Routes Imported", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });

  const allRoutes: Route[] = allRoutesData?.routes || [];

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

  useEffect(() => {
    if (filteredRoutesAllDays?.firstMatchDay !== null && filteredRoutesAllDays?.firstMatchDay !== undefined) {
      setSelectedDay(filteredRoutesAllDays.firstMatchDay);
    }
  }, [filteredRoutesAllDays?.firstMatchDay]);

  const dayRoutes = useMemo(() => {
    if (filterCustomerName && filteredRoutesAllDays) {
      return filteredRoutesAllDays.matchingRoutesByDay[selectedDay] || [];
    }
    return routesByDay[selectedDay] || [];
  }, [routesByDay, selectedDay, filterCustomerName, filteredRoutesAllDays]);
  
  const workDays = [1, 2, 3, 4, 5, 6];
  const defaultCenter: [number, number] = [33.75, -117.15];
  
  useEffect(() => {
    if (filterCustomerName && dayRoutes.length > 0) {
      setExpandedRoutes(new Set(dayRoutes.map(r => r.id)));
    }
  }, [filterCustomerName, dayRoutes.length]);

  const toggleRouteExpanded = (routeId: string) => {
    const newExpanded = new Set(expandedRoutes);
    if (newExpanded.has(routeId)) {
      newExpanded.delete(routeId);
    } else {
      newExpanded.add(routeId);
    }
    setExpandedRoutes(newExpanded);
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="page-title">
              Route Scheduling
            </h1>
            <p className="text-slate-600 text-sm">Manage technician routes and schedules</p>
            {filterCustomerName && (
              <div className="flex items-center gap-2 mt-2">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  <span>Filtering: {filterCustomerName}</span>
                  <Link href="/scheduling">
                    <button className="hover:text-blue-600">✕</button>
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Collapsible Unscheduled Queue */}
            {unscheduledOccurrences.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse mr-2" />
                    Unscheduled
                    <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5">{unscheduledOccurrences.length}</span>
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="absolute right-4 top-20 z-50 w-80 bg-white rounded-lg shadow-xl border border-amber-200 p-3 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {Object.entries(unscheduledByDay).sort().map(([dateKey, occurrences]) => {
                      const date = new Date(dateKey + "T00:00:00");
                      const dayName = DAYS[date.getDay()].short;
                      const formattedDate = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
                      return (
                        <div key={dateKey} className="border-b border-slate-100 pb-2 last:border-0">
                          <div className="text-xs font-medium text-slate-600 mb-1">{formattedDate} {dayName}</div>
                          {occurrences.map((occ) => (
                            <div key={occ.id} className="flex items-center gap-2 text-xs py-1 hover:bg-slate-50 rounded px-1">
                              <MapPin className="h-3 w-3 text-amber-500" />
                              <span className="flex-1 truncate font-medium">{occ.customerName || occ.propertyName}</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-5 px-1 text-blue-600">
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {allRoutes.length === 0 ? (
                                    <DropdownMenuItem disabled>No routes</DropdownMenuItem>
                                  ) : (
                                    allRoutes.map((route) => (
                                      <DropdownMenuItem
                                        key={route.id}
                                        onClick={() => assignToRouteMutation.mutate({ occurrenceId: occ.id, routeId: route.id })}
                                      >
                                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: route.color }} />
                                        {route.name}
                                      </DropdownMenuItem>
                                    ))
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            <div className="flex items-center bg-white rounded-lg border p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-blue-600" : ""}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className={viewMode === "map" ? "bg-blue-600" : ""}
              >
                <Map className="h-4 w-4 mr-1" />
                Map
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateRouteDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Route
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border">
            <Button
              variant={dayViewMode === "1day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDayViewMode("1day")}
              className={dayViewMode === "1day" ? "bg-slate-700" : ""}
            >
              1 Day
            </Button>
            <Button
              variant={dayViewMode === "2day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDayViewMode("2day")}
              className={dayViewMode === "2day" ? "bg-slate-700" : ""}
            >
              2 Day
            </Button>
            <Button
              variant={dayViewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDayViewMode("week")}
              className={dayViewMode === "week" ? "bg-slate-700" : ""}
            >
              Week
            </Button>
          </div>
          
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border">
            {workDays.map((day) => {
              const dayInfo = DAYS.find(d => d.value === day)!;
              const dateStr = getDateForDay(day);
              const routeCount = (routesByDay[day] || []).length;
              return (
                <Button
                  key={day}
                  variant={selectedDay === day ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedDay(day)}
                  className={`flex-col h-auto py-2 px-3 ${selectedDay === day ? "bg-blue-600" : ""}`}
                >
                  <span className="text-xs opacity-75">{dateStr}</span>
                  <span className="font-semibold">{dayInfo.short}</span>
                  {routeCount > 0 && (
                    <span className="text-[10px] mt-0.5 opacity-75">{routeCount} routes</span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {viewMode === "list" ? (
          <div className="h-[calc(100vh-180px)] overflow-auto">
            {/* Day Columns Layout */}
            <div className="flex gap-2 pb-4 min-w-0">
              {workDays.map((day) => {
                const dayInfo = DAYS.find(d => d.value === day)!;
                const dateStr = getDateForDay(day);
                const dayRoutesForColumn = routesByDay[day] || [];
                
                return (
                  <div key={day} className="flex-1 min-w-[180px]">
                    {/* Day Header */}
                    <div className="bg-blue-600 text-white rounded-t-lg px-3 py-2 text-center">
                      <div className="text-sm font-semibold">{dateStr} {dayInfo.label}</div>
                    </div>
                    
                    {/* Technician Route Cards */}
                    <div className="bg-slate-100 rounded-b-lg p-2 min-h-[200px] space-y-2">
                      {dayRoutesForColumn.length === 0 ? (
                        <div className="text-center py-4 text-slate-400 text-xs">
                          No routes
                        </div>
                      ) : (
                        dayRoutesForColumn.map((route) => {
                          const isExpanded = expandedRoutes.has(route.id);
                          const initials = getInitials(route.technicianName || route.name);
                          const totalTime = route.stops.reduce((a, s) => a + (s.estimatedTime || 30), 0);
                          const stopCount = route.stops.length;
                          const miles = route.estimatedMiles || 0;
                          const driveTime = route.estimatedDriveTime || 0;

                          return (
                            <Card 
                              key={route.id} 
                              className="overflow-hidden bg-white cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => toggleRouteExpanded(route.id)}
                              data-testid={`route-card-${route.id}`}
                            >
                              <div className="p-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-xs"
                                    style={{ backgroundColor: route.color }}
                                  >
                                    {initials}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 text-xs truncate">{route.name}</h3>
                                    <p className="text-[10px] text-slate-500">{route.technicianName || "Unassigned"}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-amber-500" />
                                    <span className="font-bold text-slate-700 text-xs">{stopCount}</span>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
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
                                            date: new Date().toISOString().split("T")[0],
                                          });
                                          setShowEditRouteDialog(true);
                                        }}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
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
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {formatTime(totalTime)}
                                  </span>
                                  <span className="flex items-center gap-0.5">
                                    <Navigation className="h-2.5 w-2.5" />
                                    {miles.toFixed(1)}mi
                                  </span>
                                  <span className="flex items-center gap-0.5">
                                    <Timer className="h-2.5 w-2.5" />
                                    {formatTime(driveTime)}
                                  </span>
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex gap-4 h-[calc(100vh-220px)]">
            <div className="w-72 flex-shrink-0 space-y-2 overflow-auto">
              <h3 className="font-semibold text-slate-700 sticky top-0 bg-white py-2">
                {DAYS.find(d => d.value === selectedDay)?.label} Routes ({dayRoutes.length})
              </h3>
              {dayRoutes.map((route) => (
                <Card 
                  key={route.id} 
                  className="border-l-4 cursor-pointer hover:shadow-md transition-shadow" 
                  style={{ borderLeftColor: route.color }}
                  onClick={() => toggleRouteExpanded(route.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: route.color }}
                      >
                        {getInitials(route.technicianName || route.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{route.name}</p>
                        <p className="text-xs text-slate-500">{route.stops.length} stops</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex-1 rounded-lg overflow-hidden border shadow-sm">
              <MapContainer
                center={defaultCenter}
                zoom={10}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {dayRoutes.map((route, routeIndex) => {
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
          </div>
        )}

        <Dialog open={showCreateRouteDialog} onOpenChange={setShowCreateRouteDialog}>
          <DialogContent>
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
                <Label>Route Date</Label>
                <Input
                  type="date"
                  value={newRoute.date}
                  onChange={(e) => {
                    const date = new Date(e.target.value + "T00:00:00");
                    setNewRoute({ 
                      ...newRoute, 
                      date: e.target.value,
                      dayOfWeek: date.getDay()
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <div className="flex gap-1 flex-wrap">
                  {DAYS.filter(d => d.value > 0).map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={newRoute.dayOfWeek === day.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewRoute({ ...newRoute, dayOfWeek: day.value })}
                      className={newRoute.dayOfWeek === day.value ? "bg-blue-600" : ""}
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
                      className={`w-8 h-8 rounded-full border-2 ${
                        newRoute.color === color ? "border-slate-900 ring-2 ring-offset-2 ring-slate-400" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewRoute({ ...newRoute, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Add Customers to Route (Optional)</Label>
                <Select
                  value=""
                  onValueChange={(customerId) => {
                    if (customerId && !selectedCustomerIds.includes(customerId)) {
                      setSelectedCustomerIds([...selectedCustomerIds, customerId]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select customers to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers
                      .filter(c => !selectedCustomerIds.includes(c.id))
                      .map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} {customer.address ? `- ${customer.address}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedCustomerIds.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-slate-500">Selected customers:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCustomerIds.map((id) => {
                        const customer = customers.find(c => c.id === id);
                        return (
                          <span 
                            key={id} 
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Route
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditRouteDialog} onOpenChange={setShowEditRouteDialog}>
          <DialogContent>
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
                      className={`w-8 h-8 rounded-full border-2 ${
                        newRoute.color === color ? "border-slate-900 ring-2 ring-offset-2 ring-slate-400" : "border-transparent"
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateStopDialog} onOpenChange={setShowCreateStopDialog}>
          <DialogContent>
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Stop
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
