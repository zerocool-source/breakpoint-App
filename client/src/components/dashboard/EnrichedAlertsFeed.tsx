import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, MapPin, Building2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface EnrichedAlert {
  alertId: string;
  poolId: string;
  poolName: string;
  customerId: string | null;
  customerName: string;
  address: string;
  notes: string;
  message: string;
  type: string;
  severity: string;
  status: string;
  createdAt: string;
}

interface EnrichedAlertsFeedProps {
  className?: string;
}

export function EnrichedAlertsFeed({ className }: EnrichedAlertsFeedProps) {
  const queryClient = useQueryClient();

  const { data: alertsData = { alerts: [] }, isLoading } = useQuery({
    queryKey: ["enrichedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/enriched");
      if (!res.ok) throw new Error("Failed to fetch enriched alerts");
      return res.json();
    },
  });

  const alerts = alertsData.alerts || [];

  const getSeverityColor = (severity: string) => {
    const upper = severity.toUpperCase();
    if (upper === "URGENT") return "bg-red-500/20 text-red-400 border-red-500/50";
    if (upper.includes("CRITICAL")) return "bg-destructive/20 text-destructive border-destructive/50";
    if (upper.includes("HIGH")) return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    if (upper.includes("MEDIUM")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    return "bg-blue-500/20 text-blue-400 border-blue-500/50";
  };

  const activeAlerts = alerts.filter((a: EnrichedAlert) => a.status === "Active");

  return (
    <Card className={cn("glass-card border-white/5 flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
        <CardTitle className="font-display text-lg tracking-wide flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          LIVE SYSTEM ALERTS
        </CardTitle>
        <Badge variant="outline" className={cn(
          "border-destructive/30 bg-destructive/10",
          activeAlerts.length > 0 ? "text-destructive animate-pulse" : "text-muted-foreground"
        )}>
          {activeAlerts.length} Active
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-4 overflow-y-auto custom-scrollbar flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
            <p>No alerts</p>
            <p className="text-xs mt-1">All systems operational</p>
          </div>
        ) : (
          alerts.map((alert: EnrichedAlert) => (
            <div 
              key={alert.alertId} 
              className="group relative p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all"
              data-testid={`alert-card-${alert.alertId}`}
            >
              {alert.status === "Active" && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-destructive to-transparent rounded-l-lg opacity-50 group-hover:opacity-100" />
              )}
              
              {/* Header: Pool + Customer */}
              <div className="mb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-sm leading-tight text-white group-hover:text-primary transition-colors" data-testid={`text-pool-${alert.alertId}`}>
                      {alert.poolName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      <span data-testid={`text-customer-${alert.alertId}`}>{alert.customerName}</span>
                    </div>
                  </div>
                  <Badge className={cn("font-mono text-[10px] uppercase tracking-wider shrink-0", getSeverityColor(alert.severity))} data-testid={`badge-severity-${alert.alertId}`}>
                    {alert.severity}
                  </Badge>
                </div>
              </div>

              {/* Location */}
              {alert.address && (
                <div className="flex items-start gap-1 mb-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span className="leading-snug">{alert.address}</span>
                </div>
              )}

              {/* Alert Message */}
              <p className="text-sm text-gray-300 mb-2 leading-relaxed" data-testid={`text-message-${alert.alertId}`}>
                {alert.message}
              </p>

              {/* Notes if available */}
              {alert.notes && (
                <div className="bg-white/5 rounded px-2 py-1 mb-2 text-xs text-muted-foreground border border-white/5">
                  <p className="line-clamp-2">{alert.notes}</p>
                </div>
              )}

              {/* Footer: Type + Time + Status */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                <div className="flex gap-2">
                  <span className="bg-white/5 px-2 py-1 rounded text-muted-foreground" data-testid={`text-type-${alert.alertId}`}>
                    {alert.type}
                  </span>
                  {alert.status === "Resolved" && (
                    <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Resolved
                    </span>
                  )}
                </div>
                <time className="text-muted-foreground" data-testid={`text-time-${alert.alertId}`}>
                  {new Date(alert.createdAt).toLocaleDateString()}
                </time>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
