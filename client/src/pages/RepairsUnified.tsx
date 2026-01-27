import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
  Wrench, Loader2, CheckCircle2, Clock, Search,
  RefreshCw, Building2, User, Calendar, DollarSign, Percent,
  FileText, MapPin, Phone, Mail, ChevronDown, Eye, EyeOff,
  XCircle, FileCheck, ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TechOpsEntry {
  id: string;
  serviceRepairNumber?: string | null;
  entryType: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string | null;
  technicianId: string | null;
  technicianName: string | null;
  description: string | null;
  notes: string | null;
  status: string;
  partsCost: number;
  photos?: string[] | null;
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
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ percent: number; amount: number }>({ percent: 0, amount: 0 });
  
  const [detailModal, setDetailModal] = useState<{ open: boolean; repair: (TechOpsEntry & { commissionPercent: number; commissionAmount: number }) | null }>({
    open: false,
    repair: null,
  });
  const [selectedRepairs, setSelectedRepairs] = useState<Set<string>>(new Set());
  const [showConvertedModal, setShowConvertedModal] = useState(false);

  const { data: techOpsData = [], isLoading: techOpsLoading, refetch: refetchRepairs } = useQuery<TechOpsEntry[]>({
    queryKey: ["tech-ops-service-repairs"],
    queryFn: async () => {
      const res = await fetch("/api/tech-ops?entryType=service_repairs");
      if (!res.ok) throw new Error("Failed to fetch service repairs");
      return res.json();
    },
  });

  const { data: techniciansResponse = { technicians: [] } } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["technicians"],
    queryFn: async () => {
      const res = await fetch("/api/technicians");
      if (!res.ok) throw new Error("Failed to fetch technicians");
      return res.json();
    },
  });
  const techniciansData = techniciansResponse.technicians || [];

  const { data: estimatesData = [] } = useQuery<Array<{ id: string; estimateNumber?: string; title: string; propertyName: string; totalAmount: number; status: string; sourceServiceRepairIds?: string[]; createdAt: string }>>({
    queryKey: ["estimates-for-converted"],
    queryFn: async () => {
      const res = await fetch("/api/estimates?sourceType=service_tech");
      if (!res.ok) throw new Error("Failed to fetch estimates");
      const data = await res.json();
      return data.estimates || data || [];
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/tech-ops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, completedAt: status === "completed" ? new Date().toISOString() : null }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops-service-repairs"] });
      toast({ title: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const convertToEstimateMutation = useMutation({
    mutationFn: async (repairIds: string[]) => {
      const selectedItems = repairsWithCommission.filter(r => repairIds.includes(r.id));
      if (selectedItems.length === 0) throw new Error("No repairs selected");
      
      const uniqueProperties = new Set(selectedItems.map(r => r.propertyId));
      if (uniqueProperties.size > 1) {
        throw new Error("MULTI_PROPERTY");
      }
      
      const firstRepair = selectedItems[0];
      const totalAmountCents = selectedItems.reduce((sum, r) => sum + (r.partsCost || 0), 0);
      
      const allPhotos = selectedItems.flatMap(r => r.photos || []);
      
      const lineItems = selectedItems.map((repair, idx) => {
        const fullDescription = [
          repair.description || "Service repair work",
          repair.notes ? `Notes: ${repair.notes}` : null,
        ].filter(Boolean).join(" | ");
        
        return {
          lineNumber: idx + 1,
          productService: repair.description || "Service Repair",
          description: fullDescription,
          quantity: 1,
          rate: repair.partsCost || 0,
          amount: repair.partsCost || 0,
          taxable: false,
        };
      });
      
      const estimateData = {
        propertyId: firstRepair.propertyId,
        propertyName: firstRepair.propertyName || "Unknown Property",
        address: firstRepair.propertyAddress || null,
        title: selectedItems.length === 1 
          ? `Service Repair - ${firstRepair.description || "Repair"}` 
          : `Service Repairs (${selectedItems.length} items)`,
        description: selectedItems.map(r => {
          const parts = [r.description];
          if (r.notes) parts.push(`Notes: ${r.notes}`);
          return parts.join(" - ");
        }).filter(Boolean).join("\n\n"),
        status: "draft",
        sourceType: "service_tech",
        serviceRepairCount: selectedItems.length,
        sourceServiceRepairIds: repairIds,
        totalAmount: totalAmountCents,
        items: lineItems,
        photos: allPhotos.length > 0 ? allPhotos : null,
        serviceTechId: firstRepair.technicianId || null,
        serviceTechName: firstRepair.technicianName || null,
        techNotes: selectedItems.map(r => r.notes).filter(Boolean).join("\n") || null,
      };

      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimateData),
      });
      if (!res.ok) throw new Error("Failed to create estimate");
      const result = await res.json();
      const estimateId = result.estimate?.id;
      
      for (const repairId of repairIds) {
        await fetch(`/api/tech-ops/${repairId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            status: "converted",
            convertedToEstimateId: estimateId,
            convertedAt: new Date().toISOString(),
          }),
        });
      }
      
      return { ...result, convertedCount: repairIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops-service-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      const count = selectedRepairs.size;
      setSelectedRepairs(new Set());
      toast({ title: `Estimate created from ${count} service repair${count !== 1 ? 's' : ''}` });
      navigate("/estimates");
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

  const repairsWithCommission = useMemo(() => {
    return techOpsData.map(entry => {
      const tech = techniciansData.find(t => t.id === entry.technicianId);
      const commissionPercent = entry.commissionPercent ?? tech?.commissionPercent ?? 10;
      const commissionAmount = entry.commissionAmount ?? Math.round((entry.partsCost * commissionPercent) / 100);
      return { ...entry, commissionPercent, commissionAmount };
    });
  }, [techOpsData, techniciansData]);

  const pendingRepairs = useMemo(() => {
    return repairsWithCommission.filter(r => r.status === "pending" || r.status === "active");
  }, [repairsWithCommission]);

  const completedRepairs = useMemo(() => {
    return repairsWithCommission.filter(r => r.status === "completed");
  }, [repairsWithCommission]);

  const convertedRepairs = useMemo(() => {
    return repairsWithCommission.filter(r => r.status === "converted");
  }, [repairsWithCommission]);

  const filterRepairs = (repairs: typeof repairsWithCommission) => {
    let filtered = repairs;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.propertyName.toLowerCase().includes(term) ||
        (r.description?.toLowerCase().includes(term) ?? false) ||
        (r.serviceRepairNumber?.toLowerCase().includes(term) ?? false) ||
        (r.technicianName?.toLowerCase().includes(term) ?? false)
      );
    }
    if (propertyFilter !== "all") {
      filtered = filtered.filter(r => r.propertyName === propertyFilter);
    }
    if (technicianFilter !== "all") {
      filtered = filtered.filter(r => r.technicianName === technicianFilter);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const filteredPending = useMemo(() => filterRepairs(pendingRepairs), [pendingRepairs, searchTerm, propertyFilter, technicianFilter]);
  const filteredCompleted = useMemo(() => filterRepairs(completedRepairs), [completedRepairs, searchTerm, propertyFilter, technicianFilter]);
  const filteredConverted = useMemo(() => filterRepairs(convertedRepairs), [convertedRepairs, searchTerm, propertyFilter, technicianFilter]);

  const uniqueProperties = useMemo(() => {
    const props = new Set<string>();
    repairsWithCommission.forEach(r => props.add(r.propertyName));
    return Array.from(props).sort();
  }, [repairsWithCommission]);

  const uniqueTechnicians = useMemo(() => {
    const techs = new Set<string>();
    repairsWithCommission.forEach(r => r.technicianName && techs.add(r.technicianName));
    return Array.from(techs).sort();
  }, [repairsWithCommission]);

  const totalSubmissions = repairsWithCommission.length;
  const pendingCount = pendingRepairs.length;
  const completedCount = completedRepairs.length;
  const convertedCount = convertedRepairs.length;

  const convertedByEstimate = useMemo(() => {
    const groups: Record<string, {
      estimate: typeof estimatesData[0] | null;
      repairs: typeof convertedRepairs;
    }> = {};
    
    const repairToEstimate = new Map<string, typeof estimatesData[0]>();
    estimatesData.forEach(estimate => {
      if (estimate.sourceServiceRepairIds) {
        estimate.sourceServiceRepairIds.forEach(repairId => {
          repairToEstimate.set(repairId, estimate);
        });
      }
    });
    
    convertedRepairs.forEach(repair => {
      const estimate = repairToEstimate.get(repair.id);
      const key = estimate?.id || 'unlinked';
      if (!groups[key]) {
        groups[key] = { estimate: estimate || null, repairs: [] };
      }
      groups[key].repairs.push(repair);
    });
    
    return Object.values(groups).sort((a, b) => {
      if (!a.estimate) return 1;
      if (!b.estimate) return -1;
      return new Date(b.estimate.createdAt).getTime() - new Date(a.estimate.createdAt).getTime();
    });
  }, [convertedRepairs, estimatesData]);

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

  const handleRepairCheckbox = (repairId: string, checked: boolean) => {
    setSelectedRepairs(prev => {
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
      const ids = filteredPending.map(r => r.id);
      setSelectedRepairs(new Set(ids));
    } else {
      setSelectedRepairs(new Set());
    }
  };

  const selectedTotal = useMemo(() => {
    return repairsWithCommission
      .filter(r => selectedRepairs.has(r.id))
      .reduce((sum, r) => sum + (r.partsCost || 0), 0);
  }, [repairsWithCommission, selectedRepairs]);

  const handleConvertSelectedToEstimate = () => {
    const ids = Array.from(selectedRepairs);
    if (ids.length === 0) {
      toast({ title: "No repairs selected", variant: "destructive" });
      return;
    }
    convertToEstimateMutation.mutate(ids);
  };

  const totalRepairRevenue = filteredPending.reduce((sum, r) => sum + (r.partsCost || 0), 0);
  const totalCommissions = filteredPending.reduce((sum, r) => sum + (r.commissionAmount || 0), 0);
  const netRevenue = totalRepairRevenue - totalCommissions;

  const renderRepairCard = (repair: typeof repairsWithCommission[0], showCheckbox = false) => {
    const isSelected = selectedRepairs.has(repair.id);
    return (
      <div
        key={repair.id}
        className={cn(
          "p-4 rounded-lg border transition-all cursor-pointer",
          repair.status === "completed"
            ? "bg-emerald-50 border-emerald-200"
            : repair.status === "converted"
            ? "bg-indigo-50 border-indigo-200"
            : "bg-slate-50 border-slate-200 hover:border-blue-300 hover:shadow-sm"
        )}
        data-testid={`repair-card-${repair.id}`}
        onClick={() => setDetailModal({ open: true, repair })}
      >
        <div className="flex items-start gap-3">
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => handleRepairCheckbox(repair.id, !!checked)}
              className="mt-1"
              onClick={(e) => e.stopPropagation()}
              data-testid={`checkbox-${repair.id}`}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">
                {repair.serviceRepairNumber ? `SR-${repair.serviceRepairNumber}` : repair.propertyName}
              </h3>
              <Badge className={cn("text-xs", 
                repair.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                repair.status === "converted" ? "bg-indigo-100 text-indigo-700" :
                "bg-amber-100 text-amber-700"
              )}>
                {repair.status === "completed" ? "Completed" : 
                 repair.status === "converted" ? "Converted" : "Pending"}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 flex items-center gap-1 mb-2">
              <Building2 className="w-3 h-3" />
              {repair.propertyName}
            </p>
            <p className="text-sm text-slate-700 line-clamp-2">
              {repair.description || "No description provided"}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              {repair.technicianName && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {repair.technicianName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(repair.createdAt), "MMM d, yyyy")}
              </span>
              {repair.partsCost > 0 && (
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <DollarSign className="w-3 h-3" />
                  {formatCurrency(repair.partsCost)}
                </span>
              )}
              {repair.photos && repair.photos.length > 0 && (
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {repair.photos.length} photo{repair.photos.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
              <p className="text-slate-500 text-sm">Manage service repairs submitted by technicians</p>
            </div>
          </div>
          <Button onClick={() => refetchRepairs()} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-slate-500">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
                <p className="text-sm text-slate-500">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="bg-white cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
            onClick={() => setShowConvertedModal(true)}
            data-testid="card-converted-estimate"
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{convertedCount}</p>
                <p className="text-sm text-slate-500">Converted to Estimate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search repairs or SR#..."
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
              <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="pending" data-testid="tab-pending">
                  Pending ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">
                  Completed ({completedCount})
                </TabsTrigger>
                <TabsTrigger value="converted" data-testid="tab-converted">
                  Converted ({convertedCount})
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              {techOpsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  <TabsContent value="pending" className="mt-0">
                    {selectedRepairs.size > 0 && (
                      <div className="flex items-center justify-between p-3 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-blue-700">
                            {selectedRepairs.size} repair{selectedRepairs.size !== 1 ? "s" : ""} selected
                          </span>
                          <span className="text-sm text-blue-600">
                            Total: {formatCurrency(selectedTotal)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRepairs(new Set())}
                          >
                            Clear Selection
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleConvertSelectedToEstimate}
                            disabled={convertToEstimateMutation.isPending}
                            className="gap-2"
                          >
                            {convertToEstimateMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileCheck className="w-4 h-4" />
                            )}
                            Convert to Estimate
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {filteredPending.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <Checkbox
                          checked={selectedRepairs.size === filteredPending.length && filteredPending.length > 0}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                          data-testid="checkbox-select-all"
                        />
                        <span className="text-sm text-slate-600">Select all</span>
                      </div>
                    )}
                    
                    <ScrollArea className="h-[calc(100vh-500px)] min-h-[300px]">
                      {filteredPending.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No pending repairs</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredPending.map((repair) => renderRepairCard(repair, true))}
                        </div>
                      )}
                    </ScrollArea>
                    
                    {filteredPending.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-slate-500">Total Revenue</p>
                            <p className="text-lg font-semibold text-slate-800">{formatCurrency(totalRepairRevenue)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-slate-500">Total Commissions</p>
                            <p className="text-lg font-semibold text-amber-600">{formatCurrency(totalCommissions)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-slate-500">Net Revenue</p>
                            <p className="text-lg font-semibold text-emerald-600">{formatCurrency(netRevenue)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="completed" className="mt-0">
                    <ScrollArea className="h-[calc(100vh-450px)] min-h-[300px]">
                      {filteredCompleted.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No completed repairs</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredCompleted.map((repair) => renderRepairCard(repair))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="converted" className="mt-0">
                    <ScrollArea className="h-[calc(100vh-450px)] min-h-[300px]">
                      {filteredConverted.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No repairs converted to estimates yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredConverted.map((repair) => renderRepairCard(repair))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </>
              )}
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Repair Detail Modal */}
      <Dialog open={detailModal.open} onOpenChange={(open) => !open && setDetailModal({ open: false, repair: null })}>
        <DialogContent className="max-w-2xl">
          {detailModal.repair && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="block">
                      {detailModal.repair.serviceRepairNumber ? `SR-${detailModal.repair.serviceRepairNumber}` : "Service Repair"}
                    </span>
                    <span className="text-sm font-normal text-slate-500">{detailModal.repair.propertyName}</span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Status</p>
                    <Badge className={cn("text-sm", 
                      detailModal.repair.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                      detailModal.repair.status === "converted" ? "bg-indigo-100 text-indigo-700" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {detailModal.repair.status === "completed" ? "Completed" : 
                       detailModal.repair.status === "converted" ? "Converted to Estimate" : "Pending"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Technician</p>
                    <p className="font-medium">{detailModal.repair.technicianName || "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Created</p>
                    <p className="font-medium">{format(new Date(detailModal.repair.createdAt), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Parts Cost</p>
                    <p className="font-medium text-lg">{formatCurrency(detailModal.repair.partsCost)}</p>
                  </div>
                </div>
                
                {detailModal.repair.propertyAddress && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Address</p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {detailModal.repair.propertyAddress}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-slate-500 mb-1">Description</p>
                  <p className="text-slate-700">{detailModal.repair.description || "No description provided"}</p>
                </div>
                
                {detailModal.repair.notes && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Notes</p>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{detailModal.repair.notes}</p>
                  </div>
                )}
                
                {detailModal.repair.photos && detailModal.repair.photos.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Photos ({detailModal.repair.photos.length})</p>
                    <div className="grid grid-cols-3 gap-2">
                      {detailModal.repair.photos.map((photo, idx) => (
                        <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={photo} 
                            alt={`Repair photo ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Commission ({detailModal.repair.commissionPercent}%)</p>
                      <p className="font-medium text-amber-600">{formatCurrency(detailModal.repair.commissionAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Net Amount</p>
                      <p className="font-medium text-emerald-600">{formatCurrency(detailModal.repair.partsCost - detailModal.repair.commissionAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                {detailModal.repair.status === "pending" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateStatusMutation.mutate({ id: detailModal.repair!.id, status: "completed" });
                      setDetailModal({ open: false, repair: null });
                    }}
                    className="gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Completed
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setDetailModal({ open: false, repair: null })}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Converted Repairs Modal */}
      <Dialog open={showConvertedModal} onOpenChange={setShowConvertedModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-indigo-600" />
              </div>
              Converted Repairs
            </DialogTitle>
            <DialogDescription>
              Repairs that have been converted into estimates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {convertedByEstimate.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No repairs have been converted yet</p>
              </div>
            ) : (
              convertedByEstimate.map((group, idx) => (
                <div key={group.estimate?.id || idx} className="border rounded-lg overflow-hidden">
                  {group.estimate && (
                    <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                      <div>
                        <p className="font-medium">{group.estimate.estimateNumber || group.estimate.title}</p>
                        <p className="text-sm text-slate-500">{group.estimate.propertyName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-emerald-600">{formatCurrency(group.estimate.totalAmount)}</p>
                        <Badge className="text-xs">{group.estimate.status}</Badge>
                      </div>
                    </div>
                  )}
                  <div className="p-3 space-y-2">
                    {group.repairs.map(repair => (
                      <div key={repair.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{repair.serviceRepairNumber ? `SR-${repair.serviceRepairNumber}` : repair.propertyName}</span>
                          {repair.description && <span className="text-slate-500 ml-2">- {repair.description}</span>}
                        </div>
                        <span className="text-slate-600">{formatCurrency(repair.partsCost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertedModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
