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
import {
  Users, UserCheck, AlertTriangle, ClipboardCheck, CalendarIcon, Filter,
  Loader2, ChevronRight, MapPin, Clock
} from "lucide-react";
import type { Technician, TechOpsEntry } from "@shared/schema";
import { cn } from "@/lib/utils";

const roleConfig: Record<string, { label: string; color: string }> = {
  service: { label: "Service Tech", color: "bg-blue-100 text-blue-700" },
  repair: { label: "Repair Tech", color: "bg-orange-100 text-orange-700" },
  supervisor: { label: "Supervisor", color: "bg-purple-100 text-purple-700" },
  foreman: { label: "Foreman", color: "bg-green-100 text-green-700" },
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export default function TechSupervisor() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("all");

  const { data: technicians = [], isLoading: loadingTechs } = useQuery<Technician[]>({
    queryKey: ["technicians-stored"],
    queryFn: async () => {
      const response = await fetch("/api/technicians/stored");
      if (!response.ok) throw new Error("Failed to fetch technicians");
      const data = await response.json();
      return Array.isArray(data) ? data : (data.technicians || []);
    },
  });

  const buildActivityQuery = () => {
    const params = new URLSearchParams();
    if (dateRange.from) params.set("startDate", startOfDay(dateRange.from).toISOString());
    if (dateRange.to) params.set("endDate", endOfDay(dateRange.to).toISOString());
    return params.toString();
  };

  const { data: recentActivity = [], isLoading: loadingActivity } = useQuery<TechOpsEntry[]>({
    queryKey: ["tech-ops-activity", dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/tech-ops?${buildActivityQuery()}`);
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
  });

  const supervisors = useMemo(() => 
    technicians.filter(t => t.role === "supervisor" && t.active), 
    [technicians]
  );

  const getTeamMembers = (supervisorId: string) => 
    technicians.filter(t => t.supervisorId === supervisorId && t.active);

  const getTeamActivity = (supervisorId: string) => {
    const teamMemberNames = getTeamMembers(supervisorId).map(t => `${t.firstName} ${t.lastName}`);
    return recentActivity.filter(a => teamMemberNames.includes(a.technicianName));
  };

  const issuesAndConcerns = useMemo(() => 
    recentActivity.filter(a => 
      a.entryType === "report_issue" || 
      a.entryType === "repairs_needed" ||
      a.priority === "urgent" || 
      a.priority === "high"
    ),
    [recentActivity]
  );

  const displayedSupervisors = selectedSupervisor === "all" 
    ? supervisors 
    : supervisors.filter(s => s.id === selectedSupervisor);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading">Supervisor Dashboard</h1>
              <p className="text-slate-500 text-sm">Team overview, assignments, and activity monitoring</p>
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

          <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
            <SelectTrigger className="w-[200px]" data-testid="filter-supervisor">
              <Users className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="All Supervisors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Supervisors</SelectItem>
              {supervisors.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{supervisors.length}</p>
                  <p className="text-sm text-slate-500">Active Supervisors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{technicians.filter(t => t.supervisorId && t.active).length}</p>
                  <p className="text-sm text-slate-500">Supervised Techs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{issuesAndConcerns.length}</p>
                  <p className="text-sm text-slate-500">Issues/Concerns</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loadingTechs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
          </div>
        ) : displayedSupervisors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No supervisors found</p>
              <p className="text-sm mt-1">Add technicians with the supervisor role to see them here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {displayedSupervisors.map(supervisor => {
              const teamMembers = getTeamMembers(supervisor.id);
              const teamActivity = getTeamActivity(supervisor.id);
              
              return (
                <Card key={supervisor.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-purple-100 text-purple-700">
                          {getInitials(supervisor.firstName, supervisor.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {supervisor.firstName} {supervisor.lastName}
                          <Badge className={roleConfig.supervisor.color}>Supervisor</Badge>
                        </CardTitle>
                        <p className="text-sm text-slate-500">{supervisor.email || supervisor.phone || "No contact info"}</p>
                      </div>
                      <Badge variant="outline" className="text-sm">
                        {teamMembers.length} team {teamMembers.length === 1 ? 'member' : 'members'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-slate-700 mb-3">Team Members</h4>
                        {teamMembers.length === 0 ? (
                          <p className="text-sm text-slate-400">No team members assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {teamMembers.map(member => (
                              <div key={member.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                    {getInitials(member.firstName, member.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
                                </div>
                                <Badge className={roleConfig[member.role || "service"]?.color || roleConfig.service.color}>
                                  {roleConfig[member.role || "service"]?.label || "Tech"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-slate-700 mb-3">Recent Team Activity</h4>
                        <ScrollArea className="max-h-[200px]">
                          {teamActivity.length === 0 ? (
                            <p className="text-sm text-slate-400">No recent activity</p>
                          ) : (
                            <div className="space-y-2">
                              {teamActivity.slice(0, 5).map(activity => (
                                <div key={activity.id} className="p-2 bg-slate-50 rounded-lg text-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{activity.technicianName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {activity.entryType.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                  <p className="text-slate-600 truncate">{activity.description || "No description"}</p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                    <MapPin className="w-3 h-3" />
                                    {activity.propertyName || "No property"}
                                    <Clock className="w-3 h-3 ml-2" />
                                    {formatDate(activity.createdAt)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {issuesAndConcerns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Issues & Concerns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3">
                  {issuesAndConcerns.map(issue => (
                    <div key={issue.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-700">{issue.technicianName}</span>
                        <Badge className={issue.priority === "urgent" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}>
                          {issue.priority}
                        </Badge>
                        <Badge variant="outline">{issue.entryType.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{issue.description || "No description"}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {issue.propertyName || "No property"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(issue.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
