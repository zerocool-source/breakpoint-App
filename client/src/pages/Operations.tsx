import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Wrench, 
  Search, 
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileCheck,
  Camera,
  Building2,
  Filter,
  ChevronRight,
  Phone,
  Mail,
  X,
  User,
  ExternalLink,
  Image
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@/lib/queryClient";

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
  isRepairNeeded?: boolean;
  techNote?: string;
  techName?: string;
  techPhone?: string;
  techEmail?: string;
  techId?: string;
  pictures?: string[];
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
  notes?: string;
  rawAlert?: any;
}

export default function Operations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("repairs");
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [repairNotes, setRepairNotes] = useState<Record<string, string>>({});
  const [loadingPhotosFor, setLoadingPhotosFor] = useState<number | null>(null);
  const [cachedPhotos, setCachedPhotos] = useState<Record<number, string[]>>({});
  const queryClient = useQueryClient();

  const { data: alertsData, isLoading } = useQuery<{ alerts: EnrichedAlert[] }>({
    queryKey: ["/api/alerts/enriched"],
  });

  const { data: completedData } = useQuery<{ completedIds: string[] }>({
    queryKey: ["/api/alerts/completed"],
  });

  const completedIds = completedData?.completedIds || [];

  const dismissMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest("POST", `/api/alerts/${alertId}/complete`, { category: "repair" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/completed"] });
    },
  });

  const alerts = alertsData?.alerts || [];

  const alertTypes = useMemo(() => {
    const types = new Set<string>();
    alerts.forEach(a => {
      if (a.type) types.add(a.type);
    });
    return Array.from(types);
  }, [alerts]);

  const repairsNeededAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const isRepairAlert = alert.isRepairNeeded === true || 
        alert.type === "RepairNeeded" ||
        (alert.message || "").toLowerCase().includes("repair needed");
      
      const isNotDismissed = !completedIds.includes(String(alert.alertId));
      return isRepairAlert && isNotDismissed;
    });
  }, [alerts, completedIds]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = searchQuery === "" || 
        alert.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.poolName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.techName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === "all" || alert.type === typeFilter;
      const matchesStatus = statusFilter === "all" || alert.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [alerts, searchQuery, typeFilter, statusFilter]);

  const groupedByProperty = useMemo(() => {
    const grouped: Record<string, { customerName: string; alerts: EnrichedAlert[] }> = {};
    filteredAlerts.forEach(alert => {
      const key = String(alert.customerId);
      if (!grouped[key]) {
        grouped[key] = { customerName: alert.customerName, alerts: [] };
      }
      grouped[key].alerts.push(alert);
    });
    return grouped;
  }, [filteredAlerts]);

  const repairsGroupedByProperty = useMemo(() => {
    const grouped: Record<string, { customerName: string; alerts: EnrichedAlert[] }> = {};
    repairsNeededAlerts.forEach(alert => {
      const key = String(alert.customerId);
      if (!grouped[key]) {
        grouped[key] = { customerName: alert.customerName, alerts: [] };
      }
      grouped[key].alerts.push(alert);
    });
    return grouped;
  }, [repairsNeededAlerts]);

  const stats = useMemo(() => {
    const urgent = alerts.filter(a => a.type === "SystemIssue").length;
    const repairs = repairsNeededAlerts.length;
    const properties = new Set(alerts.map(a => a.customerId)).size;
    return { total: alerts.length, urgent, repairs, properties };
  }, [alerts, repairsNeededAlerts]);

  const handleViewPhotos = async (alertId: number) => {
    if (cachedPhotos[alertId]) {
      setSelectedPhotos(cachedPhotos[alertId]);
      setShowPhotoDialog(true);
      return;
    }
    
    setLoadingPhotosFor(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}/photos`);
      const data = await response.json();
      const photos = data.photos || [];
      setCachedPhotos(prev => ({ ...prev, [alertId]: photos }));
      setSelectedPhotos(photos);
      setShowPhotoDialog(true);
    } catch (error) {
      console.error("Error fetching photos:", error);
      setSelectedPhotos([]);
      setShowPhotoDialog(true);
    } finally {
      setLoadingPhotosFor(null);
    }
  };

  const handleDismissRepair = (alertId: number) => {
    dismissMutation.mutate(alertId);
  };

  const renderRepairCard = (alert: EnrichedAlert) => {
    const techNote = alert.techNote || "";
    const isLoadingPhotos = loadingPhotosFor === alert.alertId;

    return (
      <Card key={alert.alertId} className="bg-white border-l-4 border-l-red-500" data-testid={`repair-card-${alert.alertId}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-red-500 text-white hover:bg-red-600 gap-1">
                <Wrench className="h-3 w-3" />
                Repair Needed
              </Badge>
              <Button 
                variant="link" 
                size="sm" 
                className="text-[#2374AB] gap-1 p-0 h-auto"
                onClick={() => handleViewPhotos(alert.alertId)}
                disabled={isLoadingPhotos}
                data-testid={`button-view-photos-${alert.alertId}`}
              >
                <Camera className="h-4 w-4" />
                {isLoadingPhotos ? "Loading..." : "View Pictures"}
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-[#2374AB] text-white hover:bg-[#2374AB] border-[#2374AB]"
              onClick={() => handleDismissRepair(alert.alertId)}
              disabled={dismissMutation.isPending}
              data-testid={`button-dismiss-${alert.alertId}`}
            >
              DISMISS
            </Button>
          </div>

          {techNote && (
            <div className="mb-4">
              <p className="text-sm">
                <span className="font-semibold text-slate-700">Tech Note: </span>
                <span className="text-slate-600">{techNote}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#2374AB] text-white rounded-lg p-3 relative">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4" />
                <span className="text-xs font-medium">Contact Pool Tech</span>
              </div>
              <p className="font-semibold text-sm">{alert.techName || "Not assigned"}</p>
              {alert.techPhone && (
                <p className="text-xs flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {alert.techPhone}
                </p>
              )}
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="h-4 w-4 text-[#2374AB]33" />
              </div>
            </div>

            <div className="bg-[#2374AB] text-white rounded-lg p-3 relative">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-medium">Contact Customer</span>
              </div>
              <p className="font-semibold text-sm">{alert.customerName}</p>
              {alert.email && (
                <p className="text-xs flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {alert.email}
                </p>
              )}
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="h-4 w-4 text-[#2374AB]33" />
              </div>
            </div>

            <div className="bg-[#2374AB] text-white rounded-lg p-3 relative">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Schedule Visit</span>
              </div>
              <p className="font-semibold text-sm">{alert.poolName}</p>
              <p className="text-xs mt-1">
                {new Date(alert.createdAt).toLocaleDateString()}
              </p>
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="h-4 w-4 text-[#2374AB]33" />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <Textarea
              placeholder="Type notes here..."
              className="min-h-[60px] text-sm resize-none"
              value={repairNotes[alert.alertId] || ""}
              onChange={(e) => setRepairNotes(prev => ({ ...prev, [alert.alertId]: e.target.value }))}
              data-testid={`textarea-notes-${alert.alertId}`}
            />
            <p className="text-xs text-slate-400 text-right mt-1">Character limit 1000</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Operations</h1>
        <p className="text-slate-500 text-sm">Manage repairs, issues, and service alerts</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2374AB]1A rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-[#2374AB]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                  <p className="text-xs text-slate-500">Total Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.urgent}</p>
                  <p className="text-xs text-slate-500">System Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.repairs}</p>
                  <p className="text-xs text-red-500 font-medium">Repairs Needed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#22D69A]1A rounded-lg">
                  <Building2 className="h-5 w-5 text-[#22D69A]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.properties}</p>
                  <p className="text-xs text-slate-500">Properties Affected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger 
              value="repairs" 
              className="data-[state=active]:bg-red-500 data-[state=active]:text-white gap-2"
              data-testid="tab-repairs-needed"
            >
              <Wrench className="h-4 w-4" />
              Repairs Needed ({stats.repairs})
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-[#2374AB] data-[state=active]:text-white gap-2"
              data-testid="tab-all-alerts"
            >
              <AlertTriangle className="h-4 w-4" />
              All Alerts ({stats.total})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repairs" className="mt-4">
            {isLoading ? (
              <div className="text-center py-10 text-slate-400">
                <div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p>Loading repair alerts...</p>
              </div>
            ) : repairsNeededAlerts.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-[#22D69A]" />
                <p className="text-lg font-medium">No repairs needed</p>
                <p className="text-sm">All pools are in good condition</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-420px)]">
                <div className="space-y-4">
                  {Object.entries(repairsGroupedByProperty).map(([customerId, { customerName, alerts: propertyAlerts }]) => (
                    <div key={customerId} className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Building2 className="h-5 w-5 text-slate-600" />
                        <h3 className="font-semibold text-slate-800">{customerName}</h3>
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                          {propertyAlerts.length} {propertyAlerts.length === 1 ? "Repair" : "Repairs"}
                        </Badge>
                      </div>
                      {propertyAlerts.map(alert => renderRepairCard(alert))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by property, pool, tech, or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-operations"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Alert Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {alertTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-10 text-slate-400">
                <div className="animate-spin h-8 w-8 border-2 border-[#2374AB] border-t-transparent rounded-full mx-auto mb-4" />
                <p>Loading operations data...</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-[#22D69A]" />
                <p className="text-lg font-medium">No alerts found</p>
                <p className="text-sm">All systems are operating normally</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-460px)]">
                <div className="space-y-4">
                  {Object.entries(groupedByProperty).map(([customerId, { customerName, alerts: propertyAlerts }]) => (
                    <Card key={customerId} className="bg-white">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-[#2374AB]" />
                            <CardTitle className="text-lg">{customerName}</CardTitle>
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                              {propertyAlerts.length} {propertyAlerts.length === 1 ? "Alert" : "Alerts"}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm" className="text-[#2374AB]">
                            View Property <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {propertyAlerts.map((alert) => (
                            <div 
                              key={alert.alertId} 
                              className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        alert.type === "SystemIssue" 
                                          ? "bg-red-100 text-red-700 border-red-300" 
                                          : "bg-[#FF8000]1A text-[#FF8000] border-[#FF8000]"
                                      }
                                    >
                                      <Wrench className="h-3 w-3 mr-1" />
                                      {alert.type}
                                    </Badge>
                                    <span className="text-xs text-slate-500">{alert.poolName}</span>
                                    <Button 
                                      variant="link" 
                                      size="sm" 
                                      className="h-5 px-0 text-[#2374AB] text-xs gap-1"
                                      onClick={() => handleViewPhotos(alert.alertId)}
                                      disabled={loadingPhotosFor === alert.alertId}
                                    >
                                      <Camera className="h-3 w-3" />
                                      {loadingPhotosFor === alert.alertId ? "Loading..." : "Photos"}
                                    </Button>
                                  </div>
                                  
                                  <p className="text-sm font-medium text-slate-800 mb-1">
                                    {alert.message}
                                  </p>

                                  <div className="flex items-center gap-3 text-xs text-slate-500">
                                    {alert.techName && (
                                      <span>Tech: {alert.techName}</span>
                                    )}
                                    {alert.createdAt && (
                                      <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="bg-[#2374AB]1A text-[#2374AB] hover:bg-[#2374AB]1A border-[#2374AB]33 text-xs"
                                    data-testid={`button-convert-estimate-${alert.alertId}`}
                                  >
                                    <FileCheck className="h-3 w-3 mr-1" />
                                    Estimate
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="bg-[#22D69A] hover:bg-[#22D69A] text-xs"
                                    data-testid={`button-convert-job-${alert.alertId}`}
                                  >
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Job
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Repair Photos ({selectedPhotos.length})
            </DialogTitle>
          </DialogHeader>
          {selectedPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Camera className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">No Photos Available</h3>
              <p className="text-sm text-slate-500 max-w-md">
                No photos have been attached to this repair alert in Pool Brain. 
                Photos will appear here when technicians add them to the job.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              {selectedPhotos.map((url, index) => (
                <div key={index} className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
                  <img 
                    src={url} 
                    alt={`Repair photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='m21 15-5-5L5 21'/%3E%3C/svg%3E";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                    onClick={() => window.open(url, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
