import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, MapPin, Building2, Phone, Mail, User, ChevronDown, AlertCircle, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export default function Repairs() {
  const queryClient = useQueryClient();
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [showResolved, setShowResolved] = useState(false);

  const { data: alertsData = { alerts: [] }, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["enrichedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/enriched");
      if (!res.ok) throw new Error("Failed to fetch enriched alerts");
      return res.json();
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
      msgLower.includes("heater") ||
      msgLower.includes("motor") ||
      msgLower.includes("valve")
    );
  };

  const repairAlerts = allAlerts.filter(isRepairAlert);
  const activeRepairs = repairAlerts.filter(a => a.status === "Active");
  const resolvedRepairs = repairAlerts.filter(a => a.status !== "Active");

  const displayedAlerts = showResolved ? repairAlerts : activeRepairs;

  const sortedAlerts = [...displayedAlerts].sort((a, b) => {
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
    if (upper.includes("HIGH")) return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    if (upper.includes("MEDIUM")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    return "bg-blue-500/20 text-blue-400 border-blue-500/50";
  };

  const urgentCount = activeRepairs.filter(a => a.severity.toUpperCase() === "URGENT").length;

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight flex items-center gap-3">
            <Wrench className="w-8 h-8 text-primary" />
            REPAIRS CENTER
          </h2>
          <p className="text-muted-foreground font-ui tracking-wide">
            {activeRepairs.length} Active Repairs • {urgentCount > 0 ? `${urgentCount} Urgent` : "No urgent repairs"}
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          className="bg-primary text-black hover:bg-primary/80 font-bold gap-2"
          data-testid="button-refresh-repairs"
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
              <Wrench className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-ui">{activeRepairs.length}</p>
              <p className="text-xs text-muted-foreground">Active Repairs</p>
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
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-ui">
                {activeRepairs.filter(a => a.severity.toUpperCase() === "HIGH").length}
              </p>
              <p className="text-xs text-muted-foreground">High Priority</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-ui">{resolvedRepairs.length}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toggle Active/All */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={!showResolved ? "default" : "outline"}
          onClick={() => setShowResolved(false)}
          className={cn(
            "gap-2",
            !showResolved ? "bg-primary text-black" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
          )}
          data-testid="button-show-active"
        >
          <Wrench className="w-4 h-4" />
          Active ({activeRepairs.length})
        </Button>
        <Button
          variant={showResolved ? "default" : "outline"}
          onClick={() => setShowResolved(true)}
          className={cn(
            "gap-2",
            showResolved ? "bg-primary text-black" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
          )}
          data-testid="button-show-all"
        >
          All Repairs ({repairAlerts.length})
        </Button>
      </div>

      {/* Repairs List */}
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg tracking-wide flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            {showResolved ? "ALL REPAIRS" : "ACTIVE REPAIRS"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mb-2" />
              <p>Loading repairs...</p>
            </div>
          ) : sortedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
              <p>No {showResolved ? "" : "active "}repairs found</p>
              <p className="text-xs mt-1">All equipment is operational</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedAlerts.map((alert, idx) => (
                <div
                  key={`repair-${alert.alertId}-${idx}`}
                  className={cn(
                    "group relative p-4 rounded-lg border transition-all",
                    alert.status === "Active"
                      ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30"
                      : "bg-white/2 border-white/5 opacity-70"
                  )}
                  data-testid={`repair-card-${alert.alertId}`}
                >
                  {alert.status === "Active" && alert.severity.toUpperCase() === "URGENT" && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-500/30 rounded-l-lg" />
                  )}

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors" data-testid={`text-pool-${alert.alertId}`}>
                          {alert.poolName}
                        </h3>
                        <Badge className={cn("text-xs", getSeverityColor(alert.severity))} data-testid={`badge-severity-${alert.alertId}`}>
                          {alert.severity}
                        </Badge>
                        {alert.status !== "Active" && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                            Resolved
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

                  {/* Repair Description */}
                  <div className="bg-white/5 rounded-lg p-3 mb-3 border border-white/5">
                    <p className="text-sm text-gray-200" data-testid={`text-message-${alert.alertId}`}>
                      {alert.message}
                    </p>
                  </div>

                  {/* Contact & Location Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {/* Location */}
                    <div className="space-y-1">
                      {alert.address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                          <span>{alert.address}</span>
                        </div>
                      )}
                      {alert.notes && (
                        <div className="text-xs text-yellow-400/80 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
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
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {alert.pictures.slice(0, 4).map((pic, picIdx) => (
                        <img
                          key={picIdx}
                          src={pic}
                          alt={`Repair ${picIdx + 1}`}
                          className="w-full h-24 object-cover rounded border border-white/10 hover:scale-105 transition-transform cursor-pointer"
                          data-testid={`img-repair-${alert.alertId}-${picIdx}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Footer: Technician + Expand */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
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
                    <div className="mt-4 pt-4 border-t border-white/10">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
