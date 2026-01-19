import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, startOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wrench, Loader2, AlertCircle, CheckCircle2, Clock, Search,
  RefreshCw, Building2, User, Calendar, DollarSign, Percent,
  FileText, MapPin, Phone, Mail, ChevronDown, Archive, Eye, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface EnrichedAlert {
  alertId: string;
  poolId: string;
  poolName: string;
  customerId: string | null;
  customerName: string;
  address: string;
  phone: string;
  email: string;
  contact: string;
  notes: string;
  message: string;
  type: string;
  severity: string;
  status: string;
  createdAt: string;
  techName?: string;
  techId?: number;
}

interface TechOpsEntry {
  id: string;
  entryType: string;
  propertyId: string;
  propertyName: string;
  technicianId: string | null;
  technicianName: string | null;
  description: string | null;
  notes: string | null;
  status: string;
  partsCost: number;
  createdAt: string;
  completedAt: string | null;
  commissionPercent?: number;
  commissionAmount?: number;
}

interface Technician {
  id: string;
  name: string;
  commissionPercent: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function RepairsUnified() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("repairs-needed");
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ percent: number; amount: number }>({ percent: 0, amount: 0 });

  const { data: alertsData = { alerts: [] }, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ["enrichedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/enriched");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
  });

  const { data: completedData = { completedIds: [] } } = useQuery({
    queryKey: ["completedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/completed");
      if (!res.ok) throw new Error("Failed to fetch completed");
      return res.json();
    },
  });

  const { data: techOpsData = [], isLoading: techOpsLoading } = useQuery<TechOpsEntry[]>({
    queryKey: ["tech-ops-service-repairs"],
    queryFn: async () => {
      const res = await fetch("/api/tech-ops?entryType=service_repairs");
      if (!res.ok) throw new Error("Failed to fetch service repairs");
      return res.json();
    },
  });

  const { data: techniciansData = [] } = useQuery<Technician[]>({
    queryKey: ["technicians"],
    queryFn: async () => {
      const res = await fetch("/api/technicians");
      if (!res.ok) throw new Error("Failed to fetch technicians");
      return res.json();
    },
  });

  const completedIds = new Set<string>((completedData.completedIds || []).map(String));

  const markCompleteMutation = useMutation({
    mutationFn: async ({ alertId, completed }: { alertId: string; completed: boolean }) => {
      if (completed) {
        const res = await fetch(`/api/alerts/${alertId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: "repair" }),
        });
        if (!res.ok) throw new Error("Failed to mark complete");
        return res.json();
      } else {
        const res = await fetch(`/api/alerts/${alertId}/complete`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to unmark");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["completedAlerts"] });
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ id, commissionPercent, commissionAmount }: { id: string; commissionPercent: number; commissionAmount: number }) => {
      const res = await fetch(`/api/tech-ops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionPercent, commissionAmount }),
      });
      if (!res.ok) throw new Error("Failed to update commission");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops-service-repairs"] });
      toast({ title: "Commission updated successfully" });
      setEditingCommission(null);
    },
    onError: () => {
      toast({ title: "Failed to update commission", variant: "destructive" });
    },
  });

  const allAlerts: EnrichedAlert[] = alertsData.alerts || [];

  const isRepairAlert = (alert: EnrichedAlert): boolean => {
    const msgLower = alert.message.toLowerCase();
    return (
      alert.type === "IssueReport" ||
      msgLower.includes("repair") ||
      msgLower.includes("broken") ||
      msgLower.includes("fix") ||
      msgLower.includes("replace") ||
      msgLower.includes("leak") ||
      msgLower.includes("pump") ||
      msgLower.includes("filter") ||
      msgLower.includes("heater")
    );
  };

  const repairAlerts = allAlerts.filter(isRepairAlert).filter(a => a.status === "Active");
  const pendingRepairs = repairAlerts.filter(a => !completedIds.has(String(a.alertId)));
  const resolvedRepairs = repairAlerts.filter(a => completedIds.has(String(a.alertId)));

  const filteredRepairAlerts = useMemo(() => {
    let filtered = showCompleted ? repairAlerts : pendingRepairs;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.customerName.toLowerCase().includes(term) ||
        a.poolName.toLowerCase().includes(term) ||
        a.message.toLowerCase().includes(term)
      );
    }
    if (propertyFilter !== "all") {
      filtered = filtered.filter(a => a.customerName === propertyFilter);
    }
    if (technicianFilter !== "all") {
      filtered = filtered.filter(a => a.techName === technicianFilter);
    }
    return filtered.sort((a, b) => {
      const aCompleted = completedIds.has(String(a.alertId)) ? 1 : 0;
      const bCompleted = completedIds.has(String(b.alertId)) ? 1 : 0;
      if (aCompleted !== bCompleted) return aCompleted - bCompleted;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [repairAlerts, pendingRepairs, showCompleted, searchTerm, propertyFilter, technicianFilter, completedIds]);

  const serviceRepairsWithCommission = useMemo(() => {
    return techOpsData.map(entry => {
      const tech = techniciansData.find(t => t.id === entry.technicianId);
      const commissionPercent = entry.commissionPercent ?? tech?.commissionPercent ?? 10;
      const commissionAmount = entry.commissionAmount ?? Math.round((entry.partsCost * commissionPercent) / 100);
      return { ...entry, commissionPercent, commissionAmount };
    });
  }, [techOpsData, techniciansData]);

  const filteredServiceRepairs = useMemo(() => {
    let filtered = serviceRepairsWithCommission;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.propertyName.toLowerCase().includes(term) ||
        (r.description?.toLowerCase().includes(term) ?? false)
      );
    }
    if (propertyFilter !== "all") {
      filtered = filtered.filter(r => r.propertyName === propertyFilter);
    }
    if (technicianFilter !== "all") {
      filtered = filtered.filter(r => r.technicianName === technicianFilter);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [serviceRepairsWithCommission, searchTerm, propertyFilter, technicianFilter]);

  const uniqueProperties = useMemo(() => {
    const props = new Set<string>();
    repairAlerts.forEach(a => props.add(a.customerName));
    serviceRepairsWithCommission.forEach(r => props.add(r.propertyName));
    return Array.from(props).sort();
  }, [repairAlerts, serviceRepairsWithCommission]);

  const uniqueTechnicians = useMemo(() => {
    const techs = new Set<string>();
    repairAlerts.forEach(a => a.techName && techs.add(a.techName));
    serviceRepairsWithCommission.forEach(r => r.technicianName && techs.add(r.technicianName));
    return Array.from(techs).sort();
  }, [repairAlerts, serviceRepairsWithCommission]);

  const totalSubmissions = repairAlerts.length + serviceRepairsWithCommission.length;
  const pendingCount = pendingRepairs.length;
  const resolvedCount = resolvedRepairs.length + serviceRepairsWithCommission.filter(r => r.status === 'completed').length;

  const totalRepairRevenue = filteredServiceRepairs.reduce((sum, r) => sum + (r.partsCost || 0), 0);
  const totalCommissions = filteredServiceRepairs.reduce((sum, r) => sum + (r.commissionAmount || 0), 0);
  const netRevenue = totalRepairRevenue - totalCommissions;

  const getSeverityColor = (severity: string) => {
    const upper = severity.toUpperCase();
    if (upper === "URGENT") return "bg-red-500/20 text-red-400 border-red-500/50";
    if (upper.includes("HIGH")) return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    if (upper.includes("MEDIUM")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    return "bg-blue-500/20 text-blue-400 border-blue-500/50";
  };

  const handleStartEdit = (entry: TechOpsEntry & { commissionPercent: number; commissionAmount: number }) => {
    setEditingCommission(entry.id);
    setEditValues({ percent: entry.commissionPercent, amount: entry.commissionAmount });
  };

  const handleSaveCommission = (id: string) => {
    updateCommissionMutation.mutate({
      id,
      commissionPercent: editValues.percent,
      commissionAmount: editValues.amount,
    });
  };

  const handlePercentChange = (percent: number, partsCost: number) => {
    setEditValues({
      percent,
      amount: Math.round((partsCost * percent) / 100),
    });
  };

  const isLoading = alertsLoading || techOpsLoading;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800" data-testid="text-heading-repairs">Repairs Center</h1>
              <p className="text-slate-500 text-sm">Manage repair requests and completed service repairs</p>
            </div>
          </div>
          <Button onClick={() => { refetchAlerts(); queryClient.invalidateQueries({ queryKey: ["tech-ops-service-repairs"] }); }} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalSubmissions}</p>
                <p className="text-sm text-slate-500">Total Submissions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
                <p className="text-sm text-slate-500">Pending / Unresolved</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{resolvedCount}</p>
                <p className="text-sm text-slate-500">Completed / Resolved</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search repairs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-repairs"
            />
          </div>
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-[180px]" data-testid="filter-property">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {uniqueProperties.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
            <SelectTrigger className="w-[180px]" data-testid="filter-technician">
              <SelectValue placeholder="All Technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {uniqueTechnicians.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-0">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="repairs-needed" data-testid="tab-repairs-needed">
                  Repairs Needed ({pendingRepairs.length})
                </TabsTrigger>
                <TabsTrigger value="service-repairs" data-testid="tab-service-repairs">
                  Service Repairs ({serviceRepairsWithCommission.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  <TabsContent value="repairs-needed" className="mt-0">
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={!showCompleted ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowCompleted(false)}
                        className="gap-2"
                      >
                        <EyeOff className="w-4 h-4" />
                        Pending ({pendingRepairs.length})
                      </Button>
                      <Button
                        variant={showCompleted ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowCompleted(true)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        All ({repairAlerts.length})
                      </Button>
                    </div>
                    <ScrollArea className="max-h-[500px]">
                      {filteredRepairAlerts.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No pending repairs</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredRepairAlerts.map((alert) => {
                            const isCompleted = completedIds.has(String(alert.alertId));
                            return (
                              <div
                                key={alert.alertId}
                                className={cn(
                                  "p-4 rounded-lg border transition-all",
                                  isCompleted
                                    ? "bg-emerald-50 border-emerald-200 opacity-70"
                                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                                )}
                                data-testid={`repair-card-${alert.alertId}`}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={isCompleted}
                                    onCheckedChange={(checked) => {
                                      markCompleteMutation.mutate({ alertId: String(alert.alertId), completed: !!checked });
                                    }}
                                    className="mt-1"
                                    data-testid={`checkbox-${alert.alertId}`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className={cn("font-semibold", isCompleted && "line-through text-slate-400")}>
                                        {alert.poolName}
                                      </h3>
                                      <Badge className={cn("text-xs", getSeverityColor(alert.severity))}>
                                        {alert.severity}
                                      </Badge>
                                      {isCompleted && (
                                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">Resolved</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-600 flex items-center gap-1 mb-2">
                                      <Building2 className="w-3 h-3" />
                                      {alert.customerName}
                                    </p>
                                    <p className={cn("text-sm", isCompleted ? "text-slate-400" : "text-slate-700")}>
                                      {alert.message}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                      {alert.techName && (
                                        <span className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {alert.techName}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(alert.createdAt), "MMM d, yyyy")}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="service-repairs" className="mt-0">
                    <ScrollArea className="max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead>Property</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Date Completed</TableHead>
                            <TableHead>Technician</TableHead>
                            <TableHead className="text-right">Repair Amount</TableHead>
                            <TableHead className="text-right">Commission %</TableHead>
                            <TableHead className="text-right">Commission Amount</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredServiceRepairs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                                No service repairs found
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {filteredServiceRepairs.map((repair) => (
                                <TableRow key={repair.id} data-testid={`service-repair-row-${repair.id}`}>
                                  <TableCell className="font-medium">{repair.propertyName}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">{repair.description || "—"}</TableCell>
                                  <TableCell>{repair.completedAt ? format(new Date(repair.completedAt), "MMM d, yyyy") : format(new Date(repair.createdAt), "MMM d, yyyy")}</TableCell>
                                  <TableCell>{repair.technicianName || "—"}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(repair.partsCost || 0)}</TableCell>
                                  <TableCell className="text-right">
                                    {editingCommission === repair.id ? (
                                      <Input
                                        type="number"
                                        value={editValues.percent}
                                        onChange={(e) => handlePercentChange(Number(e.target.value), repair.partsCost)}
                                        className="w-20 text-right"
                                        data-testid={`input-commission-percent-${repair.id}`}
                                      />
                                    ) : (
                                      <span
                                        className="cursor-pointer hover:text-blue-600 hover:underline"
                                        onClick={() => handleStartEdit(repair)}
                                        data-testid={`text-commission-percent-${repair.id}`}
                                      >
                                        {repair.commissionPercent}%
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {editingCommission === repair.id ? (
                                      <Input
                                        type="number"
                                        value={editValues.amount}
                                        onChange={(e) => setEditValues(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                        className="w-24 text-right"
                                        data-testid={`input-commission-amount-${repair.id}`}
                                      />
                                    ) : (
                                      <span
                                        className="cursor-pointer hover:text-blue-600 hover:underline"
                                        onClick={() => handleStartEdit(repair)}
                                        data-testid={`text-commission-amount-${repair.id}`}
                                      >
                                        {formatCurrency(repair.commissionAmount || 0)}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingCommission === repair.id ? (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveCommission(repair.id)}
                                          disabled={updateCommissionMutation.isPending}
                                          data-testid={`btn-save-commission-${repair.id}`}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingCommission(null)}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    ) : null}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-slate-100 font-semibold border-t-2">
                                <TableCell colSpan={4} className="text-right">Totals:</TableCell>
                                <TableCell className="text-right text-emerald-700">{formatCurrency(totalRepairRevenue)}</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right text-orange-600">{formatCurrency(totalCommissions)}</TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                              <TableRow className="bg-slate-50 font-semibold">
                                <TableCell colSpan={4} className="text-right">Net Revenue:</TableCell>
                                <TableCell colSpan={3} className="text-right text-blue-700 text-lg">{formatCurrency(netRevenue)}</TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </TabsContent>
                </>
              )}
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </AppLayout>
  );
}
