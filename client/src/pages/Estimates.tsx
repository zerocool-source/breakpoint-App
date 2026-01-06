import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Plus, Clock, CheckCircle2, XCircle, Calendar, DollarSign, 
  Building2, User, Send, AlertCircle, Loader2, Trash2, Edit, Eye,
  ArrowRight, Mail, Receipt
} from "lucide-react";

interface EstimateItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: "part" | "labor";
}

interface Estimate {
  id: string;
  propertyId: string;
  propertyName: string;
  customerName: string | null;
  customerEmail: string | null;
  address: string | null;
  title: string;
  description: string | null;
  items: EstimateItem[];
  partsTotal: number | null;
  laborTotal: number | null;
  totalAmount: number | null;
  status: string;
  createdByTechId: string | null;
  createdByTechName: string | null;
  approvedByManagerId: string | null;
  approvedByManagerName: string | null;
  createdAt: string;
  sentForApprovalAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  scheduledDate: string | null;
  completedAt: string | null;
  invoicedAt: string | null;
  techNotes: string | null;
  managerNotes: string | null;
  rejectionReason: string | null;
  jobId: string | null;
  invoiceId: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-300", icon: FileText },
  pending_approval: { label: "Pending Approval", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Calendar },
  completed: { label: "Completed", color: "bg-cyan-100 text-cyan-700 border-cyan-300", icon: CheckCircle2 },
  invoiced: { label: "Invoiced", color: "bg-purple-100 text-purple-700 border-purple-300", icon: Receipt },
};

export default function Estimates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [managerNotes, setManagerNotes] = useState("");

  const [newEstimate, setNewEstimate] = useState({
    propertyId: "",
    propertyName: "",
    customerName: "",
    customerEmail: "",
    address: "",
    title: "",
    description: "",
    techNotes: "",
    items: [] as EstimateItem[],
  });
  const [newItem, setNewItem] = useState({ description: "", quantity: 1, unitPrice: 0, type: "part" as "part" | "labor" });

  const { data: estimatesData, isLoading } = useQuery({
    queryKey: ["estimates"],
    queryFn: async () => {
      const response = await fetch("/api/estimates");
      if (!response.ok) throw new Error("Failed to fetch estimates");
      return response.json();
    },
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: async (estimate: any) => {
      const response = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimate),
      });
      if (!response.ok) throw new Error("Failed to create estimate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({ title: "Estimate Created", description: "Your estimate has been saved as a draft." });
      setShowCreateDialog(false);
      resetNewEstimate();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create estimate.", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, extras }: { id: string; status: string; extras?: any }) => {
      const response = await fetch(`/api/estimates/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extras }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({ title: "Status Updated", description: "Estimate status has been updated." });
      setShowApprovalDialog(false);
      setShowDetailDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update estimate status.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/estimates/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete estimate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({ title: "Deleted", description: "Estimate has been deleted." });
      setShowDetailDialog(false);
    },
  });

  const estimates: Estimate[] = estimatesData?.estimates || [];

  const filteredEstimates = activeTab === "all" 
    ? estimates 
    : estimates.filter(e => e.status === activeTab);

  const statusCounts = {
    all: estimates.length,
    draft: estimates.filter(e => e.status === "draft").length,
    pending_approval: estimates.filter(e => e.status === "pending_approval").length,
    approved: estimates.filter(e => e.status === "approved").length,
    rejected: estimates.filter(e => e.status === "rejected").length,
    scheduled: estimates.filter(e => e.status === "scheduled").length,
    completed: estimates.filter(e => e.status === "completed").length,
    invoiced: estimates.filter(e => e.status === "invoiced").length,
  };

  const resetNewEstimate = () => {
    setNewEstimate({
      propertyId: "",
      propertyName: "",
      customerName: "",
      customerEmail: "",
      address: "",
      title: "",
      description: "",
      techNotes: "",
      items: [],
    });
    setNewItem({ description: "", quantity: 1, unitPrice: 0, type: "part" });
  };

  const addItem = () => {
    if (newItem.description && newItem.unitPrice > 0) {
      const item: EstimateItem = {
        ...newItem,
        total: newItem.quantity * newItem.unitPrice,
      };
      setNewEstimate(prev => ({
        ...prev,
        items: [...prev.items, item],
      }));
      setNewItem({ description: "", quantity: 1, unitPrice: 0, type: "part" });
    }
  };

  const removeItem = (index: number) => {
    setNewEstimate(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = (items: EstimateItem[]) => {
    const partsTotal = items.filter(i => i.type === "part").reduce((sum, i) => sum + i.total, 0);
    const laborTotal = items.filter(i => i.type === "labor").reduce((sum, i) => sum + i.total, 0);
    return { partsTotal, laborTotal, totalAmount: partsTotal + laborTotal };
  };

  const handleCreateEstimate = () => {
    const totals = calculateTotals(newEstimate.items);
    createMutation.mutate({
      ...newEstimate,
      ...totals,
      status: "draft",
      createdByTechId: "tech-1",
      createdByTechName: "Service Tech",
    });
  };

  const handleSendForApproval = (estimate: Estimate) => {
    updateStatusMutation.mutate({
      id: estimate.id,
      status: "pending_approval",
    });
  };

  const handleApproval = () => {
    if (!selectedEstimate) return;
    
    if (approvalAction === "approve") {
      updateStatusMutation.mutate({
        id: selectedEstimate.id,
        status: "approved",
        extras: {
          approvedByManagerId: "manager-1",
          approvedByManagerName: "HOA Manager",
          managerNotes,
        },
      });
    } else {
      updateStatusMutation.mutate({
        id: selectedEstimate.id,
        status: "rejected",
        extras: { rejectionReason },
      });
    }
  };

  const handleSchedule = (estimate: Estimate) => {
    updateStatusMutation.mutate({
      id: estimate.id,
      status: "scheduled",
      extras: { scheduledDate: new Date().toISOString() },
    });
  };

  const handleComplete = (estimate: Estimate) => {
    updateStatusMutation.mutate({
      id: estimate.id,
      status: "completed",
    });
  };

  const handleInvoice = (estimate: Estimate) => {
    updateStatusMutation.mutate({
      id: estimate.id,
      status: "invoiced",
      extras: { invoiceId: `INV-${Date.now()}` },
    });
  };

  const openApprovalDialog = (estimate: Estimate, action: "approve" | "reject") => {
    setSelectedEstimate(estimate);
    setApprovalAction(action);
    setRejectionReason("");
    setManagerNotes("");
    setShowApprovalDialog(true);
  };

  const formatCurrency = (amount: number | null) => {
    return `$${(amount || 0).toLocaleString()}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Estimates</h1>
            <p className="text-slate-600">Manage repair estimates and HOA approvals</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-[#0891b2] hover:bg-[#0891b2]/90"
            data-testid="button-create-estimate"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Estimate
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {Object.entries(statusConfig).map(([key, config]) => (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab(key)}>
              <CardContent className="p-4 text-center">
                <config.icon className="w-6 h-6 mx-auto mb-2 text-[#0891b2]" />
                <p className="text-2xl font-bold text-slate-900">{statusCounts[key as keyof typeof statusCounts]}</p>
                <p className="text-xs text-slate-600">{config.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-slate-100">
                <TabsTrigger value="all" data-testid="tab-all">All ({statusCounts.all})</TabsTrigger>
                <TabsTrigger value="draft" data-testid="tab-draft">Drafts ({statusCounts.draft})</TabsTrigger>
                <TabsTrigger value="pending_approval" data-testid="tab-pending">Pending ({statusCounts.pending_approval})</TabsTrigger>
                <TabsTrigger value="approved" data-testid="tab-approved">Approved ({statusCounts.approved})</TabsTrigger>
                <TabsTrigger value="scheduled" data-testid="tab-scheduled">Scheduled ({statusCounts.scheduled})</TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">Completed ({statusCounts.completed})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#0891b2]" />
              </div>
            ) : filteredEstimates.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No estimates found</p>
                {activeTab === "all" && (
                  <Button onClick={() => setShowCreateDialog(true)} variant="link" className="mt-2 text-[#0891b2]">
                    Create your first estimate
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredEstimates.map((estimate) => {
                    const config = statusConfig[estimate.status] || statusConfig.draft;
                    return (
                      <div
                        key={estimate.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-[#0891b2]/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedEstimate(estimate);
                          setShowDetailDialog(true);
                        }}
                        data-testid={`estimate-row-${estimate.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-2 rounded-lg bg-slate-100">
                            <config.icon className="w-5 h-5 text-[#0891b2]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 truncate">{estimate.title}</h3>
                              <Badge className={`${config.color} border text-xs`}>
                                {config.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {estimate.propertyName}
                              </span>
                              {estimate.customerName && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {estimate.customerName}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(estimate.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-[#0891b2]">{formatCurrency(estimate.totalAmount)}</p>
                            <p className="text-xs text-slate-500">
                              Parts: {formatCurrency(estimate.partsTotal)} | Labor: {formatCurrency(estimate.laborTotal)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {estimate.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendForApproval(estimate);
                              }}
                              className="bg-amber-500 hover:bg-amber-600"
                              data-testid={`button-send-approval-${estimate.id}`}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Send for Approval
                            </Button>
                          )}
                          {estimate.status === "pending_approval" && (
                            <>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openApprovalDialog(estimate, "approve");
                                }}
                                className="bg-green-600 hover:bg-green-700"
                                data-testid={`button-approve-${estimate.id}`}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openApprovalDialog(estimate, "reject");
                                }}
                                data-testid={`button-reject-${estimate.id}`}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {estimate.status === "approved" && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSchedule(estimate);
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                              data-testid={`button-schedule-${estimate.id}`}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              Schedule Job
                            </Button>
                          )}
                          {estimate.status === "scheduled" && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleComplete(estimate);
                              }}
                              className="bg-cyan-600 hover:bg-cyan-700"
                              data-testid={`button-complete-${estimate.id}`}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Mark Complete
                            </Button>
                          )}
                          {estimate.status === "completed" && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInvoice(estimate);
                              }}
                              className="bg-purple-600 hover:bg-purple-700"
                              data-testid={`button-invoice-${estimate.id}`}
                            >
                              <Receipt className="w-3 h-3 mr-1" />
                              Generate Invoice
                            </Button>
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

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Estimate</DialogTitle>
              <DialogDescription>
                Create a repair estimate to send to the HOA manager for approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Property Name</Label>
                  <Input
                    value={newEstimate.propertyName}
                    onChange={(e) => setNewEstimate(prev => ({ ...prev, propertyName: e.target.value, propertyId: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    placeholder="e.g., Sunset Gardens HOA"
                    data-testid="input-property-name"
                  />
                </div>
                <div>
                  <Label>Customer/HOA Name</Label>
                  <Input
                    value={newEstimate.customerName}
                    onChange={(e) => setNewEstimate(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="e.g., HOA Manager Name"
                    data-testid="input-customer-name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer Email</Label>
                  <Input
                    type="email"
                    value={newEstimate.customerEmail}
                    onChange={(e) => setNewEstimate(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="manager@hoa.com"
                    data-testid="input-customer-email"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={newEstimate.address}
                    onChange={(e) => setNewEstimate(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Pool Lane"
                    data-testid="input-address"
                  />
                </div>
              </div>
              <div>
                <Label>Estimate Title</Label>
                <Input
                  value={newEstimate.title}
                  onChange={(e) => setNewEstimate(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Pool Pump Replacement"
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newEstimate.description}
                  onChange={(e) => setNewEstimate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the repair work..."
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-slate-900">Line Items</h4>
                <div className="flex gap-2">
                  <Input
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Item description"
                    className="flex-1"
                    data-testid="input-item-description"
                  />
                  <Input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-20"
                    min={1}
                    data-testid="input-item-quantity"
                  />
                  <Input
                    type="number"
                    value={newItem.unitPrice || ""}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                    placeholder="Price"
                    className="w-24"
                    data-testid="input-item-price"
                  />
                  <Select value={newItem.type} onValueChange={(v: "part" | "labor") => setNewItem(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger className="w-24" data-testid="select-item-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="part">Part</SelectItem>
                      <SelectItem value="labor">Labor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addItem} size="icon" data-testid="button-add-item">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {newEstimate.items.length > 0 && (
                  <div className="space-y-2">
                    {newEstimate.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                        <span>{item.description}</span>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{item.type}</Badge>
                          <span>{item.quantity} x ${item.unitPrice} = ${item.total}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeItem(idx)}
                            data-testid={`button-remove-item-${idx}`}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right pt-2 border-t">
                      <p className="text-sm text-slate-600">
                        Parts: ${calculateTotals(newEstimate.items).partsTotal} | 
                        Labor: ${calculateTotals(newEstimate.items).laborTotal}
                      </p>
                      <p className="text-lg font-bold text-[#0891b2]">
                        Total: ${calculateTotals(newEstimate.items).totalAmount}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Tech Notes (internal)</Label>
                <Textarea
                  value={newEstimate.techNotes}
                  onChange={(e) => setNewEstimate(prev => ({ ...prev, techNotes: e.target.value }))}
                  placeholder="Internal notes for the team..."
                  rows={2}
                  data-testid="input-tech-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button
                onClick={handleCreateEstimate}
                disabled={!newEstimate.title || !newEstimate.propertyName || newEstimate.items.length === 0}
                className="bg-[#0891b2] hover:bg-[#0891b2]/90"
                data-testid="button-save-estimate"
              >
                Save as Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {approvalAction === "approve" ? "Approve Estimate" : "Reject Estimate"}
              </DialogTitle>
              <DialogDescription>
                {approvalAction === "approve"
                  ? "Approving this estimate will allow it to be scheduled as a job."
                  : "Please provide a reason for rejecting this estimate."}
              </DialogDescription>
            </DialogHeader>
            {selectedEstimate && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold">{selectedEstimate.title}</h4>
                  <p className="text-sm text-slate-600">{selectedEstimate.propertyName}</p>
                  <p className="text-lg font-bold text-[#0891b2] mt-2">
                    {formatCurrency(selectedEstimate.totalAmount)}
                  </p>
                </div>
                {approvalAction === "approve" ? (
                  <div>
                    <Label>Manager Notes (optional)</Label>
                    <Textarea
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      placeholder="Add any notes for the team..."
                      rows={3}
                      data-testid="input-manager-notes"
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Rejection Reason</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this estimate is being rejected..."
                      rows={3}
                      data-testid="input-rejection-reason"
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Cancel</Button>
              <Button
                onClick={handleApproval}
                disabled={approvalAction === "reject" && !rejectionReason}
                className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                variant={approvalAction === "reject" ? "destructive" : "default"}
                data-testid="button-confirm-approval"
              >
                {approvalAction === "approve" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Estimate Details</DialogTitle>
            </DialogHeader>
            {selectedEstimate && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedEstimate.title}</h3>
                    <p className="text-slate-600">{selectedEstimate.propertyName}</p>
                  </div>
                  <Badge className={`${statusConfig[selectedEstimate.status]?.color} border`}>
                    {statusConfig[selectedEstimate.status]?.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Customer</p>
                    <p className="font-medium">{selectedEstimate.customerName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="font-medium">{selectedEstimate.customerEmail || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Address</p>
                    <p className="font-medium">{selectedEstimate.address || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Created By</p>
                    <p className="font-medium">{selectedEstimate.createdByTechName || "N/A"}</p>
                  </div>
                </div>

                {selectedEstimate.description && (
                  <div>
                    <p className="text-slate-500 text-sm">Description</p>
                    <p className="text-slate-800">{selectedEstimate.description}</p>
                  </div>
                )}

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Line Items</h4>
                  {selectedEstimate.items && selectedEstimate.items.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEstimate.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <span>{item.description}</span>
                          <span className="font-medium">
                            {item.quantity} x ${item.unitPrice} = ${item.total}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 text-right">
                        <p className="text-sm text-slate-600">
                          Parts: {formatCurrency(selectedEstimate.partsTotal)} | 
                          Labor: {formatCurrency(selectedEstimate.laborTotal)}
                        </p>
                        <p className="text-xl font-bold text-[#0891b2]">
                          Total: {formatCurrency(selectedEstimate.totalAmount)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No line items</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Created</p>
                    <p className="font-medium">{formatDate(selectedEstimate.createdAt)}</p>
                  </div>
                  {selectedEstimate.sentForApprovalAt && (
                    <div>
                      <p className="text-slate-500">Sent for Approval</p>
                      <p className="font-medium">{formatDate(selectedEstimate.sentForApprovalAt)}</p>
                    </div>
                  )}
                  {selectedEstimate.approvedAt && (
                    <div>
                      <p className="text-slate-500">Approved</p>
                      <p className="font-medium">{formatDate(selectedEstimate.approvedAt)} by {selectedEstimate.approvedByManagerName}</p>
                    </div>
                  )}
                  {selectedEstimate.rejectedAt && (
                    <div>
                      <p className="text-slate-500">Rejected</p>
                      <p className="font-medium">{formatDate(selectedEstimate.rejectedAt)}</p>
                    </div>
                  )}
                </div>

                {selectedEstimate.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-700">Rejection Reason</p>
                    <p className="text-red-600">{selectedEstimate.rejectionReason}</p>
                  </div>
                )}

                {selectedEstimate.techNotes && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-semibold text-slate-700">Tech Notes</p>
                    <p className="text-slate-600">{selectedEstimate.techNotes}</p>
                  </div>
                )}

                {selectedEstimate.managerNotes && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-700">Manager Notes</p>
                    <p className="text-green-600">{selectedEstimate.managerNotes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {selectedEstimate?.status === "draft" && (
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(selectedEstimate.id)}
                  data-testid="button-delete-estimate"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
