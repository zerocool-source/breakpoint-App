import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { 
  FileText, Loader2, Wrench, Building2, User, Calendar as CalendarIcon, DollarSign
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ServiceRepairJob {
  id: string;
  jobNumber: string;
  propertyId: string;
  propertyName: string;
  technicianId: string | null;
  technicianName: string | null;
  description: string;
  laborAmount: number;
  partsAmount: number;
  totalAmount: number;
  status: string;
  jobDate: string;
  estimateId: string | null;
  invoiceId: string | null;
  notes: string | null;
  createdAt: string;
  batchedAt: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]" },
  selected: { label: "Selected", color: "bg-blue-100 text-blue-700 border-blue-200" },
  estimated: { label: "Estimated", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  invoiced: { label: "Invoiced", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export default function ServiceRepairs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRepairs, setSelectedRepairs] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  
  const { data: serviceRepairsData, isLoading } = useQuery({
    queryKey: ["service-repairs"],
    queryFn: async () => {
      const response = await fetch("/api/service-repairs?maxAmount=50000");
      if (!response.ok) throw new Error("Failed to fetch service repairs");
      return response.json();
    },
    refetchInterval: 10000,
  });

  const serviceRepairs: ServiceRepairJob[] = serviceRepairsData || [];
  const filteredRepairs = statusFilter === "all" 
    ? serviceRepairs 
    : serviceRepairs.filter(r => r.status === statusFilter);
  
  const statusCounts = {
    all: serviceRepairs.length,
    pending: serviceRepairs.filter(r => r.status === 'pending').length,
    estimated: serviceRepairs.filter(r => r.status === 'estimated').length,
    invoiced: serviceRepairs.filter(r => r.status === 'invoiced').length,
  };

  const toggleRepairSelection = (id: string) => {
    setSelectedRepairs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const selectAllRepairs = () => {
    const pendingIds = filteredRepairs.filter(r => r.status === 'pending').map(r => r.id);
    setSelectedRepairs(new Set(pendingIds));
  };
  
  const clearRepairSelection = () => {
    setSelectedRepairs(new Set());
  };

  const batchToEstimateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch("/api/service-repairs/batch-to-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error("Failed to batch to estimate");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["service-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      clearRepairSelection();
      toast({
        title: "Estimate Created",
        description: `Created estimate from ${data.updatedJobCount} service repair(s)`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create estimate from repairs",
        variant: "destructive",
      });
    },
  });

  const selectedTotal = Array.from(selectedRepairs).reduce((sum, id) => {
    const repair = serviceRepairs.find(r => r.id === id);
    return sum + (repair?.totalAmount || 0);
  }, 0);

  const pendingInSelection = Array.from(selectedRepairs).filter(id => {
    const repair = serviceRepairs.find(r => r.id === id);
    return repair?.status === 'pending';
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Service Repairs</h1>
            <p className="text-[#64748B]">Manage sub-$500 service tech jobs and batch into estimates</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(statusCounts).map(([key, count]) => (
            <Card 
              key={key} 
              className={`cursor-pointer transition-all ${statusFilter === key ? 'ring-2 ring-[#F97316]' : 'hover:shadow-md'}`}
              onClick={() => setStatusFilter(key)}
            >
              <CardContent className="pt-4 text-center">
                <Wrench className="w-6 h-6 mx-auto mb-2 text-[#F97316]" />
                <p className="text-2xl font-bold text-[#1E293B]">{count}</p>
                <p className="text-xs text-[#64748B] capitalize">{key === 'all' ? 'All Jobs' : key}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Card */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#F97316]" />
              Service Repair Jobs
              <Badge className="bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30">
                Under $500
              </Badge>
            </CardTitle>
            
            {selectedRepairs.size > 0 && pendingInSelection.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">
                  {selectedRepairs.size} selected
                </span>
                <span className="text-sm font-semibold text-[#1E293B]">
                  Total: {formatCurrency(selectedTotal)}
                </span>
                <Button 
                  size="sm" 
                  className="bg-[#1E3A8A] hover:bg-[#1E40AF]"
                  onClick={() => batchToEstimateMutation.mutate(pendingInSelection)}
                  disabled={batchToEstimateMutation.isPending}
                  data-testid="button-batch-to-estimate"
                >
                  {batchToEstimateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-1" />
                  )}
                  Create Estimate ({pendingInSelection.length})
                </Button>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
              </div>
            ) : filteredRepairs.length === 0 ? (
              <div className="text-center py-12 text-[#64748B]">
                <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No {statusFilter === 'all' ? '' : statusFilter} service repairs found</p>
                <p className="text-sm mt-2">Service repairs will appear here when service techs log small jobs</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selection Controls */}
                {statusFilter === 'pending' && filteredRepairs.length > 0 && (
                  <div className="flex items-center gap-3 border-b pb-3">
                    <Checkbox
                      checked={selectedRepairs.size === filteredRepairs.length && filteredRepairs.length > 0}
                      onCheckedChange={(checked) => checked ? selectAllRepairs() : clearRepairSelection()}
                      data-testid="checkbox-select-all-repairs"
                    />
                    <span className="text-sm text-slate-600">
                      {selectedRepairs.size > 0 ? `${selectedRepairs.size} selected` : "Select all pending"}
                    </span>
                    {selectedRepairs.size > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearRepairSelection}>
                        Clear selection
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Service Repairs Table */}
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {statusFilter === 'pending' && <TableHead className="w-10"></TableHead>}
                        <TableHead>Job #</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Technician</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Labor</TableHead>
                        <TableHead className="text-right">Parts</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRepairs.map((repair) => {
                        const config = statusConfig[repair.status] || statusConfig.pending;
                        return (
                          <TableRow 
                            key={repair.id} 
                            className={selectedRepairs.has(repair.id) ? "bg-blue-50" : ""}
                            data-testid={`repair-row-${repair.id}`}
                          >
                            {statusFilter === 'pending' && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedRepairs.has(repair.id)}
                                  onCheckedChange={() => toggleRepairSelection(repair.id)}
                                  data-testid={`checkbox-repair-${repair.id}`}
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs bg-slate-50">
                                {repair.jobNumber}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                <span className="font-medium">{repair.propertyName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                {repair.technicianName || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                              <p className="truncate" title={repair.description}>{repair.description}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-slate-400" />
                                {formatDate(repair.jobDate)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(repair.laborAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(repair.partsAmount)}</TableCell>
                            <TableCell className="text-right font-semibold text-[#1E3A8A]">
                              {formatCurrency(repair.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${config.color} border`}>
                                {config.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
