import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar, Plus, MapPin, Clock, User, Truck, Building2, 
  Trash2, Edit, GripVertical, Lock, Unlock, MoreVertical, 
  CheckCircle2, AlertCircle, Download, Loader2, Map, List,
  Navigation, Timer, Route as RouteIcon
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
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showCreateRouteDialog, setShowCreateRouteDialog] = useState(false);
  const [showCreateStopDialog, setShowCreateStopDialog] = useState(false);
  const [showEditRouteDialog, setShowEditRouteDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedMapDay, setSelectedMapDay] = useState(new Date().getDay());

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

  const workDays = [1, 2, 3, 4, 5, 6];

  const mapRoutes = routesByDay[selectedMapDay] || [];
  const defaultCenter: [number, number] = [33.75, -117.15];

  return (
    <AppLayout>
      <div className="p-4 space-y-4 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="page-title">
              Route Scheduling
            </h1>
            <p className="text-slate-600 text-sm">Manage technician routes and schedules</p>
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
              Import
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

        {viewMode === "list" ? (
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-4 min-w-max">
              {workDays.map((day) => {
                const dayRoutes = routesByDay[day] || [];
                const dayInfo = DAYS.find(d => d.value === day)!;
                const dateStr = getDateForDay(day);

                return (
                  <div key={day} className="w-72 flex-shrink-0">
                    <div className="bg-blue-600 text-white px-3 py-2 rounded-t-lg font-semibold text-center">
                      {dateStr} {dayInfo.label}
                    </div>
                    <div className="bg-slate-100 rounded-b-lg p-2 space-y-2 min-h-[400px]">
                      {dayRoutes.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No routes</p>
                        </div>
                      ) : (
                        dayRoutes.map((route, routeIndex) => {
                          const initials = getInitials(route.technicianName || route.name);
                          const totalTime = route.stops.reduce((a, s) => a + (s.estimatedTime || 30), 0);
                          const stopCount = route.stops.length;
                          const miles = route.estimatedMiles || 0;

                          return (
                            <Card
                              key={route.id}
                              className="border-0 shadow-sm overflow-hidden"
                              data-testid={`route-card-${route.id}`}
                            >
                              <div 
                                className="h-1.5"
                                style={{ backgroundColor: route.color }}
                              />
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                    style={{ backgroundColor: route.color }}
                                  >
                                    {initials}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-semibold text-sm text-slate-900 truncate">
                                        {route.name}
                                      </h3>
                                      <div className="flex items-center gap-1">
                                        {route.isLocked && (
                                          <Lock className="h-3 w-3 text-slate-400" />
                                        )}
                                        <div className="flex items-center gap-1 bg-slate-100 rounded-full px-2 py-0.5">
                                          <MapPin className="h-3 w-3 text-slate-600" />
                                          <span className="text-xs font-semibold text-slate-700">
                                            {stopCount}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">
                                      {route.technicianName || "Unassigned"}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(totalTime)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Navigation className="h-3 w-3" />
                                        {miles.toFixed(1)}mi
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Timer className="h-3 w-3" />
                                        {formatTime(route.estimatedDriveTime || 0)}
                                      </span>
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
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
                                        onClick={() => {
                                          setSelectedRoute(route);
                                          setShowCreateStopDialog(true);
                                        }}
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Stop
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => updateRouteMutation.mutate({
                                          id: route.id,
                                          updates: { isLocked: !route.isLocked }
                                        })}
                                      >
                                        {route.isLocked ? (
                                          <><Unlock className="h-4 w-4 mr-2" />Unlock</>
                                        ) : (
                                          <><Lock className="h-4 w-4 mr-2" />Lock</>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => {
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

                                {route.stops.length > 0 && (
                                  <div className="mt-3 space-y-1.5">
                                    {route.stops.slice(0, 3).map((stop, idx) => (
                                      <div
                                        key={stop.id}
                                        className="flex items-center gap-2 text-xs bg-slate-50 rounded px-2 py-1.5"
                                      >
                                        <span 
                                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                          style={{ backgroundColor: route.color }}
                                        >
                                          {idx + 1}
                                        </span>
                                        <span className="truncate flex-1 text-slate-700">
                                          {stop.propertyName}
                                        </span>
                                        <span className="text-slate-400">
                                          {stop.estimatedTime || 30}m
                                        </span>
                                      </div>
                                    ))}
                                    {route.stops.length > 3 && (
                                      <p className="text-xs text-slate-400 text-center">
                                        +{route.stops.length - 3} more stops
                                      </p>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-slate-500 border-2 border-dashed border-slate-300"
                        onClick={() => {
                          setNewRoute({ ...newRoute, dayOfWeek: day });
                          setShowCreateRouteDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Route
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border w-fit">
              {workDays.map((day) => {
                const dayInfo = DAYS.find(d => d.value === day)!;
                return (
                  <Button
                    key={day}
                    variant={selectedMapDay === day ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedMapDay(day)}
                    className={selectedMapDay === day ? "bg-blue-600" : ""}
                  >
                    {dayInfo.short}
                  </Button>
                );
              })}
            </div>

            <div className="flex gap-4">
              <div className="w-64 flex-shrink-0 space-y-2">
                <h3 className="font-semibold text-slate-700">
                  {DAYS.find(d => d.value === selectedMapDay)?.label} Routes
                </h3>
                {mapRoutes.map((route) => (
                  <Card key={route.id} className="border-l-4" style={{ borderLeftColor: route.color }}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: route.color }}
                        >
                          {getInitials(route.technicianName || route.name)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{route.name}</p>
                          <p className="text-xs text-slate-500">{route.stops.length} stops</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex-1 h-[600px] rounded-lg overflow-hidden border shadow-sm">
                <MapContainer
                  center={defaultCenter}
                  zoom={10}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {mapRoutes.map((route, routeIndex) => {
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
                                <p className="font-semibold">{stop.propertyName}</p>
                                {stop.customerName && (
                                  <p className="text-sm text-slate-600">{stop.customerName}</p>
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
                <Label>Property Name *</Label>
                <Input
                  value={newStop.propertyName}
                  onChange={(e) => setNewStop({ ...newStop, propertyName: e.target.value })}
                  placeholder="e.g., Sunset Villas Pool"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer / HOA Name</Label>
                <Input
                  value={newStop.customerName}
                  onChange={(e) => setNewStop({ ...newStop, customerName: e.target.value })}
                  placeholder="e.g., Sunset Villas HOA"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={newStop.address}
                  onChange={(e) => setNewStop({ ...newStop, address: e.target.value })}
                  placeholder="e.g., 123 Palm Dr, Phoenix, AZ"
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
                disabled={!newStop.propertyName}
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
