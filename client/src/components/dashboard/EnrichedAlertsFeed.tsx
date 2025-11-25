import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, MapPin, Building2, AlertCircle, ChevronDown, Mail, Phone, User, Clock, Wrench, Flame, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
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
}

interface EnrichedAlertsFeedProps {
  className?: string;
}

export function EnrichedAlertsFeed({ className }: EnrichedAlertsFeedProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");

  const { data: alertsData = { alerts: [] }, isLoading } = useQuery({
    queryKey: ["enrichedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/enriched");
      if (!res.ok) throw new Error("Failed to fetch enriched alerts");
      return res.json();
    },
  });

  const alerts = alertsData.alerts || [];
  
  // Categorize alerts
  const categorizeAlert = (alert: EnrichedAlert): string[] => {
    const categories: string[] = [];
    const msgLower = alert.message.toLowerCase();
    const typeLower = alert.type.toLowerCase();
    
    // Check for algae
    if (msgLower.includes("algae") || typeLower.includes("algae")) {
      categories.push("algae");
    }
    
    // Check for time-related issues
    if (msgLower.includes("not enough time") || 
        msgLower.includes("insufficient time") ||
        typeLower.includes("notcompleted") ||
        typeLower.includes("not completed")) {
      categories.push("time");
    }
    
    // System issues
    if (alert.type === "SystemIssue" || msgLower.includes("system")) {
      categories.push("system");
    }
    
    // Repair/maintenance issues
    if (alert.type === "IssueReport" || 
        msgLower.includes("repair") ||
        msgLower.includes("broken") ||
        msgLower.includes("fix")) {
      categories.push("repair");
    }
    
    // Chemical alerts
    if (msgLower.includes("chemical") ||
        msgLower.includes("chlorine") ||
        msgLower.includes("ph") ||
        msgLower.includes("orp")) {
      categories.push("chemical");
    }
    
    return categories.length > 0 ? categories : ["other"];
  };

  // Filter alerts based on tab
  const filterAlerts = (tab: string) => {
    if (tab === "all") return alerts;
    return alerts.filter((alert: EnrichedAlert) => {
      const cats = categorizeAlert(alert);
      return cats.includes(tab);
    });
  };

  const filteredAlerts = filterAlerts(selectedTab);
  
  // Sort by severity: URGENT first, then Active status first
  const sortedAlerts = [...filteredAlerts].sort((a: EnrichedAlert, b: EnrichedAlert) => {
    const severityOrder = { URGENT: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
    const aSev = severityOrder[a.severity.toUpperCase() as keyof typeof severityOrder] ?? 5;
    const bSev = severityOrder[b.severity.toUpperCase() as keyof typeof severityOrder] ?? 5;
    if (aSev !== bSev) return aSev - bSev;
    
    // Then sort by status (Active first)
    if (a.status === "Active" && b.status !== "Active") return -1;
    if (a.status !== "Active" && b.status === "Active") return 1;
    return 0;
  });

  // Show only top 5, unless "Show All" is clicked
  const displayedAlerts = showAll ? sortedAlerts : sortedAlerts.slice(0, 5);
  const hasMore = sortedAlerts.length > 5;

  const getSeverityColor = (severity: string) => {
    const upper = severity.toUpperCase();
    if (upper === "URGENT") return "bg-red-500/20 text-red-400 border-red-500/50";
    if (upper.includes("CRITICAL")) return "bg-destructive/20 text-destructive border-destructive/50";
    if (upper.includes("HIGH")) return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    if (upper.includes("MEDIUM")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    return "bg-blue-500/20 text-blue-400 border-blue-500/50";
  };

  const activeAlerts = alerts.filter((a: EnrichedAlert) => a.status === "Active");
  
  // Count alerts by category
  const categoryCounts = {
    all: alerts.length,
    algae: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("algae")).length,
    time: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("time")).length,
    system: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("system")).length,
    repair: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("repair")).length,
    chemical: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("chemical")).length,
    other: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("other")).length,
  };

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
      
      <CardContent className="flex flex-col flex-1 pt-4 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={(v) => { setSelectedTab(v); setShowAll(false); }} className="flex flex-col flex-1">
          <TabsList className="grid grid-cols-7 mb-4 bg-white/5 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-black text-xs">
              All ({categoryCounts.all})
            </TabsTrigger>
            <TabsTrigger value="algae" className="data-[state=active]:bg-primary data-[state=active]:text-black text-xs flex items-center gap-1">
              <Droplet className="w-3 h-3" /> Algae ({categoryCounts.algae})
            </TabsTrigger>
            <TabsTrigger value="time" className="data-[state=active]:bg-primary data-[state=active]:text-black text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time ({categoryCounts.time})
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-primary data-[state=active]:text-black text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> System ({categoryCounts.system})
            </TabsTrigger>
            <TabsTrigger value="repair" className="data-[state=active]:bg-primary data-[state=active]:text-black text-xs flex items-center gap-1">
              <Wrench className="w-3 h-3" /> Repair ({categoryCounts.repair})
            </TabsTrigger>
            <TabsTrigger value="chemical" className="data-[state=active]:bg-primary data-[state=active]:text-black text-xs flex items-center gap-1">
              <Flame className="w-3 h-3" /> Chemical ({categoryCounts.chemical})
            </TabsTrigger>
            <TabsTrigger value="other" className="data-[state=active]:bg-primary data-[state=active]:text-black text-xs">
              Other ({categoryCounts.other})
            </TabsTrigger>
          </TabsList>

          {["all", "algae", "time", "system", "repair", "chemical", "other"].map((tab) => (
            <TabsContent key={tab} value={tab} className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mt-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <p>Loading alerts...</p>
                </div>
              ) : displayedAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                  <p>No {tab !== "all" ? tab : ""} alerts</p>
                  <p className="text-xs mt-1">All systems operational</p>
                </div>
              ) : (
                <>
                  {displayedAlerts.map((alert: EnrichedAlert, idx: number) => (
                    <div 
                      key={`alert-${alert.poolId}-${alert.customerName}-${idx}`}
                      className="group relative p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all"
                      data-testid={`alert-card-${alert.alertId}`}
                    >
                      {alert.status === "Active" && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-destructive to-transparent rounded-l-lg opacity-50 group-hover:opacity-100" />
                      )}
                      
                      {/* Header: Pool + Customer */}
                      <div className="mb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm leading-tight text-white group-hover:text-primary transition-colors truncate" data-testid={`text-pool-${alert.alertId}`}>
                              {alert.poolName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground truncate">
                              <Building2 className="w-3 h-3 flex-shrink-0" />
                              <span data-testid={`text-customer-${alert.alertId}`} className="truncate">{alert.customerName}</span>
                            </div>
                          </div>
                          <Badge className={cn("font-mono text-[10px] uppercase tracking-wider shrink-0", getSeverityColor(alert.severity))} data-testid={`badge-severity-${alert.alertId}`}>
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>

                      {/* Customer Info Row */}
                      <div className="grid grid-cols-1 gap-1 mb-2 text-xs">
                        {alert.address && (
                          <div className="flex items-start gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="truncate">{alert.address}</span>
                          </div>
                        )}
                        {alert.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <a href={`tel:${alert.phone}`} className="text-blue-400 hover:text-blue-300 truncate" data-testid={`link-phone-${alert.alertId}`}>
                              {alert.phone}
                            </a>
                          </div>
                        )}
                        {alert.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <a href={`mailto:${alert.email}`} className="text-blue-400 hover:text-blue-300 truncate" data-testid={`link-email-${alert.alertId}`}>
                              {alert.email}
                            </a>
                          </div>
                        )}
                        {alert.contact && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{alert.contact}</span>
                          </div>
                        )}
                      </div>

                      {/* Alert Message */}
                      <p className="text-sm text-gray-300 mb-2 leading-relaxed line-clamp-2" data-testid={`text-message-${alert.alertId}`}>
                        {alert.message}
                      </p>

                      {/* Notes if available */}
                      {alert.notes && (
                        <div className="bg-white/5 rounded px-2 py-1 mb-2 text-xs text-muted-foreground border border-white/5">
                          <p className="line-clamp-1">{alert.notes}</p>
                        </div>
                      )}

                      {/* Footer: Type + Status */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                        <div className="flex gap-2">
                          <span className="bg-white/5 px-2 py-1 rounded text-muted-foreground text-[10px]" data-testid={`text-type-${alert.alertId}`}>
                            {alert.type}
                          </span>
                        </div>
                        <time className="text-muted-foreground text-[10px]" data-testid={`text-time-${alert.alertId}`}>
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </time>
                      </div>
                    </div>
                  ))}

                  {/* Show All / Show Less Button */}
                  {hasMore && (
                    <Button
                      onClick={() => setShowAll(!showAll)}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs mt-2 bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30"
                      data-testid="button-toggle-all-alerts"
                    >
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showAll && "rotate-180")} />
                      {showAll ? `Show Top 5` : `Show All (${sortedAlerts.length})`}
                    </Button>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
