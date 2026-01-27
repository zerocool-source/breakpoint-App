import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Droplets, MapPin, Building2, Phone, Mail, User, ChevronDown, AlertCircle, RefreshCw, 
  Clock, CheckCircle2, Eye, EyeOff, Package, Send, Truck, Calendar, Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import type { TechOpsEntry } from "@shared/schema";

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
  pictures?: string[];
  techName?: string;
  techPhone?: string;
  techEmail?: string;
  techId?: number;
  rawAlert?: any;
}

const orderStatusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
  sent_to_vendor: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Send, label: "Sent to Vendor" },
  confirmed: { color: "bg-purple-100 text-purple-700 border-purple-200", icon: CheckCircle2, label: "Confirmed" },
  delivered: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Package, label: "Delivered" },
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function Chemicals() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("orders");
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TechOpsEntry | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Fetch chemical alerts from Pool Brain
  const { data: alertsData = { alerts: [] }, isLoading: alertsLoading, refetch: refetchAlerts, isFetching: alertsFetching } = useQuery({
    queryKey: ["enrichedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/enriched");
      if (!res.ok) throw new Error("Failed to fetch enriched alerts");
      return res.json();
    },
  });

  // Fetch chemical orders from TechOps
  const { data: chemicalOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["tech-ops-chemical-order"],
    queryFn: async () => {
      const res = await fetch("/api/tech-ops?entryType=chemical_order");
      if (!res.ok) throw new Error("Failed to fetch chemical orders");
      return res.json();
    },
  });

  // Fetch chemicals dropped-off from TechOps
  const { data: chemicalsDropoff = [], isLoading: dropoffLoading, refetch: refetchDropoff } = useQuery({
    queryKey: ["tech-ops-chemicals-dropoff"],
    queryFn: async () => {
      const res = await fetch("/api/tech-ops?entryType=chemicals_dropoff");
      if (!res.ok) throw new Error("Failed to fetch chemicals dropoff");
      return res.json();
    },
  });

  const { data: completedData = { completedIds: [] } } = useQuery({
    queryKey: ["completedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/completed");
      if (!res.ok) throw new Error("Failed to fetch completed alerts");
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
          body: JSON.stringify({ category: "chemical" }),
        });
        if (!res.ok) throw new Error("Failed to mark complete");
        return res.json();
      } else {
        const res = await fetch(`/api/alerts/${alertId}/complete`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to unmark");
        return res.json();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["completedAlerts"] });
    },
  });

  const allAlerts: EnrichedAlert[] = alertsData.alerts || [];

  const isChemicalAlert = (alert: EnrichedAlert): boolean => {
    const msgLower = alert.message.toLowerCase();
    return (
      msgLower.includes("chlorine") ||
      msgLower.includes("acid") ||
      msgLower.includes("chemical") ||
      msgLower.includes("ph") ||
      msgLower.includes("orp") ||
      msgLower.includes("bleach") ||
      msgLower.includes("algae") ||
      msgLower.includes("drum") ||
      msgLower.includes("carboy") ||
      msgLower.includes("tank") ||
      msgLower.includes("requesting") ||
      msgLower.includes("bag") ||
      msgLower.includes("muriatic") ||
      msgLower.includes("tabs") ||
      msgLower.includes("calcium") ||
      msgLower.includes("stabilizer") ||
      msgLower.includes("cyanuric")
    );
  };

  const chemicalAlerts = allAlerts.filter(isChemicalAlert);
  const activeChemicals = chemicalAlerts.filter(a => a.status === "Active");
  const incompleteChemicals = activeChemicals.filter(a => !completedIds.has(String(a.alertId)));
  const completedChemicals = activeChemicals.filter(a => completedIds.has(String(a.alertId)));

  const displayedAlerts = showCompleted ? activeChemicals : incompleteChemicals;

  const sortedAlerts = [...displayedAlerts].sort((a, b) => {
    const aCompleted = completedIds.has(String(a.alertId)) ? 1 : 0;
    const bCompleted = completedIds.has(String(b.alertId)) ? 1 : 0;
    if (aCompleted !== bCompleted) return aCompleted - bCompleted;

    const severityOrder = { URGENT: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
    const aSev = severityOrder[a.severity.toUpperCase() as keyof typeof severityOrder] ?? 5;
    const bSev = severityOrder[b.severity.toUpperCase() as keyof typeof severityOrder] ?? 5;
    if (aSev !== bSev) return aSev - bSev;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getSeverityColor = (severity: string) => {
    const upper = severity.toUpperCase();
    if (upper === "URGENT") return "bg-red-100 text-red-700 border-red-200";
    if (upper.includes("CRITICAL")) return "bg-red-100 text-red-700 border-red-200";
    if (upper.includes("HIGH")) return "bg-amber-100 text-amber-700 border-amber-200";
    if (upper.includes("MEDIUM")) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  // Stats
  const pendingOrders = (chemicalOrders as TechOpsEntry[]).filter(o => o.orderStatus === "pending" || !o.orderStatus).length;
  const deliveredOrders = (chemicalOrders as TechOpsEntry[]).filter(o => o.orderStatus === "delivered").length;
  const totalDropoffs = (chemicalsDropoff as TechOpsEntry[]).length;

  const handleRefresh = () => {
    refetchAlerts();
    refetchOrders();
    refetchDropoff();
  };

  const isLoading = alertsLoading || ordersLoading || dropoffLoading;
  const isFetching = alertsFetching;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Chemicals Center</h1>
              <p className="text-sm text-slate-500">Manage chemical orders, drop-offs, and alerts</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isFetching}
            variant="outline"
            className="gap-2"
            data-testid="button-refresh-chemicals"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{(chemicalOrders as TechOpsEntry[]).length}</p>
                <p className="text-sm text-slate-500">Chemical Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pendingOrders}</p>
                <p className="text-sm text-slate-500">Pending Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Truck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalDropoffs}</p>
                <p className="text-sm text-slate-500">Chemicals Dropped-Off</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{incompleteChemicals.length}</p>
                <p className="text-sm text-slate-500">Chemical Alerts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1.5 h-auto gap-1">
            <TabsTrigger 
              value="orders" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-blue-500 data-[state=active]:border-b-2 gap-2.5 px-5 py-3 text-base font-medium transition-all"
            >
              <Droplets className="w-5 h-5" />
              <span>Chemical Orders</span>
              <span className="ml-1 px-2.5 py-0.5 text-sm font-semibold rounded-full bg-blue-100 text-blue-700">
                {(chemicalOrders as TechOpsEntry[]).length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="dropoff" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-green-500 data-[state=active]:border-b-2 gap-2.5 px-5 py-3 text-base font-medium transition-all"
            >
              <Truck className="w-5 h-5" />
              <span>Chemicals Dropped-Off</span>
              <span className="ml-1 px-2.5 py-0.5 text-sm font-semibold rounded-full bg-green-100 text-green-700">
                {totalDropoffs}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="alerts" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-orange-500 data-[state=active]:border-b-2 gap-2.5 px-5 py-3 text-base font-medium transition-all"
            >
              <AlertCircle className="w-5 h-5" />
              <span>Chemical Alerts</span>
              <span className={cn(
                "ml-1 px-2.5 py-0.5 text-sm font-semibold rounded-full",
                incompleteChemicals.length > 0 
                  ? "bg-orange-500 text-white animate-pulse" 
                  : "bg-slate-100 text-slate-600"
              )}>
                {incompleteChemicals.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Chemical Orders Tab */}
          <TabsContent value="orders" className="mt-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  Chemical Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : (chemicalOrders as TechOpsEntry[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <Droplets className="w-12 h-12 mb-3 opacity-50" />
                    <p>No chemical orders found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-3 pr-4">
                      {(chemicalOrders as TechOpsEntry[]).map((entry) => {
                        const statusInfo = orderStatusConfig[entry.orderStatus || "pending"] || orderStatusConfig.pending;
                        const StatusIcon = statusInfo.icon;
                        return (
                          <div
                            key={entry.id}
                            className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => { setSelectedEntry(entry); setPhotoIndex(0); }}
                            data-testid={`card-order-${entry.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-slate-900">{entry.propertyName || "Unknown Property"}</h3>
                                  <Badge className={cn("text-xs", statusInfo.color)}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 mb-2">{entry.chemicals || entry.description || "Chemical order"}</p>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {entry.technicianName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(entry.createdAt)}
                                  </span>
                                  {entry.quantity && (
                                    <span className="flex items-center gap-1">
                                      <Package className="w-3 h-3" />
                                      Qty: {entry.quantity}
                                    </span>
                                  )}
                                  {entry.photos && entry.photos.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" />
                                      {entry.photos.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {entry.vendorName && (
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Vendor</p>
                                  <p className="text-sm font-medium text-slate-700">{entry.vendorName}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chemicals Dropped-Off Tab */}
          <TabsContent value="dropoff" className="mt-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  Chemicals Dropped-Off
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dropoffLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : (chemicalsDropoff as TechOpsEntry[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <Truck className="w-12 h-12 mb-3 opacity-50" />
                    <p>No chemicals dropped-off records found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-3 pr-4">
                      {(chemicalsDropoff as TechOpsEntry[]).map((entry) => (
                        <div
                          key={entry.id}
                          className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border-l-4 border-l-emerald-500"
                          onClick={() => { setSelectedEntry(entry); setPhotoIndex(0); }}
                          data-testid={`card-dropoff-${entry.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-slate-900">{entry.propertyName || "Unknown Property"}</h3>
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Delivered
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{entry.chemicals || entry.description || "Chemicals delivered"}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {entry.technicianName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(entry.createdAt)}
                                </span>
                                {entry.quantity && (
                                  <span className="flex items-center gap-1">
                                    <Package className="w-3 h-3" />
                                    Qty: {entry.quantity}
                                  </span>
                                )}
                                {entry.photos && entry.photos.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    {entry.photos.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            {entry.partsCost && entry.partsCost > 0 && (
                              <div className="text-right">
                                <p className="text-lg font-bold text-emerald-600">{formatCurrency(entry.partsCost)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chemical Alerts Tab */}
          <TabsContent value="alerts" className="mt-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant={!showCompleted ? "default" : "outline"}
                onClick={() => setShowCompleted(false)}
                className="gap-2"
                data-testid="button-show-pending"
              >
                <EyeOff className="w-4 h-4" />
                Pending ({incompleteChemicals.length})
              </Button>
              <Button
                variant={showCompleted ? "default" : "outline"}
                onClick={() => setShowCompleted(true)}
                className="gap-2"
                data-testid="button-show-all"
              >
                <Eye className="w-4 h-4" />
                Show All ({activeChemicals.length})
              </Button>
            </div>

            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  {showCompleted ? "All Chemical Alerts" : "Pending Chemical Alerts"}
                  <span className="text-xs text-slate-500 font-normal ml-2">(Check to mark as reviewed)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : sortedAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
                    <p>No {showCompleted ? "" : "pending "}chemical alerts found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-450px)]">
                    <div className="space-y-4 pr-4">
                      {sortedAlerts.map((alert, idx) => {
                        const isCompleted = completedIds.has(String(alert.alertId));
                        return (
                          <div
                            key={`chemical-${alert.alertId}-${idx}`}
                            className={cn(
                              "p-4 rounded-lg border transition-all",
                              isCompleted
                                ? "bg-emerald-50 border-emerald-200 opacity-70"
                                : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
                            )}
                            data-testid={`chemical-card-${alert.alertId}`}
                          >
                            <div className="flex items-start gap-4">
                              <Checkbox
                                checked={isCompleted}
                                onCheckedChange={(checked) => {
                                  markCompleteMutation.mutate({ alertId: String(alert.alertId), completed: !!checked });
                                }}
                                className="mt-1"
                                data-testid={`checkbox-${alert.alertId}`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={cn(
                                    "font-semibold",
                                    isCompleted ? "text-emerald-700 line-through" : "text-slate-900"
                                  )}>
                                    {alert.poolName}
                                  </h3>
                                  <Badge className={cn("text-xs", getSeverityColor(alert.severity))}>
                                    {alert.severity}
                                  </Badge>
                                  {isCompleted && (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Reviewed
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500 mb-2">
                                  <Building2 className="w-3 h-3 inline mr-1" />
                                  {alert.customerName}
                                </p>
                                <p className={cn(
                                  "text-sm p-2 rounded bg-slate-50 border",
                                  isCompleted ? "text-slate-500" : "text-slate-700"
                                )}>
                                  {alert.message}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  {alert.address && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {alert.address}
                                    </span>
                                  )}
                                  {alert.techName && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {alert.techName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right text-xs text-slate-500">
                                <div>{new Date(alert.createdAt).toLocaleDateString()}</div>
                                <div>{new Date(alert.createdAt).toLocaleTimeString()}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Entry Detail Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              {selectedEntry?.entryType === "chemical_order" ? "Chemical Order Details" : "Chemicals Dropped-Off Details"}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Property</p>
                  <p className="font-medium">{selectedEntry.propertyName || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Submitted By</p>
                  <p className="font-medium">{selectedEntry.technicianName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{formatDate(selectedEntry.createdAt)}</p>
                </div>
                {selectedEntry.vendorName && (
                  <div>
                    <p className="text-sm text-slate-500">Vendor</p>
                    <p className="font-medium">{selectedEntry.vendorName}</p>
                  </div>
                )}
              </div>

              {(selectedEntry.chemicals || selectedEntry.description) && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Chemicals / Description</p>
                  <p className="p-3 bg-slate-50 rounded-lg border">
                    {selectedEntry.chemicals || selectedEntry.description}
                  </p>
                </div>
              )}

              {selectedEntry.quantity && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Quantity</p>
                  <p className="font-medium">{selectedEntry.quantity}</p>
                </div>
              )}

              {selectedEntry.notes && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Notes</p>
                  <p className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800">
                    {selectedEntry.notes}
                  </p>
                </div>
              )}

              {selectedEntry.photos && selectedEntry.photos.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Photos ({selectedEntry.photos.length})</p>
                  <div className="relative">
                    <img
                      src={selectedEntry.photos[photoIndex]}
                      alt={`Photo ${photoIndex + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    {selectedEntry.photos.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {selectedEntry.photos.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPhotoIndex(idx)}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              idx === photoIndex ? "bg-white" : "bg-white/50"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEntry(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
