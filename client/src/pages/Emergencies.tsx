import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle, CalendarIcon, Filter, Clock, CheckCircle, ArrowLeft,
  MapPin, Loader2, User, Search, AlertCircle, PlayCircle, FileText, Receipt, DollarSign, XCircle
} from "lucide-react";
import type { Emergency } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const roleLabels: Record<string, { label: string; color: string }> = {
  service_technician: { label: "Service Tech", color: "bg-[#2374AB]1A text-[#2374AB]" },
  repair_technician: { label: "Repair Tech", color: "bg-[#17BEBB]1A text-[#17BEBB]" },
  supervisor: { label: "Supervisor", color: "bg-[#22D69A]1A text-[#22D69A]" },
  repair_foreman: { label: "Repair Foreman", color: "bg-[#FF8000]1A text-[#FF8000]" },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending_review: { label: "Pending Review", color: "bg-[#FF8000]1A text-[#FF8000]", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-[#2374AB]1A text-[#2374AB]", icon: PlayCircle },
  resolved: { label: "Resolved", color: "bg-[#22D69A]1A text-[#22D69A]", icon: CheckCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "border-slate-300 text-slate-600" },
  normal: { label: "Normal", color: "border-slate-300 text-slate-600" },
  high: { label: "High", color: "border-orange-300 text-[#FF8000] bg-[#FF8000]1A" },
  critical: { label: "Critical", color: "border-red-400 text-red-700 bg-red-50" },
};

export default function Emergencies() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [propertySearch, setPropertySearch] = useState<string>("");
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>("");

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (dateRange.from) params.set("startDate", startOfDay(dateRange.from).toISOString());
    if (dateRange.to) params.set("endDate", endOfDay(dateRange.to).toISOString());
    if (selectedRole !== "all") params.set("submitterRole", selectedRole);
    if (selectedStatus !== "all") params.set("status", selectedStatus);
    if (propertySearch.trim()) params.set("propertySearch", propertySearch.trim());
    return params.toString();
  };

  const { data: emergencies = [], isLoading } = useQuery<Emergency[]>({
    queryKey: ["emergencies", dateRange, selectedRole, selectedStatus, propertySearch],
    queryFn: async () => {
      const response = await fetch(`/api/emergencies?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch emergencies");
      return response.json();
    },
  });

  const { data: summary } = useQuery<{ total: number; byRole: Record<string, number>; byStatus: Record<string, number> }>({
    queryKey: ["emergencies-summary"],
    queryFn: async () => {
      const response = await fetch("/api/emergencies/summary");
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/emergencies/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionNotes: notes }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergencies"] });
      queryClient.invalidateQueries({ queryKey: ["emergencies-summary"] });
      setSelectedEmergency(null);
      setResolutionNotes("");
      toast({ title: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const convertToEstimateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/emergencies/${id}/convert-to-estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to convert to estimate");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["emergencies"] });
      queryClient.invalidateQueries({ queryKey: ["emergencies-summary"] });
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      setSelectedEmergency(null);
      toast({ 
        title: "Converted to Estimate", 
        description: `Estimate ${data.estimate.estimateNumber} created successfully`
      });
    },
    onError: () => {
      toast({ title: "Failed to convert to estimate", variant: "destructive" });
    },
  });

  const invoiceDirectlyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/emergencies/${id}/invoice-directly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to invoice");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["emergencies"] });
      queryClient.invalidateQueries({ queryKey: ["emergencies-summary"] });
      setSelectedEmergency(null);
      toast({ 
        title: "Invoiced Successfully", 
        description: data.message
      });
    },
    onError: () => {
      toast({ title: "Failed to invoice", variant: "destructive" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await fetch(`/api/emergencies/${id}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to dismiss");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergencies"] });
      queryClient.invalidateQueries({ queryKey: ["emergencies-summary"] });
      setSelectedEmergency(null);
      setResolutionNotes("");
      toast({ 
        title: "Emergency Dismissed", 
        description: "No further action needed"
      });
    },
    onError: () => {
      toast({ title: "Failed to dismiss", variant: "destructive" });
    },
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return format(new Date(date), "MMM d, yyyy h:mm a");
  };

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "";
    const now = new Date();
    const created = new Date(date);
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days waiting`;
  };

  const propertyMetrics = useMemo(() => {
    const byProperty: Record<string, { name: string; count: number; pending: number; totalAmount: number }> = {};
    
    emergencies.forEach((e) => {
      const propId = e.propertyId || "unknown";
      const propName = e.propertyName || "Unknown Property";
      
      if (!byProperty[propId]) {
        byProperty[propId] = { name: propName, count: 0, pending: 0, totalAmount: 0 };
      }
      byProperty[propId].count++;
      if (e.status === "pending_review" || e.status === "in_progress") {
        byProperty[propId].pending++;
      }
      byProperty[propId].totalAmount += e.totalAmount || 0;
    });

    return Object.entries(byProperty)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [emergencies]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tech-ops">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading">Emergencies</h1>
              <p className="text-slate-500 text-sm">Completed but not completed - urgent follow-up required</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#2374AB]" />
                Filter Emergencies
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search property..."
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    className="pl-9 w-[180px]"
                    data-testid="input-property-search"
                  />
                </div>

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

                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-[160px]" data-testid="select-role">
                    <User className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="service_technician">Service Tech</SelectItem>
                    <SelectItem value="repair_technician">Repair Tech</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="repair_foreman">Repair Foreman</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[160px]" data-testid="select-status">
                    <Clock className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200" data-testid="metric-total">
                <div className="text-2xl font-bold text-[#2374AB]">{summary?.total || 0}</div>
                <div className="text-sm text-slate-500">Total Emergencies</div>
              </div>
              <div className="p-4 bg-[#FF8000]1A rounded-lg border border-[#FF8000]33" data-testid="metric-pending">
                <div className="text-2xl font-bold text-[#FF8000]">{summary?.byStatus?.pending_review || 0}</div>
                <div className="text-sm text-[#FF8000]">Pending Review</div>
              </div>
              <div className="p-4 bg-[#2374AB]1A rounded-lg border border-[#2374AB]33" data-testid="metric-in-progress">
                <div className="text-2xl font-bold text-[#2374AB]">{summary?.byStatus?.in_progress || 0}</div>
                <div className="text-sm text-[#2374AB]">In Progress</div>
              </div>
              <div className="p-4 bg-[#22D69A]1A rounded-lg border border-[#22D69A]33" data-testid="metric-resolved">
                <div className="text-2xl font-bold text-[#22D69A]">{summary?.byStatus?.resolved || 0}</div>
                <div className="text-sm text-[#22D69A]">Resolved</div>
              </div>
            </div>

            {propertyMetrics.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Top Properties by Emergencies
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {propertyMetrics.map((prop, index) => (
                    <div 
                      key={prop.id} 
                      className="p-3 bg-white border border-slate-200 rounded-lg hover:border-red-200 hover:bg-red-50/30 transition-colors cursor-pointer"
                      onClick={() => setPropertySearch(prop.name)}
                      data-testid={`property-metric-${index}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg font-bold text-[#1E293B]">{prop.count}</span>
                        {prop.pending > 0 && (
                          <Badge className="bg-[#FF8000]1A text-[#FF8000] text-[10px] px-1.5">
                            {prop.pending} open
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 truncate" title={prop.name}>
                        {prop.name}
                      </div>
                      {prop.totalAmount > 0 && (
                        <div className="text-xs text-[#22D69A] mt-1">
                          ${(prop.totalAmount / 100).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#2374AB]" />
              </div>
            ) : emergencies.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No emergencies found for the selected filters</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {emergencies.map((emergency) => {
                    const roleConfig = roleLabels[emergency.submitterRole] || { label: emergency.submitterRole, color: "bg-slate-100 text-slate-700" };
                    const statConfig = statusConfig[emergency.status] || statusConfig.pending_review;
                    const prioConfig = priorityConfig[emergency.priority || "normal"];
                    const StatusIcon = statConfig.icon;

                    return (
                      <div
                        key={emergency.id}
                        className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => setSelectedEmergency(emergency)}
                        data-testid={`emergency-${emergency.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-100 shrink-0">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge className={cn("text-xs", statConfig.color)}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statConfig.label}
                                </Badge>
                                <Badge className={cn("text-xs", roleConfig.color)}>
                                  {roleConfig.label}
                                </Badge>
                                {emergency.priority && emergency.priority !== "normal" && (
                                  <Badge variant="outline" className={cn("text-xs", prioConfig.color)}>
                                    {prioConfig.label}
                                  </Badge>
                                )}
                                <span className="text-xs text-red-600 font-medium">
                                  {formatTimeAgo(emergency.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-[#1E293B] line-clamp-2 mb-2">{emergency.description}</p>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                {emergency.propertyName && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {emergency.propertyName}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" /> {emergency.submittedByName || "Unknown"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3" /> {formatDate(emergency.createdAt)}
                                </span>
                              </div>
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

      <Dialog open={!!selectedEmergency} onOpenChange={(open) => !open && setSelectedEmergency(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Emergency Details
            </DialogTitle>
            <DialogDescription>
              {selectedEmergency?.propertyName || "Unknown Property"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmergency && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <Badge className={cn(statusConfig[selectedEmergency.status]?.color)}>
                    {statusConfig[selectedEmergency.status]?.label || selectedEmergency.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Submitted By</span>
                  <span className="text-sm font-medium">{selectedEmergency.submittedByName || "Unknown"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Role</span>
                  <Badge className={cn("text-xs", roleLabels[selectedEmergency.submitterRole]?.color)}>
                    {roleLabels[selectedEmergency.submitterRole]?.label || selectedEmergency.submitterRole}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Created</span>
                  <span className="text-sm">{formatDate(selectedEmergency.createdAt)}</span>
                </div>
                {selectedEmergency.propertyAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Address</span>
                    <span className="text-sm text-right max-w-[200px]">{selectedEmergency.propertyAddress}</span>
                  </div>
                )}
                {selectedEmergency.totalAmount !== null && selectedEmergency.totalAmount !== undefined && selectedEmergency.totalAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Amount</span>
                    <span className="text-sm font-medium text-[#22D69A]">${(selectedEmergency.totalAmount / 100).toFixed(2)}</span>
                  </div>
                )}
                {selectedEmergency.convertedToEstimateId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Converted To</span>
                    <Badge className="bg-[#17BEBB]1A text-[#17BEBB]">Estimate Created</Badge>
                  </div>
                )}
                {selectedEmergency.convertedToInvoiceId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Invoiced As</span>
                    <Badge className="bg-[#2374AB]1A text-[#2374AB]">{selectedEmergency.convertedToInvoiceId}</Badge>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Description</label>
                <p className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">{selectedEmergency.description}</p>
              </div>

              {selectedEmergency.status !== "resolved" && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Resolution Notes (optional)</label>
                  <Textarea
                    placeholder="Add notes about how this was resolved..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                    data-testid="textarea-resolution-notes"
                  />
                </div>
              )}

              {selectedEmergency.resolutionNotes && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Resolution Notes</label>
                  <p className="text-sm text-slate-600 p-3 bg-[#22D69A]1A rounded-lg border border-[#22D69A]33">{selectedEmergency.resolutionNotes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {selectedEmergency?.status !== "resolved" && (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => convertToEstimateMutation.mutate(selectedEmergency!.id)}
                  disabled={convertToEstimateMutation.isPending || invoiceDirectlyMutation.isPending || dismissMutation.isPending}
                  data-testid="button-convert-estimate"
                  className="flex-1 sm:flex-initial"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Convert to Estimate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => invoiceDirectlyMutation.mutate(selectedEmergency!.id)}
                  disabled={convertToEstimateMutation.isPending || invoiceDirectlyMutation.isPending || dismissMutation.isPending}
                  data-testid="button-invoice-directly"
                  className="flex-1 sm:flex-initial"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Invoice Directly
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => dismissMutation.mutate({ id: selectedEmergency!.id, reason: resolutionNotes || undefined })}
                  disabled={convertToEstimateMutation.isPending || invoiceDirectlyMutation.isPending || dismissMutation.isPending}
                  data-testid="button-dismiss"
                  className="flex-1 sm:flex-initial text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Dismiss
                </Button>
              </div>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              {selectedEmergency?.status === "pending_review" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ id: selectedEmergency.id, status: "in_progress" })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-start-progress"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start Progress
                  </Button>
                  <Button
                    onClick={() => updateStatusMutation.mutate({ 
                      id: selectedEmergency.id, 
                      status: "resolved",
                      notes: resolutionNotes 
                    })}
                    disabled={updateStatusMutation.isPending}
                    className="bg-[#22D69A] hover:bg-[#22D69A]"
                    data-testid="button-resolve"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </Button>
                </>
              )}
              {selectedEmergency?.status === "in_progress" && (
                <Button
                  onClick={() => updateStatusMutation.mutate({ 
                    id: selectedEmergency.id, 
                    status: "resolved",
                    notes: resolutionNotes 
                  })}
                  disabled={updateStatusMutation.isPending}
                  className="bg-[#22D69A] hover:bg-[#22D69A]"
                  data-testid="button-resolve"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Resolved
                </Button>
              )}
              {selectedEmergency?.status === "resolved" && !selectedEmergency.convertedToEstimateId && !selectedEmergency.convertedToInvoiceId && (
                <Button variant="outline" onClick={() => setSelectedEmergency(null)}>
                  Close
                </Button>
              )}
              {selectedEmergency?.status === "resolved" && (selectedEmergency.convertedToEstimateId || selectedEmergency.convertedToInvoiceId) && (
                <Button variant="outline" onClick={() => setSelectedEmergency(null)}>
                  Close
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
