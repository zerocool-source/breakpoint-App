import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  MessageSquare, User, MapPin, Clock, CheckCircle2, Filter, X, CalendarIcon
} from "lucide-react";
import type { Technician, TechOpsEntry } from "@shared/schema";
import type { DateRange } from "react-day-picker";

export default function ChatHubs() {
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [supervisorFilter, setSupervisorFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const hasActiveFilters = propertyFilter || supervisorFilter || dateRange?.from;

  const clearAllFilters = () => {
    setPropertyFilter("");
    setSupervisorFilter("");
    setDateRange(undefined);
  };

  const { data: allTechnicians = [] } = useQuery<Technician[]>({
    queryKey: ["technicians-stored"],
    queryFn: async () => {
      const response = await fetch("/api/technicians/stored");
      if (!response.ok) throw new Error("Failed to fetch technicians");
      const data = await response.json();
      return data.technicians || [];
    },
  });

  const { data: properties = [] } = useQuery<{ propertyName: string }[]>({
    queryKey: ["tech-ops-properties"],
    queryFn: async () => {
      const response = await fetch("/api/tech-ops");
      if (!response.ok) throw new Error("Failed to fetch entries");
      const data = await response.json();
      const entries = Array.isArray(data) ? data : (data.entries || []);
      const uniqueProperties = Array.from(new Set(entries.map((e: TechOpsEntry) => e.propertyName).filter(Boolean)));
      return uniqueProperties.map(name => ({ propertyName: name as string }));
    },
  });

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set("entryType", "report_issue");
    if (dateRange?.from) params.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
    if (dateRange?.to) params.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
    return params.toString();
  };

  const { data: allMessages = [] } = useQuery<TechOpsEntry[]>({
    queryKey: ["tech-ops-supervisor-messages", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const params = buildQueryParams();
      const response = await fetch(`/api/tech-ops?${params}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      return Array.isArray(data) ? data : (data.entries || []);
    },
  });

  const supervisors = allTechnicians.filter(t => t.role === "supervisor" && t.active);

  const supervisorMessages = useMemo(() => {
    return allMessages.filter(msg => {
      const tech = allTechnicians.find(t => `${t.firstName} ${t.lastName}` === msg.technicianName);
      if (tech?.role !== "supervisor") return false;
      if (propertyFilter && msg.propertyName !== propertyFilter) return false;
      if (supervisorFilter) {
        if (tech.id !== supervisorFilter) return false;
      }
      return true;
    });
  }, [allMessages, allTechnicians, propertyFilter, supervisorFilter]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return format(new Date(date), "MMM d, yyyy h:mm a");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Supervisor Messages</h1>
            <p className="text-slate-500 mt-1">Direct messages from supervisors to the office</p>
          </div>
          <Badge className="bg-[#0078D4]1A text-[#0078D4] text-lg px-4 py-2">
            {supervisorMessages.length} Messages
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Filter Messages</span>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="ml-auto text-xs h-7"
                  data-testid="button-clear-filters"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={propertyFilter || "_all"} onValueChange={(v) => setPropertyFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="h-9" data-testid="select-property-filter">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Properties</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.propertyName} value={p.propertyName}>
                      {p.propertyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={supervisorFilter || "_all"} onValueChange={(v) => setSupervisorFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="h-9" data-testid="select-supervisor-filter">
                  <SelectValue placeholder="All Supervisors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Supervisors</SelectItem>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="h-9 justify-start text-left font-normal"
                    data-testid="button-date-filter"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <span className="text-xs">
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                        </span>
                      ) : (
                        <span className="text-xs">{format(dateRange.from, "MMM d, yyyy")}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">Date Range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#0078D4]" />
              Messages from Supervisors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supervisorMessages.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No supervisor messages</p>
                <p className="text-sm mt-1">
                  {hasActiveFilters 
                    ? "Try adjusting your filters" 
                    : "Messages from supervisors will appear here"}
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-3">
                  {supervisorMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 border border-slate-200 rounded-lg hover:border-[#0078D4]33 hover:shadow-sm transition-all"
                      data-testid={`message-${message.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#0078D4]1A flex items-center justify-center">
                          <User className="w-6 h-6 text-[#0078D4]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-700 text-base">{message.technicianName}</span>
                            <Badge className="bg-[#0078D4]1A text-[#0078D4] text-xs">
                              Supervisor
                            </Badge>
                            {message.status === "reviewed" && (
                              <Badge className="bg-[#22D69A]1A text-[#22D69A] text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Reviewed
                              </Badge>
                            )}
                          </div>
                          {message.propertyName && (
                            <div className="flex items-center gap-1 text-sm text-slate-500 mb-2">
                              <MapPin className="w-3 h-3" />
                              {message.propertyName}
                            </div>
                          )}
                          <p className="text-sm text-slate-600 leading-relaxed">{message.notes}</p>
                          <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatDate(message.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
