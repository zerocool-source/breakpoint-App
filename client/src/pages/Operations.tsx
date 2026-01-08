import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/layout/Sidebar";

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
  address?: string;
}

export default function Operations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: alertsData, isLoading } = useQuery<{ alerts: EnrichedAlert[] }>({
    queryKey: ["/api/alerts/enriched"],
  });

  const alerts = alertsData?.alerts || [];

  const alertTypes = useMemo(() => {
    const types = new Set<string>();
    alerts.forEach(a => {
      if (a.type) types.add(a.type);
    });
    return Array.from(types);
  }, [alerts]);

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

  const stats = useMemo(() => {
    const urgent = alerts.filter(a => a.type === "SystemIssue").length;
    const repairs = alerts.filter(a => 
      a.message?.toLowerCase().includes("repair") || 
      a.type?.toLowerCase().includes("repair")
    ).length;
    const properties = new Set(alerts.map(a => a.customerId)).size;
    return { total: alerts.length, urgent, repairs, properties };
  }, [alerts]);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Operations</h1>
              <p className="text-slate-500 text-sm">Manage repairs, issues, and service alerts</p>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6 overflow-auto">
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
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

            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Wrench className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.repairs}</p>
                    <p className="text-xs text-slate-500">Repairs Needed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.properties}</p>
                    <p className="text-xs text-slate-500">Properties Affected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-4">
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
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p>Loading operations data...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="text-lg font-medium">No alerts found</p>
              <p className="text-sm">All systems are operating normally</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-4">
                {Object.entries(groupedByProperty).map(([customerId, { customerName, alerts: propertyAlerts }]) => (
                  <Card key={customerId} className="bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <CardTitle className="text-lg">{customerName}</CardTitle>
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                            {propertyAlerts.length} {propertyAlerts.length === 1 ? "Alert" : "Alerts"}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="text-blue-600">
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
                                        : "bg-amber-100 text-amber-700 border-amber-300"
                                    }
                                  >
                                    <Wrench className="h-3 w-3 mr-1" />
                                    {alert.type}
                                  </Badge>
                                  <span className="text-xs text-slate-500">{alert.poolName}</span>
                                  {alert.pictures && alert.pictures.length > 0 && (
                                    <Button variant="link" size="sm" className="h-5 px-0 text-blue-600 text-xs gap-1">
                                      <Camera className="h-3 w-3" />
                                      {alert.pictures.length} Photos
                                    </Button>
                                  )}
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
                                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 text-xs"
                                  data-testid={`button-convert-estimate-${alert.alertId}`}
                                >
                                  <FileCheck className="h-3 w-3 mr-1" />
                                  Estimate
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700 text-xs"
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
        </div>
      </div>
    </div>
  );
}
