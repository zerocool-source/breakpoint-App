import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Wrench, Loader2, CheckCircle, Clock, AlertTriangle,
  User, MapPin, DollarSign, Calendar, Eye, Users, TrendingUp, Target, FileText
} from "lucide-react";
import type { ServiceRepairJob, Technician } from "@shared/schema";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
  assigned: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: User, label: "Assigned" },
  in_progress: { color: "bg-purple-100 text-purple-700 border-purple-200", icon: Wrench, label: "In Progress" },
  completed: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertTriangle, label: "Cancelled" },
  estimated: { color: "bg-cyan-100 text-cyan-700 border-cyan-200", icon: DollarSign, label: "Estimated" },
  batched: { color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Target, label: "Batched" },
};

const defaultStatus = { color: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock, label: "Unknown" };

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "$0.00";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function RepairQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("by-tech");
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const { data: repairs = [], isLoading } = useQuery<ServiceRepairJob[]>({
    queryKey: ["service-repairs"],
    queryFn: async () => {
      const response = await fetch("/api/service-repairs");
      if (!response.ok) throw new Error("Failed to fetch repairs");
      return response.json();
    },
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["technicians"],
    queryFn: async () => {
      const response = await fetch("/api/technicians?role=repair_tech");
      if (!response.ok) throw new Error("Failed to fetch technicians");
      return response.json();
    },
  });

  const pendingRepairs = repairs.filter(r => r.status === "pending" || r.status === "assigned");
  const inProgressRepairs = repairs.filter(r => r.status === "in_progress");
  const completedRepairs = repairs.filter(r => r.status === "completed");

  const repairsByTech = useMemo(() => {
    const grouped: Record<string, { tech: string; repairs: ServiceRepairJob[]; pending: number; inProgress: number; completed: number; totalValue: number }> = {};
    
    repairs.forEach(repair => {
      const techName = repair.technicianName || "Unassigned";
      if (!grouped[techName]) {
        grouped[techName] = { tech: techName, repairs: [], pending: 0, inProgress: 0, completed: 0, totalValue: 0 };
      }
      grouped[techName].repairs.push(repair);
      grouped[techName].totalValue += repair.totalAmount || 0;
      if (repair.status === "pending" || repair.status === "assigned") grouped[techName].pending++;
      else if (repair.status === "in_progress") grouped[techName].inProgress++;
      else if (repair.status === "completed") grouped[techName].completed++;
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.tech === "Unassigned") return 1;
      if (b.tech === "Unassigned") return -1;
      return (b.pending + b.inProgress) - (a.pending + a.inProgress);
    });
  }, [repairs]);

  const dashboardMetrics = useMemo(() => {
    const totalValue = repairs.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const pendingValue = pendingRepairs.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const inProgressValue = inProgressRepairs.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const completedValue = completedRepairs.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const activeTechs = repairsByTech.filter(t => t.tech !== "Unassigned" && (t.pending > 0 || t.inProgress > 0)).length;
    const avgPerTech = activeTechs > 0 ? (pendingRepairs.length + inProgressRepairs.length) / activeTechs : 0;

    return {
      totalJobs: repairs.length,
      pending: pendingRepairs.length,
      inProgress: inProgressRepairs.length,
      completed: completedRepairs.length,
      totalValue,
      pendingValue,
      inProgressValue,
      completedValue,
      activeTechs,
      avgPerTech: Math.round(avgPerTech * 10) / 10,
    };
  }, [repairs, pendingRepairs, inProgressRepairs, completedRepairs, repairsByTech]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/service-repairs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({ title: "Status Updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const renderRepairCard = (repair: ServiceRepairJob) => {
    const statusCfg = statusConfig[repair.status || "pending"] || defaultStatus;
    const StatusIcon = statusCfg.icon;

    return (
      <div
        key={repair.id}
        className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all"
        data-testid={`repair-item-${repair.id}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#1E3A8A]">
              {repair.jobNumber || "—"}
            </span>
            <Badge className={statusCfg.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusCfg.label}
            </Badge>
          </div>
          <span className="text-lg font-bold text-[#1E293B]">
            {formatCurrency(repair.totalAmount)}
          </span>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{repair.propertyName || "No property"}</span>
          </div>
          {repair.technicianName && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="w-4 h-4 text-slate-400" />
              <span>{repair.technicianName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{formatDate(repair.jobDate)}</span>
          </div>
        </div>

        {repair.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{repair.description}</p>
        )}

        {repair.estimateId && (
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
              <FileText className="w-3 h-3 mr-1" />
              From Estimate
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          {repair.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => updateStatusMutation.mutate({ id: repair.id, status: "in_progress" })}
              data-testid={`button-start-${repair.id}`}
            >
              <Wrench className="w-4 h-4 mr-1" /> Start Work
            </Button>
          )}
          {repair.status === "in_progress" && (
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => updateStatusMutation.mutate({ id: repair.id, status: "completed" })}
              data-testid={`button-complete-${repair.id}`}
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Complete
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            data-testid={`button-view-${repair.id}`}
          >
            <Eye className="w-4 h-4 mr-1" /> View
          </Button>
        </div>
      </div>
    );
  };

  const renderTechCard = (techData: { tech: string; repairs: ServiceRepairJob[]; pending: number; inProgress: number; completed: number; totalValue: number }) => {
    const totalActive = techData.pending + techData.inProgress;
    const completionRate = techData.repairs.length > 0 ? Math.round((techData.completed / techData.repairs.length) * 100) : 0;

    return (
      <Card
        key={techData.tech}
        className={`cursor-pointer transition-all hover:shadow-lg ${selectedTech === techData.tech ? 'ring-2 ring-[#1E3A8A] shadow-lg' : ''}`}
        onClick={() => setSelectedTech(selectedTech === techData.tech ? null : techData.tech)}
        data-testid={`tech-card-${techData.tech.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={techData.tech === "Unassigned" ? "bg-slate-200 text-slate-600" : "bg-[#1E3A8A] text-white"}>
                {getInitials(techData.tech)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#1E293B] truncate">{techData.tech}</h3>
              <p className="text-xs text-slate-500">{totalActive} active jobs</p>
            </div>
            {totalActive > 0 && (
              <Badge className="bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20">
                {totalActive}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <div className="text-lg font-bold text-amber-700">{techData.pending}</div>
              <div className="text-xs text-amber-600">Pending</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-700">{techData.inProgress}</div>
              <div className="text-xs text-purple-600">In Progress</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-700">{techData.completed}</div>
              <div className="text-xs text-green-600">Completed</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Value</span>
              <span className="font-semibold text-[#1E293B]">{formatCurrency(techData.totalValue)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Completion</span>
              <span className="font-medium text-green-600">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#F97316]/10 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#F97316]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading-repairqueue">Repair Queue</h1>
              <p className="text-slate-500 text-sm">Manage repairs assigned to Repair Techs</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200" data-testid="badge-pending-count">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">{pendingRepairs.length} Pending</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-200" data-testid="badge-inprogress-count">
              <Wrench className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">{inProgressRepairs.length} In Progress</span>
            </div>
          </div>
        </div>

        {/* Dashboard Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" data-testid="dashboard-metrics">
          <Card className="bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">Total Jobs</span>
              </div>
              <div className="text-2xl font-bold">{dashboardMetrics.totalJobs}</div>
              <div className="text-xs opacity-80">{formatCurrency(dashboardMetrics.totalValue)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-400 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">Pending</span>
              </div>
              <div className="text-2xl font-bold">{dashboardMetrics.pending}</div>
              <div className="text-xs opacity-80">{formatCurrency(dashboardMetrics.pendingValue)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-500 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">In Progress</span>
              </div>
              <div className="text-2xl font-bold">{dashboardMetrics.inProgress}</div>
              <div className="text-xs opacity-80">{formatCurrency(dashboardMetrics.inProgressValue)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-500 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">Completed</span>
              </div>
              <div className="text-2xl font-bold">{dashboardMetrics.completed}</div>
              <div className="text-xs opacity-80">{formatCurrency(dashboardMetrics.completedValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#1E3A8A]" />
                <span className="text-sm text-slate-600">Active Techs</span>
              </div>
              <div className="text-2xl font-bold text-[#1E293B]">{dashboardMetrics.activeTechs}</div>
              <div className="text-xs text-slate-500">with assigned jobs</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[#F97316]" />
                <span className="text-sm text-slate-600">Avg per Tech</span>
              </div>
              <div className="text-2xl font-bold text-[#1E293B]">{dashboardMetrics.avgPerTech}</div>
              <div className="text-xs text-slate-500">active jobs</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="by-tech" data-testid="tab-by-tech">
              <Users className="w-4 h-4 mr-2" /> By Technician
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingRepairs.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" data-testid="tab-in-progress">
              In Progress ({inProgressRepairs.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed ({completedRepairs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="by-tech" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <h3 className="font-semibold text-[#1E293B] mb-3">Repair Technicians</h3>
                  <div className="space-y-3">
                    {repairsByTech.map(renderTechCard)}
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <h3 className="font-semibold text-[#1E293B] mb-3">
                    {selectedTech ? `${selectedTech}'s Jobs` : "All Active Jobs"}
                  </h3>
                  <ScrollArea className="h-[600px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                      {(selectedTech 
                        ? repairsByTech.find(t => t.tech === selectedTech)?.repairs.filter(r => r.status !== "completed" && r.status !== "cancelled") || []
                        : [...pendingRepairs, ...inProgressRepairs]
                      ).map(renderRepairCard)}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
              </div>
            ) : pendingRepairs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No pending repairs</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRepairs.map(renderRepairCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="in_progress" className="mt-4">
            {inProgressRepairs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No repairs in progress</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressRepairs.map(renderRepairCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedRepairs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No completed repairs</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedRepairs.map(renderRepairCard)}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
