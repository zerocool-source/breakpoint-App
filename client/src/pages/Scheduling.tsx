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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus, MapPin, Clock, Truck, 
  Trash2, Edit, GripVertical, Lock, Unlock, MoreVertical, 
  Download, Loader2, Map, List,
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
  customerName: string | null;
  address: string | null;
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
  });

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
              variant="outline"
              size="sm"
              onClick={() => importFromPoolBrainMutation.mutate()}
              disabled={importFromPoolBrainMutation.isPending}
            >
              {importFromPoolBrainMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Import from Pool Brain
            </Button>
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

        <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border w-fit">
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

        {viewMode === "list" ? (
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-3 pr-4">
              {dayRoutes.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No routes for {DAYS.find(d => d.value === selectedDay)?.label}</p>
                  <p className="text-sm mt-1">Click "Import from Pool Brain" or "Add Route" to get started</p>
                </div>
              ) : (
                dayRoutes.map((route) => {
                  const isExpanded = expandedRoutes.has(route.id);
                  const initials = getInitials(route.technicianName || route.name);
                  const totalTime = route.stops.reduce((a, s) => a + (s.estimatedTime || 30), 0);
                  const stopCount = route.stops.length;
                  const miles = route.estimatedMiles || 0;
                  const driveTime = route.estimatedDriveTime || 0;
                  const dayShort = DAYS.find(d => d.value === route.dayOfWeek)?.short || "---";

                  return (
                    <Card key={route.id} className="overflow-hidden" data-testid={`route-card-${route.id}`}>
                      <div 
                        className="h-2"
                        style={{ backgroundColor: route.color }}
                      />
                      
                      <div 
                        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleRouteExpanded(route.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-slate-400" />
                            )}
                            <div 
                              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                              style={{ backgroundColor: route.color }}
                            >
                              {initials}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{route.name}</h3>
                            <p className="text-sm text-slate-500">{route.technicianName || "Unassigned"}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-amber-500">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                              {stopCount}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
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

                        <div className="flex items-center gap-6 mt-3 text-sm text-slate-500 ml-16">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(totalTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Navigation className="h-4 w-4" />
                            {miles.toFixed(2)}mi
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="h-4 w-4" />
                            {formatTime(driveTime)}
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-slate-50">
                          <div className="p-3 border-b bg-blue-600">
                            <Button size="sm" variant="secondary" className="text-blue-600">
                              Optimize Route
                            </Button>
                          </div>

                          <div className="p-3 border-b bg-white flex items-center gap-3">
                            <Play className="h-5 w-5 text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-700">Start Location</p>
                              <p className="text-sm text-slate-500">Office / Home base</p>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <span className="text-sm text-slate-500">All</span>
                              <Checkbox />
                            </div>
                          </div>

                          <div className="divide-y">
                            {route.stops.map((stop, idx) => (
                              <div 
                                key={stop.id} 
                                className="p-3 bg-white hover:bg-slate-50 flex items-start gap-3"
                                data-testid={`route-stop-${stop.id}`}
                              >
                                <div className="flex items-center gap-2 mt-1">
                                  <GripVertical className="h-4 w-4 text-slate-300 cursor-grab" />
                                  <div 
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: route.color }}
                                  >
                                    {idx + 1}
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-blue-600 hover:underline cursor-pointer">
                                    {stop.customerName || stop.propertyName}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {stop.poolName || stop.propertyName}
                                    {stop.address && ` - ${stop.address}`}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    {dayShort}
                                  </span>
                                  <Checkbox />
                                </div>
                              </div>
                            ))}
                          </div>

                          {route.stops.length === 0 && (
                            <div className="p-6 text-center text-slate-400">
                              <p>No stops on this route</p>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => {
                                  setSelectedRoute(route);
                                  setShowCreateStopDialog(true);
                                }}
                              >
                                Add first stop
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateRouteDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createRouteMutation.mutate(newRoute)}
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
