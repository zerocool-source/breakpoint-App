import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Wrench, Droplets, AlertTriangle, CalendarIcon, AlertCircle,
  Filter, Clock, CheckCircle, XCircle, FileText, User, MapPin, Loader2, Wind, Archive, Building2, ExternalLink
} from "lucide-react";
import type { TechOpsEntry, Emergency } from "@shared/schema";
import { cn } from "@/lib/utils";

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
  techName?: string;
  techId?: number;
}

interface UnifiedEntry {
  id: string;
  entryType: string;
  propertyName: string;
  technicianName: string;
  description: string;
  status: string;
  priority?: string;
  createdAt: string;
  source: 'tech_ops' | 'chemical_alert' | 'emergency';
}

const entryTypeConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  repairs_needed: { label: "Repairs Needed", color: "text-red-600", bgColor: "bg-red-50", icon: Wrench },
  service_repairs: { label: "Service Repairs", color: "text-teal-600", bgColor: "bg-teal-50", icon: Wrench },
  chemical_order: { label: "Chemical Orders", color: "text-[#0077b6]", bgColor: "bg-sky-50", icon: Droplets },
  chemicals_dropoff: { label: "Chemicals Dropped-Off", color: "text-emerald-600", bgColor: "bg-emerald-50", icon: Droplets },
  chemical_alert: { label: "Chemical Alerts", color: "text-[#0077b6]", bgColor: "bg-sky-50", icon: Droplets },
  windy_day_cleanup: { label: "Windy Day Clean Up", color: "text-cyan-600", bgColor: "bg-cyan-50", icon: Wind },
  report_issue: { label: "Report Issues", color: "text-[#f97316]", bgColor: "bg-orange-50", icon: AlertTriangle },
  emergencies: { label: "Emergencies", color: "text-red-600", bgColor: "bg-red-50", icon: AlertCircle },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_review: { label: "Pending Review", color: "bg-amber-100 text-amber-800", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-teal-100 text-teal-700", icon: FileText },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  in_progress: { label: "In Progress", color: "bg-teal-100 text-teal-700", icon: Clock },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-600", icon: XCircle },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-500", icon: Archive },
  Active: { label: "Active", color: "bg-orange-100 text-orange-700", icon: Clock },
};

const filterTabs = [
  { key: "all", label: "All" },
  { key: "repairs_needed", label: "Repairs Needed" },
  { key: "service_repairs", label: "Service Repairs" },
  { key: "chemical_order", label: "Chemical Orders" },
  { key: "chemicals_dropoff", label: "Chemicals Dropped-Off" },
  { key: "chemical_alert", label: "Chemical Alerts" },
  { key: "windy_day_cleanup", label: "Windy Day Clean Up" },
  { key: "report_issue", label: "Report Issues" },
  { key: "emergencies", label: "Emergencies" },
];

export default function TechOpsLanding() {
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [selectedTechs, setSelectedTechs] = useState<Set<string>>(new Set());

  const navigateToEntry = (entry: UnifiedEntry) => {
    const entryId = entry.id.replace(/^(alert-|emergency-)/, '');
    
    switch (entry.entryType) {
      case 'repairs_needed':
      case 'service_repairs':
        setLocation(`/repairs?highlight=${entryId}&type=${entry.entryType}`);
        break;
      case 'chemical_order':
      case 'chemicals_dropoff':
      case 'chemical_alert':
        setLocation(`/chemicals?highlight=${entryId}&type=${entry.entryType}`);
        break;
      case 'windy_day_cleanup':
      case 'report_issue':
        setLocation(`/service?highlight=${entryId}&type=${entry.entryType}`);
        break;
      case 'emergencies':
        setLocation(`/repairs?highlight=${entryId}&type=emergency`);
        break;
      default:
        setLocation(`/repairs?highlight=${entryId}`);
    }
  };

  // Fetch TechOps entries
  const { data: techOpsEntries = [], isLoading: techOpsLoading } = useQuery<TechOpsEntry[]>({
    queryKey: ["tech-ops-all", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", startOfDay(dateRange.from).toISOString());
      params.set("endDate", endOfDay(dateRange.to).toISOString());
      const response = await fetch(`/api/tech-ops?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch entries");
      return response.json();
    },
  });

  // Fetch Chemical Alerts
  const { data: alertsData = { alerts: [] }, isLoading: alertsLoading } = useQuery({
    queryKey: ["enrichedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/enriched");
      if (!res.ok) throw new Error("Failed to fetch enriched alerts");
      return res.json();
    },
  });

  // Fetch Emergencies
  const { data: emergencies = [], isLoading: emergenciesLoading } = useQuery<Emergency[]>({
    queryKey: ["emergencies"],
    queryFn: async () => {
      const res = await fetch("/api/emergencies");
      if (!res.ok) throw new Error("Failed to fetch emergencies");
      return res.json();
    },
  });

  // Filter chemical alerts to only chemical-related ones
  const chemicalAlerts: EnrichedAlert[] = useMemo(() => {
    const allAlerts = alertsData.alerts || [];
    return allAlerts.filter((alert: EnrichedAlert) => {
      const msgLower = alert.message.toLowerCase();
      return (
        msgLower.includes("chlorine") || msgLower.includes("acid") || msgLower.includes("chemical") ||
        msgLower.includes("ph") || msgLower.includes("orp") || msgLower.includes("bleach") ||
        msgLower.includes("drum") || msgLower.includes("carboy") || msgLower.includes("tank") ||
        msgLower.includes("muriatic") || msgLower.includes("tabs") || msgLower.includes("calcium")
      );
    });
  }, [alertsData]);

  // Convert all data sources to unified entries
  const unifiedEntries: UnifiedEntry[] = useMemo(() => {
    const entries: UnifiedEntry[] = [];

    // Add TechOps entries
    techOpsEntries.forEach(e => {
      entries.push({
        id: e.id,
        entryType: e.entryType,
        propertyName: e.propertyName || "Unknown Property",
        technicianName: e.technicianName || "Unknown",
        description: e.description || "",
        status: e.status || "pending",
        priority: e.priority ?? undefined,
        createdAt: e.createdAt?.toString() || new Date().toISOString(),
        source: 'tech_ops',
      });
    });

    // Add Chemical Alerts
    chemicalAlerts.forEach(a => {
      entries.push({
        id: `alert-${a.alertId}`,
        entryType: "chemical_alert",
        propertyName: a.poolName || a.customerName || "Unknown Property",
        technicianName: a.techName || "Unknown",
        description: a.message,
        status: a.status,
        priority: a.severity,
        createdAt: a.createdAt,
        source: 'chemical_alert',
      });
    });

    // Add Emergencies
    emergencies.forEach(e => {
      entries.push({
        id: `emergency-${e.id}`,
        entryType: "emergencies",
        propertyName: e.propertyName || "Unknown Property",
        technicianName: e.submittedByName || "Unknown",
        description: e.description || "",
        status: e.status || "pending_review",
        priority: e.priority ?? undefined,
        createdAt: e.createdAt?.toString() || new Date().toISOString(),
        source: 'emergency',
      });
    });

    // Sort by date descending
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return entries;
  }, [techOpsEntries, chemicalAlerts, emergencies]);

  // Get unique properties and technicians for filters
  const uniqueProperties = useMemo(() => {
    const props = new Set<string>();
    unifiedEntries.forEach(e => {
      if (e.propertyName && e.propertyName !== "Unknown Property") {
        props.add(e.propertyName);
      }
    });
    return Array.from(props).sort();
  }, [unifiedEntries]);

  const uniqueTechs = useMemo(() => {
    const techs = new Set<string>();
    unifiedEntries.forEach(e => {
      if (e.technicianName && e.technicianName !== "Unknown") {
        techs.add(e.technicianName);
      }
    });
    return Array.from(techs).sort();
  }, [unifiedEntries]);

  // Count by type for tabs
  const countsByType = useMemo(() => {
    const counts: Record<string, number> = { all: unifiedEntries.length };
    unifiedEntries.forEach(e => {
      counts[e.entryType] = (counts[e.entryType] || 0) + 1;
    });
    return counts;
  }, [unifiedEntries]);

  // Filter entries based on selected filters
  const filteredEntries = useMemo(() => {
    let result = unifiedEntries;

    // Filter by type
    if (selectedType !== "all") {
      result = result.filter(e => e.entryType === selectedType);
    }

    // Filter by selected properties
    if (selectedProperties.size > 0) {
      result = result.filter(e => selectedProperties.has(e.propertyName));
    }

    // Filter by selected technicians
    if (selectedTechs.size > 0) {
      result = result.filter(e => selectedTechs.has(e.technicianName));
    }

    return result;
  }, [unifiedEntries, selectedType, selectedProperties, selectedTechs]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return format(new Date(date), "MMM d, yyyy h:mm a");
  };

  const toggleProperty = (prop: string) => {
    setSelectedProperties(prev => {
      const next = new Set(prev);
      if (next.has(prop)) {
        next.delete(prop);
      } else {
        next.add(prop);
      }
      return next;
    });
  };

  const toggleTech = (tech: string) => {
    setSelectedTechs(prev => {
      const next = new Set(prev);
      if (next.has(tech)) {
        next.delete(tech);
      } else {
        next.add(tech);
      }
      return next;
    });
  };

  const isLoading = techOpsLoading || alertsLoading || emergenciesLoading;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900" data-testid="text-heading-techops">Tech Ops Alerts</h1>
              <p className="text-slate-500 text-xs">Unified feed of all field technician submissions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-sm h-9 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50" data-testid="button-date-range">
                  <CalendarIcon className="w-4 h-4 text-slate-500" />
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filter Tabs - QuickBooks Pill Style */}
        <div className="flex flex-wrap gap-2" data-testid="filter-tabs">
          {filterTabs.map(tab => {
            const count = countsByType[tab.key] || 0;
            const config = entryTypeConfig[tab.key];
            const isActive = selectedType === tab.key;
            const TabIcon = config?.icon || FileText;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedType(tab.key)}
                className={cn(
                  "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-sm font-medium transition-all duration-200",
                  "border",
                  isActive 
                    ? "bg-white border-[#0077b6] ring-1 ring-[#0077b6]/20" 
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
                data-testid={`filter-tab-${tab.key}`}
              >
                {/* Dark circular icon */}
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  isActive ? "bg-[#0077b6]" : "bg-slate-800"
                )}>
                  <TabIcon className="w-3 h-3 text-white" />
                </div>
                <span className={cn(
                  "text-sm",
                  isActive ? "text-[#0077b6] font-semibold" : "text-slate-700"
                )}>{tab.label}</span>
                <span 
                  className={cn(
                    "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium",
                    isActive 
                      ? "bg-[#0077b6]/10 text-[#0077b6]" 
                      : "text-slate-500"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Left Column - Filters */}
          <div className="lg:col-span-1 space-y-3">
            {/* Select Properties */}
            <Card className="bg-white border border-slate-200 rounded-lg" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Select Properties
                  {selectedProperties.size > 0 && (
                    <Badge className="ml-auto bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">{selectedProperties.size}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[180px] px-3 py-2">
                  {selectedProperties.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 mb-2 h-7"
                      onClick={() => setSelectedProperties(new Set())}
                      data-testid="clear-properties"
                    >
                      Clear selection
                    </Button>
                  )}
                  <div className="space-y-1">
                    {uniqueProperties.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No properties found</p>
                    ) : (
                      uniqueProperties.map(prop => (
                        <div key={prop} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-slate-50">
                          <Checkbox
                            id={`prop-${prop}`}
                            checked={selectedProperties.has(prop)}
                            onCheckedChange={() => toggleProperty(prop)}
                            className="data-[state=checked]:bg-[#f97316] data-[state=checked]:border-[#f97316]"
                            data-testid={`checkbox-prop-${prop}`}
                          />
                          <Label 
                            htmlFor={`prop-${prop}`} 
                            className="text-xs text-slate-700 cursor-pointer truncate flex-1"
                          >
                            {prop}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Select Technicians */}
            <Card className="bg-white border border-slate-200 rounded-lg" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Select Technicians
                  {selectedTechs.size > 0 && (
                    <Badge className="ml-auto bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">{selectedTechs.size}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[180px] px-3 py-2">
                  {selectedTechs.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 mb-2 h-7"
                      onClick={() => setSelectedTechs(new Set())}
                      data-testid="clear-technicians"
                    >
                      Clear selection
                    </Button>
                  )}
                  <div className="space-y-1">
                    {uniqueTechs.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No technicians found</p>
                    ) : (
                      uniqueTechs.map(tech => (
                        <div key={tech} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-slate-50">
                          <Checkbox
                            id={`tech-${tech}`}
                            checked={selectedTechs.has(tech)}
                            onCheckedChange={() => toggleTech(tech)}
                            className="data-[state=checked]:bg-[#f97316] data-[state=checked]:border-[#f97316]"
                            data-testid={`checkbox-tech-${tech}`}
                          />
                          <Label 
                            htmlFor={`tech-${tech}`} 
                            className="text-xs text-slate-700 cursor-pointer truncate flex-1"
                          >
                            {tech}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Unified Feed */}
          <div className="lg:col-span-3">
            <Card className="bg-white h-full border border-slate-200 rounded-lg" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    Submissions Feed
                  </CardTitle>
                  <span className="text-xs text-slate-500">
                    {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No submissions found for the selected filters</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-340px)]">
                    <div className="space-y-2 pr-3">
                      {filteredEntries.map((entry) => {
                        const typeConfig = entryTypeConfig[entry.entryType] || { 
                          label: entry.entryType, 
                          color: "text-slate-700", 
                          bgColor: "bg-slate-100", 
                          icon: FileText 
                        };
                        const statConfig = statusConfig[entry.status] || { 
                          label: entry.status || "Unknown", 
                          color: "bg-slate-100 text-slate-600", 
                          icon: Clock 
                        };
                        const TypeIcon = typeConfig.icon;
                        const StatusIcon = statConfig.icon;

                        return (
                          <div
                            key={entry.id}
                            className="p-3 bg-white border border-slate-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/30 transition-all cursor-pointer group"
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                            onClick={() => navigateToEntry(entry)}
                            data-testid={`entry-${entry.id}`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Type Icon - Navy circle with white icon */}
                              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-slate-800">
                                <TypeIcon className="w-4 h-4 text-white" />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-sm font-medium text-[#0077b6] hover:underline">
                                    {typeConfig.label}
                                  </span>
                                  <Badge className={cn("text-[10px] px-1.5 py-0", statConfig.color)}>
                                    <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                                    {statConfig.label}
                                  </Badge>
                                  {entry.priority && entry.priority !== "normal" && entry.priority !== "LOW" && (
                                    <Badge 
                                      className={cn(
                                        "text-[10px] px-1.5 py-0",
                                        entry.priority === "urgent" || entry.priority === "URGENT" || entry.priority === "critical" || entry.priority === "CRITICAL"
                                          ? "bg-red-500 text-white" 
                                          : entry.priority === "high" || entry.priority === "HIGH"
                                            ? "bg-orange-100 text-orange-700 border border-orange-200" 
                                            : "bg-slate-100 text-slate-600"
                                      )}
                                    >
                                      {entry.priority.toLowerCase()}
                                    </Badge>
                                  )}
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-500 mb-1.5">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {entry.propertyName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {entry.technicianName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />
                                    {formatDate(entry.createdAt)}
                                  </span>
                                </div>

                                {entry.description && (
                                  <p className="text-xs text-slate-600 line-clamp-2">{entry.description}</p>
                                )}
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
