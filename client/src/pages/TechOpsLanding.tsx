import React, { useState, useMemo } from "react";
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
  Wrench, Droplets, AlertTriangle, CalendarIcon,
  Filter, Clock, CheckCircle, XCircle, FileText, User, MapPin, Loader2, Wind, Archive
} from "lucide-react";
import type { TechOpsEntry } from "@shared/schema";
import { cn } from "@/lib/utils";

const entryTypeLabels: Record<string, { label: string; color: string; icon: any }> = {
  repairs_needed: { label: "Repairs Needed", color: "bg-red-100 text-red-700", icon: Wrench },
  service_repairs: { label: "Service Repairs", color: "bg-[#17BEBB]1A text-[#0D9488]", icon: Wrench },
  chemical_order: { label: "Chemical Orders", color: "bg-[#0078D4]1A text-[#0078D4]", icon: Droplets },
  chemicals_dropoff: { label: "Chemicals Dropped-Off", color: "bg-[#22D69A]1A text-[#16A679]", icon: Droplets },
  windy_day_cleanup: { label: "Windy Day Clean Up", color: "bg-[#17BEBB]1A text-[#0D9488]", icon: Wind },
  report_issue: { label: "Report Issues", color: "bg-[#FF8000]1A text-[#D35400]", icon: AlertTriangle },
  emergencies: { label: "Emergencies", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-[#FF8000]1A text-[#D35400]", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-[#0078D4]1A text-[#0078D4]", icon: FileText },
  completed: { label: "Completed", color: "bg-[#22D69A]1A text-[#16A679]", icon: CheckCircle },
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
            <div className="w-12 h-12 rounded-lg bg-[#0078D4]/10 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#0078D4]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading-techops">Tech Ops</h1>
              <p className="text-slate-500 text-sm">Field technician requests and submissions</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="w-5 h-5 text-[#0078D4]" />
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
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200" data-testid="metric-total">
                    <div className="text-2xl font-bold text-[#0078D4]">{summary?.total || 0}</div>
                    <div className="text-sm text-slate-500">Total</div>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200" data-testid="metric-pending">
                    <div className="text-2xl font-bold text-amber-600">{summary?.byStatus?.pending || 0}</div>
                    <div className="text-sm text-amber-600">Pending</div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200" data-testid="metric-completed">
                    <div className="text-2xl font-bold text-emerald-600">{summary?.byStatus?.completed || 0}</div>
                    <div className="text-sm text-emerald-600">Completed</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200" data-testid="metric-repairs">
                    <div className="text-2xl font-bold text-red-600">{(summary?.byType?.repairs_needed || 0) + (summary?.byType?.service_repairs || 0)}</div>
                    <div className="text-sm text-red-600">Repairs</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200" data-testid="metric-chemicals">
                    <div className="text-2xl font-bold text-blue-600">{(summary?.byType?.chemical_order || 0) + (summary?.byType?.chemicals_dropoff || 0)}</div>
                    <div className="text-sm text-blue-600">Chemicals</div>
                  </div>
                  <div className="p-4 bg-teal-50 rounded-lg border border-teal-200" data-testid="metric-windy">
                    <div className="text-2xl font-bold text-teal-600">{summary?.byType?.windy_day_cleanup || 0}</div>
                    <div className="text-sm text-teal-600">Windy Day</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200" data-testid="metric-issues">
                    <div className="text-2xl font-bold text-orange-600">{summary?.byType?.report_issue || 0}</div>
                    <div className="text-sm text-orange-600">Issues</div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0078D4]" />
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
                        const statConfig = statusConfig[entry.status || "pending"] || { label: entry.status || "Unknown", color: "bg-slate-100 text-slate-600", icon: FileText };
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
                                        entry.priority === "high" ? "border-orange-300 text-[#D35400]" :
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
      </div>
    </AppLayout>
  );
}
