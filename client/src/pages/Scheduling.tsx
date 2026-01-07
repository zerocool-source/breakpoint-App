import React, { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar, Plus, MapPin, Clock, User, Truck, Building2, 
  ChevronLeft, ChevronRight, Trash2, Edit, GripVertical,
  Lock, Unlock, MoreVertical, CheckCircle2, AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const ROUTE_COLORS = [
  "#0891b2", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#ca8a04"
];

const stopStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  not_started: { label: "Not Started", color: "bg-slate-100 text-slate-600", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  no_access: { label: "No Access", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
  skipped: { label: "Skipped", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

export default function Scheduling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 1);
  const [showCreateRouteDialog, setShowCreateRouteDialog] = useState(false);
  const [showCreateStopDialog, setShowCreateStopDialog] = useState(false);
  const [showEditRouteDialog, setShowEditRouteDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [draggedStop, setDraggedStop] = useState<{ stop: RouteStop; sourceRouteId: string } | null>(null);

  const [newRoute, setNewRoute] = useState({
    name: "",
    color: ROUTE_COLORS[0],
    technicianName: "",
  });

  const [newStop, setNewStop] = useState({
    propertyName: "",
    customerName: "",
    address: "",
    poolName: "",
    estimatedTime: 30,
  });

  const { data: routesData, isLoading } = useQuery({
    queryKey: ["routes", selectedDay],
    queryFn: async () => {
      const response = await fetch(`/api/routes?dayOfWeek=${selectedDay}`);
      if (!response.ok) throw new Error("Failed to fetch routes");
      return response.json();
    },
  });

  const { data: unscheduledData } = useQuery({
    queryKey: ["unscheduled-stops"],
    queryFn: async () => {
      const response = await fetch("/api/unscheduled-stops");
      if (!response.ok) throw new Error("Failed to fetch unscheduled stops");
      return response.json();
    },
  });

  const createRouteMutation = useMutation({
    mutationFn: async (route: any) => {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...route, dayOfWeek: selectedDay }),
      });
      if (!response.ok) throw new Error("Failed to create route");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route Created", description: "New route has been added." });
      setShowCreateRouteDialog(false);
      setNewRoute({ name: "", color: ROUTE_COLORS[0], technicianName: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create route.", variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route Updated", description: "Route has been updated." });
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
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route Deleted", description: "Route and its stops have been removed." });
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
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Stop Added", description: "New stop has been added to the route." });
      setShowCreateStopDialog(false);
      setNewStop({ propertyName: "", customerName: "", address: "", poolName: "", estimatedTime: 30 });
    },
  });

  const updateStopMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/route-stops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update stop");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });

  const deleteStopMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/route-stops/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete stop");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Stop Removed", description: "Stop has been removed from the route." });
    },
  });

  const moveStopMutation = useMutation({
    mutationFn: async ({ stopId, newRouteId }: { stopId: string; newRouteId: string }) => {
      const response = await fetch(`/api/route-stops/${stopId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: newRouteId }),
      });
      if (!response.ok) throw new Error("Failed to move stop");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Stop Moved", description: "Stop has been moved to the new route." });
    },
  });

  const routes: Route[] = routesData?.routes || [];

  const handleDragStart = (e: React.DragEvent, stop: RouteStop, sourceRouteId: string) => {
    setDraggedStop({ stop, sourceRouteId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetRouteId: string) => {
    e.preventDefault();
    if (draggedStop && draggedStop.sourceRouteId !== targetRouteId) {
      moveStopMutation.mutate({ stopId: draggedStop.stop.id, newRouteId: targetRouteId });
    }
    setDraggedStop(null);
  };

  const totalStops = routes.reduce((acc, r) => acc + r.stops.length, 0);
  const completedStops = routes.reduce((acc, r) => acc + r.stops.filter(s => s.status === "completed").length, 0);
  const totalTime = routes.reduce((acc, r) => acc + r.stops.reduce((a, s) => a + (s.estimatedTime || 30), 0), 0);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="page-title">
              Route Scheduling
            </h1>
            <p className="text-slate-600">Manage service routes and daily schedules</p>
          </div>
          <Button
            onClick={() => setShowCreateRouteDialog(true)}
            className="bg-cyan-600 hover:bg-cyan-700"
            data-testid="button-create-route"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Route
          </Button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border">
            {DAYS.map((day) => (
              <Button
                key={day.value}
                variant={selectedDay === day.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedDay(day.value)}
                className={selectedDay === day.value ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                data-testid={`button-day-${day.short.toLowerCase()}`}
              >
                {day.short}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{totalStops} stops</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>{completedStops} completed</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{Math.round(totalTime / 60)}h {totalTime % 60}m total</span>
            </div>
          </div>
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {isLoading ? (
              <div className="flex items-center justify-center w-full py-12">
                <div className="text-slate-500">Loading routes...</div>
              </div>
            ) : routes.length === 0 ? (
              <Card className="w-80 border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600 text-center mb-4">No routes for {DAYS.find(d => d.value === selectedDay)?.label}</p>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateRouteDialog(true)}
                    data-testid="button-create-first-route"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Route
                  </Button>
                </CardContent>
              </Card>
            ) : (
              routes.map((route) => (
                <Card
                  key={route.id}
                  className="w-80 flex-shrink-0"
                  style={{ borderTopColor: route.color, borderTopWidth: "4px" }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, route.id)}
                  data-testid={`route-card-${route.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: route.color }}
                        />
                        {route.name}
                        {route.isLocked && <Lock className="h-3 w-3 text-slate-400" />}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRoute(route);
                              setNewRoute({ name: route.name, color: route.color, technicianName: route.technicianName || "" });
                              setShowEditRouteDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Route
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
                            onClick={() => updateRouteMutation.mutate({ id: route.id, updates: { isLocked: !route.isLocked } })}
                          >
                            {route.isLocked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                            {route.isLocked ? "Unlock Route" : "Lock Route"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (confirm("Delete this route and all its stops?")) {
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
                    {route.technicianName && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <User className="h-3 w-3" />
                        {route.technicianName}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>{route.stops.length} stops</span>
                      <span>{route.stops.reduce((a, s) => a + (s.estimatedTime || 30), 0)} min</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {route.stops.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                        <MapPin className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">No stops</p>
                        <p className="text-xs">Drag stops here or add new</p>
                      </div>
                    ) : (
                      route.stops.map((stop, index) => {
                        const statusInfo = stopStatusConfig[stop.status || "not_started"];
                        return (
                          <div
                            key={stop.id}
                            draggable={!route.isLocked}
                            onDragStart={(e) => handleDragStart(e, stop, route.id)}
                            className={`p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-move ${
                              draggedStop?.stop.id === stop.id ? "opacity-50" : ""
                            }`}
                            data-testid={`stop-card-${stop.id}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex items-center gap-1 text-slate-400">
                                <GripVertical className="h-4 w-4" />
                                <span className="text-xs font-medium">{index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-medium text-sm text-slate-900 truncate">
                                    {stop.propertyName}
                                  </h4>
                                  <Badge className={`${statusInfo.color} text-xs`}>
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                {stop.customerName && (
                                  <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {stop.customerName}
                                  </p>
                                )}
                                {stop.address && (
                                  <p className="text-xs text-slate-400 truncate">
                                    {stop.address}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {stop.estimatedTime || 30}m
                                  </span>
                                  {stop.frequency && stop.frequency !== "weekly" && (
                                    <Badge variant="outline" className="text-xs">
                                      {stop.frequency}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => updateStopMutation.mutate({ id: stop.id, updates: { status: "completed" } })}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark Completed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateStopMutation.mutate({ id: stop.id, updates: { status: "no_access" } })}
                                  >
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    No Access
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => deleteStopMutation.mutate(stop.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-slate-500 hover:text-slate-700"
                      onClick={() => {
                        setSelectedRoute(route);
                        setShowCreateStopDialog(true);
                      }}
                      data-testid={`button-add-stop-${route.id}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Stop
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

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
                  placeholder="e.g., North Zone Morning"
                  data-testid="input-route-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Technician Name (optional)</Label>
                <Input
                  value={newRoute.technicianName}
                  onChange={(e) => setNewRoute({ ...newRoute, technicianName: e.target.value })}
                  placeholder="e.g., John Smith"
                  data-testid="input-technician-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Route Color</Label>
                <div className="flex gap-2">
                  {ROUTE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        newRoute.color === color ? "border-slate-900" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewRoute({ ...newRoute, color })}
                      data-testid={`button-color-${color}`}
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
                className="bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-submit-route"
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
                  data-testid="input-edit-route-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Technician Name</Label>
                <Input
                  value={newRoute.technicianName}
                  onChange={(e) => setNewRoute({ ...newRoute, technicianName: e.target.value })}
                  data-testid="input-edit-technician-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Route Color</Label>
                <div className="flex gap-2">
                  {ROUTE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        newRoute.color === color ? "border-slate-900" : "border-transparent"
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
                onClick={() => selectedRoute && updateRouteMutation.mutate({ id: selectedRoute.id, updates: newRoute })}
                className="bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-save-route"
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
                  data-testid="input-property-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer / HOA Name</Label>
                <Input
                  value={newStop.customerName}
                  onChange={(e) => setNewStop({ ...newStop, customerName: e.target.value })}
                  placeholder="e.g., Sunset Villas HOA"
                  data-testid="input-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={newStop.address}
                  onChange={(e) => setNewStop({ ...newStop, address: e.target.value })}
                  placeholder="e.g., 123 Palm Dr, Phoenix, AZ"
                  data-testid="input-address"
                />
              </div>
              <div className="space-y-2">
                <Label>Pool Name</Label>
                <Input
                  value={newStop.poolName}
                  onChange={(e) => setNewStop({ ...newStop, poolName: e.target.value })}
                  placeholder="e.g., Main Pool, Spa"
                  data-testid="input-pool-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated Time (minutes)</Label>
                <Input
                  type="number"
                  value={newStop.estimatedTime}
                  onChange={(e) => setNewStop({ ...newStop, estimatedTime: parseInt(e.target.value) || 30 })}
                  data-testid="input-estimated-time"
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
                className="bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-submit-stop"
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
