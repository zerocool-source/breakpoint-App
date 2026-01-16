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
  pictures?: string[];
  techName?: string;
  techPhone?: string;
  techEmail?: string;
  techId?: number;
  rawAlert?: any;
}

interface EnrichedAlertsFeedProps {
  className?: string;
}

export function EnrichedAlertsFeed({ className }: EnrichedAlertsFeedProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

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
    
    // Chemicals added
    if (msgLower.includes("added") || 
        msgLower.includes("requesting") ||
        msgLower.includes("drum") ||
        msgLower.includes("carboy") ||
        msgLower.includes("bag")) {
      categories.push("chemicals-added");
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
    if (upper === "URGENT") return "bg-destructive/15 text-destructive border-destructive/30";
    if (upper.includes("CRITICAL")) return "bg-destructive/15 text-destructive border-destructive/30";
    if (upper.includes("HIGH")) return "bg-secondary/15 text-secondary border-secondary/30";
    if (upper.includes("MEDIUM")) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    return "bg-primary/15 text-primary border-primary/30";
  };

  const activeAlerts = alerts.filter((a: EnrichedAlert) => a.status === "Active");
  
  // Count alerts by category
  const categoryCounts = {
    all: alerts.length,
    algae: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("algae")).length,
    repair: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("repair")).length,
    "chemicals-added": alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("chemicals-added")).length,
    time: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("time")).length,
    system: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("system")).length,
    chemical: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("chemical")).length,
    other: alerts.filter((a: EnrichedAlert) => categorizeAlert(a).includes("other")).length,
  };

  return (
    <Card className={cn("bg-white border-slate-200 shadow-sm flex flex-col rounded-xl overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 flex-shrink-0 border-b border-slate-200 bg-slate-50">
        <CardTitle className="font-display text-xl tracking-wide flex items-center gap-3 text-slate-800">
          <div className="p-2 rounded-lg bg-[#f5a962]">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          LIVE SYSTEM ALERTS
        </CardTitle>
        <Badge className={cn(
          "border-red-400 bg-red-100 font-bold px-3 py-1",
          activeAlerts.length > 0 ? "text-red-600 animate-pulse" : "text-slate-500"
        )}>
          {activeAlerts.length} Active
        </Badge>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 pt-4 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={(v) => { setSelectedTab(v); setShowAll(false); }} className="flex flex-col flex-1">
          <TabsList className="grid grid-cols-7 mb-4 bg-[#F1F5F9] border border-[#E2E8F0]">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white text-[#64748B] text-[10px] font-semibold">
              All ({categoryCounts.all})
            </TabsTrigger>
            <TabsTrigger value="algae" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white text-[#64748B] text-[10px] font-semibold">
              Algae ({categoryCounts.algae})
            </TabsTrigger>
            <TabsTrigger value="repair" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white text-[#64748B] text-[10px] font-semibold">
              Repair ({categoryCounts.repair})
            </TabsTrigger>
            <TabsTrigger value="chemicals-added" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white text-[#64748B] text-[10px] font-semibold">
              Chem+ ({categoryCounts["chemicals-added"]})
            </TabsTrigger>
            <TabsTrigger value="time" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white text-[#64748B] text-[10px] font-semibold">
              Time ({categoryCounts.time})
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white text-[#64748B] text-[10px] font-semibold">
              System ({categoryCounts.system})
            </TabsTrigger>
            <TabsTrigger value="other" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white text-[#64748B] text-[10px] font-semibold">
              Other ({categoryCounts.other})
            </TabsTrigger>
          </TabsList>

          {["all", "algae", "repair", "chemicals-added", "time", "system", "other"].map((tab) => (
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
                      className="group relative p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#60A5FA] transition-all duration-200"
                      data-testid={`alert-card-${alert.alertId}`}
                    >
                      {alert.status === "Active" && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-red-500 via-[#f5a962] to-transparent rounded-l-xl" />
                      )}
                      
                      {/* Header: Pool + Customer */}
                      <div className="mb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm leading-tight text-slate-800 group-hover:text-[#0891b2] transition-colors truncate" data-testid={`text-pool-${alert.alertId}`}>
                              {alert.poolName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 truncate">
                              <Building2 className="w-3 h-3 flex-shrink-0 text-[#0891b2]" />
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
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-secondary" />
                            <span className="truncate">{alert.address}</span>
                          </div>
                        )}
                        {alert.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3 flex-shrink-0 text-secondary" />
                            <a href={`tel:${alert.phone}`} className="text-primary hover:text-primary/80 truncate" data-testid={`link-phone-${alert.alertId}`}>
                              {alert.phone}
                            </a>
                          </div>
                        )}
                        {alert.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3 flex-shrink-0 text-secondary" />
                            <a href={`mailto:${alert.email}`} className="text-primary hover:text-primary/80 truncate" data-testid={`link-email-${alert.alertId}`}>
                              {alert.email}
                            </a>
                          </div>
                        )}
                        {alert.contact && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3 flex-shrink-0 text-secondary" />
                            <span className="truncate">{alert.contact}</span>
                          </div>
                        )}
                      </div>

                      {/* Alert Message */}
                      <p className="text-sm text-foreground/80 mb-2 leading-relaxed line-clamp-2" data-testid={`text-message-${alert.alertId}`}>
                        {alert.message}
                      </p>

                      {/* Pictures if available */}
                      {alert.pictures && alert.pictures.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {alert.pictures.slice(0, 3).map((pic, picIdx) => (
                            <img 
                              key={picIdx}
                              src={pic} 
                              alt={`Alert picture ${picIdx + 1}`}
                              className="w-full h-20 object-cover rounded border border-border hover:scale-105 transition-transform cursor-pointer"
                              data-testid={`img-alert-${alert.alertId}-${picIdx}`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Notes if available */}
                      {alert.notes && (
                        <div className="bg-muted rounded px-2 py-1 mb-2 text-xs text-muted-foreground border border-border">
                          <p className="line-clamp-1">{alert.notes}</p>
                        </div>
                      )}

                      {/* Technician Info */}
                      {alert.techName && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                          <div className="flex items-center gap-2 px-2 py-1 rounded bg-primary/10 border border-primary/30">
                            <User className="w-3 h-3 text-primary flex-shrink-0" />
                            <span className="text-xs font-medium text-primary" data-testid={`text-tech-${alert.alertId}`}>
                              {alert.techName}
                            </span>
                          </div>
                          {alert.techPhone && (
                            <a href={`tel:${alert.techPhone}`} className="text-xs text-primary hover:text-primary/80">
                              {alert.techPhone}
                            </a>
                          )}
                        </div>
                      )}

                      {/* Footer: Type + Status + Expand Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                        <div className="flex gap-2 items-center">
                          <span className="bg-muted px-2 py-1 rounded text-muted-foreground text-[10px] border border-border" data-testid={`text-type-${alert.alertId}`}>
                            {alert.type}
                          </span>
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
                            className="h-6 px-2 text-[10px] text-primary hover:text-primary/80"
                            data-testid={`button-expand-${alert.alertId}`}
                          >
                            <ChevronDown className={cn("w-3 h-3 transition-transform mr-1", expandedAlerts.has(alert.alertId) && "rotate-180")} />
                            {expandedAlerts.has(alert.alertId) ? "Hide" : "Show All"}
                          </Button>
                        </div>
                        <time className="text-muted-foreground text-[10px]" data-testid={`text-time-${alert.alertId}`}>
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </time>
                      </div>

                      {/* Expanded Raw Data Section */}
                      {expandedAlerts.has(alert.alertId) && alert.rawAlert && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <h5 className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Complete Alert Data
                          </h5>
                          <div className="bg-foreground/5 rounded p-2 max-h-96 overflow-y-auto custom-scrollbar border border-border">
                            <pre className="text-[10px] text-foreground/70 whitespace-pre-wrap break-words font-mono">
                              {JSON.stringify(alert.rawAlert, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Show All / Show Less Button */}
                  {hasMore && (
                    <Button
                      onClick={() => setShowAll(!showAll)}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs mt-2 bg-muted border-border hover:bg-muted hover:border-primary/30"
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
