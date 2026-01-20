import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Wind, AlertTriangle, AlertCircle, Clock, CheckCircle, MapPin, User, Calendar,
  RefreshCw, Image as ImageIcon, PlayCircle, FileText, Building2
} from "lucide-react";
import type { TechOpsEntry, Emergency } from "@shared/schema";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  pending_review: { label: "Pending Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200", icon: PlayCircle },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-600 border-slate-200", icon: FileText },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "High", color: "bg-amber-100 text-amber-700" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700" },
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function Service() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("windy");
  const [selectedEntry, setSelectedEntry] = useState<TechOpsEntry | null>(null);
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Fetch Windy Day Clean Up entries
  const { data: windyEntries = [], isLoading: windyLoading, refetch: refetchWindy } = useQuery({
    queryKey: ["tech-ops-windy-day"],
    queryFn: async () => {
      const res = await fetch("/api/tech-ops?entryType=windy_day_cleanup");
      if (!res.ok) throw new Error("Failed to fetch windy day entries");
      return res.json();
    },
  });

  // Fetch Report Issues entries
  const { data: issueEntries = [], isLoading: issuesLoading, refetch: refetchIssues } = useQuery({
    queryKey: ["tech-ops-report-issue"],
    queryFn: async () => {
      const res = await fetch("/api/tech-ops?entryType=report_issue");
      if (!res.ok) throw new Error("Failed to fetch report issues");
      return res.json();
    },
  });

  // Fetch Emergencies
  const { data: emergencies = [], isLoading: emergenciesLoading, refetch: refetchEmergencies } = useQuery<Emergency[]>({
    queryKey: ["emergencies"],
    queryFn: async () => {
      const res = await fetch("/api/emergencies");
      if (!res.ok) throw new Error("Failed to fetch emergencies");
      return res.json();
    },
  });

  const updateTechOpsMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/tech-ops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops-windy-day"] });
      queryClient.invalidateQueries({ queryKey: ["tech-ops-report-issue"] });
      toast({ title: "Status updated" });
    },
  });

  const updateEmergencyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/emergencies/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergencies"] });
      toast({ title: "Emergency status updated" });
      setSelectedEmergency(null);
    },
  });

  // Group windy entries by property
  const windyByProperty = useMemo(() => {
    const groups: Record<string, TechOpsEntry[]> = {};
    (windyEntries as TechOpsEntry[]).forEach(entry => {
      const key = entry.propertyName || "Unknown Property";
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [windyEntries]);

  // Stats
  const pendingWindy = (windyEntries as TechOpsEntry[]).filter(e => e.status === "pending").length;
  const pendingIssues = (issueEntries as TechOpsEntry[]).filter(e => e.status === "pending").length;
  const pendingEmergencies = emergencies.filter(e => e.status === "pending_review").length;

  const handleRefresh = () => {
    refetchWindy();
    refetchIssues();
    refetchEmergencies();
  };

  const isLoading = windyLoading || issuesLoading || emergenciesLoading;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Wind className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Service Center</h1>
              <p className="text-sm text-slate-500">Manage windy day cleanups, issues, and emergencies</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
            data-testid="button-refresh-service"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Wind className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{(windyEntries as TechOpsEntry[]).length}</p>
                <p className="text-sm text-slate-500">Windy Day Cleanups</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pendingWindy}</p>
                <p className="text-sm text-slate-500">Pending Cleanups</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{(issueEntries as TechOpsEntry[]).length}</p>
                <p className="text-sm text-slate-500">Reported Issues</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{emergencies.length}</p>
                <p className="text-sm text-slate-500">Emergencies</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="windy" className="data-[state=active]:bg-white gap-2">
              <Wind className="w-4 h-4" />
              Windy Day Clean Up ({(windyEntries as TechOpsEntry[]).length})
            </TabsTrigger>
            <TabsTrigger value="issues" className="data-[state=active]:bg-white gap-2">
              <AlertTriangle className="w-4 h-4" />
              Report Issues ({(issueEntries as TechOpsEntry[]).length})
            </TabsTrigger>
            <TabsTrigger value="emergencies" className="data-[state=active]:bg-white gap-2">
              <AlertCircle className="w-4 h-4" />
              Emergencies ({emergencies.length})
            </TabsTrigger>
          </TabsList>

          {/* Windy Day Clean Up Tab */}
          <TabsContent value="windy" className="mt-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wind className="w-5 h-5 text-orange-600" />
                  Windy Day Clean Up
                </CardTitle>
              </CardHeader>
              <CardContent>
                {windyLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : windyByProperty.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <Wind className="w-12 h-12 mb-3 opacity-50" />
                    <p>No windy day cleanup entries found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-4 pr-4">
                      {windyByProperty.map(([propertyName, entries]) => (
                        <div key={propertyName} className="border rounded-lg overflow-hidden">
                          <div className="bg-orange-50 p-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-orange-600" />
                              <span className="font-semibold text-slate-900">{propertyName}</span>
                              <Badge variant="outline" className="text-xs">{entries.length} entries</Badge>
                            </div>
                          </div>
                          <div className="divide-y">
                            {entries.map(entry => {
                              const statusInfo = statusConfig[entry.status || "pending"] || statusConfig.pending;
                              return (
                                <div
                                  key={entry.id}
                                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                  onClick={() => { setSelectedEntry(entry); setPhotoIndex(0); }}
                                  data-testid={`card-windy-${entry.id}`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge className={cn("text-xs", statusInfo.color)}>
                                          {statusInfo.label}
                                        </Badge>
                                        {entry.priority && entry.priority !== "normal" && (
                                          <Badge className={cn("text-xs", priorityConfig[entry.priority]?.color)}>
                                            {priorityConfig[entry.priority]?.label}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-600 mb-2">{entry.description || "Windy day cleanup"}</p>
                                      <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {entry.technicianName}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {formatDate(entry.createdAt)}
                                        </span>
                                        {entry.photos && entry.photos.length > 0 && (
                                          <span className="flex items-center gap-1">
                                            <ImageIcon className="w-3 h-3" />
                                            {entry.photos.length}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {entry.partsCost && entry.partsCost > 0 && (
                                      <p className="font-bold text-emerald-600">{formatCurrency(entry.partsCost)}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Issues Tab */}
          <TabsContent value="issues" className="mt-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-purple-600" />
                  Report Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                {issuesLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : (issueEntries as TechOpsEntry[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <AlertTriangle className="w-12 h-12 mb-3 opacity-50" />
                    <p>No reported issues found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-3 pr-4">
                      {(issueEntries as TechOpsEntry[]).map(entry => {
                        const statusInfo = statusConfig[entry.status || "pending"] || statusConfig.pending;
                        return (
                          <div
                            key={entry.id}
                            className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border-l-4 border-l-purple-500"
                            onClick={() => { setSelectedEntry(entry); setPhotoIndex(0); }}
                            data-testid={`card-issue-${entry.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-slate-900">{entry.propertyName || "Unknown Property"}</h3>
                                  <Badge className={cn("text-xs", statusInfo.color)}>
                                    {statusInfo.label}
                                  </Badge>
                                  {entry.issueType && (
                                    <Badge variant="outline" className="text-xs">{entry.issueType}</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 mb-2">{entry.description || "Issue reported"}</p>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {entry.technicianName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(entry.createdAt)}
                                  </span>
                                  {entry.photos && entry.photos.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" />
                                      {entry.photos.length}
                                    </span>
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
          </TabsContent>

          {/* Emergencies Tab */}
          <TabsContent value="emergencies" className="mt-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Emergencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {emergenciesLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : emergencies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
                    <p>No emergencies found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-3 pr-4">
                      {emergencies.map(emergency => {
                        const statusInfo = statusConfig[emergency.status || "pending_review"] || statusConfig.pending_review;
                        const prioInfo = priorityConfig[emergency.priority || "normal"] || priorityConfig.normal;
                        return (
                          <div
                            key={emergency.id}
                            className={cn(
                              "p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border-l-4",
                              emergency.priority === "critical" || emergency.priority === "urgent" 
                                ? "border-l-red-500" 
                                : "border-l-amber-500"
                            )}
                            onClick={() => setSelectedEmergency(emergency)}
                            data-testid={`card-emergency-${emergency.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-slate-900">{emergency.propertyName}</h3>
                                  <Badge className={cn("text-xs", statusInfo.color)}>
                                    {statusInfo.label}
                                  </Badge>
                                  <Badge className={cn("text-xs", prioInfo.color)}>
                                    {prioInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 mb-2">{emergency.description}</p>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {emergency.submitterName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(emergency.createdAt)}
                                  </span>
                                  {emergency.photos && emergency.photos.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" />
                                      {emergency.photos.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {emergency.totalAmount && emergency.totalAmount > 0 && (
                                <p className="font-bold text-red-600">{formatCurrency(emergency.totalAmount)}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* TechOps Entry Detail Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntry?.entryType === "windy_day_cleanup" ? (
                <><Wind className="w-5 h-5 text-orange-600" /> Windy Day Cleanup Details</>
              ) : (
                <><AlertTriangle className="w-5 h-5 text-purple-600" /> Report Issue Details</>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Property</p>
                  <p className="font-medium">{selectedEntry.propertyName || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Submitted By</p>
                  <p className="font-medium">{selectedEntry.technicianName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{formatDate(selectedEntry.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={cn("text-xs", statusConfig[selectedEntry.status || "pending"]?.color)}>
                    {statusConfig[selectedEntry.status || "pending"]?.label}
                  </Badge>
                </div>
              </div>

              {selectedEntry.description && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Description</p>
                  <p className="p-3 bg-slate-50 rounded-lg border">{selectedEntry.description}</p>
                </div>
              )}

              {selectedEntry.notes && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Notes</p>
                  <p className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800">
                    {selectedEntry.notes}
                  </p>
                </div>
              )}

              {selectedEntry.partsCost && selectedEntry.partsCost > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Parts Cost</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(selectedEntry.partsCost)}</p>
                </div>
              )}

              {selectedEntry.photos && selectedEntry.photos.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Photos ({selectedEntry.photos.length})</p>
                  <div className="relative">
                    <img
                      src={selectedEntry.photos[photoIndex]}
                      alt={`Photo ${photoIndex + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    {selectedEntry.photos.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {selectedEntry.photos.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPhotoIndex(idx)}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              idx === photoIndex ? "bg-white" : "bg-white/50"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedEntry.status === "pending" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      updateTechOpsMutation.mutate({ id: selectedEntry.id, status: "completed" });
                      setSelectedEntry(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Completed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateTechOpsMutation.mutate({ id: selectedEntry.id, status: "reviewed" });
                      setSelectedEntry(null);
                    }}
                  >
                    Mark Reviewed
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEntry(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Detail Modal */}
      <Dialog open={!!selectedEmergency} onOpenChange={() => setSelectedEmergency(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Emergency Details
            </DialogTitle>
          </DialogHeader>
          {selectedEmergency && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Property</p>
                  <p className="font-medium">{selectedEmergency.propertyName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Submitted By</p>
                  <p className="font-medium">{selectedEmergency.submitterName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{formatDate(selectedEmergency.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={cn("text-xs", statusConfig[selectedEmergency.status || "pending_review"]?.color)}>
                    {statusConfig[selectedEmergency.status || "pending_review"]?.label}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Description</p>
                <p className="p-3 bg-red-50 rounded-lg border border-red-200">{selectedEmergency.description}</p>
              </div>

              {selectedEmergency.totalAmount && selectedEmergency.totalAmount > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total Amount</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(selectedEmergency.totalAmount)}</p>
                </div>
              )}

              {selectedEmergency.resolutionNotes && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Resolution Notes</p>
                  <p className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800">
                    {selectedEmergency.resolutionNotes}
                  </p>
                </div>
              )}

              {selectedEmergency.photos && selectedEmergency.photos.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Photos ({selectedEmergency.photos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedEmergency.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedEmergency.status === "pending_review" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => updateEmergencyMutation.mutate({ id: selectedEmergency.id, status: "in_progress" })}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start Working
                  </Button>
                  <Button
                    onClick={() => updateEmergencyMutation.mutate({ id: selectedEmergency.id, status: "resolved" })}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </Button>
                </div>
              )}

              {selectedEmergency.status === "in_progress" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => updateEmergencyMutation.mutate({ id: selectedEmergency.id, status: "resolved" })}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEmergency(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
