import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wrench, Droplets, AlertTriangle, ChevronRight, CalendarIcon,
  Filter, Clock, CheckCircle, XCircle, FileText, User, MapPin, Loader2, Wind, Archive, Users
} from "lucide-react";
import type { TechOpsEntry } from "@shared/schema";
import { cn } from "@/lib/utils";

const techOpsOptions = [
  { 
    id: "repairs-needed",
    entryType: "repairs_needed",
    label: "Repairs Needed", 
    href: "/tech-ops/repairs-needed",
    icon: Wrench, 
    color: "bg-red-100 text-red-700 border-red-200",
    description: "Report equipment or pool repairs needed at a property"
  },
  { 
    id: "service-repairs",
    entryType: "service_repairs",
    label: "Service Repairs", 
    href: "/service-repairs",
    icon: Wrench, 
    color: "bg-purple-100 text-purple-700 border-purple-200",
    description: "Sub-$500 service technician repair jobs"
  },
  { 
    id: "chemical-order",
    entryType: "chemical_order",
    label: "Chemical Orders", 
    href: "/tech-ops/chemical-order",
    icon: Droplets, 
    color: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Request chemicals to be ordered for a property"
  },
  { 
    id: "chemicals-dropoff",
    entryType: "chemicals_dropoff",
    label: "Chemicals Dropped-Off", 
    href: "/tech-ops/chemicals-dropoff",
    icon: Droplets, 
    color: "bg-green-100 text-green-700 border-green-200",
    description: "Log chemicals delivered or dropped off at a property"
  },
  { 
    id: "windy-day-cleanup",
    entryType: "windy_day_cleanup",
    label: "Windy Day Clean Up", 
    href: "/tech-ops/windy-day-cleanup",
    icon: Wind, 
    color: "bg-cyan-100 text-cyan-700 border-cyan-200",
    description: "Request extra cleaning after windy conditions"
  },
  { 
    id: "report-issue",
    entryType: "report_issue",
    label: "Report Issues", 
    href: "/tech-ops/report-issue",
    icon: AlertTriangle, 
    color: "bg-orange-100 text-orange-700 border-orange-200",
    description: "Report any issue or concern at a property"
  },
  { 
    id: "supervisor-concerns",
    entryType: "supervisor_concerns",
    label: "Supervisor Concerns", 
    href: "/tech-ops/supervisor-concerns",
    icon: User, 
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    description: "Concerns or issues escalated to supervisors"
  },
];

const managementOptions = [
  { 
    id: "supervisor-management",
    label: "Supervisor Management", 
    href: "/supervisor-teams",
    icon: Users, 
    color: "bg-slate-100 text-slate-700 border-slate-200",
    description: "Manage supervisor teams and technician assignments"
  },
];

const entryTypeLabels: Record<string, { label: string; color: string; icon: any }> = {
  repairs_needed: { label: "Repairs Needed", color: "bg-red-100 text-red-700", icon: Wrench },
  service_repairs: { label: "Service Repairs", color: "bg-purple-100 text-purple-700", icon: Wrench },
  chemical_order: { label: "Chemical Orders", color: "bg-blue-100 text-blue-700", icon: Droplets },
  chemicals_dropoff: { label: "Chemicals Dropped-Off", color: "bg-green-100 text-green-700", icon: Droplets },
  windy_day_cleanup: { label: "Windy Day Clean Up", color: "bg-cyan-100 text-cyan-700", icon: Wind },
  report_issue: { label: "Report Issues", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  supervisor_concerns: { label: "Supervisor Concerns", color: "bg-indigo-100 text-indigo-700", icon: User },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-blue-100 text-blue-700", icon: FileText },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-600", icon: XCircle },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-500", icon: Archive },
};

export default function TechOpsLanding() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedTech, setSelectedTech] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (dateRange.from) params.set("startDate", startOfDay(dateRange.from).toISOString());
    if (dateRange.to) params.set("endDate", endOfDay(dateRange.to).toISOString());
    if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
    if (selectedTech !== "all") params.set("technicianName", selectedTech);
    if (selectedType !== "all") params.set("entryType", selectedType);
    return params.toString();
  };

  const { data: entries = [], isLoading } = useQuery<TechOpsEntry[]>({
    queryKey: ["tech-ops", dateRange, selectedProperty, selectedTech, selectedType],
    queryFn: async () => {
      const response = await fetch(`/api/tech-ops?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch entries");
      return response.json();
    },
  });

  const { data: summary } = useQuery<{ total: number; byType: Record<string, number>; byStatus: Record<string, number> }>({
    queryKey: ["tech-ops-summary", dateRange, selectedProperty, selectedTech],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.set("startDate", startOfDay(dateRange.from).toISOString());
      if (dateRange.to) params.set("endDate", endOfDay(dateRange.to).toISOString());
      if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
      if (selectedTech !== "all") params.set("technicianName", selectedTech);
      const response = await fetch(`/api/tech-ops/summary?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json();
    },
  });

  const { data: serviceRepairsCount = 0 } = useQuery<number>({
    queryKey: ["service-repairs-count-landing"],
    queryFn: async () => {
      const response = await fetch("/api/service-repairs");
      if (!response.ok) return 0;
      const data = await response.json();
      return Array.isArray(data) ? data.filter((j: any) => j.status === "pending" || j.status === "in_progress").length : 0;
    },
  });

  const { data: emergenciesCount = 0 } = useQuery<number>({
    queryKey: ["emergencies-count-landing"],
    queryFn: async () => {
      const response = await fetch("/api/emergencies/summary");
      if (!response.ok) return 0;
      const data = await response.json();
      return (data.byStatus?.pending_review || 0) + (data.byStatus?.in_progress || 0);
    },
  });

  // Fetch unread counts for new submission badges
  const { data: unreadCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["tech-ops-unread-counts"],
    queryFn: async () => {
      const response = await fetch("/api/tech-ops/unread-counts");
      if (!response.ok) return {};
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const getCountForType = (entryType: string): number => {
    if (entryType === "service_repairs") return serviceRepairsCount;
    if (entryType === "emergencies") return emergenciesCount;
    return summary?.byType?.[entryType] || 0;
  };

  const getUnreadCount = (entryType: string): number => {
    return unreadCounts[entryType] || 0;
  };

  const uniqueProperties = useMemo(() => {
    const props = new Map<string, string>();
    entries.forEach(e => {
      if (e.propertyId && e.propertyName) {
        props.set(e.propertyId, e.propertyName);
      }
    });
    return Array.from(props.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  const uniqueTechs = useMemo(() => {
    const techs = new Set<string>();
    entries.forEach(e => {
      if (e.technicianName) techs.add(e.technicianName);
    });
    return Array.from(techs);
  }, [entries]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return format(new Date(date), "MMM d, yyyy h:mm a");
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#1E3A8A]/10 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#1E3A8A]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading-techops">Tech Ops</h1>
              <p className="text-slate-500 text-sm">Field technician requests and submissions</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {techOpsOptions.map((option) => {
            const Icon = option.icon;
            const count = getCountForType(option.entryType);
            const unreadCount = getUnreadCount(option.entryType);
            return (
              <Link key={option.href} href={option.href} data-testid={`link-techops-${option.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group h-full relative" data-testid={`card-techops-${option.id}`}>
                  {unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white animate-pulse min-w-[20px] text-center" data-testid={`badge-new-${option.id}`}>
                        {unreadCount} NEW
                      </span>
                    </div>
                  )}
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${option.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-[#1E293B] group-hover:text-[#1E3A8A] text-sm transition-colors flex-1">
                        {option.label}
                      </span>
                      {count > 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#F97316] text-white min-w-[24px] text-center">
                          {count}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#1E3A8A] transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <h3 className="lg:col-span-4 text-sm font-medium text-slate-500 -mb-2">Team Management</h3>
          {managementOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Link key={option.href} href={option.href} data-testid={`link-mgmt-${option.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group h-full border-dashed" data-testid={`card-mgmt-${option.id}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${option.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-[#1E293B] group-hover:text-[#1E3A8A] text-sm transition-colors flex-1">
                        {option.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#1E3A8A] transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#1E3A8A]" />
                Dashboard & Filters
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-date-range">
                      <CalendarIcon className="w-4 h-4" />
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

                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger className="w-[180px]" data-testid="select-property">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {uniqueProperties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTech} onValueChange={setSelectedTech}>
                  <SelectTrigger className="w-[180px]" data-testid="select-technician">
                    <User className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="All Technicians" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Technicians</SelectItem>
                    {uniqueTechs.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[180px]" data-testid="select-type">
                    <FileText className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="repairs_needed">Repairs Needed</SelectItem>
                    <SelectItem value="service_repairs">Service Repairs</SelectItem>
                    <SelectItem value="chemical_order">Chemical Orders</SelectItem>
                    <SelectItem value="chemicals_dropoff">Chemicals Dropped-Off</SelectItem>
                    <SelectItem value="windy_day_cleanup">Windy Day Clean Up</SelectItem>
                    <SelectItem value="report_issue">Report Issues</SelectItem>
                    <SelectItem value="supervisor_concerns">Supervisor Concerns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200" data-testid="metric-total">
                <div className="text-2xl font-bold text-[#1E3A8A]">{summary?.total || 0}</div>
                <div className="text-sm text-slate-500">Total Submissions</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200" data-testid="metric-pending">
                <div className="text-2xl font-bold text-amber-700">{summary?.byStatus?.pending || 0}</div>
                <div className="text-sm text-amber-600">Pending</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200" data-testid="metric-completed">
                <div className="text-2xl font-bold text-green-700">{summary?.byStatus?.completed || 0}</div>
                <div className="text-sm text-green-600">Completed</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200" data-testid="metric-repairs">
                <div className="text-2xl font-bold text-red-700">{summary?.byType?.repairs_needed || 0}</div>
                <div className="text-sm text-red-600">Repairs Needed</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200" data-testid="metric-chemicals">
                <div className="text-2xl font-bold text-blue-700">{(summary?.byType?.chemical_order || 0) + (summary?.byType?.chemicals_dropoff || 0)}</div>
                <div className="text-sm text-blue-600">Chemical Requests</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200" data-testid="metric-issues">
                <div className="text-2xl font-bold text-orange-700">{summary?.byType?.report_issue || 0}</div>
                <div className="text-sm text-orange-600">Reported Issues</div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No submissions found for the selected filters</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const typeConfig = entryTypeLabels[entry.entryType] || { label: entry.entryType, color: "bg-slate-100 text-slate-700", icon: FileText };
                    const statConfig = statusConfig[entry.status || "pending"];
                    const TypeIcon = typeConfig.icon;
                    const StatusIcon = statConfig.icon;

                    return (
                      <div
                        key={entry.id}
                        className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all"
                        data-testid={`entry-${entry.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeConfig.color)}>
                              <TypeIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-medium text-[#1E293B]">{typeConfig.label}</span>
                                <Badge className={cn("text-xs", statConfig.color)}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statConfig.label}
                                </Badge>
                                {entry.priority && entry.priority !== "normal" && (
                                  <Badge variant="outline" className={cn(
                                    entry.priority === "urgent" ? "border-red-300 text-red-700" :
                                    entry.priority === "high" ? "border-orange-300 text-orange-700" :
                                    "border-slate-300 text-slate-600"
                                  )}>
                                    {entry.priority}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                {entry.propertyName && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {entry.propertyName}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" /> {entry.technicianName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3" /> {formatDate(entry.createdAt)}
                                </span>
                              </div>
                              {entry.description && (
                                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{entry.description}</p>
                              )}
                            </div>
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
    </AppLayout>
  );
}
