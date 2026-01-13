import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
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
import {
  Wrench, Plus, Loader2, CheckCircle, Clock, XCircle,
  Droplets, Wind, AlertTriangle, FileText, User, MapPin, Trash2
} from "lucide-react";
import type { TechOpsEntry, Property } from "@shared/schema";

const entryTypeConfig: Record<string, { label: string; icon: any; color: string; description: string }> = {
  repairs_needed: { 
    label: "Repairs Needed", 
    icon: Wrench, 
    color: "bg-red-100 text-red-700 border-red-200",
    description: "Report equipment or pool repairs needed at a property"
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
  add_notes: { 
    label: "Add Notes", 
    icon: FileText, 
    color: "bg-slate-100 text-slate-700 border-slate-200",
    description: "Add general notes about a property or service"
  },
};

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  reviewed: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle },
  completed: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  cancelled: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: XCircle },
};

const priorityConfig: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
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
  const [form, setForm] = useState({
    technicianName: "",
    propertyId: "",
    propertyName: "",
    description: "",
    priority: "normal",
    chemicals: "",
    quantity: "",
    issueType: "",
  });

  const config = entryTypeConfig[entryType] || entryTypeConfig.repairs_needed;
  const Icon = config.icon;

  const { data: entries = [], isLoading } = useQuery<TechOpsEntry[]>({
    queryKey: ["tech-ops", entryType],
    queryFn: async () => {
      const response = await fetch(`/api/tech-ops?entryType=${entryType}`);
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
      queryClient.invalidateQueries({ queryKey: ["tech-ops", entryType] });
      setShowAddDialog(false);
      setForm({
        technicianName: "",
        propertyId: "",
        propertyName: "",
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
      queryClient.invalidateQueries({ queryKey: ["tech-ops", entryType] });
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
      queryClient.invalidateQueries({ queryKey: ["tech-ops", entryType] });
      toast({ title: "Entry Marked as Reviewed" });
    },
  });

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    setForm({
      ...form,
      propertyId,
      propertyName: property?.name || "",
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
              <h1 className="text-2xl font-bold text-[#1E293B]">{config.label}</h1>
              <p className="text-slate-500 text-sm">{config.description}</p>
            </div>
          </div>
          <Button
            className="bg-[#1E3A8A] hover:bg-[#1E40AF]"
            onClick={() => setShowAddDialog(true)}
            data-testid="button-add-entry"
          >
            <Plus className="w-4 h-4 mr-2" /> New Entry
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No entries yet</p>
                <p className="text-sm mt-1">Click "New Entry" to submit one</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const statusCfg = statusConfig[entry.status || "pending"];
                    const StatusIcon = statusCfg.icon;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
                        data-testid={`entry-item-${entry.id}`}
                      >
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={statusCfg.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {entry.status}
                            </Badge>
                            <Badge className={priorityConfig[entry.priority || "normal"]}>
                              {entry.priority}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              {formatDate(entry.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="font-medium">{entry.technicianName}</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <MapPin className="w-3 h-3" />
                              {entry.propertyName || "No property"}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-slate-600">{entry.description}</p>
                          )}
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
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {entry.status === "pending" && (
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
              <Icon className="w-5 h-5" style={{ color: config.color.includes("red") ? "#DC2626" : "#1E3A8A" }} />
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
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#1E3A8A] hover:bg-[#1E40AF]"
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
    </AppLayout>
  );
}
