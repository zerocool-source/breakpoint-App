import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wrench, Loader2, CheckCircle, Clock, AlertTriangle,
  User, MapPin, DollarSign, Calendar, Eye
} from "lucide-react";
import type { ServiceRepairJob } from "@shared/schema";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
  assigned: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: User, label: "Assigned" },
  in_progress: { color: "bg-purple-100 text-purple-700 border-purple-200", icon: Wrench, label: "In Progress" },
  completed: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertTriangle, label: "Cancelled" },
};


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

export default function RepairQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: repairs = [], isLoading } = useQuery<ServiceRepairJob[]>({
    queryKey: ["service-repairs"],
    queryFn: async () => {
      const response = await fetch("/api/service-repairs");
      if (!response.ok) throw new Error("Failed to fetch repairs");
      return response.json();
    },
  });

  const pendingRepairs = repairs.filter(r => r.status === "pending" || r.status === "assigned");
  const inProgressRepairs = repairs.filter(r => r.status === "in_progress");
  const completedRepairs = repairs.filter(r => r.status === "completed");

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/service-repairs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-repairs"] });
      toast({ title: "Status Updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const renderRepairCard = (repair: ServiceRepairJob) => {
    const statusCfg = statusConfig[repair.status || "pending"];
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

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#F97316]/10 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#F97316]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]">Repair Queue</h1>
              <p className="text-slate-500 text-sm">Manage repairs assigned to Repair Techs</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">{pendingRepairs.length} Pending</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-200">
              <Wrench className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">{inProgressRepairs.length} In Progress</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
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
