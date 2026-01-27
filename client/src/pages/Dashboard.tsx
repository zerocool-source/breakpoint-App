import { useState } from "react";
import { 
  Activity, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  Receipt,
  Users,
  Wrench,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Bell,
  DollarSign,
  Loader2,
  Search,
  Building2,
  ChevronDown,
  User,
  Beaker,
  ClipboardList
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";

interface Property {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  customerId?: string | null;
  customerName?: string | null;
}

interface OpenEmergency {
  id: string;
  propertyName: string;
  submittedByName: string;
  submitterRole: string;
  priority: string;
  description: string;
  createdAt: string;
}

interface DashboardData {
  metrics: {
    estimates: {
      draft: number;
      pendingApproval: number;
      approved: number;
      scheduled: number;
      completed: number;
      readyToInvoice: number;
      invoiced: number;
      total: number;
    };
    values: {
      total: number;
      pendingApproval: number;
      readyToInvoice: number;
      scheduled: number;
    };
    serviceRepairs: {
      pending: number;
      inProgress: number;
      total: number;
    };
    technicians: {
      repairTechs: number;
      repairForemen: number;
      supervisors: number;
      total: number;
    };
    alerts: {
      urgent: number;
      active: number;
      total: number;
    };
    emergencies: {
      open: number;
      pendingReview: number;
      inProgress: number;
      total: number;
      recentOpen: OpenEmergency[];
    };
  };
  recentActivity: Array<{
    type: string;
    id: string;
    title: string;
    property: string;
    status: string;
    amount: number;
    timestamp: string;
  }>;
  urgentItems: Array<{
    type: string;
    id: string;
    title: string;
    description: string;
    severity: string;
    property: string;
  }>;
  summary: {
    needsScheduling: number;
    needsInvoicing: number;
    pendingApprovals: number;
    activeRepairs: number;
  };
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Search state
  const [estimateSearch, setEstimateSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [serviceRepairSearch, setServiceRepairSearch] = useState("");

  // Property dropdown state
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyTab, setPropertyTab] = useState("profile");

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard/overview"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/overview");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/alerts/sync", { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync alerts");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/overview"] });
      toast({
        title: "Sync Complete",
        description: data.message || `Synced ${data.syncedCount} alerts from Pool Brain`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync alerts",
        variant: "destructive",
      });
    },
  });

  // Fetch properties for dropdown
  const { data: propertiesData } = useQuery<Property[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      // Transform customers to properties format
      return (data.customers || []).map((c: any) => ({
        id: c.id,
        name: c.displayName || c.name || "Unknown",
        address: c.billingAddress || c.address,
        city: c.city,
        state: c.state,
        customerId: c.id,
        customerName: c.displayName || c.name,
      }));
    },
  });

  const properties = propertiesData || [];

  // Search handlers
  const handleEstimateSearch = () => {
    if (!estimateSearch.trim()) return;
    navigate(`/estimates?search=${encodeURIComponent(estimateSearch.trim())}`);
  };

  const handleInvoiceSearch = () => {
    if (!invoiceSearch.trim()) return;
    navigate(`/invoices?search=${encodeURIComponent(invoiceSearch.trim())}`);
  };

  const handleServiceRepairSearch = () => {
    if (!serviceRepairSearch.trim()) return;
    navigate(`/service-repairs?search=${encodeURIComponent(serviceRepairSearch.trim())}`);
  };

  const metrics = dashboardData?.metrics;
  const summary = dashboardData?.summary;
  const recentActivity = dashboardData?.recentActivity || [];
  const urgentItems = dashboardData?.urgentItems || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      pending_approval: "bg-[#FF8000]1A text-[#D35400]",
      approved: "bg-[#22D69A]1A text-[#22D69A]",
      scheduled: "bg-[#0078D4]1A text-[#0078D4]",
      completed: "bg-[#0078D41A] text-sky-700",
      ready_to_invoice: "bg-[#17BEBB]1A text-[#0D9488]",
      invoiced: "bg-[#22D69A]1A text-[#22D69A]",
      pending: "bg-[#FF8000]1A text-[#D35400]",
      open: "bg-[#0078D4]1A text-[#0078D4]",
      in_progress: "bg-[#0078D41A] text-sky-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-[#0078D4]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1E293B]">Overview</h1>
            <p className="text-[#64748B] text-sm">Real-time business intelligence dashboard</p>
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2 bg-[#0078D4] hover:bg-[#0078D4]/90"
            data-testid="button-sync-poolbrain"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? "Syncing..." : "Sync Pool Brain"}
          </Button>
        </div>

        {/* Search Section */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4">
              {/* Estimate Search */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Search Estimate #</label>
                <div className="relative">
                  <Input
                    placeholder="e.g. 26-00001"
                    value={estimateSearch}
                    onChange={(e) => setEstimateSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEstimateSearch()}
                    className="pr-10"
                    data-testid="input-search-estimate"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={handleEstimateSearch}
                    data-testid="button-search-estimate"
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>

              {/* Invoice Search */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Search Invoice #</label>
                <div className="relative">
                  <Input
                    placeholder="e.g. INV-001"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvoiceSearch()}
                    className="pr-10"
                    data-testid="input-search-invoice"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={handleInvoiceSearch}
                    data-testid="button-search-invoice"
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>

              {/* Service Repair Search */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Search Service Repair #</label>
                <div className="relative">
                  <Input
                    placeholder="e.g. SR-001"
                    value={serviceRepairSearch}
                    onChange={(e) => setServiceRepairSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleServiceRepairSearch()}
                    className="pr-10"
                    data-testid="input-search-service-repair"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={handleServiceRepairSearch}
                    data-testid="button-search-service-repair"
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>

              {/* Property Dropdown */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Search Property</label>
                <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={propertyOpen}
                      className="w-full justify-between font-normal"
                      data-testid="button-property-dropdown"
                    >
                      {selectedProperty ? (
                        <span className="truncate">{selectedProperty.name}</span>
                      ) : (
                        <span className="text-slate-400">Select property...</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search properties..." />
                      <CommandList>
                        <CommandEmpty>No properties found.</CommandEmpty>
                        <CommandGroup>
                          {properties.map((property) => (
                            <CommandItem
                              key={property.id}
                              value={property.name}
                              onSelect={() => {
                                setSelectedProperty(property);
                                setPropertyOpen(false);
                                setPropertyTab("profile");
                              }}
                              data-testid={`property-option-${property.id}`}
                            >
                              <Building2 className="mr-2 h-4 w-4 text-slate-400" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{property.name}</p>
                                {property.address && (
                                  <p className="text-xs text-slate-500 truncate">{property.address}</p>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Details Section */}
        {selectedProperty && (
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#0078D4]/10">
                    <Building2 className="w-5 h-5 text-[#0078D4]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selectedProperty.name}</CardTitle>
                    {selectedProperty.address && (
                      <CardDescription>{selectedProperty.address}</CardDescription>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProperty(null)}
                  className="text-slate-500"
                  data-testid="button-close-property"
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={propertyTab} onValueChange={setPropertyTab}>
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="profile" className="gap-2" data-testid="tab-profile">
                    <User className="w-4 h-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="repairs" className="gap-2" data-testid="tab-repairs">
                    <Wrench className="w-4 h-4" />
                    Repairs
                  </TabsTrigger>
                  <TabsTrigger value="service" className="gap-2" data-testid="tab-service">
                    <ClipboardList className="w-4 h-4" />
                    Service
                  </TabsTrigger>
                  <TabsTrigger value="chemical" className="gap-2" data-testid="tab-chemical">
                    <Beaker className="w-4 h-4" />
                    Chemical
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Customer Name</p>
                      <p className="font-medium text-slate-900">{selectedProperty.customerName || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Address</p>
                      <p className="font-medium text-slate-900">{selectedProperty.address || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">City</p>
                      <p className="font-medium text-slate-900">{selectedProperty.city || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">State</p>
                      <p className="font-medium text-slate-900">{selectedProperty.state || "-"}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="repairs" className="space-y-4">
                  <div className="text-center py-8 text-slate-500">
                    <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">Repair History</p>
                    <p className="text-sm">Select a property to view repair records</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => navigate(`/estimates?property=${encodeURIComponent(selectedProperty.name)}`)}
                      data-testid="button-view-property-repairs"
                    >
                      View All Repairs
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="service" className="space-y-4">
                  <div className="text-center py-8 text-slate-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">Service History</p>
                    <p className="text-sm">Service records for this property</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => navigate(`/service-repairs?property=${encodeURIComponent(selectedProperty.name)}`)}
                      data-testid="button-view-property-service"
                    >
                      View Service Records
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="chemical" className="space-y-4">
                  <div className="text-center py-8 text-slate-500">
                    <Beaker className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">Chemical Orders</p>
                    <p className="text-sm">Chemical order history for this property</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      data-testid="button-view-property-chemical"
                    >
                      View Chemical Orders
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-[#FF8000]/50 transition-all border-l-4 border-l-[#FF8000]"
            onClick={() => navigate("/estimates")}
            data-testid="card-pending-approvals"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Pending Approvals</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{summary?.pendingApprovals || 0}</p>
                  <p className="text-sm text-[#D35400]">{formatCurrency(metrics?.values.pendingApproval || 0)}</p>
                </div>
                <div className="p-3 rounded-full bg-[#FF8000]/10">
                  <Clock className="w-6 h-6 text-[#D35400]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md hover:border-[#0078D4]/50 transition-all border-l-4 border-l-[#0078D4]"
            onClick={() => navigate("/estimates")}
            data-testid="card-needs-scheduling"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Needs Scheduling</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{summary?.needsScheduling || 0}</p>
                  <p className="text-sm text-[#0078D4]">Approved jobs awaiting</p>
                </div>
                <div className="p-3 rounded-full bg-[#0078D4]/10">
                  <Calendar className="w-6 h-6 text-[#0078D4]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md hover:border-[#17BEBB]/50 transition-all border-l-4 border-l-#17BEBB"
            onClick={() => navigate("/estimates")}
            data-testid="card-ready-to-invoice"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Ready to Invoice</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{summary?.needsInvoicing || 0}</p>
                  <p className="text-sm text-[#0D9488]">{formatCurrency(metrics?.values.readyToInvoice || 0)}</p>
                </div>
                <div className="p-3 rounded-full bg-[#17BEBB]1A">
                  <Receipt className="w-6 h-6 text-[#0D9488]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md hover:border-[#60A5FA]/50 transition-all border-l-4 border-l-[#60A5FA]"
            onClick={() => navigate("/tech-ops")}
            data-testid="card-active-repairs"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Active Repairs</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{summary?.activeRepairs || 0}</p>
                  <p className="text-sm text-[#60A5FA]">Service repairs in progress</p>
                </div>
                <div className="p-3 rounded-full bg-[#60A5FA]/10">
                  <Wrench className="w-6 h-6 text-[#60A5FA]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {(metrics?.emergencies?.open ?? 0) > 0 && (
          <Card className="border-l-4 border-l-red-500" data-testid="card-emergencies">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Open Emergencies
                  <Badge className="bg-red-100 text-red-700 ml-2">{metrics?.emergencies?.open ?? 0}</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/emergencies")} className="text-red-600">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {metrics?.emergencies?.recentOpen?.map((emergency, index) => (
                  <div 
                    key={emergency.id}
                    className="p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => navigate("/emergencies")}
                    data-testid={`emergency-card-${index}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-[#1E293B] truncate flex-1">{emergency.propertyName}</span>
                      {emergency.priority === "critical" && (
                        <Badge className="bg-red-600 text-white text-[10px] shrink-0">Critical</Badge>
                      )}
                      {emergency.priority === "high" && (
                        <Badge className="bg-[#FF8000]1A text-[#D35400] text-[10px] shrink-0">High</Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] line-clamp-2 mb-2">{emergency.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Users className="w-3 h-3" />
                        <span>{emergency.submittedByName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="capitalize">{emergency.submitterRole?.replace(/_/g, " ")}</span>
                      </div>
                      {emergency.createdAt && (
                        <span className="text-red-500 font-medium">
                          {formatDistanceToNow(new Date(emergency.createdAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#0078D4]" />
                    Estimate Pipeline
                  </CardTitle>
                  <CardDescription>Job estimates by status</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/estimates")} className="text-[#60A5FA]">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="text-sm text-[#1E293B]">Draft</span>
                  </div>
                  <Badge variant="secondary">{metrics?.estimates.draft || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#FF8000]1A hover:bg-[#FF8000]1A cursor-pointer" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#FF8000]"></div>
                    <span className="text-sm text-[#1E293B]">Pending Approval</span>
                  </div>
                  <Badge className="bg-[#FF8000]1A text-[#D35400]">{metrics?.estimates.pendingApproval || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#22D69A]1A hover:bg-[#22D69A]1A cursor-pointer" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#22D69A]"></div>
                    <span className="text-sm text-[#1E293B]">Approved</span>
                  </div>
                  <Badge className="bg-[#22D69A]1A text-[#22D69A]">{metrics?.estimates.approved || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0078D4]1A hover:bg-[#0078D4]1A cursor-pointer" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#0078D4]"></div>
                    <span className="text-sm text-[#1E293B]">Scheduled</span>
                  </div>
                  <Badge className="bg-[#0078D4]1A text-[#0078D4]">{metrics?.estimates.scheduled || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 hover:bg-[#17BEBB]1A cursor-pointer" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#17BEBB]"></div>
                    <span className="text-sm text-[#1E293B]">Ready to Invoice</span>
                  </div>
                  <Badge className="bg-[#17BEBB]1A text-[#0D9488]">{metrics?.estimates.readyToInvoice || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#22D69A]" />
                    Financial Summary
                  </CardTitle>
                  <CardDescription>Values across pipeline stages</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-r from-[#0078D4]/5 to-[#60A5FA]/5 border border-[#0078D4]/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#64748B]">Total Pipeline Value</span>
                    <span className="text-2xl font-bold text-[#0078D4]">{formatCurrency(metrics?.values.total || 0)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-[#FF8000]1A text-center">
                    <p className="text-xs text-[#64748B]">Pending Approval</p>
                    <p className="text-lg font-semibold text-[#D35400]">{formatCurrency(metrics?.values.pendingApproval || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0078D4]1A text-center">
                    <p className="text-xs text-[#64748B]">Scheduled</p>
                    <p className="text-lg font-semibold text-[#0078D4]">{formatCurrency(metrics?.values.scheduled || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 text-center">
                    <p className="text-xs text-[#64748B]">Ready to Invoice</p>
                    <p className="text-lg font-semibold text-[#0D9488]">{formatCurrency(metrics?.values.readyToInvoice || 0)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#60A5FA]" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest estimates and service repairs</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {recentActivity.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[#64748B]">
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((item, index) => (
                      <div 
                        key={`${item.type}-${item.id}-${index}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] hover:border-[#60A5FA]/50 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => navigate(item.type === "estimate" ? "/estimates" : "/service-repairs")}
                        data-testid={`activity-item-${item.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${item.type === "estimate" ? "bg-[#0078D4]/10" : "bg-[#FF8000]/10"}`}>
                            {item.type === "estimate" ? (
                              <FileText className="w-4 h-4 text-[#0078D4]" />
                            ) : (
                              <Wrench className="w-4 h-4 text-[#D35400]" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1E293B]">{item.title}</p>
                            <p className="text-xs text-[#64748B]">{item.property}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(item.status)}>{item.status?.replace(/_/g, " ")}</Badge>
                          {item.amount > 0 && (
                            <span className="text-sm font-medium text-[#1E293B]">{formatCurrency(item.amount)}</span>
                          )}
                          {item.timestamp && (
                            <span className="text-xs text-[#94A3B8]">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#D35400]" />
                Urgent Items
              </CardTitle>
              <CardDescription>Requires immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {urgentItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#64748B]">
                    <CheckCircle2 className="w-12 h-12 mb-2 text-[#22D69A]" />
                    <p>All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {urgentItems.map((item, index) => (
                      <div 
                        key={`${item.type}-${item.id}-${index}`}
                        className="p-3 rounded-lg border border-[#E2E8F0] hover:border-[#FF8000]/50 transition-all cursor-pointer"
                        onClick={() => {
                          if (item.type === "ready_to_invoice" || item.type === "needs_scheduling") {
                            navigate("/estimates");
                          }
                        }}
                        data-testid={`urgent-item-${item.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-full ${
                            item.severity === "warning" ? "bg-[#FF8000]1A" : 
                            item.severity === "info" ? "bg-[#17BEBB]1A" : "bg-red-100"
                          }`}>
                            {item.type === "alert" ? (
                              <Bell className={`w-3 h-3 ${
                                item.severity === "warning" ? "text-[#D35400]" : "text-red-600"
                              }`} />
                            ) : item.type === "ready_to_invoice" ? (
                              <Receipt className="w-3 h-3 text-[#0D9488]" />
                            ) : (
                              <Calendar className="w-3 h-3 text-[#D35400]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1E293B] truncate">{item.title}</p>
                            <p className="text-xs text-[#64748B] truncate">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/tech-ops")} data-testid="card-tech-ops">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#0078D4]/10">
                  <Users className="w-5 h-5 text-[#0078D4]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">Tech Ops</p>
                  <p className="text-xs text-[#64748B]">{metrics?.technicians.total || 0} technicians</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/service-repairs")} data-testid="card-repair-queue">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#FF8000]/10">
                  <Wrench className="w-5 h-5 text-[#D35400]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">Repair Queue</p>
                  <p className="text-xs text-[#64748B]">{metrics?.serviceRepairs.pending || 0} pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/estimates")} data-testid="card-estimates">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#22D69A]1A">
                  <FileText className="w-5 h-5 text-[#22D69A]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">Estimates</p>
                  <p className="text-xs text-[#64748B]">{metrics?.estimates.total || 0} total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all" data-testid="card-alerts">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Bell className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">Alerts</p>
                  <p className="text-xs text-[#64748B]">{metrics?.alerts.urgent || 0} urgent, {metrics?.alerts.active || 0} active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
