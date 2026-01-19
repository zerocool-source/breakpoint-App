import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Users, User, ChevronDown, ChevronRight, Phone, Mail, Plus, 
  UserMinus, UserPlus, Loader2, Search, ArrowRight, AlertTriangle,
  ClipboardList, MessageSquare, MapPin, Clock, CheckCircle2, Filter, X, CalendarIcon,
  BarChart3, Download, Activity, FileCheck2, HandHelping, XCircle, ShoppingCart,
  ClipboardCheck, Image, Upload, Trash2
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { QcInspection } from "@shared/schema";
import type { Technician, TechOpsEntry, SupervisorActivity } from "@shared/schema";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SupervisorWithTeam extends Technician {
  teamMembers: Technician[];
}

interface SupervisorMetrics {
  checkedOut: number;
  assignmentsCreated: number;
  notCompletedResolved: number;
  needAssistanceResolved: number;
  dismissed: number;
}

interface SupervisorProfile {
  metrics: SupervisorMetrics;
  activity: SupervisorActivity[];
}

export default function SupervisorTeams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSupervisors, setExpandedSupervisors] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [targetSupervisorId, setTargetSupervisorId] = useState<string>("");

  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [supervisorFilter, setSupervisorFilter] = useState<string>("");
  const [technicianFilter, setTechnicianFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedProfileSupervisor, setSelectedProfileSupervisor] = useState<Technician | null>(null);
  const [profileActivityFilter, setProfileActivityFilter] = useState<string>("all");
  const [profileDateRange, setProfileDateRange] = useState<DateRange | undefined>();

  const hasActiveFilters = propertyFilter || supervisorFilter || technicianFilter || dateRange?.from;

  // QC Inspections state
  const [showQcInspectionForm, setShowQcInspectionForm] = useState(false);
  const [qcPropertySearch, setQcPropertySearch] = useState("");
  const [qcSelectedProperty, setQcSelectedProperty] = useState<{ id: string; name: string; address: string } | null>(null);
  const [qcSelectedSupervisor, setQcSelectedSupervisor] = useState<string>("");
  const [qcTitle, setQcTitle] = useState("");
  const [qcNotes, setQcNotes] = useState("");
  const [qcPhotos, setQcPhotos] = useState<string[]>([]);

  const clearAllFilters = () => {
    setPropertyFilter("");
    setSupervisorFilter("");
    setTechnicianFilter("");
    setDateRange(undefined);
  };

  const { data: allTechnicians = [], isLoading } = useQuery<Technician[]>({
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

  const buildQueryParams = (entryType?: string, status?: string) => {
    const params = new URLSearchParams();
    if (entryType) params.set("entryType", entryType);
    if (status) params.set("status", status);
    if (technicianFilter) params.set("technicianName", technicianFilter);
    if (dateRange?.from) params.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
    if (dateRange?.to) params.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
    return params.toString();
  };

  const { data: supervisorConcerns = [] } = useQuery<TechOpsEntry[]>({
    queryKey: ["tech-ops-supervisor-concerns", technicianFilter, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const params = buildQueryParams("supervisor_concerns");
      const response = await fetch(`/api/tech-ops?${params}`);
      if (!response.ok) throw new Error("Failed to fetch supervisor concerns");
      const data = await response.json();
      return Array.isArray(data) ? data : (data.entries || []);
    },
  });

  const { data: activityEntries = [] } = useQuery<TechOpsEntry[]>({
    queryKey: ["tech-ops-activity", technicianFilter, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const params = buildQueryParams(undefined, "reviewed");
      const response = await fetch(`/api/tech-ops?${params}`);
      if (!response.ok) throw new Error("Failed to fetch activity");
      const data = await response.json();
      return Array.isArray(data) ? data : (data.entries || []);
    },
  });

  const { data: supervisorProfile, isLoading: profileLoading } = useQuery<SupervisorProfile>({
    queryKey: ["supervisor-profile", selectedProfileSupervisor?.id, profileActivityFilter, profileDateRange?.from?.toISOString(), profileDateRange?.to?.toISOString()],
    queryFn: async () => {
      if (!selectedProfileSupervisor) throw new Error("No supervisor selected");
      const params = new URLSearchParams();
      if (profileActivityFilter && profileActivityFilter !== 'all') params.set("actionType", profileActivityFilter);
      if (profileDateRange?.from) params.set("startDate", format(profileDateRange.from, "yyyy-MM-dd"));
      if (profileDateRange?.to) params.set("endDate", format(profileDateRange.to, "yyyy-MM-dd"));
      
      const response = await fetch(`/api/supervisors/${selectedProfileSupervisor.id}/profile?${params}`);
      if (!response.ok) throw new Error("Failed to fetch supervisor profile");
      return response.json();
    },
    enabled: !!selectedProfileSupervisor && showProfileDialog,
  });

  // QC Inspections queries
  const { data: qcInspections = [], refetch: refetchQcInspections } = useQuery<QcInspection[]>({
    queryKey: ["qc-inspections"],
    queryFn: async () => {
      const response = await fetch("/api/qc-inspections?limit=50");
      if (!response.ok) throw new Error("Failed to fetch QC inspections");
      const data = await response.json();
      return data.inspections || [];
    },
  });

  const { data: qcMetrics } = useQuery<{
    totalAssigned: number;
    totalCompleted: number;
    twoWeeks: { assigned: number; completed: number };
    month: { assigned: number; completed: number };
    bySupervisor: { supervisorId: string; supervisorName: string; total: number; completed: number; pending: number }[];
  }>({
    queryKey: ["qc-inspection-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/qc-inspections/metrics");
      if (!response.ok) throw new Error("Failed to fetch QC metrics");
      return response.json();
    },
  });

  const { data: qcPropertyResults = [] } = useQuery<{ id: string; name: string; address: string; type: string }[]>({
    queryKey: ["qc-property-search", qcPropertySearch],
    queryFn: async () => {
      if (qcPropertySearch.length < 2) return [];
      const response = await fetch(`/api/qc-inspections/search-properties?q=${encodeURIComponent(qcPropertySearch)}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.properties || [];
    },
    enabled: qcPropertySearch.length >= 2,
  });

  const createQcInspectionMutation = useMutation({
    mutationFn: async (data: {
      supervisorId: string;
      supervisorName: string;
      propertyId: string | null;
      propertyName: string;
      propertyAddress: string;
      title: string;
      notes: string;
      photos: string[];
    }) => {
      const response = await fetch("/api/qc-inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create QC inspection");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qc-inspections"] });
      queryClient.invalidateQueries({ queryKey: ["qc-inspection-metrics"] });
      resetQcForm();
      toast({ title: "QC Inspection Created", description: "The inspection has been assigned to the supervisor" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create QC inspection", variant: "destructive" });
    },
  });

  const updateQcInspectionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/qc-inspections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update QC inspection");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qc-inspections"] });
      queryClient.invalidateQueries({ queryKey: ["qc-inspection-metrics"] });
      toast({ title: "Inspection Updated" });
    },
  });

  const resetQcForm = () => {
    setShowQcInspectionForm(false);
    setQcPropertySearch("");
    setQcSelectedProperty(null);
    setQcSelectedSupervisor("");
    setQcTitle("");
    setQcNotes("");
    setQcPhotos([]);
  };

  const handleCreateQcInspection = () => {
    if (!qcSelectedSupervisor || !qcSelectedProperty) {
      toast({ title: "Missing Fields", description: "Please select a supervisor and property", variant: "destructive" });
      return;
    }
    const supervisor = supervisors.find(s => s.id === qcSelectedSupervisor);
    createQcInspectionMutation.mutate({
      supervisorId: qcSelectedSupervisor,
      supervisorName: supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : "",
      propertyId: qcSelectedProperty.id,
      propertyName: qcSelectedProperty.name,
      propertyAddress: qcSelectedProperty.address,
      title: qcTitle,
      notes: qcNotes,
      photos: qcPhotos,
    });
  };

  const supervisors = allTechnicians.filter(t => t.role === "supervisor" && t.active);
  const unassignedTechnicians = allTechnicians.filter(
    t => t.role === "service" && t.active && !t.supervisorId
  );

  const supervisorsWithTeams: SupervisorWithTeam[] = supervisors.map(supervisor => ({
    ...supervisor,
    teamMembers: allTechnicians.filter(
      t => t.supervisorId === supervisor.id && t.active
    ),
  }));

  const toggleExpand = (supervisorId: string) => {
    setExpandedSupervisors(prev => {
      const next = new Set(prev);
      if (next.has(supervisorId)) {
        next.delete(supervisorId);
      } else {
        next.add(supervisorId);
      }
      return next;
    });
  };

  const assignMutation = useMutation({
    mutationFn: async ({ technicianId, supervisorId }: { technicianId: string; supervisorId: string | null }) => {
      const response = await fetch(`/api/technicians/${technicianId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supervisorId }),
      });
      if (!response.ok) throw new Error("Failed to update assignment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians-stored"] });
      setShowAssignDialog(false);
      setShowReassignDialog(false);
      setSelectedTechnician(null);
      setTargetSupervisorId("");
      toast({ title: "Assignment Updated", description: "Technician assignment has been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update assignment", variant: "destructive" });
    },
  });

  const handleAssignTechnician = (technician: Technician) => {
    setSelectedTechnician(technician);
    setTargetSupervisorId("");
    setShowAssignDialog(true);
  };

  const handleReassignTechnician = (technician: Technician) => {
    setSelectedTechnician(technician);
    setTargetSupervisorId(technician.supervisorId || "");
    setShowReassignDialog(true);
  };

  const handleRemoveFromTeam = (technician: Technician) => {
    assignMutation.mutate({ technicianId: technician.id, supervisorId: null });
  };

  const confirmAssignment = () => {
    if (selectedTechnician && targetSupervisorId) {
      assignMutation.mutate({ technicianId: selectedTechnician.id, supervisorId: targetSupervisorId });
    }
  };

  const filteredUnassigned = unassignedTechnicians.filter(t => {
    const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const serviceTechnicians = allTechnicians.filter(t => t.role === "service" && t.active);

  const filterEntries = (entries: TechOpsEntry[]) => {
    return entries.filter(entry => {
      if (propertyFilter && entry.propertyName !== propertyFilter) return false;
      if (supervisorFilter) {
        const tech = allTechnicians.find(t => `${t.firstName} ${t.lastName}` === entry.technicianName);
        if (!tech || tech.supervisorId !== supervisorFilter) return false;
      }
      return true;
    });
  };

  const filteredConcerns = useMemo(() => filterEntries(supervisorConcerns), [supervisorConcerns, propertyFilter, supervisorFilter]);
  const filteredActivity = useMemo(() => filterEntries(activityEntries), [activityEntries, propertyFilter, supervisorFilter]);

  const filteredAssignments = useMemo(() => {
    return supervisorsWithTeams.flatMap(supervisor => {
      if (supervisorFilter && supervisor.id !== supervisorFilter) return [];
      return supervisor.teamMembers.map(tech => ({
        type: "assignment" as const,
        supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
        technicianName: `${tech.firstName} ${tech.lastName}`,
        technicianId: tech.id,
        supervisorId: supervisor.id,
      }));
    });
  }, [supervisorsWithTeams, supervisorFilter]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return format(new Date(date), "MMM d, yyyy h:mm a");
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "normal": return "bg-[#0078D4]1A text-[#0078D4] border-[#0078D4]33";
      case "low": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const openSupervisorProfile = (supervisor: Technician) => {
    setSelectedProfileSupervisor(supervisor);
    setProfileActivityFilter("all");
    setProfileDateRange(undefined);
    setShowProfileDialog(true);
  };

  const formatActionType = (type: string): string => {
    switch (type) {
      case 'checked_out': return 'Inspected Property';
      case 'assignment_created': return 'Assignment Created';
      case 'resolved_not_completed': return 'Not Completed Resolved';
      case 'resolved_need_assistance': return 'Need Assistance Resolved';
      case 'dismissed': return 'Dismissed';
      default: return type;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'checked_out': return <MapPin className="w-4 h-4" />;
      case 'assignment_created': return <ClipboardList className="w-4 h-4" />;
      case 'resolved_not_completed': return <FileCheck2 className="w-4 h-4" />;
      case 'resolved_need_assistance': return <HandHelping className="w-4 h-4" />;
      case 'dismissed': return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'checked_out': return 'bg-[#0078D4]/10 text-[#0078D4]';
      case 'assignment_created': return 'bg-[#0078D4]/10 text-[#0078D4]';
      case 'resolved_not_completed': return 'bg-[#FF8000]/10 text-[#D35400]';
      case 'resolved_need_assistance': return 'bg-[#17BEBB]/10 text-[#0D9488]';
      case 'dismissed': return 'bg-[#EF4444]/10 text-[#EF4444]';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleExportActivity = () => {
    if (!selectedProfileSupervisor) return;
    const params = new URLSearchParams();
    if (profileActivityFilter && profileActivityFilter !== 'all') params.set("actionType", profileActivityFilter);
    if (profileDateRange?.from) params.set("startDate", format(profileDateRange.from, "yyyy-MM-dd"));
    if (profileDateRange?.to) params.set("endDate", format(profileDateRange.to, "yyyy-MM-dd"));
    
    window.open(`/api/supervisors/${selectedProfileSupervisor.id}/activity/export?${params}`, '_blank');
  };

  const totalProfileActions = supervisorProfile?.metrics ? 
    supervisorProfile.metrics.checkedOut + 
    supervisorProfile.metrics.assignmentsCreated + 
    supervisorProfile.metrics.notCompletedResolved + 
    supervisorProfile.metrics.needAssistanceResolved + 
    supervisorProfile.metrics.dismissed : 0;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#0078D4]/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#0078D4]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading">
                Supervisor Team Management
              </h1>
              <p className="text-slate-500 text-sm">
                Manage supervisor teams and technician assignments
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#0078D4]" />
                  Supervisors & Teams
                  <Badge className="ml-2 bg-slate-100 text-slate-700">
                    {supervisors.length} Supervisors
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0078D4]" />
                  </div>
                ) : supervisorsWithTeams.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No supervisors found</p>
                    <p className="text-sm mt-1">Add technicians with the "supervisor" role to get started</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-3">
                      {supervisorsWithTeams.map((supervisor) => {
                        const isExpanded = expandedSupervisors.has(supervisor.id);
                        return (
                          <div
                            key={supervisor.id}
                            className="border border-slate-200 rounded-lg overflow-hidden"
                            data-testid={`supervisor-card-${supervisor.id}`}
                          >
                            <div
                              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#0078D4] to-[#3B82F6] text-white"
                              data-testid={`supervisor-header-${supervisor.id}`}
                            >
                              <button
                                onClick={() => toggleExpand(supervisor.id)}
                                className="flex items-center gap-4 flex-1 hover:opacity-90 transition-opacity"
                              >
                                <Avatar className="h-10 w-10 border-2 border-white/30">
                                  <AvatarImage src={supervisor.photoUrl || undefined} />
                                  <AvatarFallback className="bg-white/20 text-white">
                                    {getInitials(supervisor.firstName, supervisor.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                  <div className="font-semibold">
                                    {supervisor.firstName} {supervisor.lastName}
                                  </div>
                                  <div className="text-white/70 text-sm flex items-center gap-3">
                                    {supervisor.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> {supervisor.phone}
                                      </span>
                                    )}
                                    {supervisor.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> {supervisor.email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge className="bg-white/20 text-white border-white/30">
                                  {supervisor.teamMembers.length} Technicians
                                </Badge>
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5" />
                                ) : (
                                  <ChevronRight className="w-5 h-5" />
                                )}
                              </button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:bg-white/20"
                                onClick={() => openSupervisorProfile(supervisor)}
                                data-testid={`button-view-profile-${supervisor.id}`}
                              >
                                <BarChart3 className="w-4 h-4 mr-1" />
                                Profile
                              </Button>
                            </div>

                            {isExpanded && (
                              <div className="bg-white divide-y divide-slate-100">
                                {supervisor.teamMembers.length === 0 ? (
                                  <div className="p-4 text-center text-slate-500 text-sm">
                                    No technicians assigned to this supervisor
                                  </div>
                                ) : (
                                  supervisor.teamMembers.map((tech) => (
                                    <div
                                      key={tech.id}
                                      className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                                      data-testid={`technician-row-${tech.id}`}
                                    >
                                      <Avatar className="h-9 w-9">
                                        <AvatarImage src={tech.photoUrl || undefined} />
                                        <AvatarFallback className="bg-slate-100 text-slate-600 text-sm">
                                          {getInitials(tech.firstName, tech.lastName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-700">
                                          {tech.firstName} {tech.lastName}
                                        </div>
                                        <div className="text-sm text-slate-500 flex items-center gap-3">
                                          {tech.phone && (
                                            <span className="flex items-center gap-1">
                                              <Phone className="w-3 h-3" /> {tech.phone}
                                            </span>
                                          )}
                                          {tech.email && (
                                            <span className="flex items-center gap-1 truncate">
                                              <Mail className="w-3 h-3" /> {tech.email}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {tech.role}
                                      </Badge>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-[#0078D4] hover:text-[#0078D4] hover:bg-[#0078D4]1A"
                                          onClick={() => handleReassignTechnician(tech)}
                                          data-testid={`button-reassign-${tech.id}`}
                                        >
                                          <ArrowRight className="w-4 h-4 mr-1" />
                                          Reassign
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => handleRemoveFromTeam(tech)}
                                          data-testid={`button-remove-${tech.id}`}
                                        >
                                          <UserMinus className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-[#D35400]" />
                  Unassigned Technicians
                  <Badge className="ml-2 bg-[#FF8000]1A text-[#D35400]">
                    {unassignedTechnicians.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search technicians..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-technicians"
                  />
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : filteredUnassigned.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    {searchTerm ? "No matching technicians" : "All technicians are assigned"}
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {filteredUnassigned.map((tech) => (
                        <div
                          key={tech.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-[#0078D4] transition-colors"
                          data-testid={`unassigned-tech-${tech.id}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={tech.photoUrl || undefined} />
                            <AvatarFallback className="bg-[#FF8000]1A text-[#D35400] text-xs">
                              {getInitials(tech.firstName, tech.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-700 text-sm truncate">
                              {tech.firstName} {tech.lastName}
                            </div>
                            {tech.phone && (
                              <div className="text-xs text-slate-500 truncate">{tech.phone}</div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 text-[#0078D4] border-[#0078D4] hover:bg-[#0078D4] hover:text-white"
                            onClick={() => handleAssignTechnician(tech)}
                            data-testid={`button-assign-${tech.id}`}
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-dashed">
              <CardContent className="pt-6">
                <div className="text-center text-slate-600">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Team Summary</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Supervisors:</span>
                      <span className="font-semibold">{supervisors.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Technicians:</span>
                      <span className="font-semibold">
                        {allTechnicians.filter(t => t.role === "service" && t.active).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#D35400]">
                      <span>Unassigned:</span>
                      <span className="font-semibold">{unassignedTechnicians.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* QC Inspections Section - Metrics and Assignment Form */}
        <div className="space-y-4 mb-6">
          {/* QC Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-[#0078D4]/20 bg-[#0078D4]/5">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-[#0078D4]" data-testid="qc-metric-total">
                  {qcMetrics?.totalAssigned || 0}
                </div>
                <div className="text-xs text-slate-600">Total Assigned</div>
              </CardContent>
            </Card>
            <Card className="border-[#16A679]/20 bg-[#16A679]/5">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-[#16A679]" data-testid="qc-metric-completed">
                  {qcMetrics?.totalCompleted || 0}
                </div>
                <div className="text-xs text-slate-600">Total Completed</div>
              </CardContent>
            </Card>
            <Card className="border-[#FF8000]/20 bg-[#FF8000]/5">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-[#D35400]" data-testid="qc-metric-2weeks">
                  {qcMetrics?.twoWeeks.assigned || 0} / {qcMetrics?.twoWeeks.completed || 0}
                </div>
                <div className="text-xs text-slate-600">Last 2 Weeks (Assigned/Completed)</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-slate-700" data-testid="qc-metric-month">
                  {qcMetrics?.month.assigned || 0} / {qcMetrics?.month.completed || 0}
                </div>
                <div className="text-xs text-slate-600">Last Month (Assigned/Completed)</div>
              </CardContent>
            </Card>
          </div>

          {/* Assign New QC Inspection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-[#0078D4]" />
                  Assign QC Inspection
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-[#0078D4] hover:bg-[#1E40AF]"
                  onClick={() => setShowQcInspectionForm(!showQcInspectionForm)}
                  data-testid="button-toggle-qc-form"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Inspection
                </Button>
              </div>
            </CardHeader>
            {showQcInspectionForm && (
              <CardContent className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qc-supervisor">Assign To Supervisor *</Label>
                    <Select value={qcSelectedSupervisor} onValueChange={setQcSelectedSupervisor}>
                      <SelectTrigger id="qc-supervisor" data-testid="select-qc-supervisor">
                        <SelectValue placeholder="Select supervisor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisors.map((sup) => (
                          <SelectItem key={sup.id} value={sup.id}>
                            {sup.firstName} {sup.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qc-property">Property *</Label>
                    <div className="relative">
                      <Input
                        id="qc-property"
                        placeholder="Search property..."
                        value={qcSelectedProperty ? qcSelectedProperty.name : qcPropertySearch}
                        onChange={(e) => {
                          setQcPropertySearch(e.target.value);
                          setQcSelectedProperty(null);
                        }}
                        data-testid="input-qc-property-search"
                      />
                      {qcPropertyResults.length > 0 && !qcSelectedProperty && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                          {qcPropertyResults.map((prop) => (
                            <button
                              key={prop.id}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 text-sm"
                              onClick={() => {
                                setQcSelectedProperty(prop);
                                setQcPropertySearch("");
                              }}
                              data-testid={`property-option-${prop.id}`}
                            >
                              <div className="font-medium">{prop.name}</div>
                              {prop.address && (
                                <div className="text-xs text-slate-500">{prop.address}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {qcSelectedProperty && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-3 h-3" />
                        {qcSelectedProperty.address || "No address"}
                        <button
                          onClick={() => setQcSelectedProperty(null)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qc-title">Title</Label>
                    <Input
                      id="qc-title"
                      placeholder="Inspection title..."
                      value={qcTitle}
                      onChange={(e) => setQcTitle(e.target.value)}
                      data-testid="input-qc-title"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="qc-notes">Notes</Label>
                    <Textarea
                      id="qc-notes"
                      placeholder="Add notes for the supervisor..."
                      value={qcNotes}
                      onChange={(e) => setQcNotes(e.target.value)}
                      rows={3}
                      data-testid="input-qc-notes"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={resetQcForm}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-[#0078D4] hover:bg-[#1E40AF]"
                      onClick={handleCreateQcInspection}
                      disabled={createQcInspectionMutation.isPending || !qcSelectedSupervisor || !qcSelectedProperty}
                      data-testid="button-create-qc-inspection"
                    >
                      {createQcInspectionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-1" />
                      )}
                      Assign Inspection
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Filter Results</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

              <Select value={technicianFilter || "_all"} onValueChange={(v) => setTechnicianFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="h-9" data-testid="select-technician-filter">
                  <SelectValue placeholder="All Technicians" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Technicians</SelectItem>
                  {serviceTechnicians.map((t) => (
                    <SelectItem key={t.id} value={`${t.firstName} ${t.lastName}`}>
                      {t.firstName} {t.lastName}
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

        <Tabs defaultValue="concerns" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="concerns" className="gap-2" data-testid="tab-concerns">
              <AlertTriangle className="w-4 h-4" />
              Supervisor Concerns
              {filteredConcerns.length > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0">{filteredConcerns.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2" data-testid="tab-activity">
              <ClipboardList className="w-4 h-4" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="qc-inspections" className="gap-2" data-testid="tab-qc-inspections">
              <ClipboardCheck className="w-4 h-4" />
              QC Inspection Log
              {qcInspections.filter(i => i.status === 'assigned').length > 0 && (
                <Badge className="ml-1 bg-[#0078D4] text-white text-xs px-1.5 py-0">
                  {qcInspections.filter(i => i.status === 'assigned').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="concerns">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Supervisor Concerns
                  <Badge className="ml-2 bg-red-100 text-red-700">
                    {filteredConcerns.length} Issues
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredConcerns.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No supervisor concerns reported</p>
                    <p className="text-sm mt-1">{hasActiveFilters ? "Try adjusting your filters" : "Concerns from supervisors will appear here"}</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-3">
                      {filteredConcerns.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-4 border border-slate-200 rounded-lg hover:border-red-200 transition-colors"
                          data-testid={`concern-${entry.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-slate-700">{entry.technicianName}</span>
                                <Badge className={cn("text-xs", getPriorityColor(entry.priority))}>
                                  {entry.priority || "normal"}
                                </Badge>
                                {entry.status === "reviewed" && (
                                  <Badge className="bg-[#22D69A]1A text-[#16A679] text-xs">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Reviewed
                                  </Badge>
                                )}
                              </div>
                              {entry.propertyName && (
                                <div className="flex items-center gap-1 text-sm text-slate-500 mb-2">
                                  <MapPin className="w-3 h-3" />
                                  {entry.propertyName}
                                </div>
                              )}
                              <p className="text-sm text-slate-600">{entry.notes}</p>
                              <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                                <Clock className="w-3 h-3" />
                                {formatDate(entry.createdAt)}
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
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2" data-testid="text-activity-title">
                  <ClipboardList className="w-5 h-5 text-[#0078D4]" />
                  Activity Log
                  <Badge className="ml-2 bg-slate-100 text-slate-700" data-testid="badge-activity-count">
                    {filteredActivity.length + filteredAssignments.length} Items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-500 flex items-center gap-2" data-testid="text-reviewed-heading">
                      <CheckCircle2 className="w-4 h-4" />
                      Recently Reviewed Entries
                    </h4>
                    {filteredActivity.slice(0, 10).map((entry) => (
                      <div
                        key={`reviewed-${entry.id}`}
                        className="flex items-start gap-4 p-3 bg-[#22D69A]1A rounded-lg border border-[#22D69A]33"
                        data-testid={`activity-reviewed-${entry.id}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#22D69A]1A flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-[#16A679]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">{entry.technicianName}</span>
                            <span className="text-slate-500"> submitted </span>
                            <span className="font-medium">{entry.entryType?.replace(/_/g, ' ')}</span>
                          </p>
                          {entry.propertyName && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {entry.propertyName}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(entry.updatedAt || entry.createdAt)}
                          </p>
                        </div>
                        <Badge className="bg-[#22D69A]1A text-[#16A679] text-xs">Reviewed</Badge>
                      </div>
                    ))}
                    {filteredActivity.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-sm" data-testid="text-no-reviewed">
                        {hasActiveFilters ? "No entries match your filters" : "No reviewed entries yet"}
                      </div>
                    )}

                    <h4 className="text-sm font-medium text-slate-500 flex items-center gap-2 mt-6 pt-4 border-t" data-testid="text-assignments-heading">
                      <Users className="w-4 h-4" />
                      Current Team Assignments
                    </h4>
                    {filteredAssignments.slice(0, 20).map((activity, idx) => (
                      <div
                        key={`activity-${idx}`}
                        className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200"
                        data-testid={`activity-assignment-${idx}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#0078D4]/10 flex items-center justify-center">
                          <UserPlus className="w-4 h-4 text-[#0078D4]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">{activity.technicianName}</span>
                            <span className="text-slate-500"> is assigned to </span>
                            <span className="font-medium">{activity.supervisorName}</span>
                          </p>
                          <p className="text-xs text-slate-400">Team Assignment</p>
                        </div>
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                    ))}
                    {filteredAssignments.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-sm" data-testid="text-no-assignments">
                        {hasActiveFilters ? "No assignments match your filters" : "No team assignments yet"}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qc-inspections">
            <div className="space-y-4">
              {/* QC Inspection Activity Log */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#0078D4]" />
                    QC Inspection Log
                    <Badge className="ml-2 bg-slate-100 text-slate-700">
                      {qcInspections.length} Inspections
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qcInspections.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No QC inspections assigned yet</p>
                      <p className="text-sm mt-1">Use the form above to assign inspections to supervisors</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Supervisor</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {qcInspections.map((inspection) => (
                            <TableRow key={inspection.id} data-testid={`qc-row-${inspection.id}`}>
                              <TableCell className="text-sm text-slate-600">
                                {inspection.createdAt ? format(new Date(inspection.createdAt), "MMM d, h:mm a") : "—"}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                {inspection.supervisorName || "—"}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{inspection.propertyName}</div>
                                {inspection.propertyAddress && (
                                  <div className="text-xs text-slate-500">{inspection.propertyAddress}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {inspection.title || "—"}
                              </TableCell>
                              <TableCell>
                                <Badge className={cn(
                                  inspection.status === 'completed' ? 'bg-[#16A679]/10 text-[#16A679]' :
                                  inspection.status === 'in_progress' ? 'bg-[#FF8000]/10 text-[#D35400]' :
                                  'bg-[#0078D4]/10 text-[#0078D4]'
                                )}>
                                  {inspection.status === 'completed' ? 'Completed' :
                                   inspection.status === 'in_progress' ? 'In Progress' : 'Assigned'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {inspection.status !== 'completed' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-[#16A679] hover:bg-[#16A679]/10"
                                    onClick={() => updateQcInspectionMutation.mutate({ id: inspection.id, status: 'completed' })}
                                    data-testid={`button-complete-${inspection.id}`}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Complete
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Supervisor Performance */}
              {qcMetrics?.bySupervisor && qcMetrics.bySupervisor.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#0078D4]" />
                      Supervisor Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {qcMetrics.bySupervisor.map((sup) => (
                        <div key={sup.supervisorId} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-slate-700">{sup.supervisorName || 'Unknown'}</div>
                            <div className="text-sm text-slate-500">
                              {sup.total} assigned, {sup.completed} completed, {sup.pending} pending
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#16A679] rounded-full" 
                                style={{ width: `${sup.total > 0 ? (sup.completed / sup.total) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-600">
                              {sup.total > 0 ? Math.round((sup.completed / sup.total) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0078D4]" />
              Assign to Supervisor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTechnician && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedTechnician.photoUrl || undefined} />
                    <AvatarFallback className="bg-[#FF8000]1A text-[#D35400]">
                      {getInitials(selectedTechnician.firstName, selectedTechnician.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {selectedTechnician.firstName} {selectedTechnician.lastName}
                    </div>
                    <div className="text-sm text-slate-500 capitalize">{selectedTechnician.role}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Select Supervisor</label>
              <Select value={targetSupervisorId} onValueChange={setTargetSupervisorId}>
                <SelectTrigger data-testid="select-supervisor">
                  <SelectValue placeholder="Choose a supervisor..." />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.firstName} {sup.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0078D4] hover:bg-[#1E40AF]"
              onClick={confirmAssignment}
              disabled={!targetSupervisorId || assignMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {assignMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-1" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-[#0078D4]" />
              Reassign Technician
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTechnician && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedTechnician.photoUrl || undefined} />
                    <AvatarFallback className="bg-[#0078D4]1A text-[#0078D4]">
                      {getInitials(selectedTechnician.firstName, selectedTechnician.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {selectedTechnician.firstName} {selectedTechnician.lastName}
                    </div>
                    <div className="text-sm text-slate-500">
                      Currently assigned to:{" "}
                      {supervisors.find(s => s.id === selectedTechnician.supervisorId)
                        ? `${supervisors.find(s => s.id === selectedTechnician.supervisorId)?.firstName} ${supervisors.find(s => s.id === selectedTechnician.supervisorId)?.lastName}`
                        : "None"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Move to Supervisor</label>
              <Select value={targetSupervisorId} onValueChange={setTargetSupervisorId}>
                <SelectTrigger data-testid="select-new-supervisor">
                  <SelectValue placeholder="Choose a supervisor..." />
                </SelectTrigger>
                <SelectContent>
                  {supervisors
                    .filter(sup => sup.id !== selectedTechnician?.supervisorId)
                    .map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>
                        {sup.firstName} {sup.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0078D4] hover:bg-[#0078D4]"
              onClick={confirmAssignment}
              disabled={!targetSupervisorId || targetSupervisorId === selectedTechnician?.supervisorId || assignMutation.isPending}
              data-testid="button-confirm-reassign"
            >
              {assignMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-1" />
              )}
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-3">
              {selectedProfileSupervisor && (
                <>
                  <Avatar className="h-12 w-12 border-2 border-[#0078D4]/20">
                    <AvatarImage src={selectedProfileSupervisor.photoUrl || undefined} />
                    <AvatarFallback className="bg-[#0078D4]/10 text-[#0078D4]">
                      {getInitials(selectedProfileSupervisor.firstName, selectedProfileSupervisor.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xl font-bold text-slate-800">
                      {selectedProfileSupervisor.firstName} {selectedProfileSupervisor.lastName}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-3">
                      <Badge className="bg-[#0078D4]/10 text-[#0078D4]">Supervisor</Badge>
                      {selectedProfileSupervisor.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {selectedProfileSupervisor.email}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#0078D4]" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Card className="border-[#0078D4]/20 bg-[#0078D4]/10">
                    <CardContent className="pt-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#0078D4]/20 flex items-center justify-center mx-auto mb-2">
                        <MapPin className="w-5 h-5 text-[#0078D4]" />
                      </div>
                      <div className="text-2xl font-bold text-[#0078D4]" data-testid="metric-checked-out">
                        {supervisorProfile?.metrics.checkedOut || 0}
                      </div>
                      <div className="text-xs text-[#0078D4]">Inspected Property</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#0078D4]/20 bg-[#0078D4]/10">
                    <CardContent className="pt-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#0078D4]/20 flex items-center justify-center mx-auto mb-2">
                        <ClipboardList className="w-5 h-5 text-[#0078D4]" />
                      </div>
                      <div className="text-2xl font-bold text-[#0078D4]" data-testid="metric-assignments">
                        {supervisorProfile?.metrics.assignmentsCreated || 0}
                      </div>
                      <div className="text-xs text-[#0078D4]">Assignments Created</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#FF8000]/20 bg-[#FF8000]/10">
                    <CardContent className="pt-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#FF8000]/20 flex items-center justify-center mx-auto mb-2">
                        <FileCheck2 className="w-5 h-5 text-[#D35400]" />
                      </div>
                      <div className="text-2xl font-bold text-[#D35400]" data-testid="metric-not-completed">
                        {supervisorProfile?.metrics.notCompletedResolved || 0}
                      </div>
                      <div className="text-xs text-[#D35400]">Not Completed Resolved</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#17BEBB]/20 bg-[#17BEBB]/10">
                    <CardContent className="pt-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#17BEBB]/20 flex items-center justify-center mx-auto mb-2">
                        <HandHelping className="w-5 h-5 text-[#0D9488]" />
                      </div>
                      <div className="text-2xl font-bold text-[#0D9488]" data-testid="metric-need-assistance">
                        {supervisorProfile?.metrics.needAssistanceResolved || 0}
                      </div>
                      <div className="text-xs text-[#0D9488]">Need Assistance Resolved</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#EF4444]/20 bg-[#EF4444]/10">
                    <CardContent className="pt-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#EF4444]/20 flex items-center justify-center mx-auto mb-2">
                        <XCircle className="w-5 h-5 text-[#EF4444]" />
                      </div>
                      <div className="text-2xl font-bold text-[#EF4444]" data-testid="metric-dismissed">
                        {supervisorProfile?.metrics.dismissed || 0}
                      </div>
                      <div className="text-xs text-[#EF4444]">Dismissed</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#0078D4]" />
                        Activity Log
                        <Badge variant="outline" className="ml-2">
                          {supervisorProfile?.activity.length || 0} entries
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Select value={profileActivityFilter} onValueChange={setProfileActivityFilter}>
                          <SelectTrigger className="w-[180px]" data-testid="select-activity-filter">
                            <SelectValue placeholder="Filter by action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            <SelectItem value="checked_out">Inspected Property</SelectItem>
                            <SelectItem value="assignment_created">Assignments</SelectItem>
                            <SelectItem value="resolved_not_completed">Not Completed</SelectItem>
                            <SelectItem value="resolved_need_assistance">Need Assistance</SelectItem>
                            <SelectItem value="dismissed">Dismissed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              {profileDateRange?.from ? (
                                profileDateRange.to ? (
                                  <>
                                    {format(profileDateRange.from, "MMM d")} - {format(profileDateRange.to, "MMM d")}
                                  </>
                                ) : (
                                  format(profileDateRange.from, "MMM d, yyyy")
                                )
                              ) : (
                                "Date Range"
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="range"
                              selected={profileDateRange}
                              onSelect={setProfileDateRange}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportActivity}
                          data-testid="button-export-activity"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(!supervisorProfile?.activity || supervisorProfile.activity.length === 0) ? (
                      <div className="text-center py-8 text-slate-500">
                        <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>No activity found</p>
                        <p className="text-sm mt-1">Activity will appear here as the supervisor takes actions</p>
                      </div>
                    ) : (
                      <ScrollArea className="max-h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Property</TableHead>
                              <TableHead>Technician</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supervisorProfile.activity.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="text-sm text-slate-600">
                                  {entry.createdAt ? format(new Date(entry.createdAt), "MMM d, h:mm a") : "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn("gap-1", getActionColor(entry.actionType))}>
                                    {getActionIcon(entry.actionType)}
                                    {formatActionType(entry.actionType)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {entry.propertyName || "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {entry.technicianName || "—"}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">
                                  {entry.notes || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
