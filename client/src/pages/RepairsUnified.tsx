import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, startOfDay } from "date-fns";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  FileText, MapPin, Phone, Mail, ChevronDown, Archive, Eye, EyeOff,
  XCircle, FileCheck, ImageIcon
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
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("repairs-needed");
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ percent: number; amount: number }>({ percent: 0, amount: 0 });
  
  const [declineModal, setDeclineModal] = useState<{ open: boolean; alert: EnrichedAlert | null; reason: string }>({
    open: false,
    alert: null,
    reason: "",
  });
  const [editModal, setEditModal] = useState<{ open: boolean; alert: EnrichedAlert | null }>({
    open: false,
    alert: null,
  });
  const [selectedServiceRepairs, setSelectedServiceRepairs] = useState<Set<string>>(new Set());

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

  const { data: photosData = { photos: [] }, isLoading: photosLoading } = useQuery<{ photos: Array<{ url: string; caption?: string }> }>({
    queryKey: ["alertPhotos", editModal.alert?.alertId],
    queryFn: async () => {
      if (!editModal.alert?.alertId) return { photos: [] };
      const res = await fetch(`/api/alerts/${editModal.alert.alertId}/photos`);
      if (!res.ok) return { photos: [] };
      return res.json();
    },
    enabled: editModal.open && !!editModal.alert?.alertId,
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

  const createEstimateMutation = useMutation({
    mutationFn: async (estimateData: any) => {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimateData),
      });
      if (!res.ok) throw new Error("Failed to create estimate");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({ title: "Estimate created successfully" });
      if (data.estimate?.id) {
        navigate(`/estimates/${data.estimate.id}`);
      }
    },
    onError: () => {
      toast({ title: "Failed to create estimate", variant: "destructive" });
    },
  });

  const declineRepairMutation = useMutation({
    mutationFn: async ({ alertId, reason }: { alertId: string; reason?: string }) => {
      const res = await fetch(`/api/alerts/${alertId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to decline repair");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrichedAlerts"] });
      toast({ title: "Repair request declined" });
      setDeclineModal({ open: false, alert: null, reason: "" });
    },
    onError: () => {
      toast({ title: "Failed to decline repair", variant: "destructive" });
    },
  });

  const convertToEstimateMutation = useMutation({
    mutationFn: async (repairIds: string[]) => {
      const selectedRepairs = filteredServiceRepairs.filter(r => repairIds.includes(r.id));
      if (selectedRepairs.length === 0) throw new Error("No repairs selected");
      
      const uniqueProperties = new Set(selectedRepairs.map(r => r.propertyId));
      if (uniqueProperties.size > 1) {
        throw new Error("MULTI_PROPERTY");
      }
      
      const firstRepair = selectedRepairs[0];
      const totalAmount = selectedRepairs.reduce((sum, r) => sum + (r.partsCost || 0), 0);
      
      const estimateData = {
        propertyId: firstRepair.propertyId,
        propertyName: firstRepair.propertyName,
        title: selectedRepairs.length === 1 
          ? `Service Repair - ${firstRepair.description || "Repair"}` 
          : `Service Repairs (${selectedRepairs.length} items)`,
        description: selectedRepairs.map(r => r.description).filter(Boolean).join("\n"),
        status: "draft",
        sourceType: "service_tech",
        serviceRepairCount: selectedRepairs.length,
        items: selectedRepairs.map((repair, idx) => ({
          lineNumber: idx + 1,
          productService: "Service Repair",
          description: repair.description || "Service repair work",
          quantity: 1,
          rate: (repair.partsCost || 0) / 100,
          amount: (repair.partsCost || 0) / 100,
          taxable: false,
        })),
        subtotal: totalAmount / 100,
        total: totalAmount / 100,
      };

      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimateData),
      });
      if (!res.ok) throw new Error("Failed to create estimate");
      const result = await res.json();
      
      const failedUpdates: string[] = [];
      for (const repairId of repairIds) {
        try {
          const updateRes = await fetch(`/api/tech-ops/${repairId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "converted" }),
          });
          if (!updateRes.ok) {
            failedUpdates.push(repairId);
          }
        } catch {
          failedUpdates.push(repairId);
        }
      }
      
      if (failedUpdates.length > 0) {
        console.warn(`Failed to mark ${failedUpdates.length} repairs as converted`);
      }
      
      return { ...result, convertedCount: repairIds.length - failedUpdates.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops-service-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      const count = selectedServiceRepairs.size;
      setSelectedServiceRepairs(new Set());
      toast({ title: `Estimate created from ${count} service repair${count !== 1 ? 's' : ''}` });
      if (data.estimate?.id) {
        navigate(`/estimates/${data.estimate.id}`);
      }
    },
    onError: (error: Error) => {
      if (error.message === "MULTI_PROPERTY") {
        toast({ 
          title: "Cannot combine repairs from different properties", 
          description: "Please select repairs from the same property only.",
          variant: "destructive" 
        });
      } else {
        toast({ title: "Failed to convert to estimate", variant: "destructive" });
      }
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

  const handleConvertToEstimate = (alert: EnrichedAlert) => {
    const estimateData = {
      propertyId: alert.customerId || alert.poolId,
      propertyName: alert.customerName,
      customerName: alert.customerName,
      customerEmail: alert.email,
      address: alert.address,
      title: `Repair Request - ${alert.poolName}`,
      description: alert.message,
      status: "draft",
      sourceType: "repair_tech",
      items: [{
        lineNumber: 1,
        productService: "Repair Service",
        description: alert.message,
        quantity: 1,
        rate: 0,
        amount: 0,
        taxable: false,
      }],
    };
    createEstimateMutation.mutate(estimateData);
  };

  const handleServiceRepairCheckbox = (repairId: string, checked: boolean) => {
    setSelectedServiceRepairs(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(repairId);
      } else {
        next.delete(repairId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const nonConvertedIds = filteredServiceRepairs
        .filter(r => r.status !== "converted")
        .map(r => r.id);
      setSelectedServiceRepairs(new Set(nonConvertedIds));
    } else {
      setSelectedServiceRepairs(new Set());
    }
  };

  const selectedTotal = useMemo(() => {
    return filteredServiceRepairs
      .filter(r => selectedServiceRepairs.has(r.id))
      .reduce((sum, r) => sum + (r.partsCost || 0), 0);
  }, [filteredServiceRepairs, selectedServiceRepairs]);

  const handleConvertSelectedToEstimate = () => {
    const ids = Array.from(selectedServiceRepairs);
    if (ids.length === 0) {
      toast({ title: "No repairs selected", variant: "destructive" });
      return;
    }
    convertToEstimateMutation.mutate(ids);
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
                                  "p-4 rounded-lg border transition-all cursor-pointer",
                                  isCompleted
                                    ? "bg-emerald-50 border-emerald-200 opacity-70"
                                    : "bg-slate-50 border-slate-200 hover:border-blue-300 hover:shadow-sm"
                                )}
                                data-testid={`repair-card-${alert.alertId}`}
                                onClick={() => setEditModal({ open: true, alert })}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={isCompleted}
                                    onCheckedChange={(checked) => {
                                      markCompleteMutation.mutate({ alertId: String(alert.alertId), completed: !!checked });
                                    }}
                                    className="mt-1"
                                    onClick={(e) => e.stopPropagation()}
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
                                    {!isCompleted && (
                                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                          onClick={(e) => { e.stopPropagation(); handleConvertToEstimate(alert); }}
                                          disabled={createEstimateMutation.isPending}
                                          data-testid={`btn-convert-estimate-${alert.alertId}`}
                                        >
                                          <FileCheck className="w-3 h-3" />
                                          Convert to Estimate
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                          onClick={(e) => { e.stopPropagation(); setDeclineModal({ open: true, alert, reason: "" }); }}
                                          data-testid={`btn-decline-${alert.alertId}`}
                                        >
                                          <XCircle className="w-3 h-3" />
                                          Decline
                                        </Button>
                                      </div>
                                    )}
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
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedServiceRepairs.size > 0 && 
                                  filteredServiceRepairs.filter(r => r.status !== "converted").length === selectedServiceRepairs.size}
                                onCheckedChange={handleSelectAll}
                                data-testid="checkbox-select-all"
                              />
                            </TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
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
                              <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                                No service repairs found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredServiceRepairs.map((repair) => (
                                <TableRow 
                                  key={repair.id} 
                                  data-testid={`service-repair-row-${repair.id}`}
                                  className={cn(repair.status === "converted" && "opacity-60 bg-slate-50")}
                                >
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedServiceRepairs.has(repair.id)}
                                      onCheckedChange={(checked) => handleServiceRepairCheckbox(repair.id, !!checked)}
                                      disabled={repair.status === "converted"}
                                      data-testid={`checkbox-service-${repair.id}`}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{repair.propertyName}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">{repair.description || "—"}</TableCell>
                                  <TableCell>
                                    {repair.status === "converted" ? (
                                      <Badge className="bg-purple-100 text-purple-700 text-xs">Converted</Badge>
                                    ) : repair.status === "completed" ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">Completed</Badge>
                                    ) : (
                                      <Badge className="bg-blue-100 text-blue-700 text-xs">Pending</Badge>
                                    )}
                                  </TableCell>
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
                              ))
                          )}
                          <TableRow className="bg-slate-100 font-semibold border-t-2" data-testid="totals-row">
                            <TableCell colSpan={6} className="text-right">Totals:</TableCell>
                            <TableCell className="text-right text-emerald-700" data-testid="text-total-revenue">{formatCurrency(totalRepairRevenue)}</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right text-orange-600" data-testid="text-total-commissions">{formatCurrency(totalCommissions)}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                          <TableRow className="bg-slate-50 font-semibold" data-testid="net-revenue-row">
                            <TableCell colSpan={6} className="text-right">Net Revenue:</TableCell>
                            <TableCell colSpan={3} className="text-right text-blue-700 text-lg" data-testid="text-net-revenue">{formatCurrency(netRevenue)}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    
                    {selectedServiceRepairs.size > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between" data-testid="selection-bar">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-800">
                            {selectedServiceRepairs.size} item{selectedServiceRepairs.size !== 1 ? 's' : ''} selected
                          </span>
                          <span className="text-blue-600">—</span>
                          <span className="font-bold text-blue-800" data-testid="text-selected-total">
                            Total: {formatCurrency(selectedTotal)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedServiceRepairs(new Set())}
                          >
                            Clear Selection
                          </Button>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={handleConvertSelectedToEstimate}
                            disabled={convertToEstimateMutation.isPending}
                            data-testid="btn-convert-selected"
                          >
                            {convertToEstimateMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <FileCheck className="w-4 h-4 mr-2" />
                            )}
                            Convert Selected to Estimate
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <Dialog open={declineModal.open} onOpenChange={(open) => !open && setDeclineModal({ open: false, alert: null, reason: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Repair Request</DialogTitle>
            <DialogDescription>
              {declineModal.alert && (
                <>
                  Are you sure you want to decline the repair request for <strong>{declineModal.alert.poolName}</strong> at <strong>{declineModal.alert.customerName}</strong>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Reason (optional)</label>
              <Textarea
                value={declineModal.reason}
                onChange={(e) => setDeclineModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter a reason for declining this repair request..."
                className="mt-1"
                data-testid="input-decline-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeclineModal({ open: false, alert: null, reason: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (declineModal.alert) {
                  declineRepairMutation.mutate({
                    alertId: String(declineModal.alert.alertId),
                    reason: declineModal.reason || undefined,
                  });
                }
              }}
              disabled={declineRepairMutation.isPending}
              data-testid="btn-confirm-decline"
            >
              {declineRepairMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModal.open} onOpenChange={(open) => !open && setEditModal({ open: false, alert: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Repair Request</DialogTitle>
            <DialogDescription>
              Review the details of this repair request before taking action.
            </DialogDescription>
          </DialogHeader>
          {editModal.alert && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Pool/Equipment</label>
                  <p className="text-sm text-slate-900 mt-1">{editModal.alert.poolName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Property</label>
                  <p className="text-sm text-slate-900 mt-1">{editModal.alert.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Severity</label>
                  <Badge className={cn(
                    "mt-1",
                    editModal.alert.severity === "URGENT" && "bg-red-100 text-red-700",
                    editModal.alert.severity === "HIGH" && "bg-orange-100 text-orange-700",
                    editModal.alert.severity === "NORMAL" && "bg-blue-100 text-blue-700"
                  )}>
                    {editModal.alert.severity}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Date Reported</label>
                  <p className="text-sm text-slate-900 mt-1">
                    {format(new Date(editModal.alert.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                {editModal.alert.techName && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Reported By</label>
                    <p className="text-sm text-slate-900 mt-1">{editModal.alert.techName}</p>
                  </div>
                )}
                {editModal.alert.address && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Address</label>
                    <p className="text-sm text-slate-900 mt-1">{editModal.alert.address}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <p className="text-sm text-slate-900 mt-1 p-3 bg-slate-50 rounded-md">
                  {editModal.alert.message}
                </p>
              </div>
              {editModal.alert.notes && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Additional Notes</label>
                  <p className="text-sm text-slate-900 mt-1 p-3 bg-slate-50 rounded-md">
                    {editModal.alert.notes}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Attached Photos
                </label>
                {photosLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : photosData.photos && photosData.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {photosData.photos.map((photo, idx) => (
                      <a
                        key={idx}
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || `Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-lg mt-2">
                    <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No photos attached</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModal({ open: false, alert: null })}
            >
              Close
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (editModal.alert) {
                  handleConvertToEstimate(editModal.alert);
                  setEditModal({ open: false, alert: null });
                }
              }}
              disabled={createEstimateMutation.isPending}
            >
              Convert to Estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
