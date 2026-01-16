import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Wrench, Users, CalendarIcon, Filter, Loader2, Clock,
  CheckCircle, AlertTriangle, HardHat, ClipboardList, MapPin
} from "lucide-react";
import type { Technician, TechOpsEntry, ServiceRepairJob } from "@shared/schema";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-[#FF8000]1A text-[#D35400]" },
  in_progress: { label: "In Progress", color: "bg-[#0078D4]1A text-[#0078D4]" },
  completed: { label: "Completed", color: "bg-[#22D69A]1A text-[#22D69A]" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-500" },
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export default function TechForeman() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedForeman, setSelectedForeman] = useState<string>("all");

  const { data: technicians = [], isLoading: loadingTechs } = useQuery<Technician[]>({
    queryKey: ["technicians-stored"],
    queryFn: async () => {
      const response = await fetch("/api/technicians/stored");
      if (!response.ok) throw new Error("Failed to fetch technicians");
      const data = await response.json();
      return Array.isArray(data) ? data : (data.technicians || []);
    },
  });

  const { data: repairJobs = [], isLoading: loadingJobs } = useQuery<ServiceRepairJob[]>({
    queryKey: ["repair-jobs"],
    queryFn: async () => {
      const response = await fetch("/api/service-repair-jobs");
      if (!response.ok) throw new Error("Failed to fetch repair jobs");
      return response.json();
    },
  });

  const buildActivityQuery = () => {
    const params = new URLSearchParams();
    params.set("entryType", "repairs_needed");
    if (dateRange.from) params.set("startDate", startOfDay(dateRange.from).toISOString());
    if (dateRange.to) params.set("endDate", endOfDay(dateRange.to).toISOString());
    return params.toString();
  };

  const { data: repairRequests = [], isLoading: loadingRequests } = useQuery<TechOpsEntry[]>({
    queryKey: ["repair-requests", dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/tech-ops?${buildActivityQuery()}`);
      if (!response.ok) throw new Error("Failed to fetch repair requests");
      return response.json();
    },
  });

  const foremen = useMemo(() => 
    technicians.filter(t => t.role === "foreman" && t.active), 
    [technicians]
  );

  const repairTechs = useMemo(() => 
    technicians.filter(t => t.role === "repair" && t.active), 
    [technicians]
  );

  const getTeamMembers = (foremanId: string) => 
    technicians.filter(t => t.supervisorId === foremanId && t.active);

  const displayedForemen = selectedForeman === "all" 
    ? foremen 
    : foremen.filter(f => f.id === selectedForeman);

  const activeJobs = repairJobs.filter(j => j.status === "pending" || j.status === "in_progress");
  const completedJobs = repairJobs.filter(j => j.status === "completed");
  const urgentRequests = repairRequests.filter(r => r.priority === "urgent");

  const completionRate = repairJobs.length > 0 
    ? Math.round((completedJobs.length / repairJobs.length) * 100) 
    : 0;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#FF8000]1A flex items-center justify-center">
              <HardHat className="w-6 h-6 text-[#D35400]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading">Repair Foreman Dashboard</h1>
              <p className="text-slate-500 text-sm">Team management, oversight, and repair job tracking</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap p-4 bg-slate-50 rounded-lg border border-slate-200">
          <Filter className="w-4 h-4 text-slate-500" />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-date-range">
                <CalendarIcon className="w-4 h-4" />
                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
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

          <Select value={selectedForeman} onValueChange={setSelectedForeman}>
            <SelectTrigger className="w-[200px]" data-testid="filter-foreman">
              <HardHat className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="All Foremen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Foremen</SelectItem>
              {foremen.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.firstName} {f.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0078D4]1A flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-[#0078D4]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeJobs.length}</p>
                  <p className="text-sm text-slate-500">Active Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#22D69A]1A flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[#22D69A]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedJobs.length}</p>
                  <p className="text-sm text-slate-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF8000]1A flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#D35400]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{urgentRequests.length}</p>
                  <p className="text-sm text-slate-500">Urgent Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#17BEBB]1A flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#0D9488]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{repairTechs.length}</p>
                  <p className="text-sm text-slate-500">Repair Techs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#D35400]" />
                Repair Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTechs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : repairTechs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No repair technicians found</p>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3">
                    {repairTechs.map(tech => {
                      const techJobs = repairJobs.filter(j => 
                        j.technicianName === `${tech.firstName} ${tech.lastName}` && 
                        (j.status === "pending" || j.status === "in_progress")
                      );
                      return (
                        <div key={tech.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-[#FF8000]1A text-[#D35400]">
                              {getInitials(tech.firstName, tech.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{tech.firstName} {tech.lastName}</p>
                            <p className="text-xs text-slate-500">{tech.email || tech.phone || "No contact"}</p>
                          </div>
                          <Badge variant="outline" className={techJobs.length > 0 ? "bg-[#0078D4]1A text-[#0078D4]" : ""}>
                            {techJobs.length} active {techJobs.length === 1 ? 'job' : 'jobs'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#0078D4]" />
                Job Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Completion Rate</span>
                    <span className="text-sm font-medium">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#FF8000]1A rounded-lg border border-[#FF8000]33">
                    <p className="text-xs text-[#D35400] font-medium">Pending</p>
                    <p className="text-xl font-bold text-[#D35400]">
                      {repairJobs.filter(j => j.status === "pending").length}
                    </p>
                  </div>
                  <div className="p-3 bg-[#0078D4]1A rounded-lg border border-[#0078D4]33">
                    <p className="text-xs text-[#0078D4] font-medium">In Progress</p>
                    <p className="text-xl font-bold text-blue-900">
                      {repairJobs.filter(j => j.status === "in_progress").length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#D35400]" />
              Pending Repair Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : repairRequests.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No pending repair requests</p>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {repairRequests.map(request => (
                    <div 
                      key={request.id} 
                      className={cn(
                        "p-3 rounded-lg border",
                        request.priority === "urgent" 
                          ? "bg-red-50 border-red-200" 
                          : request.priority === "high" 
                            ? "bg-[#FF8000]1A border-[#FF8000]33"
                            : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={
                          request.priority === "urgent" ? "bg-red-100 text-red-700" :
                          request.priority === "high" ? "bg-[#FF8000]1A text-[#D35400]" :
                          "bg-[#0078D4]1A text-[#0078D4]"
                        }>
                          {request.priority}
                        </Badge>
                        <Badge className={statusConfig[request.status || "pending"]?.color}>
                          {statusConfig[request.status || "pending"]?.label}
                        </Badge>
                        <span className="text-xs text-slate-500 ml-auto">
                          {formatDate(request.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-1">{request.description || "No description"}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {request.propertyName || "No property"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {request.technicianName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {displayedForemen.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HardHat className="w-5 h-5 text-[#D35400]" />
                Foremen Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedForemen.map(foreman => {
                  const teamMembers = getTeamMembers(foreman.id);
                  return (
                    <div key={foreman.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-[#FF8000]1A text-[#D35400]">
                            {getInitials(foreman.firstName, foreman.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{foreman.firstName} {foreman.lastName}</p>
                          <Badge className="bg-[#22D69A]1A text-[#22D69A]">Foreman</Badge>
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>{teamMembers.length} team {teamMembers.length === 1 ? 'member' : 'members'}</p>
                        {teamMembers.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1">
                            {teamMembers.map(m => `${m.firstName} ${m.lastName}`).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
