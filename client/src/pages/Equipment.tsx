import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Flame,
  History,
  Plus,
  RefreshCw,
  Search,
  Settings,
  FileText,
  User,
  Wrench,
  X,
  Droplets,
  Camera,
  FileCheck,
  Hammer,
  Image,
} from "lucide-react";
import {
  PM_EQUIPMENT_TYPES,
  PM_EQUIPMENT_APPLICATIONS,
  PM_EQUIPMENT_BRANDS,
  PM_EQUIPMENT_MODELS,
  PM_SERVICE_REASONS,
  type EquipmentPmSchedule,
  type PmServiceType,
  type PmServiceRecord,
} from "@shared/schema";

interface CustomerWithEquipment {
  id: string;
  name: string;
  address?: string;
  region?: string;
  supervisor?: string;
  pools: {
    id: string;
    name: string;
    type: string;
    equipment: {
      category: string;
      type: string;
      notes?: string;
    }[];
  }[];
}

interface PropertyActivityLog {
  id: string;
  propertyId: string;
  action: string;
  details?: string;
  createdBy?: string;
  createdAt: string;
}

interface EnrichedAlert {
  alertId: number;
  poolId: number;
  poolName: string;
  customerId: number;
  customerName: string;
  type: string;
  message: string;
  createdAt: string;
  status: string;
  techName?: string;
  pictures?: string[];
}

type StatusFilter = "all" | "overdue" | "due_soon";

export default function Equipment() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedProperty, setSelectedProperty] = useState<CustomerWithEquipment | null>(null);
  const [activeTab, setActiveTab] = useState("equipment");
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  
  const [newEquipment, setNewEquipment] = useState({
    category: "",
    application: "",
    brand: "",
    model: "",
    customBrand: "",
    customModel: "",
    notes: "",
  });

  const [propertySettings, setPropertySettings] = useState({
    name: "",
    address: "",
    supervisor: "",
    region: "",
    poolTypes: "",
    notes: "",
  });

  const { data: customersData, isLoading: customersLoading } = useQuery<{ customers: CustomerWithEquipment[] }>({
    queryKey: ["/api/poolbrain/customers-equipment"],
  });
  
  const customers = customersData?.customers || [];

  const { data: pmSchedules = [] } = useQuery<EquipmentPmSchedule[]>({
    queryKey: ["/api/pm/schedules"],
  });

  const { data: serviceTypes = [] } = useQuery<PmServiceType[]>({
    queryKey: ["/api/pm/service-types"],
  });

  const { data: alertsData } = useQuery<{ alerts: EnrichedAlert[] }>({
    queryKey: ["/api/alerts/enriched"],
  });
  
  const alerts = alertsData?.alerts || [];

  const regions = useMemo(() => {
    const regionSet = new Set<string>();
    customers.forEach(c => {
      if (c.region) regionSet.add(c.region);
    });
    return Array.from(regionSet).sort();
  }, [customers]);

  const supervisors = useMemo(() => {
    const supervisorSet = new Set<string>();
    customers.forEach(c => {
      if (c.supervisor) supervisorSet.add(c.supervisor);
    });
    return Array.from(supervisorSet).sort();
  }, [customers]);

  const getEquipmentCounts = (customer: CustomerWithEquipment) => {
    let filters = 0, pumps = 0, heaters = 0;
    customer.pools?.forEach(pool => {
      pool.equipment?.forEach(eq => {
        const cat = eq.category?.toLowerCase() || "";
        if (cat.includes("filter")) filters++;
        else if (cat.includes("pump")) pumps++;
        else if (cat.includes("heater")) heaters++;
      });
    });
    return { filters, pumps, heaters };
  };

  const getPropertyPmStatus = (customerId: string) => {
    const propertySchedules = pmSchedules.filter(s => s.propertyId === customerId);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    let overdue = 0, dueSoon = 0, current = 0;
    propertySchedules.forEach(schedule => {
      const dueDate = new Date(schedule.nextDueDate);
      if (dueDate < today) overdue++;
      else if (dueDate <= thirtyDaysFromNow) dueSoon++;
      else current++;
    });
    return { overdue, dueSoon, current, total: propertySchedules.length };
  };

  const dashboardStats = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    let overdue = 0, dueSoon = 0, current = 0;
    pmSchedules.forEach(schedule => {
      const dueDate = new Date(schedule.nextDueDate);
      if (dueDate < today) overdue++;
      else if (dueDate <= thirtyDaysFromNow) dueSoon++;
      else current++;
    });

    return {
      overdue,
      dueSoon,
      current,
      properties: customers.length,
    };
  }, [pmSchedules, customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = customer.name?.toLowerCase().includes(query);
        const addressMatch = customer.address?.toLowerCase().includes(query);
        if (!nameMatch && !addressMatch) return false;
      }

      if (regionFilter !== "all" && customer.region !== regionFilter) {
        return false;
      }

      if (statusFilter !== "all") {
        const status = getPropertyPmStatus(customer.id);
        if (statusFilter === "overdue" && status.overdue === 0) return false;
        if (statusFilter === "due_soon" && status.dueSoon === 0) return false;
      }

      return true;
    });
  }, [customers, searchQuery, regionFilter, statusFilter, pmSchedules]);

  const getPropertyEquipmentByType = (customerId: string) => {
    const propertySchedules = pmSchedules.filter(s => s.propertyId === customerId);
    const customer = customers.find(c => c.id === customerId);
    const grouped: Record<string, any[]> = {};
    
    if (propertySchedules.length > 0) {
      propertySchedules.forEach(schedule => {
        const type = schedule.equipmentType || "Other";
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        if (!grouped[typeLabel]) grouped[typeLabel] = [];
        grouped[typeLabel].push({ ...schedule, source: 'pm' });
      });
    }
    
    if (customer?.pools) {
      customer.pools.forEach(pool => {
        pool.equipment?.forEach(eq => {
          const cat = eq.category || "Other";
          const typeLabel = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
          const existsInPm = Object.values(grouped).flat().some(
            item => item.equipmentName?.toLowerCase().includes(eq.type?.toLowerCase() || '')
          );
          if (!existsInPm) {
            if (!grouped[typeLabel]) grouped[typeLabel] = [];
            grouped[typeLabel].push({
              id: `eq-${pool.id}-${eq.category}`,
              equipmentName: eq.type || `${eq.category}`,
              equipmentType: eq.category,
              waterType: pool.type?.toLowerCase() || 'pool',
              nextDueDate: new Date().toISOString(),
              lastServiceDate: null,
              source: 'poolbrain',
              notes: eq.notes,
            });
          }
        });
      });
    }
    
    return grouped;
  };

  const getEquipmentStatus = (schedule: any) => {
    if (!schedule.nextDueDate || schedule.source === 'poolbrain') {
      return { status: "no_pm", daysUntil: 0, color: "bg-slate-100 text-slate-600" };
    }
    const today = new Date();
    const dueDate = new Date(schedule.nextDueDate);
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { status: "overdue", daysOver: Math.abs(daysUntil), daysUntil, color: "bg-red-100 text-red-700" };
    if (daysUntil <= 30) return { status: "due_soon", daysUntil, color: "bg-[#FF8000]1A text-[#D35400]" };
    return { status: "current", daysUntil, color: "bg-[#22D69A]1A text-[#22D69A]" };
  };

  const getEquipmentBrands = () => {
    const categoryKey = newEquipment.category.toLowerCase();
    return PM_EQUIPMENT_BRANDS[categoryKey] || PM_EQUIPMENT_BRANDS["other"] || ["Other"];
  };

  const getEquipmentModels = () => {
    const categoryKey = newEquipment.category.toLowerCase();
    return PM_EQUIPMENT_MODELS[categoryKey] || PM_EQUIPMENT_MODELS["other"] || ["Other"];
  };

  const resetEquipmentForm = () => {
    setNewEquipment({
      category: "",
      application: "",
      brand: "",
      model: "",
      customBrand: "",
      customModel: "",
      notes: "",
    });
  };

  const getPropertyRepairs = (customerId: string) => {
    return alerts.filter(alert => {
      const alertCustomerId = String(alert.customerId);
      const matchesCustomer = alertCustomerId === customerId;
      if (!matchesCustomer) return false;
      
      const msg = (alert.message || "").toLowerCase();
      const alertType = (alert.type || "").toLowerCase();
      
      return alertType.includes('issue') ||
             alertType.includes('repair') ||
             msg.includes('repair') ||
             msg.includes('broken') ||
             msg.includes('needs') ||
             msg.includes('not working') ||
             msg.includes("doesn't work") ||
             msg.includes('leak') ||
             msg.includes('issue');
    });
  };

  const getPropertyRepairCount = (customerId: string) => {
    return getPropertyRepairs(customerId).length;
  };

  const addEquipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/pm/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/schedules"] });
      setAddEquipmentOpen(false);
      resetEquipmentForm();
    },
  });

  const handleAddEquipment = () => {
    if (!selectedProperty || !newEquipment.category || !newEquipment.application) return;
    
    const brand = newEquipment.brand === "Other" ? newEquipment.customBrand : newEquipment.brand;
    const model = newEquipment.model === "Other" ? newEquipment.customModel : newEquipment.model;
    
    if (!brand || !model) return;
    
    const matchingServiceType = serviceTypes.find(st => 
      st.category.toLowerCase() === newEquipment.category.toLowerCase()
    ) || serviceTypes[0];
    
    if (!matchingServiceType) return;

    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + 12);

    const waterType = newEquipment.application.toLowerCase() === "spa" ? "spa" : "pool";

    addEquipmentMutation.mutate({
      equipmentId: `manual-${Date.now()}`,
      equipmentName: `${brand} ${model}`,
      equipmentType: newEquipment.category,
      propertyId: selectedProperty.id,
      propertyName: selectedProperty.name,
      bodyOfWaterId: selectedProperty.pools?.[0]?.id || "default",
      waterType,
      pmServiceTypeId: matchingServiceType.id,
      nextDueDate: nextDue.toISOString().split('T')[0],
      status: "current",
    });
  };

  const handlePropertyClick = (customer: CustomerWithEquipment) => {
    setSelectedProperty(customer);
    setPropertySettings({
      name: customer.name || "",
      address: customer.address || "",
      supervisor: customer.supervisor || "",
      region: customer.region || "",
      poolTypes: customer.pools?.map(p => p.type).filter(Boolean).join(", ") || "",
      notes: "",
    });
    setActiveTab("equipment");
  };

  const getEquipmentTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("heater")) return <Flame className="h-4 w-4 text-[#D35400]" />;
    if (t.includes("filter")) return <Filter className="h-4 w-4 text-[#0078D4]" />;
    if (t.includes("pump")) return <Droplets className="h-4 w-4 text-[#0D9488]" />;
    return <Wrench className="h-4 w-4 text-slate-500" />;
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <p className="text-sm text-red-600 font-medium">Overdue</p>
              <p className="text-3xl font-bold text-red-700" data-testid="stat-overdue">
                {dashboardStats.overdue}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#FF8000]1A to-[#FF8000]1A border-[#FF8000]33">
            <CardContent className="p-4">
              <p className="text-sm text-[#D35400] font-medium">Due Soon</p>
              <p className="text-3xl font-bold text-[#D35400]" data-testid="stat-due-soon">
                {dashboardStats.dueSoon}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600 font-medium">Current</p>
              <p className="text-3xl font-bold text-slate-700" data-testid="stat-current">
                {dashboardStats.current}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#0078D4]1A to-[#0078D4]1A border-[#0078D4]33">
            <CardContent className="p-4">
              <p className="text-sm text-[#0078D4] font-medium">Properties</p>
              <p className="text-3xl font-bold text-[#0078D4]" data-testid="stat-properties">
                {dashboardStats.properties}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-properties"
            />
          </div>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-48" data-testid="select-region-filter">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <Button
              variant={statusFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              data-testid="filter-all"
            >
              All
            </Button>
            <Button
              variant={statusFilter === "overdue" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("overdue")}
              className={statusFilter === "overdue" ? "bg-red-600" : ""}
              data-testid="filter-overdue"
            >
              Overdue
            </Button>
            <Button
              variant={statusFilter === "due_soon" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("due_soon")}
              className={statusFilter === "due_soon" ? "bg-[#FF8000]" : ""}
              data-testid="filter-due-soon"
            >
              Due Soon
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Properties ({filteredCustomers.length})
              </CardTitle>
              <p className="text-sm text-slate-500">
                Click row to view details • Assign region & supervisor inline
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-400px)]">
              {customersLoading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="h-8 w-8 animate-spin text-[#0078D4]" />
                  <span className="ml-3 text-slate-500">Loading properties...</span>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No properties found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredCustomers.map((customer) => {
                    const counts = getEquipmentCounts(customer);
                    const status = getPropertyPmStatus(customer.id);
                    return (
                      <div
                        key={customer.id}
                        className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => handlePropertyClick(customer)}
                        data-testid={`property-row-${customer.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#0078D4]1A rounded-lg flex items-center justify-center">
                              <Building className="h-5 w-5 text-[#0078D4]" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{customer.name}</p>
                              <p className="text-sm text-slate-500">
                                {counts.filters}F • {counts.pumps}P • {counts.heaters}H
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {status.overdue > 0 && (
                              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                {status.overdue} overdue
                              </Badge>
                            )}
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          </div>
                        </div>
                        <div className="flex items-center gap-6 mt-2 ml-13">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">Region:</span>
                            <Select
                              value={customer.region || "unassigned"}
                              onValueChange={(value) => {}}
                            >
                              <SelectTrigger className="h-7 w-32 text-xs" onClick={(e) => e.stopPropagation()}>
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                <SelectItem value="North County">North County</SelectItem>
                                <SelectItem value="South County">South County</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">Supervisor:</span>
                            <Select
                              value={customer.supervisor || "not_assigned"}
                              onValueChange={(value) => {}}
                            >
                              <SelectTrigger className="h-7 w-40 text-xs" onClick={(e) => e.stopPropagation()}>
                                <SelectValue placeholder="-- Not Assigned --" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_assigned">-- Not Assigned --</SelectItem>
                                <SelectItem value="Mike Torres">Mike Torres</SelectItem>
                                <SelectItem value="Kevin Brown">Kevin Brown</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Sheet open={!!selectedProperty} onOpenChange={(open) => !open && setSelectedProperty(null)}>
          <SheetContent className="sm:max-w-lg p-0 overflow-hidden">
            {selectedProperty && (
              <>
                <SheetHeader className="bg-slate-800 text-white p-4">
                  <SheetTitle className="text-white flex items-center gap-2">
                    <span>{selectedProperty.name}</span>
                  </SheetTitle>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span>{getPropertyPmStatus(selectedProperty.id).total} Equipment</span>
                    {selectedProperty.supervisor && (
                      <>
                        <span>•</span>
                        <User className="h-3 w-3" />
                        <span>{selectedProperty.supervisor}</span>
                      </>
                    )}
                    {selectedProperty.region && (
                      <Badge variant="secondary" className="bg-[#0078D4] text-white text-xs">
                        {selectedProperty.region}
                      </Badge>
                    )}
                  </div>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                  <TabsList className="w-full rounded-none border-b bg-white">
                    <TabsTrigger value="equipment" className="flex-1 gap-1 text-xs">
                      <Wrench className="h-4 w-4" />
                      Equipment
                    </TabsTrigger>
                    <TabsTrigger value="operations" className="flex-1 gap-1 text-xs">
                      <Hammer className="h-4 w-4" />
                      Operations
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex-1 gap-1 text-xs">
                      <FileText className="h-4 w-4" />
                      Logs
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1 gap-1 text-xs">
                      <Settings className="h-4 w-4" />
                      Settings
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="equipment" className="mt-0 p-4">
                    <Button
                      className="w-full mb-4 bg-[#0078D4]1A text-[#0078D4] hover:bg-[#0078D4]1A border border-[#0078D4]33"
                      variant="outline"
                      onClick={() => setAddEquipmentOpen(true)}
                      data-testid="button-add-equipment"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Equipment
                    </Button>

                    <ScrollArea className="h-[calc(100vh-320px)]">
                      {Object.entries(getPropertyEquipmentByType(selectedProperty.id)).map(([type, items]) => (
                        <div key={type} className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            {getEquipmentTypeIcon(type)}
                            <span className="font-medium text-slate-700">
                              {type}{type.endsWith('s') ? '' : 's'} ({items.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {items.map((schedule) => {
                              const statusInfo = getEquipmentStatus(schedule);
                              return (
                                <div
                                  key={schedule.id}
                                  className="bg-white border rounded-lg p-3"
                                  data-testid={`equipment-card-${schedule.id}`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex gap-3">
                                      <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400">
                                        Photo
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge variant="outline" className="text-xs bg-[#0078D4]1A text-[#0078D4]">
                                            <Droplets className="h-3 w-3 mr-1" />
                                            {schedule.waterType}
                                          </Badge>
                                        </div>
                                        <p className="font-medium text-slate-800">{schedule.equipmentName}</p>
                                        <p className="text-xs text-slate-500">
                                          Last: {schedule.lastServiceDate ? new Date(schedule.lastServiceDate).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }) : "N/A"} 
                                          {" "}Next: {new Date(schedule.nextDueDate).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                                          {statusInfo.status === "overdue" && (
                                            <span className="text-red-600 ml-1">({statusInfo.daysOver}d over)</span>
                                          )}
                                          {statusInfo.status === "current" && (
                                            <span className="text-slate-400 ml-1">({statusInfo.daysUntil}d)</span>
                                          )}
                                        </p>
                                        {schedule.lastServiceDate && (
                                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                            <User className="h-3 w-3" />
                                            Service recorded
                                          </p>
                                        )}
                                        <div className="flex gap-2 mt-2">
                                          <Button variant="link" size="sm" className="h-6 px-0 text-[#0078D4]">
                                            Edit
                                          </Button>
                                          <Button variant="link" size="sm" className="h-6 px-0 text-[#0078D4]">
                                            Service
                                          </Button>
                                          <Button variant="link" size="sm" className="h-6 px-0 text-red-600">
                                            Remove
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                    <Badge className={
                                      statusInfo.status === "overdue" ? "bg-red-100 text-red-700" : 
                                      statusInfo.status === "no_pm" ? "bg-slate-100 text-slate-600" :
                                      "bg-[#22D69A]1A text-[#22D69A]"
                                    }>
                                      {statusInfo.status === "overdue" ? "OVERDUE" : 
                                       statusInfo.status === "no_pm" ? "NO PM" : "OK"}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {Object.keys(getPropertyEquipmentByType(selectedProperty.id)).length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                          <Wrench className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p>No equipment added yet</p>
                          <Button
                            variant="link"
                            onClick={() => setAddEquipmentOpen(true)}
                            className="mt-2"
                          >
                            Add your first equipment
                          </Button>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="operations" className="mt-0 p-4">
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-red-600 mb-4">
                          <Wrench className="h-5 w-5" />
                          <span className="font-semibold text-lg">Repair Needed</span>
                        </div>

                        {getPropertyRepairs(selectedProperty.id).length === 0 ? (
                          <div className="text-center py-10 text-slate-400">
                            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50 text-[#22D69A]" />
                            <p>No repairs needed</p>
                            <p className="text-sm">All equipment is in good condition</p>
                          </div>
                        ) : (
                          getPropertyRepairs(selectedProperty.id).map((repair) => (
                            <Card key={repair.alertId} className="border-red-200 bg-red-50/50">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                                      <Wrench className="h-3 w-3 mr-1" />
                                      {repair.type || "Issue"}
                                    </Badge>
                                    {repair.pictures && repair.pictures.length > 0 && (
                                      <Button variant="link" size="sm" className="h-6 px-0 text-[#0078D4] gap-1">
                                        <Camera className="h-3 w-3" />
                                        View Pictures
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <p className="font-medium text-slate-800">{repair.message || "Equipment needs attention"}</p>
                                  
                                  {repair.techName && (
                                    <div className="bg-white rounded p-2 border">
                                      <p className="text-xs text-slate-500 font-medium">Technician:</p>
                                      <p className="text-sm text-slate-700">{repair.techName}</p>
                                    </div>
                                  )}

                                  <div className="text-xs text-slate-500">
                                    <span>{repair.poolName}</span>
                                    {repair.createdAt && (
                                      <span className="ml-2">• {new Date(repair.createdAt).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="flex-1 bg-[#0078D4]1A text-[#0078D4] hover:bg-[#0078D4]1A border-[#0078D4]33"
                                    data-testid={`button-convert-estimate-${repair.alertId}`}
                                  >
                                    <FileCheck className="h-4 w-4 mr-1" />
                                    Convert to Estimate
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="flex-1 bg-[#22D69A] hover:bg-[#22D69A]"
                                    data-testid={`button-convert-job-${repair.alertId}`}
                                  >
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Convert to Job
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="logs" className="mt-0 p-4">
                    <div className="space-y-4">
                      <div>
                        <Label className="font-medium">Add Note</Label>
                        <Textarea
                          placeholder="Enter a note..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="mt-2"
                          rows={3}
                          data-testid="input-add-note"
                        />
                        <Button className="mt-2" size="sm" data-testid="button-add-note">
                          Add Note
                        </Button>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span className="font-medium">Activity Log (0)</span>
                        </div>
                        <div className="text-center py-10 text-slate-400">
                          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p>No activity logged yet</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="mt-0 p-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Property Name</Label>
                        <Input
                          value={propertySettings.name}
                          onChange={(e) => setPropertySettings({ ...propertySettings, name: e.target.value })}
                          className="mt-1"
                          data-testid="input-property-name"
                        />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Input
                          placeholder="Enter property address"
                          value={propertySettings.address}
                          onChange={(e) => setPropertySettings({ ...propertySettings, address: e.target.value })}
                          className="mt-1"
                          data-testid="input-property-address"
                        />
                      </div>
                      <div>
                        <Label>Assigned Supervisor</Label>
                        <Select
                          value={propertySettings.supervisor || "not_assigned"}
                          onValueChange={(value) => setPropertySettings({ ...propertySettings, supervisor: value })}
                        >
                          <SelectTrigger className="mt-1" data-testid="select-supervisor">
                            <SelectValue placeholder="Select supervisor..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_assigned">-- Not Assigned --</SelectItem>
                            <SelectItem value="Mike Torres - North County Supervisor">Mike Torres - North County Supervisor</SelectItem>
                            <SelectItem value="Kevin Brown">Kevin Brown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Region / County</Label>
                        <Select
                          value={propertySettings.region || "unassigned"}
                          onValueChange={(value) => setPropertySettings({ ...propertySettings, region: value })}
                        >
                          <SelectTrigger className="mt-1" data-testid="select-region">
                            <SelectValue placeholder="Select region..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            <SelectItem value="North County">North County</SelectItem>
                            <SelectItem value="South County">South County</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Pool Types</Label>
                        <Input
                          value={propertySettings.poolTypes}
                          readOnly
                          className="mt-1 bg-slate-50"
                          data-testid="input-pool-types"
                        />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          placeholder="Notes..."
                          value={propertySettings.notes}
                          onChange={(e) => setPropertySettings({ ...propertySettings, notes: e.target.value })}
                          className="mt-1"
                          rows={3}
                          data-testid="input-property-notes"
                        />
                      </div>
                      <Button className="w-full" data-testid="button-save-settings">
                        Save Settings
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>

        <Dialog open={addEquipmentOpen} onOpenChange={(open) => {
          if (!open) resetEquipmentForm();
          setAddEquipmentOpen(open);
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#0078D4]" />
                Add New Equipment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedProperty && (
                <div className="bg-[#0078D4]1A p-3 rounded-lg border border-[#0078D4]33">
                  <p className="text-sm text-[#0078D4]">Adding equipment to:</p>
                  <p className="font-semibold text-blue-800">{selectedProperty.name}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600">Type *</Label>
                  <Select
                    value={newEquipment.category}
                    onValueChange={(value) => setNewEquipment({
                      ...newEquipment,
                      category: value,
                      brand: "",
                      model: "",
                      customBrand: "",
                      customModel: "",
                    })}
                  >
                    <SelectTrigger data-testid="select-equipment-type">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PM_EQUIPMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Application *</Label>
                  <Select
                    value={newEquipment.application}
                    onValueChange={(value) => setNewEquipment({ ...newEquipment, application: value })}
                  >
                    <SelectTrigger data-testid="select-equipment-application">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PM_EQUIPMENT_APPLICATIONS.map((app) => (
                        <SelectItem key={app} value={app}>{app}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600">Brand *</Label>
                  {newEquipment.brand === "Other" ? (
                    <div className="flex gap-1">
                      <Input
                        placeholder="Type brand..."
                        value={newEquipment.customBrand}
                        onChange={(e) => setNewEquipment({ ...newEquipment, customBrand: e.target.value })}
                        data-testid="input-custom-brand"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setNewEquipment({ ...newEquipment, brand: "", customBrand: "" })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={newEquipment.brand}
                      onValueChange={(value) => setNewEquipment({ ...newEquipment, brand: value })}
                      disabled={!newEquipment.category}
                    >
                      <SelectTrigger data-testid="select-equipment-brand">
                        <SelectValue placeholder="Select brand..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getEquipmentBrands().map((brand) => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Model *</Label>
                  {newEquipment.model === "Other" ? (
                    <div className="flex gap-1">
                      <Input
                        placeholder="Type model..."
                        value={newEquipment.customModel}
                        onChange={(e) => setNewEquipment({ ...newEquipment, customModel: e.target.value })}
                        data-testid="input-custom-model"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setNewEquipment({ ...newEquipment, model: "", customModel: "" })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={newEquipment.model}
                      onValueChange={(value) => setNewEquipment({ ...newEquipment, model: value })}
                      disabled={!newEquipment.category}
                    >
                      <SelectTrigger data-testid="select-equipment-model">
                        <SelectValue placeholder="Select model..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getEquipmentModels().map((model) => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-600">Notes (Optional)</Label>
                <Textarea
                  placeholder="Any additional notes about this equipment..."
                  value={newEquipment.notes}
                  onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })}
                  rows={2}
                  data-testid="input-equipment-notes"
                />
              </div>

              {serviceTypes.length > 0 && newEquipment.category && (
                <div className="bg-[#22D69A]1A p-3 rounded-lg border border-[#22D69A]33 text-sm">
                  <div className="flex items-center gap-2 text-[#22D69A] font-medium mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    PM Schedule will be created
                  </div>
                  <p className="text-[#22D69A] text-xs">
                    A preventative maintenance schedule will be automatically created for this {newEquipment.category.toLowerCase()}.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setAddEquipmentOpen(false);
                resetEquipmentForm();
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddEquipment}
                disabled={
                  !newEquipment.category ||
                  !newEquipment.application ||
                  (!newEquipment.brand && !newEquipment.customBrand) ||
                  (!newEquipment.model && !newEquipment.customModel) ||
                  (newEquipment.brand === "Other" && !newEquipment.customBrand) ||
                  (newEquipment.model === "Other" && !newEquipment.customModel) ||
                  addEquipmentMutation.isPending
                }
                data-testid="button-add-equipment-submit"
              >
                {addEquipmentMutation.isPending ? 'Adding...' : 'Add Equipment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
