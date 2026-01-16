import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Droplets, MapPin, Building2, Phone, Mail, User, ChevronDown, AlertCircle, RefreshCw, Clock, CheckCircle2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

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

export default function Chemicals() {
  const queryClient = useQueryClient();
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: alertsData = { alerts: [] }, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["enrichedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/enriched");
      if (!res.ok) throw new Error("Failed to fetch enriched alerts");
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
    onMutate: async ({ alertId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["completedAlerts"] });
      const previousData = queryClient.getQueryData(["completedAlerts"]);
      
      queryClient.setQueryData(["completedAlerts"], (old: any) => {
        const currentIds = old?.completedIds || [];
        if (completed) {
          return { completedIds: [...currentIds, alertId] };
        } else {
          return { completedIds: currentIds.filter((id: string) => String(id) !== String(alertId)) };
        }
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["completedAlerts"], context.previousData);
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
      msgLower.includes("added") ||
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
    if (upper === "URGENT") return "bg-red-500/20 text-red-400 border-red-500/50";
    if (upper.includes("CRITICAL")) return "bg-destructive/20 text-destructive border-destructive/50";
    if (upper.includes("HIGH")) return "bg-[#FF8000]/20 text-orange-400 border-[#FF8000]/50";
    if (upper.includes("MEDIUM")) return "bg-[#FF8000]/20 text-yellow-400 border-[#FF8000]/50";
    return "bg-[#0078D4]/20 text-blue-400 border-[#0078D4]/50";
  };

  const urgentCount = incompleteChemicals.filter(a => a.severity.toUpperCase() === "URGENT").length;

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground hover:text-[#17BEBB]" data-testid="btn-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight flex items-center gap-3">
            <Droplets className="w-8 h-8 text-primary" />
            CHEMICALS CENTER
          </h2>
          <p className="text-muted-foreground font-ui tracking-wide">
            {incompleteChemicals.length} Pending • {completedChemicals.length} Reviewed • {urgentCount > 0 ? `${urgentCount} Urgent` : "No urgent"}
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          className="bg-primary text-black hover:bg-primary/80 font-bold gap-2"
          data-testid="button-refresh-chemicals"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-ui">{incompleteChemicals.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-ui">{urgentCount}</p>
              <p className="text-xs text-muted-foreground">Urgent</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#FF8000]/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-ui">
                {incompleteChemicals.filter(a => a.severity.toUpperCase() === "HIGH").length}
              </p>
              <p className="text-xs text-muted-foreground">High Priority</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#22D69A]/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-ui">{completedChemicals.length}</p>
              <p className="text-xs text-muted-foreground">Reviewed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toggle Pending/All */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={!showCompleted ? "default" : "outline"}
          onClick={() => setShowCompleted(false)}
          className={cn(
            "gap-2",
            !showCompleted ? "bg-primary text-black" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
          )}
          data-testid="button-show-pending"
        >
          <EyeOff className="w-4 h-4" />
          Pending ({incompleteChemicals.length})
        </Button>
        <Button
          variant={showCompleted ? "default" : "outline"}
          onClick={() => setShowCompleted(true)}
          className={cn(
            "gap-2",
            showCompleted ? "bg-primary text-black" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
          )}
          data-testid="button-show-all"
        >
          <Eye className="w-4 h-4" />
          Show All ({activeChemicals.length})
        </Button>
      </div>

      {/* Chemicals List */}
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg tracking-wide flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary" />
            {showCompleted ? "ALL CHEMICAL ALERTS" : "PENDING CHEMICAL ALERTS"}
            <span className="text-xs text-muted-foreground font-normal ml-2">
              (Check box to mark as reviewed)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mb-2" />
              <p>Loading chemical alerts...</p>
            </div>
          ) : sortedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
              <p>No {showCompleted ? "" : "pending "}chemical alerts found</p>
              <p className="text-xs mt-1">All chemicals have been reviewed!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedAlerts.map((alert, idx) => {
                const isCompleted = completedIds.has(String(alert.alertId));
                return (
                  <div
                    key={`chemical-${alert.alertId}-${idx}`}
                    className={cn(
                      "group relative p-4 rounded-lg border transition-all",
                      isCompleted
                        ? "bg-[#22D69A]/5 border-[#22D69A]/20 opacity-60"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30"
                    )}
                    data-testid={`chemical-card-${alert.alertId}`}
                  >
                    {!isCompleted && alert.severity.toUpperCase() === "URGENT" && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-500/30 rounded-l-lg" />
                    )}

                    {/* Header Row with Checkbox */}
                    <div className="flex items-start gap-4 mb-3">
                      <div className="pt-1">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={(checked) => {
                            markCompleteMutation.mutate({ alertId: String(alert.alertId), completed: !!checked });
                          }}
                          className={cn(
                            "h-6 w-6 border-2",
                            isCompleted 
                              ? "border-[#22D69A] bg-[#22D69A] data-[state=checked]:bg-[#22D69A]" 
                              : "border-primary/50 data-[state=checked]:bg-primary"
                          )}
                          data-testid={`checkbox-${alert.alertId}`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={cn(
                            "font-bold text-lg transition-colors",
                            isCompleted ? "text-green-400 line-through" : "text-white group-hover:text-primary"
                          )} data-testid={`text-pool-${alert.alertId}`}>
                            {alert.poolName}
                          </h3>
                          <Badge className={cn("text-xs", getSeverityColor(alert.severity))} data-testid={`badge-severity-${alert.alertId}`}>
                            {alert.severity}
                          </Badge>
                          {isCompleted && (
                            <Badge className="bg-[#22D69A]/20 text-green-400 border-[#22D69A]/50 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Reviewed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span data-testid={`text-customer-${alert.alertId}`}>{alert.customerName}</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="mb-1">{new Date(alert.createdAt).toLocaleDateString()}</div>
                        <div>{new Date(alert.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>

                    {/* Chemical Description */}
                    <div className={cn(
                      "rounded-lg p-3 mb-3 border ml-10",
                      isCompleted ? "bg-[#22D69A]/5 border-[#22D69A]/10" : "bg-primary/5 border-primary/20"
                    )}>
                      <p className={cn("text-sm", isCompleted ? "text-gray-400" : "text-gray-200")} data-testid={`text-message-${alert.alertId}`}>
                        {alert.message}
                      </p>
                    </div>

                    {/* Contact & Location Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 ml-10">
                      {/* Location */}
                      <div className="space-y-1">
                        {alert.address && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                            <span>{alert.address}</span>
                          </div>
                        )}
                        {alert.notes && (
                          <div className="text-xs text-yellow-400/80 bg-[#FF8000]/10 px-2 py-1 rounded border border-[#FF8000]/20">
                            {alert.notes}
                          </div>
                        )}
                      </div>

                      {/* Contact */}
                      <div className="space-y-1">
                        {alert.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-primary" />
                            <a href={`tel:${alert.phone}`} className="text-blue-400 hover:text-blue-300" data-testid={`link-phone-${alert.alertId}`}>
                              {alert.phone}
                            </a>
                          </div>
                        )}
                        {alert.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-primary" />
                            <a href={`mailto:${alert.email}`} className="text-blue-400 hover:text-blue-300 truncate" data-testid={`link-email-${alert.alertId}`}>
                              {alert.email}
                            </a>
                          </div>
                        )}
                        {alert.contact && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-4 h-4 text-primary" />
                            <span>{alert.contact}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pictures */}
                    {alert.pictures && alert.pictures.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-3 ml-10">
                        {alert.pictures.slice(0, 4).map((pic, picIdx) => (
                          <img
                            key={picIdx}
                            src={pic}
                            alt={`Chemical ${picIdx + 1}`}
                            className="w-full h-24 object-cover rounded border border-white/10 hover:scale-105 transition-transform cursor-pointer"
                            data-testid={`img-chemical-${alert.alertId}-${picIdx}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Footer: Technician + Expand */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10 ml-10">
                      {alert.techName ? (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-primary" data-testid={`text-tech-${alert.alertId}`}>
                              {alert.techName}
                            </span>
                          </div>
                          {alert.techPhone && (
                            <a href={`tel:${alert.techPhone}`} className="text-sm text-blue-400 hover:text-blue-300">
                              {alert.techPhone}
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No technician assigned</span>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newExpanded = new Set(expandedAlerts);
                          if (newExpanded.has(alert.alertId)) {
                            newExpanded.delete(alert.alertId);
                          } else {
                            newExpanded.add(alert.alertId);
                          }
                          setExpandedAlerts(newExpanded);
                        }}
                        className="text-xs text-primary hover:text-primary/80"
                        data-testid={`button-expand-${alert.alertId}`}
                      >
                        <ChevronDown className={cn("w-4 h-4 transition-transform mr-1", expandedAlerts.has(alert.alertId) && "rotate-180")} />
                        {expandedAlerts.has(alert.alertId) ? "Hide Details" : "View Full Data"}
                      </Button>
                    </div>

                    {/* Expanded Raw Data */}
                    {expandedAlerts.has(alert.alertId) && alert.rawAlert && (
                      <div className="mt-4 pt-4 border-t border-white/10 ml-10">
                        <h5 className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Complete Pool Brain Data
                        </h5>
                        <div className="bg-black/40 rounded-lg p-3 max-h-96 overflow-y-auto custom-scrollbar">
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words font-mono">
                            {JSON.stringify(alert.rawAlert, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
