import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Truck, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Plus,
  Search,
  ClipboardCheck,
  Package,
  PackagePlus,
  Minus,
  Trash2
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { FleetTruck, FleetMaintenanceRecord, TruckInventory } from "@shared/schema";
import { FLEET_SERVICE_TYPES, FLEET_TRUCK_STATUSES, TRUCK_INVENTORY_CATEGORIES } from "@shared/schema";

function excelDateToJS(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000);
}

function parseDate(dateStr: string | number | null | undefined): Date | null {
  if (!dateStr) return null;
  if (typeof dateStr === 'number') return excelDateToJS(dateStr);
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
    "Oil Change": 90, "Tire Rotation": 180, "Brake Inspection": 365,
    "Air Filter": 365, "Transmission Fluid": 730, "Coolant System": 730,
    "Brake Fluid": 730, "New Tires": 1095,
  };
  const threshold = thresholds[serviceType] || 365;
  if (days > threshold * 1.2) return { status: "Overdue", color: "bg-red-100 text-red-700" };
  if (days > threshold * 0.9) return { status: "Due Soon", color: "bg-[#FF8000]1A text-[#D35400]" };
  return { status: "Current", color: "bg-[#22D69A]1A text-[#22D69A]" };
}

interface TruckWithMaintenance extends FleetTruck {
  maintenanceRecords: FleetMaintenanceRecord[];
  latestByType: Record<string, FleetMaintenanceRecord>;
}

const COLORS = {
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
  orange: "#f97316",
  purple: "#8b5cf6",
  gray: "#6b7280",
};

const MOCK_ISSUES = [
  { id: 1, date: "2026-01-08", tech: "Mike R.", vehicle: "TRK-012", type: "AC Not Working", priority: "High", status: "New" },
  { id: 2, date: "2026-01-07", tech: "Carlos M.", vehicle: "VAN-008", type: "Brake Noise", priority: "Critical", status: "In Progress" },
  { id: 3, date: "2026-01-07", tech: "James L.", vehicle: "TRK-023", type: "Check Engine", priority: "Medium", status: "Acknowledged" },
  { id: 4, date: "2026-01-06", tech: "David P.", vehicle: "TRK-005", type: "Tire Pressure", priority: "Low", status: "Resolved" },
  { id: 5, date: "2026-01-06", tech: "Alex T.", vehicle: "VAN-011", type: "Fluid Leak", priority: "High", status: "New" },
];

const MOCK_ACTIVITY = [
  { id: 1, user: "MR", name: "Mike R.", action: "commented on", vehicle: "TRK-012", comment: "AC compressor making unusual noise, needs inspection", time: "2 hours ago" },
  { id: 2, user: "SM", name: "Sarah M.", action: "updated status for", vehicle: "VAN-008", comment: "Parts ordered, ETA 3 days", time: "4 hours ago" },
  { id: 3, user: "JL", name: "James L.", action: "reported issue on", vehicle: "TRK-023", comment: "@dispatch Check engine light came on during route", time: "6 hours ago" },
  { id: 4, user: "DP", name: "David P.", action: "completed service for", vehicle: "TRK-005", comment: "Oil change and tire rotation complete", time: "1 day ago" },
];

export default function Fleet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [selectedTruck, setSelectedTruck] = useState<TruckWithMaintenance | null>(null);
  const [addRecordModal, setAddRecordModal] = useState(false);
  const [issueFilter, setIssueFilter] = useState("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [newRecord, setNewRecord] = useState({
    serviceType: "",
    vendor: "",
    mileage: "",
    notes: "",
    serviceDate: new Date().toISOString().split('T')[0],
  });

  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [selectedInventoryTruck, setSelectedInventoryTruck] = useState<FleetTruck | null>(null);
  const [newInventoryItem, setNewInventoryItem] = useState({
    itemName: "",
    category: "Chemicals",
    quantity: 0,
    unit: "each",
    minQuantity: 0,
    notes: "",
  });

  const { data: trucks = [], isLoading: trucksLoading } = useQuery<FleetTruck[]>({
    queryKey: ["/api/fleet/trucks"],
    queryFn: async () => {
      const res = await fetch("/api/fleet/trucks");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: allRecords = [] } = useQuery<FleetMaintenanceRecord[]>({
    queryKey: ["/api/fleet/maintenance"],
    queryFn: async () => {
      const res = await fetch("/api/fleet/maintenance");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: allInventory = [] } = useQuery<TruckInventory[]>({
    queryKey: ["/api/fleet/inventory"],
    queryFn: async () => {
      const res = await fetch("/api/fleet/inventory");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: lowStockItems = [] } = useQuery<TruckInventory[]>({
    queryKey: ["/api/fleet/inventory-low-stock"],
    queryFn: async () => {
      const res = await fetch("/api/fleet/inventory-low-stock");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
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

  const updateTruckStatusMutation = useMutation({
    mutationFn: async ({ truckId, status }: { truckId: string; status: string }) => {
      const res = await fetch(`/api/fleet/trucks/${truckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/fleet/trucks"] }),
  });

  const addRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/fleet/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/maintenance"] });
      setAddRecordModal(false);
      setSelectedVehicleId("");
      setNewRecord({ serviceType: "", vendor: "", mileage: "", notes: "", serviceDate: new Date().toISOString().split('T')[0] });
      toast({ title: "Service record saved", description: "The maintenance record has been added successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save service record. Please try again.", variant: "destructive" });
    },
  });

  const addInventoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/fleet/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add inventory item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/inventory-low-stock"] });
      setInventoryModalOpen(false);
      setNewInventoryItem({ itemName: "", category: "Chemicals", quantity: 0, unit: "each", minQuantity: 0, notes: "" });
      toast({ title: "Inventory added", description: "Item has been added to truck inventory." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add inventory item.", variant: "destructive" });
    },
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await fetch(`/api/fleet/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update inventory");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/inventory-low-stock"] });
    },
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/fleet/inventory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete inventory");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/inventory-low-stock"] });
      toast({ title: "Item removed", description: "Inventory item has been removed." });
    },
  });

  const getInventoryForTruck = (truckId: string) => {
    return allInventory.filter(item => item.truckId === truckId);
  };

  // Calculate stats
  const stats = {
    active: trucks.filter(t => t.status === "Active" || !t.status).length,
    inShop: trucks.filter(t => t.status === "In Shop").length,
    inactive: trucks.filter(t => t.status === "Inactive").length,
    total: trucks.length,
  };

  const maintenanceStats = {
    overdue: trucksWithMaintenance.reduce((acc, truck) => {
      for (const type of FLEET_SERVICE_TYPES) {
        const record = truck.latestByType[type];
        const days = daysSince(record?.serviceDate);
        if (getMaintenanceStatus(days, type).status === "Overdue") acc++;
      }
      return acc;
    }, 0),
    dueSoon: trucksWithMaintenance.reduce((acc, truck) => {
      for (const type of FLEET_SERVICE_TYPES) {
        const record = truck.latestByType[type];
        const days = daysSince(record?.serviceDate);
        if (getMaintenanceStatus(days, type).status === "Due Soon") acc++;
      }
      return acc;
    }, 0),
  };

  const vehicleStatusData = [
    { name: "Active", value: stats.active, color: COLORS.green },
    { name: "In Shop", value: stats.inShop, color: COLORS.yellow },
    { name: "Inactive", value: stats.inactive, color: COLORS.gray },
  ];

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      Critical: "bg-red-100 text-red-700",
      High: "bg-[#FF8000]1A text-[#D35400]",
      Medium: "bg-[#FF8000]1A text-[#D35400]",
      Low: "bg-gray-100 text-gray-700",
    };
    return styles[priority] || styles.Low;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      New: "bg-[#0078D4]1A text-[#0078D4]",
      Acknowledged: "bg-[#FF8000]1A text-[#D35400]",
      "In Progress": "bg-[#17BEBB]1A text-[#0D9488]",
      Resolved: "bg-[#22D69A]1A text-[#22D69A]",
    };
    return styles[status] || styles.New;
  };

  const filteredIssues = MOCK_ISSUES.filter(issue => {
    if (issueFilter === "new") return issue.status === "New";
    if (issueFilter === "critical") return issue.priority === "Critical";
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6 bg-slate-50 min-h-screen -m-6 p-6">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Fleet Dashboard</h1>
            <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 bg-white"
                data-testid="input-search"
              />
            </div>
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger className="w-40 bg-white" data-testid="filter-vehicles">
                <SelectValue placeholder="All Vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inshop">In Shop</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 1 - Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Vehicle Status Donut */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Vehicle Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie
                      data={vehicleStatusData}
                      innerRadius={30}
                      outerRadius={45}
                      dataKey="value"
                      stroke="none"
                    >
                      {vehicleStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  {vehicleStatusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Service Orders */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active Service Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0078D4]" />
                    <span className="text-gray-600">Open</span>
                  </div>
                  <span className="text-2xl font-bold">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#FF8000]" />
                    <span className="text-gray-600">In Progress</span>
                  </div>
                  <span className="text-2xl font-bold">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#22D69A]" />
                    <span className="text-gray-600">Completed Today</span>
                  </div>
                  <span className="text-2xl font-bold">5</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Alerts */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Maintenance Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <p className="text-4xl font-bold text-red-500">{maintenanceStats.overdue}</p>
                  <p className="text-sm text-gray-500">Overdue</p>
                </div>
                <div className="h-12 w-px bg-gray-200" />
                <div className="text-center">
                  <p className="text-4xl font-bold text-[#D35400]">{maintenanceStats.dueSoon}</p>
                  <p className="text-sm text-gray-500">Due This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Open Issues */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Open Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <p className="text-4xl font-bold text-[#0078D4]">12</p>
                  <p className="text-sm text-gray-500">Open</p>
                </div>
                <div className="h-12 w-px bg-gray-200" />
                <div className="text-center">
                  <p className="text-4xl font-bold text-red-500">3</p>
                  <p className="text-sm text-gray-500">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2 - Activity & Issues */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[140px] px-6 pb-4">
                <div className="space-y-3">
                  {MOCK_ACTIVITY.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#0078D4]1A flex items-center justify-center text-xs font-semibold text-[#0078D4]">
                        {activity.user}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.name}</span>
                          <span className="text-gray-500"> {activity.action} </span>
                          <span className="text-[#0078D4] font-medium">{activity.vehicle}</span>
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {activity.comment.includes("@") ? (
                            <>
                              {activity.comment.split("@")[0]}
                              <span className="bg-[#FF8000]1A text-yellow-800 px-1 rounded">@{activity.comment.split("@")[1].split(" ")[0]}</span>
                              {" " + activity.comment.split("@")[1].split(" ").slice(1).join(" ")}
                            </>
                          ) : activity.comment}
                        </p>
                        <p className="text-xs text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Row 4 - Tech Issues & Equipment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tech Submitted Issues - Wider */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Tech Reported Issues</CardTitle>
                  <Badge className="bg-[#0078D4]1A text-[#0078D4]">NEW</Badge>
                  <span className="text-sm text-gray-500">({filteredIssues.length})</span>
                </div>
                <Select value={issueFilter} onValueChange={setIssueFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs" data-testid="filter-issues">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="new">New Only</SelectItem>
                    <SelectItem value="critical">Critical Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Tech</th>
                      <th className="pb-2 font-medium">Vehicle</th>
                      <th className="pb-2 font-medium">Issue Type</th>
                      <th className="pb-2 font-medium">Priority</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map((issue) => (
                      <tr key={issue.id} className="border-b hover:bg-gray-50 cursor-pointer">
                        <td className="py-2 text-gray-600">{issue.date}</td>
                        <td className="py-2">{issue.tech}</td>
                        <td className="py-2 text-[#0078D4] font-medium">{issue.vehicle}</td>
                        <td className="py-2">{issue.type}</td>
                        <td className="py-2">
                          <Badge className={getPriorityBadge(issue.priority)}>{issue.priority}</Badge>
                        </td>
                        <td className="py-2">
                          <Badge className={getStatusBadge(issue.status)}>{issue.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-center">
                <Button variant="link" className="text-[#0078D4] text-sm">View All Issues</Button>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Status */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Equipment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#22D69A]1A rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-[#22D69A]" />
                    <span className="text-gray-700">In-Service</span>
                  </div>
                  <span className="text-2xl font-bold text-[#22D69A]">{stats.active}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#FF8000]1A rounded-lg">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-[#D35400]" />
                    <span className="text-gray-700">Needs Inspection</span>
                  </div>
                  <span className="text-2xl font-bold text-[#D35400]">{maintenanceStats.dueSoon}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#FF8000]1A rounded-lg">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-[#D35400]" />
                    <span className="text-gray-700">Out for Repair</span>
                  </div>
                  <span className="text-2xl font-bold text-[#D35400]">{stats.inShop}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Fleet */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Vehicle Fleet ({trucks.length})</CardTitle>
              <Button size="sm" onClick={() => setAddRecordModal(true)} data-testid="button-add-service">
                <Plus className="h-4 w-4 mr-2" />
                Add Service Record
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {trucksLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078D4]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Vehicle</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Mileage</th>
                      <th className="pb-2 font-medium">Truck Health</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trucksWithMaintenance
                      .filter(truck => {
                        const matchesSearch = !searchQuery || truck.truckNumber.toString().includes(searchQuery);
                        let matchesStatus = true;
                        if (vehicleFilter === "active") matchesStatus = truck.status === "Active" || !truck.status;
                        else if (vehicleFilter === "inshop") matchesStatus = truck.status === "In Shop";
                        else if (vehicleFilter === "inactive") matchesStatus = truck.status === "Inactive";
                        return matchesSearch && matchesStatus;
                      })
                      .map((truck) => {
                        const truckStatus = truck.status || "Active";
                        const healthScore = (() => {
                          let score = 100;
                          for (const type of FLEET_SERVICE_TYPES) {
                            const record = truck.latestByType[type];
                            const days = daysSince(record?.serviceDate);
                            const status = getMaintenanceStatus(days, type);
                            if (status.status === "Overdue") score -= 15;
                            else if (status.status === "Due Soon") score -= 5;
                            else if (status.status === "No Record") score -= 10;
                          }
                          return Math.max(0, Math.min(100, score));
                        })();
                        const healthColor = healthScore >= 80 ? "text-[#22D69A]" : healthScore >= 60 ? "text-[#D35400]" : "text-red-600";
                        const statusBadgeColor = truckStatus === "Active" ? "bg-[#22D69A]1A text-[#22D69A]" :
                                                 truckStatus === "In Shop" ? "bg-[#FF8000]1A text-[#D35400]" : "bg-gray-100 text-gray-700";

                        return (
                          <tr 
                            key={truck.id} 
                            className="border-b hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedTruck(truck)}
                            data-testid={`row-truck-${truck.truckNumber}`}
                          >
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-[#0078D4]" />
                                <span className="font-bold">#{truck.truckNumber}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <Select
                                value={truckStatus}
                                onValueChange={(value) => {
                                  updateTruckStatusMutation.mutate({ truckId: truck.id, status: value });
                                }}
                              >
                                <SelectTrigger 
                                  className="h-7 w-28 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent onClick={(e) => e.stopPropagation()}>
                                  {FLEET_TRUCK_STATUSES.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-3 text-gray-600">
                              {truck.currentMileage?.toLocaleString() || "—"}
                            </td>
                            <td className="py-3">
                              <span className={`font-semibold ${healthColor}`}>
                                {healthScore}%
                              </span>
                            </td>
                            <td className="py-3">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTruck(truck);
                                }}
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Truck Inventory Section */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-[#0078D4]" />
                <CardTitle className="text-lg font-semibold">Truck Inventory</CardTitle>
                {lowStockItems.length > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    {lowStockItems.length} Low Stock
                  </Badge>
                )}
              </div>
              <Button 
                size="sm" 
                onClick={() => setInventoryModalOpen(true)} 
                data-testid="button-add-inventory"
              >
                <PackagePlus className="h-4 w-4 mr-2" />
                Add Inventory Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {trucks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No trucks available. Add trucks first to manage inventory.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trucks.map(truck => {
                  const inventory = getInventoryForTruck(truck.id);
                  const lowItems = inventory.filter(item => item.quantity <= (item.minQuantity || 0));
                  
                  return (
                    <div key={truck.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-[#0078D4]" />
                          <span className="font-bold">Truck #{truck.truckNumber}</span>
                          <Badge variant="outline" className="text-xs">
                            {inventory.length} items
                          </Badge>
                          {lowItems.length > 0 && (
                            <Badge className="bg-red-100 text-red-700 text-xs">
                              {lowItems.length} low
                            </Badge>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedInventoryTruck(truck);
                            setInventoryModalOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Item
                        </Button>
                      </div>
                      
                      {inventory.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No inventory items tracked</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {inventory.slice(0, 8).map(item => (
                            <div 
                              key={item.id} 
                              className={`p-2 rounded border text-sm ${
                                item.quantity <= (item.minQuantity || 0) 
                                  ? 'bg-red-50 border-red-200' 
                                  : 'bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate">{item.itemName}</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => updateInventoryMutation.mutate({
                                      id: item.id,
                                      updates: { quantity: Math.max(0, item.quantity - 1) }
                                    })}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className={`font-bold ${
                                    item.quantity <= (item.minQuantity || 0) ? 'text-red-600' : ''
                                  }`}>
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => updateInventoryMutation.mutate({
                                      id: item.id,
                                      updates: { quantity: item.quantity + 1 }
                                    })}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-500">{item.category}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                  onClick={() => deleteInventoryMutation.mutate(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {inventory.length > 8 && (
                            <div className="p-2 flex items-center justify-center text-sm text-[#0078D4]">
                              +{inventory.length - 8} more items
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Truck Detail Modal */}
      <Dialog open={!!selectedTruck} onOpenChange={() => setSelectedTruck(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#0078D4]" />
              Truck #{selectedTruck?.truckNumber} Details
            </DialogTitle>
            <DialogDescription>View and manage maintenance records for this vehicle.</DialogDescription>
          </DialogHeader>
          {selectedTruck && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Current Mileage</p>
                  <p className="text-xl font-bold">{selectedTruck.currentMileage?.toLocaleString() || "—"}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="text-xl font-bold">{selectedTruck.status || "Active"}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Maintenance Status</h4>
                <div className="space-y-2">
                  {FLEET_SERVICE_TYPES.map(type => {
                    const record = selectedTruck.latestByType[type];
                    const days = daysSince(record?.serviceDate);
                    const status = getMaintenanceStatus(days, type);
                    return (
                      <div key={type} className="flex items-center justify-between p-2 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{type}</p>
                          <p className="text-xs text-gray-500">
                            {record ? formatDate(record.serviceDate) : "No record"}
                          </p>
                        </div>
                        <Badge className={status.color}>{status.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Record Modal */}
      <Dialog open={addRecordModal} onOpenChange={(open) => {
        setAddRecordModal(open);
        if (!open) {
          setSelectedVehicleId("");
          setNewRecord({ serviceType: "", vendor: "", mileage: "", notes: "", serviceDate: new Date().toISOString().split('T')[0] });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service Record</DialogTitle>
            <DialogDescription>Record a new maintenance service for a vehicle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map(t => (
                    <SelectItem key={t.id} value={t.id}>Truck #{t.truckNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service Type</Label>
              <Select value={newRecord.serviceType} onValueChange={(v) => setNewRecord({ ...newRecord, serviceType: v })}>
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
                onChange={(e) => setNewRecord({ ...newRecord, serviceDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Vendor</Label>
              <Input 
                value={newRecord.vendor}
                onChange={(e) => setNewRecord({ ...newRecord, vendor: e.target.value })}
                placeholder="Enter vendor name"
              />
            </div>
            <div>
              <Label>Mileage</Label>
              <Input 
                type="number"
                value={newRecord.mileage}
                onChange={(e) => setNewRecord({ ...newRecord, mileage: e.target.value })}
                placeholder="Current mileage"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea 
                value={newRecord.notes}
                onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRecordModal(false)}>Cancel</Button>
            <Button 
              disabled={!selectedVehicleId || !newRecord.serviceType}
              onClick={() => {
                const selectedTruckData = trucks.find(t => t.id === selectedVehicleId);
                if (selectedTruckData && newRecord.serviceType) {
                  addRecordMutation.mutate({
                    truckId: selectedVehicleId,
                    truckNumber: selectedTruckData.truckNumber,
                    serviceType: newRecord.serviceType,
                    vendor: newRecord.vendor || null,
                    mileage: newRecord.mileage ? parseInt(newRecord.mileage) : null,
                    notes: newRecord.notes || null,
                    serviceDate: newRecord.serviceDate,
                  });
                }
              }}
            >
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Inventory Modal */}
      <Dialog open={inventoryModalOpen} onOpenChange={(open) => {
        setInventoryModalOpen(open);
        if (!open) {
          setSelectedInventoryTruck(null);
          setNewInventoryItem({ itemName: "", category: "Chemicals", quantity: 0, unit: "each", minQuantity: 0, notes: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#0078D4]" />
              Add Inventory Item
            </DialogTitle>
            <DialogDescription>Add a new item to truck inventory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Truck</Label>
              <Select 
                value={selectedInventoryTruck?.id || ""} 
                onValueChange={(v) => setSelectedInventoryTruck(trucks.find(t => t.id === v) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map(t => (
                    <SelectItem key={t.id} value={t.id}>Truck #{t.truckNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item Name</Label>
              <Input 
                value={newInventoryItem.itemName}
                onChange={(e) => setNewInventoryItem({ ...newInventoryItem, itemName: e.target.value })}
                placeholder="e.g., Chlorine Tablets, Test Strips..."
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select 
                value={newInventoryItem.category} 
                onValueChange={(v) => setNewInventoryItem({ ...newInventoryItem, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRUCK_INVENTORY_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input 
                  type="number"
                  min={0}
                  value={newInventoryItem.quantity}
                  onChange={(e) => setNewInventoryItem({ ...newInventoryItem, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select 
                  value={newInventoryItem.unit} 
                  onValueChange={(v) => setNewInventoryItem({ ...newInventoryItem, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="lbs">Lbs</SelectItem>
                    <SelectItem value="gallons">Gallons</SelectItem>
                    <SelectItem value="cases">Cases</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Minimum Quantity (for low stock alert)</Label>
              <Input 
                type="number"
                min={0}
                value={newInventoryItem.minQuantity}
                onChange={(e) => setNewInventoryItem({ ...newInventoryItem, minQuantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea 
                value={newInventoryItem.notes}
                onChange={(e) => setNewInventoryItem({ ...newInventoryItem, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInventoryModalOpen(false)}>Cancel</Button>
            <Button 
              disabled={!selectedInventoryTruck || !newInventoryItem.itemName}
              onClick={() => {
                if (selectedInventoryTruck && newInventoryItem.itemName) {
                  addInventoryMutation.mutate({
                    truckId: selectedInventoryTruck.id,
                    truckNumber: selectedInventoryTruck.truckNumber,
                    itemName: newInventoryItem.itemName,
                    category: newInventoryItem.category,
                    quantity: newInventoryItem.quantity,
                    unit: newInventoryItem.unit,
                    minQuantity: newInventoryItem.minQuantity,
                    notes: newInventoryItem.notes || null,
                  });
                }
              }}
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
