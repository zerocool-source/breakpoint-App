import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Wrench, Plus, Loader2, CheckCircle, Clock, XCircle,
  Droplets, Wind, AlertTriangle, FileText, User, MapPin, Trash2,
  CalendarIcon, Filter, Archive, FileUp, Zap, Image, X, ChevronLeft, ChevronRight,
  Receipt, Ban, DollarSign, Building
} from "lucide-react";
import type { TechOpsEntry, Property } from "@shared/schema";
import { cn } from "@/lib/utils";

const entryTypeConfig: Record<string, { label: string; icon: any; color: string; description: string }> = {
  repairs_needed: { 
    label: "Repairs Needed", 
    icon: Wrench, 
    color: "bg-red-100 text-red-700 border-red-200",
    description: "Report equipment or pool repairs needed at a property"
  },
  service_repairs: { 
    label: "Service Repairs", 
    icon: Wrench, 
    color: "bg-purple-100 text-purple-700 border-purple-200",
    description: "Sub-$500 service repairs submitted by technicians"
  },
  chemical_order: { 
    label: "Chemical Order", 
    icon: Droplets, 
    color: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Request chemicals to be ordered for a property"
  },
  chemicals_dropoff: { 
    label: "Chemicals Drop-Off", 
    icon: Droplets, 
    color: "bg-green-100 text-green-700 border-green-200",
    description: "Log chemicals delivered or dropped off at a property"
  },
  windy_day_cleanup: { 
    label: "Windy Day Clean Up", 
    icon: Wind, 
    color: "bg-amber-100 text-amber-700 border-amber-200",
    description: "Schedule additional cleanup due to windy conditions"
  },
  report_issue: { 
    label: "Report Issue", 
    icon: AlertTriangle, 
    color: "bg-orange-100 text-orange-700 border-orange-200",
    description: "Report any issue or concern at a property"
  },
  supervisor_concerns: { 
    label: "Supervisor Concerns", 
    icon: User, 
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    description: "Concerns or issues escalated to supervisors"
  },
};

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
  reviewed: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle, label: "Reviewed" },
  completed: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: XCircle, label: "Cancelled" },
  archived: { color: "bg-slate-100 text-slate-500 border-slate-200", icon: XCircle, label: "Archived" },
};

const priorityConfig: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-green-100", text: "text-green-700", label: "Low" },
  normal: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Medium" },
  high: { bg: "bg-orange-100", text: "text-orange-700", label: "High" },
  urgent: { bg: "bg-red-100", text: "text-red-700", label: "Urgent" },
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

export default function TechOps() {
  const [, params] = useRoute("/tech-ops/:type");
  const entryType = params?.type?.replace(/-/g, '_') || "repairs_needed";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedTech, setSelectedTech] = useState<string>("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertEntry, setConvertEntry] = useState<TechOpsEntry | null>(null);
  const [markUrgent, setMarkUrgent] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (photos: string[], index: number) => {
    setLightboxImages(photos);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  const [form, setForm] = useState({
    technicianName: "",
    propertyId: "",
    propertyName: "",
    propertyAddress: "",
    description: "",
    priority: "normal",
    chemicals: "",
    quantity: "",
    issueType: "",
  });

  const config = entryTypeConfig[entryType] || entryTypeConfig.repairs_needed;
  const Icon = config.icon;

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("entryType", entryType);
    if (dateRange.from) params.set("startDate", startOfDay(dateRange.from).toISOString());
    if (dateRange.to) params.set("endDate", endOfDay(dateRange.to).toISOString());
    if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
    if (selectedTech !== "all") params.set("technicianName", selectedTech);
    if (entryType === "repairs_needed" && urgentOnly) params.set("priority", "urgent");
    return params.toString();
  };

  const { data: entries = [], isLoading } = useQuery<TechOpsEntry[]>({
    queryKey: ["tech-ops", entryType, dateRange, selectedProperty, selectedTech, urgentOnly],
    queryFn: async () => {
      const response = await fetch(`/api/tech-ops?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch entries");
      return response.json();
    },
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties");
      if (!response.ok) throw new Error("Failed to fetch properties");
      return response.json();
    },
  });

  // Fetch pending count for Windy Day Cleanup badge
  const { data: pendingCount = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["windy-day-pending-count"],
    queryFn: async () => {
      const response = await fetch("/api/tech-ops/windy-day-pending-count");
      if (!response.ok) throw new Error("Failed to fetch pending count");
      return response.json();
    },
    enabled: entryType === "windy_day_cleanup",
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

  // Group entries by property for windy_day_cleanup view
  const entriesByProperty = useMemo(() => {
    if (entryType !== "windy_day_cleanup") return null;
    
    const groups: Record<string, { propertyName: string; propertyAddress?: string; entries: typeof entries }> = {};
    entries.forEach(entry => {
      const key = entry.propertyId || entry.propertyName || "Unknown Property";
      if (!groups[key]) {
        groups[key] = {
          propertyName: entry.propertyName || "Unknown Property",
          propertyAddress: (entry as any).propertyAddress,
          entries: []
        };
      }
      groups[key].entries.push(entry);
    });
    
    // Sort groups by property name
    return Object.entries(groups).sort((a, b) => 
      a[1].propertyName.localeCompare(b[1].propertyName)
    );
  }, [entries, entryType]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/tech-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, entryType }),
      });
      if (!response.ok) throw new Error("Failed to create entry");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops"] });
      setShowAddDialog(false);
      setForm({
        technicianName: "",
        propertyId: "",
        propertyName: "",
        propertyAddress: "",
        description: "",
        priority: "normal",
        chemicals: "",
        quantity: "",
        issueType: "",
      });
      toast({ title: "Entry Created", description: "Tech ops entry has been submitted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create entry", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tech-ops/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete entry");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops"] });
      toast({ title: "Entry Deleted" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tech-ops/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewedBy: "Admin" }),
      });
      if (!response.ok) throw new Error("Failed to review entry");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops"] });
      toast({ title: "Entry Marked as Reviewed" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tech-ops/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to archive entry");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops"] });
      queryClient.invalidateQueries({ queryKey: ["windy-day-pending-count"] });
      toast({ title: "Entry Dismissed", description: "Entry has been archived" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to dismiss entry", variant: "destructive" });
    },
  });

  // No Charge mutation for Windy Day Cleanup
  const noChargeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tech-ops/${id}/no-charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to mark as no charge");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops"] });
      queryClient.invalidateQueries({ queryKey: ["windy-day-pending-count"] });
      toast({ title: "No Charge", description: "Entry marked as completed with no billing" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark as no charge", variant: "destructive" });
    },
  });

  // Create Invoice mutation for Windy Day Cleanup - marks entry and redirects to invoice creation
  const createInvoiceMutation = useMutation({
    mutationFn: async (entry: TechOpsEntry) => {
      // First mark the entry as completed (being invoiced)
      const response = await fetch(`/api/tech-ops/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "completed",
          notes: (entry.notes || "") + (entry.notes?.includes("[Invoice Created]") ? "" : "\n[Invoice Created]")
        }),
      });
      if (!response.ok) throw new Error("Failed to update entry status");
      return { entry };
    },
    onSuccess: ({ entry }) => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops"] });
      queryClient.invalidateQueries({ queryKey: ["windy-day-pending-count"] });
      // Navigate to invoice creation with pre-filled data
      window.location.href = `/estimates/new?propertyId=${entry.propertyId || ''}&propertyName=${encodeURIComponent(entry.propertyName || '')}&title=${encodeURIComponent('Windy Day Cleanup - ' + (entry.propertyName || ''))}&description=${encodeURIComponent(entry.description || entry.notes || '')}`;
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create invoice", variant: "destructive" });
    },
  });

  const convertToEstimateMutation = useMutation({
    mutationFn: async ({ id, urgent }: { id: string; urgent: boolean }) => {
      const response = await fetch(`/api/tech-ops/${id}/convert-to-estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urgent }),
      });
      if (!response.ok) throw new Error("Failed to convert to estimate");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops"] });
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      setShowConvertDialog(false);
      setConvertEntry(null);
      setMarkUrgent(false);
      toast({ 
        title: "Converted to Estimate", 
        description: `Estimate #${data.estimateNumber || data.id} has been created`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to convert to estimate", variant: "destructive" });
    },
  });

  const handleOpenConvertDialog = (entry: TechOpsEntry) => {
    setConvertEntry(entry);
    setMarkUrgent(false);
    setShowConvertDialog(true);
  };

  const handleConvertToEstimate = () => {
    if (convertEntry) {
      convertToEstimateMutation.mutate({ id: convertEntry.id, urgent: markUrgent });
    }
  };

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    setForm({
      ...form,
      propertyId,
      propertyName: property?.name || "",
      propertyAddress: property?.address || "",
    });
  };

  const handleSubmit = () => {
    if (!form.technicianName || !form.propertyId) {
      toast({ title: "Missing Fields", description: "Technician name and property are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading">{config.label}</h1>
                {entryType === "windy_day_cleanup" && pendingCount.count > 0 && (
                  <Badge className="bg-amber-500 text-white border-amber-600 px-2.5 py-0.5 text-sm font-semibold" data-testid="badge-pending-count">
                    {pendingCount.count} Pending
                  </Badge>
                )}
              </div>
              <p className="text-slate-500 text-sm">{config.description}</p>
            </div>
          </div>
          <Button
            className="bg-[#4169E1] hover:bg-[#1E40AF]"
            onClick={() => setShowAddDialog(true)}
            data-testid="button-add-entry"
          >
            <Plus className="w-4 h-4 mr-2" /> New Entry
          </Button>
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

          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[180px]" data-testid="filter-property">
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
            <SelectTrigger className="w-[180px]" data-testid="filter-technician">
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

          {entryType === "repairs_needed" && (
            <Button
              variant={urgentOnly ? "default" : "outline"}
              size="sm"
              className={urgentOnly ? "bg-red-500 hover:bg-red-600 text-white" : ""}
              onClick={() => setUrgentOnly(!urgentOnly)}
              data-testid="filter-urgent"
            >
              <Zap className="w-4 h-4 mr-1" />
              URGENT Only
            </Button>
          )}

          <div className="ml-auto text-sm text-slate-500">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {entryType === "windy_day_cleanup" ? (
                <>
                  <Building className="w-5 h-5 text-[#4169E1]" />
                  Entries by Property
                </>
              ) : (
                "Entries"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#4169E1]" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No entries found</p>
                <p className="text-sm mt-1">Try adjusting your filters or click "New Entry" to submit one</p>
              </div>
            ) : entryType === "windy_day_cleanup" && entriesByProperty ? (
              /* Property-Grouped View for Windy Day Cleanup */
              <ScrollArea className="max-h-[700px]">
                <div className="space-y-6">
                  {entriesByProperty.map(([propertyKey, group]) => (
                    <div key={propertyKey} className="border border-slate-200 rounded-lg overflow-hidden" data-testid={`property-group-${propertyKey}`}>
                      {/* Property Header */}
                      <div className="bg-gradient-to-r from-[#4169E1] to-[#3B82F6] text-white p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Building className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{group.propertyName}</h3>
                            {group.propertyAddress && (
                              <p className="text-blue-100 text-sm">{group.propertyAddress}</p>
                            )}
                          </div>
                          <Badge className="bg-white/20 text-white border-white/30">
                            {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Property Entries */}
                      <div className="bg-white divide-y divide-slate-100">
                        {group.entries.map((entry) => {
                          const statusCfg = statusConfig[entry.status || "pending"];
                          const StatusIcon = statusCfg.icon;
                          const priorityCfg = priorityConfig[entry.priority || "normal"];
                          const photos = entry.photos || [];
                          
                          return (
                            <div
                              key={entry.id}
                              className="p-4 hover:bg-slate-50 transition-colors"
                              data-testid={`entry-item-${entry.id}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0 space-y-2">
                                  {/* Header: Status, Priority, Date, Technician */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={statusCfg.color}>
                                      <StatusIcon className="w-3 h-3 mr-1" />
                                      {statusCfg.label}
                                    </Badge>
                                    <Badge className={cn(priorityCfg.bg, priorityCfg.text, "font-semibold")}>
                                      {priorityCfg.label}
                                    </Badge>
                                    <span className="text-sm text-slate-600 flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {entry.technicianName}
                                    </span>
                                    <span className="text-xs text-slate-400 ml-auto">
                                      {formatDate(entry.createdAt)}
                                    </span>
                                  </div>

                                  {/* Description/Notes */}
                                  {(entry.description || entry.notes) && (
                                    <div className="bg-cyan-50 border border-cyan-100 rounded-md p-3">
                                      {entry.description && (
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.description}</p>
                                      )}
                                      {entry.notes && entry.notes !== entry.description && (
                                        <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{entry.notes}</p>
                                      )}
                                    </div>
                                  )}

                                  {/* Photo Gallery */}
                                  {photos.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {photos.map((photo, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => openLightbox(photos, idx)}
                                          className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-[#4169E1] transition-colors"
                                        >
                                          <img
                                            src={photo}
                                            alt={`Photo ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="%23f1f5f9" width="64" height="64"/><text x="32" y="36" text-anchor="middle" fill="%2394a3b8" font-size="8">No img</text></svg>';
                                            }}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                  {entry.status !== "archived" && entry.status !== "completed" && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="bg-[#2CA01C] hover:bg-[#248a17] text-white"
                                        onClick={() => createInvoiceMutation.mutate(entry)}
                                        disabled={createInvoiceMutation.isPending || noChargeMutation.isPending || archiveMutation.isPending}
                                        data-testid={`button-create-invoice-${entry.id}`}
                                      >
                                        {createInvoiceMutation.isPending ? (
                                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        ) : (
                                          <Receipt className="w-4 h-4 mr-1" />
                                        )}
                                        Create Invoice
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                                        onClick={() => noChargeMutation.mutate(entry.id)}
                                        disabled={createInvoiceMutation.isPending || noChargeMutation.isPending || archiveMutation.isPending}
                                        data-testid={`button-no-charge-${entry.id}`}
                                      >
                                        {noChargeMutation.isPending ? (
                                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        ) : (
                                          <Ban className="w-4 h-4 mr-1" />
                                        )}
                                        No Charge
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                                        onClick={() => archiveMutation.mutate(entry.id)}
                                        disabled={createInvoiceMutation.isPending || noChargeMutation.isPending || archiveMutation.isPending}
                                        data-testid={`button-dismiss-${entry.id}`}
                                      >
                                        {archiveMutation.isPending ? (
                                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        ) : (
                                          <Archive className="w-4 h-4 mr-1" />
                                        )}
                                        Dismiss
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => deleteMutation.mutate(entry.id)}
                                    data-testid={`button-delete-${entry.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const statusCfg = statusConfig[entry.status || "pending"];
                    const StatusIcon = statusCfg.icon;
                    const priorityCfg = priorityConfig[entry.priority || "normal"];
                    const photos = entry.photos || [];
                    return (
                      <div
                        key={entry.id}
                        className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                        data-testid={`entry-item-${entry.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-3">
                            {/* Header: Status, Priority, Date */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={statusCfg.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusCfg.label}
                              </Badge>
                              <Badge className={cn(priorityCfg.bg, priorityCfg.text, "font-semibold")}>
                                {priorityCfg.label}
                              </Badge>
                              <span className="text-xs text-slate-400 ml-auto">
                                {formatDate(entry.createdAt)}
                              </span>
                            </div>

                            {/* Property Info */}
                            <div className="bg-slate-50 rounded-md p-3 space-y-1">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-[#4169E1]" />
                                <span className="font-semibold text-[#1E293B]">{entry.propertyName || "No property"}</span>
                              </div>
                              {(entry as any).propertyAddress && (
                                <p className="text-sm text-slate-500 ml-6">{(entry as any).propertyAddress}</p>
                              )}
                            </div>

                            {/* Technician */}
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600">Submitted by:</span>
                              <span className="font-medium text-[#1E293B]">{entry.technicianName}</span>
                            </div>

                            {/* Description/Notes */}
                            {(entry.description || entry.notes) && (
                              <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                                <h4 className="text-xs font-semibold text-blue-700 uppercase mb-1">Description / Notes</h4>
                                {entry.description && (
                                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.description}</p>
                                )}
                                {entry.notes && entry.notes !== entry.description && (
                                  <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{entry.notes}</p>
                                )}
                              </div>
                            )}

                            {/* Chemical info (for other entry types) */}
                            {entry.chemicals && (
                              <p className="text-sm text-slate-600">
                                <strong>Chemicals:</strong> {entry.chemicals}
                                {entry.quantity && ` (${entry.quantity})`}
                              </p>
                            )}
                            {entry.issueType && (
                              <p className="text-sm text-slate-600">
                                <strong>Issue Type:</strong> {entry.issueType}
                              </p>
                            )}

                            {/* Photo Gallery */}
                            {photos.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                                  <Image className="w-3 h-3" />
                                  Attached Photos ({photos.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {photos.map((photo, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => openLightbox(photos, idx)}
                                      className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-[#4169E1] transition-colors"
                                      data-testid={`photo-thumb-${entry.id}-${idx}`}
                                    >
                                      <img
                                        src={photo}
                                        alt={`Photo ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="%23f1f5f9" width="80" height="80"/><text x="40" y="45" text-anchor="middle" fill="%2394a3b8" font-size="10">No image</text></svg>';
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">View</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            {entryType === "repairs_needed" && entry.status !== "archived" && entry.status !== "completed" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-[#4169E1] hover:bg-[#1E40AF] text-white"
                                  onClick={() => handleOpenConvertDialog(entry)}
                                  data-testid={`button-convert-${entry.id}`}
                                >
                                  <FileUp className="w-4 h-4 mr-1" /> Convert to Estimate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                                  onClick={() => archiveMutation.mutate(entry.id)}
                                  data-testid={`button-archive-${entry.id}`}
                                >
                                  <Archive className="w-4 h-4 mr-1" /> Archive
                                </Button>
                              </>
                            )}
                            {/* Windy Day Cleanup specific actions */}
                            {entryType === "windy_day_cleanup" && entry.status !== "archived" && entry.status !== "completed" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-[#2CA01C] hover:bg-[#248a17] text-white"
                                  onClick={() => createInvoiceMutation.mutate(entry)}
                                  disabled={createInvoiceMutation.isPending || noChargeMutation.isPending || archiveMutation.isPending}
                                  data-testid={`button-create-invoice-${entry.id}`}
                                >
                                  {createInvoiceMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Receipt className="w-4 h-4 mr-1" />
                                  )}
                                  Create Invoice
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                                  onClick={() => noChargeMutation.mutate(entry.id)}
                                  disabled={createInvoiceMutation.isPending || noChargeMutation.isPending || archiveMutation.isPending}
                                  data-testid={`button-no-charge-${entry.id}`}
                                >
                                  {noChargeMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Ban className="w-4 h-4 mr-1" />
                                  )}
                                  No Charge
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                                  onClick={() => archiveMutation.mutate(entry.id)}
                                  disabled={createInvoiceMutation.isPending || noChargeMutation.isPending || archiveMutation.isPending}
                                  data-testid={`button-dismiss-${entry.id}`}
                                >
                                  {archiveMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Archive className="w-4 h-4 mr-1" />
                                  )}
                                  Dismiss
                                </Button>
                              </>
                            )}
                            {entryType !== "repairs_needed" && entryType !== "windy_day_cleanup" && entry.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => reviewMutation.mutate(entry.id)}
                                data-testid={`button-review-${entry.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> Review
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => deleteMutation.mutate(entry.id)}
                              data-testid={`button-delete-${entry.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              New {config.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Technician Name *</Label>
              <Input
                value={form.technicianName}
                onChange={(e) => setForm({ ...form, technicianName: e.target.value })}
                placeholder="Enter your name"
                data-testid="input-technician-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Property *</Label>
              <Select value={form.propertyId} onValueChange={handlePropertyChange}>
                <SelectTrigger data-testid="select-property">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(entryType === "chemical_order" || entryType === "chemicals_dropoff") && (
              <>
                <div className="space-y-2">
                  <Label>Chemicals</Label>
                  <Input
                    value={form.chemicals}
                    onChange={(e) => setForm({ ...form, chemicals: e.target.value })}
                    placeholder="e.g., Chlorine, Acid, Salt"
                    data-testid="input-chemicals"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="e.g., 2 buckets, 5 gallons"
                    data-testid="input-quantity"
                  />
                </div>
              </>
            )}

            {entryType === "report_issue" && (
              <div className="space-y-2">
                <Label>Issue Type</Label>
                <Select value={form.issueType} onValueChange={(v) => setForm({ ...form, issueType: v })}>
                  <SelectTrigger data-testid="select-issue-type">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="safety">Safety Concern</SelectItem>
                    <SelectItem value="customer">Customer Complaint</SelectItem>
                    <SelectItem value="access">Access Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Enter details..."
                rows={4}
                data-testid="input-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              className="bg-[#4169E1] hover:bg-[#1E40AF]"
              onClick={handleSubmit}
              disabled={!form.technicianName || !form.propertyId || createMutation.isPending}
              data-testid="button-submit-entry"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-blue-600" />
              Convert to Estimate
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {convertEntry && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-medium text-slate-700">{convertEntry.propertyName || "No property"}</p>
                <p className="text-sm text-slate-500 mt-1">{convertEntry.description || "No description"}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Submitted by {convertEntry.technicianName} on {formatDate(convertEntry.createdAt)}
                </p>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <input
                type="checkbox"
                id="mark-urgent"
                checked={markUrgent}
                onChange={(e) => setMarkUrgent(e.target.checked)}
                className="w-5 h-5 rounded border-amber-400 text-red-500 focus:ring-red-500"
                data-testid="checkbox-urgent"
              />
              <label htmlFor="mark-urgent" className="flex items-center gap-2 cursor-pointer">
                <Zap className="w-4 h-4 text-red-500" />
                <span className="font-medium text-amber-800">Mark as URGENT</span>
              </label>
            </div>
            <p className="text-sm text-slate-500">
              This will create an estimate in the Estimates section and mark this repair request as completed.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowConvertDialog(false);
                setConvertEntry(null);
                setMarkUrgent(false);
              }}
              data-testid="button-cancel-convert"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#4169E1] hover:bg-[#1E40AF]"
              onClick={handleConvertToEstimate}
              disabled={convertToEstimateMutation.isPending}
              data-testid="button-confirm-convert"
            >
              {convertToEstimateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <FileUp className="w-4 h-4 mr-1" />
              )}
              Create Estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
          data-testid="lightbox-overlay"
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            data-testid="button-close-lightbox"
          >
            <X className="w-8 h-8" />
          </button>
          
          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 text-white hover:text-gray-300 z-10 p-2 bg-black/50 rounded-full"
                data-testid="button-prev-image"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 text-white hover:text-gray-300 z-10 p-2 bg-black/50 rounded-full"
                data-testid="button-next-image"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
          
          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`Image ${lightboxIndex + 1} of ${lightboxImages.length}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              data-testid="lightbox-image"
            />
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
