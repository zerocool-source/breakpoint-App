import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Truck, 
  Wrench, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Plus,
  ChevronRight,
  Activity,
  Fuel,
  Settings,
  RefreshCw
} from "lucide-react";
import type { FleetTruck, FleetMaintenanceRecord } from "@shared/schema";
import { FLEET_SERVICE_TYPES } from "@shared/schema";

function excelDateToJS(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000);
}

function parseDate(dateStr: string | number | null | undefined): Date | null {
  if (!dateStr) return null;
  
  if (typeof dateStr === 'number') {
    return excelDateToJS(dateStr);
  }
  
  const numericValue = parseFloat(dateStr);
  if (!isNaN(numericValue) && numericValue > 40000 && numericValue < 60000) {
    return excelDateToJS(numericValue);
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date;
}

function formatDate(dateStr: string | number | null | undefined): string {
  const date = parseDate(dateStr);
  if (!date) return "—";
  return date.toLocaleDateString();
}

function daysSince(dateStr: string | number | null | undefined): number | null {
  const date = parseDate(dateStr);
  if (!date) return null;
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getMaintenanceStatus(days: number | null, serviceType: string): { status: string; color: string } {
  if (days === null) return { status: "No Record", color: "bg-gray-200 text-gray-700" };
  
  const thresholds: Record<string, number> = {
    "Oil Change": 90,
    "Tire Rotation": 180,
    "Brake Inspection": 365,
    "Air Filter": 365,
    "Transmission Fluid": 730,
    "Coolant System": 730,
    "Brake Fluid": 730,
    "New Tires": 1095,
  };
  
  const threshold = thresholds[serviceType] || 365;
  
  if (days > threshold * 1.2) return { status: "Overdue", color: "bg-red-100 text-red-700" };
  if (days > threshold * 0.9) return { status: "Due Soon", color: "bg-yellow-100 text-yellow-700" };
  return { status: "Current", color: "bg-green-100 text-green-700" };
}

interface TruckWithMaintenance extends FleetTruck {
  maintenanceRecords: FleetMaintenanceRecord[];
  latestByType: Record<string, FleetMaintenanceRecord>;
}

const SERVICE_TYPE_FILTERS = [
  "All",
  "Oil Change",
  "Tire Rotation", 
  "Brake Inspection",
  "Air Filter",
  "Transmission Fluid",
  "Coolant System",
  "Brake Fluid",
];

export default function Fleet() {
  const queryClient = useQueryClient();
  const [selectedTruck, setSelectedTruck] = useState<TruckWithMaintenance | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [addRecordModal, setAddRecordModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    serviceType: "",
    vendor: "",
    mileage: "",
    notes: "",
    serviceDate: new Date().toISOString().split('T')[0],
  });

  const { data: trucks = [], isLoading: trucksLoading } = useQuery<FleetTruck[]>({
    queryKey: ["/api/fleet/trucks"],
    queryFn: async () => {
      const res = await fetch("/api/fleet/trucks");
      return res.json();
    },
  });

  const { data: allRecords = [] } = useQuery<FleetMaintenanceRecord[]>({
    queryKey: ["/api/fleet/maintenance"],
    queryFn: async () => {
      const res = await fetch("/api/fleet/maintenance");
      return res.json();
    },
  });

  const trucksWithMaintenance: TruckWithMaintenance[] = trucks.map(truck => {
    const records = allRecords.filter(r => r.truckNumber === truck.truckNumber);
    const latestByType: Record<string, FleetMaintenanceRecord> = {};
    
    for (const type of FLEET_SERVICE_TYPES) {
      const typeRecords = records.filter(r => r.serviceType === type);
      if (typeRecords.length > 0) {
        latestByType[type] = typeRecords.sort((a, b) => {
          const dateA = parseDate(a.serviceDate)?.getTime() || 0;
          const dateB = parseDate(b.serviceDate)?.getTime() || 0;
          return dateB - dateA;
        })[0];
      }
    }
    
    return { ...truck, maintenanceRecords: records, latestByType };
  });

  const addRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/fleet/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/maintenance"] });
      setAddRecordModal(false);
      setNewRecord({
        serviceType: "",
        vendor: "",
        mileage: "",
        notes: "",
        serviceDate: new Date().toISOString().split('T')[0],
      });
    },
  });

  const handleAddRecord = () => {
    if (!selectedTruck || !newRecord.serviceType) return;
    
    addRecordMutation.mutate({
      truckId: selectedTruck.id,
      truckNumber: selectedTruck.truckNumber,
      serviceType: newRecord.serviceType,
      vendor: newRecord.vendor,
      mileage: newRecord.mileage ? parseInt(newRecord.mileage) : null,
      notes: newRecord.notes,
      serviceDate: newRecord.serviceDate,
    });
  };

  const fleetStats = {
    totalTrucks: trucks.length,
    servicesThisMonth: allRecords.filter(r => {
      const date = parseDate(r.serviceDate);
      if (!date) return false;
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    overdueMaintenance: trucksWithMaintenance.reduce((acc, truck) => {
      for (const type of FLEET_SERVICE_TYPES) {
        const record = truck.latestByType[type];
        const days = daysSince(record?.serviceDate);
        const status = getMaintenanceStatus(days, type);
        if (status.status === "Overdue") acc++;
      }
      return acc;
    }, 0),
    upcomingMaintenance: trucksWithMaintenance.reduce((acc, truck) => {
      for (const type of FLEET_SERVICE_TYPES) {
        const record = truck.latestByType[type];
        const days = daysSince(record?.serviceDate);
        const status = getMaintenanceStatus(days, type);
        if (status.status === "Due Soon") acc++;
      }
      return acc;
    }, 0),
  };

  const getTruckHealthScore = (truck: TruckWithMaintenance): number => {
    let score = 100;
    let checks = 0;
    
    for (const type of FLEET_SERVICE_TYPES) {
      const record = truck.latestByType[type];
      const days = daysSince(record?.serviceDate);
      const status = getMaintenanceStatus(days, type);
      checks++;
      
      if (status.status === "Overdue") score -= 15;
      else if (status.status === "Due Soon") score -= 5;
      else if (status.status === "No Record") score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Fleet Management</h1>
          <p className="text-slate-500">Track and maintain your service vehicles</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{fleetStats.totalTrucks}</p>
                  <p className="text-sm text-slate-500">Total Trucks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{fleetStats.servicesThisMonth}</p>
                  <p className="text-sm text-slate-500">Services This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{fleetStats.upcomingMaintenance}</p>
                  <p className="text-sm text-slate-500">Due Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{fleetStats.overdueMaintenance}</p>
                  <p className="text-sm text-slate-500">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="overview" data-testid="tab-overview">Fleet Overview</TabsTrigger>
            <TabsTrigger value="maintenance" data-testid="tab-maintenance">Maintenance Log</TabsTrigger>
            <TabsTrigger value="smogs" data-testid="tab-smogs">Smogs</TabsTrigger>
            <TabsTrigger value="tires" data-testid="tab-tires">Tires</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {trucksLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trucksWithMaintenance.map((truck) => {
                  const healthScore = getTruckHealthScore(truck);
                  const healthColor = healthScore >= 80 ? "text-green-600" : healthScore >= 60 ? "text-yellow-600" : "text-red-600";
                  
                  return (
                    <Card 
                      key={truck.id} 
                      className="bg-white border-slate-200 hover:border-blue-300 cursor-pointer transition-colors"
                      onClick={() => setSelectedTruck(truck)}
                      data-testid={`card-truck-${truck.truckNumber}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg">Truck #{truck.truckNumber}</CardTitle>
                          </div>
                          <div className={`text-lg font-bold ${healthColor}`}>
                            {healthScore}%
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Current Mileage</span>
                            <span className="font-medium">{truck.currentMileage?.toLocaleString() || "—"}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-slate-500 font-medium">Service Status</p>
                            <div className="flex flex-wrap gap-1">
                              {FLEET_SERVICE_TYPES.slice(0, 4).map(type => {
                                const record = truck.latestByType[type];
                                const days = daysSince(record?.serviceDate);
                                const status = getMaintenanceStatus(days, type);
                                return (
                                  <Badge key={type} className={`text-xs ${status.color}`}>
                                    {type.split(' ')[0]}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>

                          {truck.notes && (
                            <p className="text-xs text-slate-500 line-clamp-2">{truck.notes}</p>
                          )}

                          <Button variant="ghost" size="sm" className="w-full justify-between text-blue-600">
                            View Details
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="maintenance" className="mt-4">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <CardTitle className="text-lg">Recent Maintenance Activity</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_TYPE_FILTERS.map(filter => (
                      <Button
                        key={filter}
                        variant={serviceFilter === filter ? "default" : "outline"}
                        size="sm"
                        onClick={() => setServiceFilter(filter)}
                        data-testid={`filter-${filter.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {filter}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allRecords
                    .filter(r => serviceFilter === "All" || r.serviceType === serviceFilter)
                    .slice(0, 50)
                    .map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Wrench className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            Truck #{record.truckNumber} - {record.serviceType}
                          </p>
                          <p className="text-sm text-slate-500">
                            {record.vendor || "Unknown vendor"} • {record.mileage?.toLocaleString() || "—"} mi
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">{formatDate(record.serviceDate)}</p>
                      </div>
                    </div>
                  ))}
                  
                  {allRecords.filter(r => serviceFilter === "All" || r.serviceType === serviceFilter).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No {serviceFilter === "All" ? "maintenance" : serviceFilter} records yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="smogs" className="mt-4">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Smog Check Tracking</CardTitle>
                  <Button size="sm" data-testid="button-add-smog">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Smog Record
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trucksWithMaintenance.map(truck => {
                    const smogRecord = truck.maintenanceRecords.find(r => 
                      r.serviceType?.toLowerCase().includes('smog')
                    );
                    const daysSinceSmog = smogRecord ? daysSince(smogRecord.serviceDate) : null;
                    const smogDue = daysSinceSmog === null || daysSinceSmog > 365;
                    const smogDueSoon = daysSinceSmog !== null && daysSinceSmog > 300 && daysSinceSmog <= 365;
                    
                    return (
                      <div 
                        key={truck.id} 
                        className="p-4 border border-slate-200 rounded-lg"
                        data-testid={`smog-truck-${truck.truckNumber}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Truck #{truck.truckNumber}</span>
                          </div>
                          <Badge className={
                            smogDue ? "bg-red-100 text-red-700" : 
                            smogDueSoon ? "bg-yellow-100 text-yellow-700" : 
                            "bg-green-100 text-green-700"
                          }>
                            {smogDue ? "Due" : smogDueSoon ? "Due Soon" : "Current"}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-500">
                          <p>Last Smog: {smogRecord ? formatDate(smogRecord.serviceDate) : "No record"}</p>
                          {daysSinceSmog !== null && (
                            <p className="text-xs mt-1">{daysSinceSmog} days ago</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {trucks.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No trucks to display</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tires" className="mt-4">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Tire Tracking</CardTitle>
                  <Button size="sm" data-testid="button-add-tires">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Tire Record
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trucksWithMaintenance.map(truck => {
                    const tireRotation = truck.latestByType["Tire Rotation"];
                    const newTires = truck.latestByType["New Tires"];
                    const daysSinceRotation = tireRotation ? daysSince(tireRotation.serviceDate) : null;
                    const daysSinceNewTires = newTires ? daysSince(newTires.serviceDate) : null;
                    
                    const rotationStatus = getMaintenanceStatus(daysSinceRotation, "Tire Rotation");
                    const tiresStatus = getMaintenanceStatus(daysSinceNewTires, "New Tires");
                    
                    return (
                      <div 
                        key={truck.id} 
                        className="p-4 border border-slate-200 rounded-lg"
                        data-testid={`tires-truck-${truck.truckNumber}`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Truck #{truck.truckNumber}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Tire Rotation</span>
                            <Badge className={rotationStatus.color}>{rotationStatus.status}</Badge>
                          </div>
                          <p className="text-xs text-slate-400">
                            {tireRotation ? `${formatDate(tireRotation.serviceDate)} (${daysSinceRotation} days)` : "No record"}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-slate-500">New Tires</span>
                            <Badge className={tiresStatus.color}>{tiresStatus.status}</Badge>
                          </div>
                          <p className="text-xs text-slate-400">
                            {newTires ? `${formatDate(newTires.serviceDate)} (${daysSinceNewTires} days)` : "No record"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {trucks.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No trucks to display</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedTruck} onOpenChange={() => setSelectedTruck(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Truck #{selectedTruck?.truckNumber} Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedTruck && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Current Mileage</p>
                  <p className="text-xl font-bold">{selectedTruck.currentMileage?.toLocaleString() || "—"}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Health Score</p>
                  <p className="text-xl font-bold">{getTruckHealthScore(selectedTruck)}%</p>
                </div>
              </div>

              {selectedTruck.notes && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Notes</p>
                  <p className="text-sm text-yellow-700">{selectedTruck.notes}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900">Maintenance Status</h4>
                  <Button size="sm" onClick={() => setAddRecordModal(true)} data-testid="button-add-record">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Record
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {FLEET_SERVICE_TYPES.map(type => {
                    const record = selectedTruck.latestByType[type];
                    const days = daysSince(record?.serviceDate);
                    const status = getMaintenanceStatus(days, type);
                    
                    return (
                      <div key={type} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Wrench className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-900">{type}</p>
                            <p className="text-sm text-slate-500">
                              {record ? (
                                <>
                                  {formatDate(record.serviceDate)} • {record.vendor || "Unknown"} • {record.mileage?.toLocaleString() || "—"} mi
                                </>
                              ) : (
                                "No record"
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge className={status.color}>{status.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-3">Service History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTruck.maintenanceRecords.length > 0 ? (
                    selectedTruck.maintenanceRecords.map(record => (
                      <div key={record.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{record.serviceType}</p>
                          <p className="text-xs text-slate-500">{record.vendor}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{formatDate(record.serviceDate)}</p>
                          <p className="text-xs text-slate-500">{record.mileage?.toLocaleString()} mi</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No service history</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addRecordModal} onOpenChange={setAddRecordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Maintenance Record</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Service Type</Label>
              <Select value={newRecord.serviceType} onValueChange={v => setNewRecord(p => ({ ...p, serviceType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {FLEET_SERVICE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Service Date</Label>
              <Input 
                type="date" 
                value={newRecord.serviceDate}
                onChange={e => setNewRecord(p => ({ ...p, serviceDate: e.target.value }))}
              />
            </div>

            <div>
              <Label>Vendor</Label>
              <Input 
                placeholder="e.g., Jiffy Lube, Ramona Tire"
                value={newRecord.vendor}
                onChange={e => setNewRecord(p => ({ ...p, vendor: e.target.value }))}
              />
            </div>

            <div>
              <Label>Mileage</Label>
              <Input 
                type="number"
                placeholder="Current mileage"
                value={newRecord.mileage}
                onChange={e => setNewRecord(p => ({ ...p, mileage: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea 
                placeholder="Any additional notes..."
                value={newRecord.notes}
                onChange={e => setNewRecord(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRecordModal(false)}>Cancel</Button>
            <Button onClick={handleAddRecord} disabled={!newRecord.serviceType}>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
