import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Droplets, MapPin, Building2, Phone, Mail, User, ChevronDown, AlertCircle, RefreshCw, 
  Clock, CheckCircle2, Eye, EyeOff, Package, Send, Truck, Calendar, Image as ImageIcon,
  Plus, Edit2, Trash2, Copy, X, Store, FileText, ShoppingCart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import type { TechOpsEntry, ChemicalVendor, InvoiceTemplate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface EnrichedAlert {
  alertId: string;
  poolId: string;
  poolName: string;
  customerId: string | null;
  customerName: string;
  address: string;
  phone: string;
  email: string;
  contact: string;
  notes: string;
  message: string;
  type: string;
  severity: string;
  status: string;
  createdAt: string;
  pictures?: string[];
  techName?: string;
  techPhone?: string;
  techEmail?: string;
  techId?: number;
  rawAlert?: any;
}

const orderStatusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
  sent_to_vendor: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Send, label: "Sent to Vendor" },
  confirmed: { color: "bg-purple-100 text-purple-700 border-purple-200", icon: CheckCircle2, label: "Confirmed" },
  delivered: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Package, label: "Delivered" },
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

export default function Chemicals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("orders");
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TechOpsEntry | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  
  // Multi-select for chemical orders
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  
  // Vendor management
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<ChemicalVendor | null>(null);
  const [vendorForm, setVendorForm] = useState({
    vendorName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  // Fetch chemical alerts from Pool Brain
  const { data: alertsData = { alerts: [] }, isLoading: alertsLoading, refetch: refetchAlerts, isFetching: alertsFetching } = useQuery({
    queryKey: ["enrichedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/enriched");
      if (!res.ok) throw new Error("Failed to fetch enriched alerts");
      return res.json();
    },
  });

  // Fetch chemical orders from TechOps
  const { data: chemicalOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["tech-ops-chemical-order"],
    queryFn: async () => {
      const res = await fetch("/api/tech-ops?entryType=chemical_order");
      if (!res.ok) throw new Error("Failed to fetch chemical orders");
      return res.json();
    },
  });

  // Fetch chemicals dropped-off from TechOps
  const { data: chemicalsDropoff = [], isLoading: dropoffLoading, refetch: refetchDropoff } = useQuery({
    queryKey: ["tech-ops-chemicals-dropoff"],
    queryFn: async () => {
      const res = await fetch("/api/tech-ops?entryType=chemicals_dropoff");
      if (!res.ok) throw new Error("Failed to fetch chemicals dropoff");
      return res.json();
    },
  });

  const { data: completedData = { completedIds: [] } } = useQuery({
    queryKey: ["completedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/completed");
      if (!res.ok) throw new Error("Failed to fetch completed alerts");
      return res.json();
    },
  });

  const completedIds = new Set<string>((completedData.completedIds || []).map(String));

  // Fetch vendors
  const { data: vendors = [] } = useQuery<ChemicalVendor[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await fetch("/api/vendors");
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });

  // Fetch email templates
  const { data: templates = [] } = useQuery<InvoiceTemplate[]>({
    queryKey: ["invoice-templates"],
    queryFn: async () => {
      const res = await fetch("/api/invoice-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  // Vendor mutations
  const createVendorMutation = useMutation({
    mutationFn: async (data: typeof vendorForm) => {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create vendor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast({ title: "Vendor created successfully" });
      resetVendorForm();
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof vendorForm }) => {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update vendor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast({ title: "Vendor updated successfully" });
      resetVendorForm();
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete vendor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast({ title: "Vendor deleted" });
    },
  });

  const resetVendorForm = () => {
    setShowVendorModal(false);
    setEditingVendor(null);
    setVendorForm({ vendorName: "", contactPerson: "", email: "", phone: "", address: "", notes: "" });
  };

  const handleEditVendor = (vendor: ChemicalVendor) => {
    setEditingVendor(vendor);
    setVendorForm({
      vendorName: vendor.vendorName,
      contactPerson: vendor.contactPerson || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
    });
    setShowVendorModal(true);
  };

  const handleSaveVendor = () => {
    if (!vendorForm.vendorName.trim()) {
      toast({ title: "Vendor name is required", variant: "destructive" });
      return;
    }
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, data: vendorForm });
    } else {
      createVendorMutation.mutate(vendorForm);
    }
  };

  // Order selection helpers
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const selectAllOrders = () => {
    const allIds = (chemicalOrders as TechOpsEntry[]).map((o) => o.id);
    setSelectedOrders(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
    setSelectedVendorId("");
    setSelectedTemplateId("");
  };

  // Generate email content
  const generateEmailContent = () => {
    const selected = (chemicalOrders as TechOpsEntry[]).filter((o) => selectedOrders.has(o.id));
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    const template = templates.find((t) => t.id === selectedTemplateId);
    
    const subject = `Chemical Order Request - ${format(new Date(), "MMM d, yyyy")}`;
    
    // Use template header if available
    const headerText = template?.headerText || `Dear ${vendor?.contactPerson || vendor?.vendorName || "Vendor"},`;
    
    let body = `<p>${headerText}</p>\n\n`;
    body += `<p>Please fulfill the following chemical order request:</p>\n\n`;
    
    // Chemical order details with bold chemicals and quantities
    body += `<table style="border-collapse: collapse; width: 100%; margin: 16px 0;">\n`;
    body += `<tr style="background: #1e3a5f; color: white;"><th style="padding: 10px; text-align: left;">Property</th><th style="padding: 10px; text-align: left;">Chemicals</th><th style="padding: 10px; text-align: left;">Quantity</th></tr>\n`;
    
    selected.forEach((order, idx) => {
      const bgColor = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
      body += `<tr style="background: ${bgColor};">`;
      body += `<td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${order.propertyName || "Unknown"}</td>`;
      body += `<td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong style="color: #1e40af;">${order.chemicals || order.description || "N/A"}</strong></td>`;
      body += `<td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong style="color: #059669;">${order.quantity || "As needed"}</strong></td>`;
      body += `</tr>\n`;
    });
    
    body += `</table>\n\n`;
    
    // Use template footer if available
    const footerText = template?.footerText || "Please confirm receipt and estimated delivery date.";
    body += `<p>${footerText}</p>\n\n`;
    
    // Use template terms if available
    if (template?.termsConditions) {
      body += `<p style="font-size: 12px; color: #6b7280; margin-top: 16px;">${template.termsConditions}</p>\n\n`;
    }
    
    body += `<p>Thank you,<br/><strong>Pool Service Team</strong></p>`;
    
    setEmailSubject(subject);
    setEmailBody(body);
    setShowEmailPreview(true);
  };

  const copyEmailToClipboard = async () => {
    const plainText = emailBody.replace(/<[^>]*>/g, "").replace(/\n\n/g, "\n");
    await navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${plainText}`);
    toast({ title: "Email copied to clipboard" });
  };

  const openInEmailClient = () => {
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    const plainText = emailBody.replace(/<[^>]*>/g, "").replace(/\n\n/g, "\n");
    const mailtoUrl = `mailto:${vendor?.email || ""}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainText)}`;
    window.open(mailtoUrl, "_blank");
  };

  const markCompleteMutation = useMutation({
    mutationFn: async ({ alertId, completed }: { alertId: string; completed: boolean }) => {
      if (completed) {
        const res = await fetch(`/api/alerts/${alertId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: "chemical" }),
        });
        if (!res.ok) throw new Error("Failed to mark complete");
        return res.json();
      } else {
        const res = await fetch(`/api/alerts/${alertId}/complete`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to unmark");
        return res.json();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["completedAlerts"] });
    },
  });

  const allAlerts: EnrichedAlert[] = alertsData.alerts || [];

  const isChemicalAlert = (alert: EnrichedAlert): boolean => {
    const msgLower = alert.message.toLowerCase();
    return (
      msgLower.includes("chlorine") ||
      msgLower.includes("acid") ||
      msgLower.includes("chemical") ||
      msgLower.includes("ph") ||
      msgLower.includes("orp") ||
      msgLower.includes("bleach") ||
      msgLower.includes("algae") ||
      msgLower.includes("drum") ||
      msgLower.includes("carboy") ||
      msgLower.includes("tank") ||
      msgLower.includes("requesting") ||
      msgLower.includes("bag") ||
      msgLower.includes("muriatic") ||
      msgLower.includes("tabs") ||
      msgLower.includes("calcium") ||
      msgLower.includes("stabilizer") ||
      msgLower.includes("cyanuric")
    );
  };

  const chemicalAlerts = allAlerts.filter(isChemicalAlert);
  const activeChemicals = chemicalAlerts.filter(a => a.status === "Active");
  const incompleteChemicals = activeChemicals.filter(a => !completedIds.has(String(a.alertId)));
  const completedChemicals = activeChemicals.filter(a => completedIds.has(String(a.alertId)));

  const displayedAlerts = showCompleted ? activeChemicals : incompleteChemicals;

  const sortedAlerts = [...displayedAlerts].sort((a, b) => {
    const aCompleted = completedIds.has(String(a.alertId)) ? 1 : 0;
    const bCompleted = completedIds.has(String(b.alertId)) ? 1 : 0;
    if (aCompleted !== bCompleted) return aCompleted - bCompleted;

    const severityOrder = { URGENT: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
    const aSev = severityOrder[a.severity.toUpperCase() as keyof typeof severityOrder] ?? 5;
    const bSev = severityOrder[b.severity.toUpperCase() as keyof typeof severityOrder] ?? 5;
    if (aSev !== bSev) return aSev - bSev;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getSeverityColor = (severity: string) => {
    const upper = severity.toUpperCase();
    if (upper === "URGENT") return "bg-red-100 text-red-700 border-red-200";
    if (upper.includes("CRITICAL")) return "bg-red-100 text-red-700 border-red-200";
    if (upper.includes("HIGH")) return "bg-amber-100 text-amber-700 border-amber-200";
    if (upper.includes("MEDIUM")) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  // Stats
  const pendingOrders = (chemicalOrders as TechOpsEntry[]).filter(o => o.orderStatus === "pending" || !o.orderStatus).length;
  const deliveredOrders = (chemicalOrders as TechOpsEntry[]).filter(o => o.orderStatus === "delivered").length;
  const totalDropoffs = (chemicalsDropoff as TechOpsEntry[]).length;

  const handleRefresh = () => {
    refetchAlerts();
    refetchOrders();
    refetchDropoff();
  };

  const isLoading = alertsLoading || ordersLoading || dropoffLoading;
  const isFetching = alertsFetching;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Chemicals Center</h1>
              <p className="text-sm text-slate-500">Manage chemical orders, drop-offs, and alerts</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isFetching}
            variant="outline"
            className="gap-2"
            data-testid="button-refresh-chemicals"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{(chemicalOrders as TechOpsEntry[]).length}</p>
                <p className="text-sm text-slate-500">Chemical Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pendingOrders}</p>
                <p className="text-sm text-slate-500">Pending Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Truck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalDropoffs}</p>
                <p className="text-sm text-slate-500">Chemicals Dropped-Off</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{incompleteChemicals.length}</p>
                <p className="text-sm text-slate-500">Chemical Alerts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1.5 h-auto gap-1">
            <TabsTrigger 
              value="orders" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-blue-500 data-[state=active]:border-b-2 gap-2.5 px-5 py-3 text-base font-medium transition-all"
            >
              <Droplets className="w-5 h-5" />
              <span>Chemical Orders</span>
              <span className="ml-1 px-2.5 py-0.5 text-sm font-semibold rounded-full bg-blue-100 text-blue-700">
                {(chemicalOrders as TechOpsEntry[]).length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="dropoff" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-green-500 data-[state=active]:border-b-2 gap-2.5 px-5 py-3 text-base font-medium transition-all"
            >
              <Truck className="w-5 h-5" />
              <span>Chemicals Dropped-Off</span>
              <span className="ml-1 px-2.5 py-0.5 text-sm font-semibold rounded-full bg-green-100 text-green-700">
                {totalDropoffs}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="alerts" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-orange-500 data-[state=active]:border-b-2 gap-2.5 px-5 py-3 text-base font-medium transition-all"
            >
              <AlertCircle className="w-5 h-5" />
              <span>Chemical Alerts</span>
              <span className={cn(
                "ml-1 px-2.5 py-0.5 text-sm font-semibold rounded-full",
                incompleteChemicals.length > 0 
                  ? "bg-orange-500 text-white animate-pulse" 
                  : "bg-slate-100 text-slate-600"
              )}>
                {incompleteChemicals.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Chemical Orders Tab */}
          <TabsContent value="orders" className="mt-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-600" />
                    Chemical Orders
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVendorModal(true)}
                      className="gap-1"
                      data-testid="btn-manage-vendors"
                    >
                      <Store className="w-4 h-4" />
                      Manage Vendors
                    </Button>
                    {(chemicalOrders as TechOpsEntry[]).length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectedOrders.size === (chemicalOrders as TechOpsEntry[]).length ? clearSelection : selectAllOrders}
                        data-testid="btn-select-all"
                      >
                        {selectedOrders.size === (chemicalOrders as TechOpsEntry[]).length ? "Deselect All" : "Select All"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : (chemicalOrders as TechOpsEntry[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <Droplets className="w-12 h-12 mb-3 opacity-50" />
                    <p>No chemical orders found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-3 pr-4">
                      {(chemicalOrders as TechOpsEntry[]).map((entry) => {
                        const statusInfo = orderStatusConfig[entry.orderStatus || "pending"] || orderStatusConfig.pending;
                        const StatusIcon = statusInfo.icon;
                        const isSelected = selectedOrders.has(entry.id);
                        return (
                          <div
                            key={entry.id}
                            className={cn(
                              "p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3",
                              isSelected && "bg-blue-50 border-blue-300"
                            )}
                            data-testid={`card-order-${entry.id}`}
                          >
                            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleOrderSelection(entry.id)}
                                data-testid={`checkbox-order-${entry.id}`}
                              />
                            </div>
                            <div 
                              className="flex-1"
                              onClick={() => { setSelectedEntry(entry); setPhotoIndex(0); }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-slate-900">{entry.propertyName || "Unknown Property"}</h3>
                                    <Badge className={cn("text-xs", statusInfo.color)}>
                                      <StatusIcon className="w-3 h-3 mr-1" />
                                      {statusInfo.label}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-600 mb-2">{entry.chemicals || entry.description || "Chemical order"}</p>
                                  <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {entry.technicianName}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(entry.createdAt)}
                                    </span>
                                    {entry.quantity && (
                                      <span className="flex items-center gap-1">
                                        <Package className="w-3 h-3" />
                                        Qty: {entry.quantity}
                                      </span>
                                    )}
                                    {entry.photos && entry.photos.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        {entry.photos.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {entry.vendorName && (
                                  <div className="text-right">
                                    <p className="text-xs text-slate-500">Vendor</p>
                                    <p className="text-sm font-medium text-slate-700">{entry.vendorName}</p>
                                  </div>
                                )}
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

          {/* Chemicals Dropped-Off Tab */}
          <TabsContent value="dropoff" className="mt-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  Chemicals Dropped-Off
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dropoffLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : (chemicalsDropoff as TechOpsEntry[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <Truck className="w-12 h-12 mb-3 opacity-50" />
                    <p>No chemicals dropped-off records found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-3 pr-4">
                      {(chemicalsDropoff as TechOpsEntry[]).map((entry) => (
                        <div
                          key={entry.id}
                          className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border-l-4 border-l-emerald-500"
                          onClick={() => { setSelectedEntry(entry); setPhotoIndex(0); }}
                          data-testid={`card-dropoff-${entry.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-slate-900">{entry.propertyName || "Unknown Property"}</h3>
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Delivered
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{entry.chemicals || entry.description || "Chemicals delivered"}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {entry.technicianName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(entry.createdAt)}
                                </span>
                                {entry.quantity && (
                                  <span className="flex items-center gap-1">
                                    <Package className="w-3 h-3" />
                                    Qty: {entry.quantity}
                                  </span>
                                )}
                                {entry.photos && entry.photos.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    {entry.photos.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            {entry.partsCost && entry.partsCost > 0 && (
                              <div className="text-right">
                                <p className="text-lg font-bold text-emerald-600">{formatCurrency(entry.partsCost)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chemical Alerts Tab */}
          <TabsContent value="alerts" className="mt-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant={!showCompleted ? "default" : "outline"}
                onClick={() => setShowCompleted(false)}
                className="gap-2"
                data-testid="button-show-pending"
              >
                <EyeOff className="w-4 h-4" />
                Pending ({incompleteChemicals.length})
              </Button>
              <Button
                variant={showCompleted ? "default" : "outline"}
                onClick={() => setShowCompleted(true)}
                className="gap-2"
                data-testid="button-show-all"
              >
                <Eye className="w-4 h-4" />
                Show All ({activeChemicals.length})
              </Button>
            </div>

            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  {showCompleted ? "All Chemical Alerts" : "Pending Chemical Alerts"}
                  <span className="text-xs text-slate-500 font-normal ml-2">(Check to mark as reviewed)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : sortedAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
                    <p>No {showCompleted ? "" : "pending "}chemical alerts found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-450px)]">
                    <div className="space-y-4 pr-4">
                      {sortedAlerts.map((alert, idx) => {
                        const isCompleted = completedIds.has(String(alert.alertId));
                        return (
                          <div
                            key={`chemical-${alert.alertId}-${idx}`}
                            className={cn(
                              "p-4 rounded-lg border transition-all",
                              isCompleted
                                ? "bg-emerald-50 border-emerald-200 opacity-70"
                                : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
                            )}
                            data-testid={`chemical-card-${alert.alertId}`}
                          >
                            <div className="flex items-start gap-4">
                              <Checkbox
                                checked={isCompleted}
                                onCheckedChange={(checked) => {
                                  markCompleteMutation.mutate({ alertId: String(alert.alertId), completed: !!checked });
                                }}
                                className="mt-1"
                                data-testid={`checkbox-${alert.alertId}`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={cn(
                                    "font-semibold",
                                    isCompleted ? "text-emerald-700 line-through" : "text-slate-900"
                                  )}>
                                    {alert.poolName}
                                  </h3>
                                  <Badge className={cn("text-xs", getSeverityColor(alert.severity))}>
                                    {alert.severity}
                                  </Badge>
                                  {isCompleted && (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Reviewed
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500 mb-2">
                                  <Building2 className="w-3 h-3 inline mr-1" />
                                  {alert.customerName}
                                </p>
                                <p className={cn(
                                  "text-sm p-2 rounded bg-slate-50 border",
                                  isCompleted ? "text-slate-500" : "text-slate-700"
                                )}>
                                  {alert.message}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  {alert.address && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {alert.address}
                                    </span>
                                  )}
                                  {alert.techName && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {alert.techName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right text-xs text-slate-500">
                                <div>{new Date(alert.createdAt).toLocaleDateString()}</div>
                                <div>{new Date(alert.createdAt).toLocaleTimeString()}</div>
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
        </Tabs>
      </div>

      {/* Entry Detail Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              {selectedEntry?.entryType === "chemical_order" ? "Chemical Order Details" : "Chemicals Dropped-Off Details"}
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
                {selectedEntry.vendorName && (
                  <div>
                    <p className="text-sm text-slate-500">Vendor</p>
                    <p className="font-medium">{selectedEntry.vendorName}</p>
                  </div>
                )}
              </div>

              {(selectedEntry.chemicals || selectedEntry.description) && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Chemicals / Description</p>
                  <p className="p-3 bg-slate-50 rounded-lg border">
                    {selectedEntry.chemicals || selectedEntry.description}
                  </p>
                </div>
              )}

              {selectedEntry.quantity && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Quantity</p>
                  <p className="font-medium">{selectedEntry.quantity}</p>
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEntry(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slide-out Panel for Selected Orders */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-96 bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out z-50",
          selectedOrders.size > 0 ? "translate-x-0" : "translate-x-full"
        )}
        data-testid="orders-slide-panel"
      >
        <div className="flex flex-col h-full">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 border-b bg-slate-50">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">
                {selectedOrders.size} Order{selectedOrders.size !== 1 ? "s" : ""} Selected
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSelection}
              className="text-slate-400 hover:text-slate-600"
              data-testid="btn-close-panel"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Selected Orders List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {(chemicalOrders as TechOpsEntry[])
                .filter((o) => selectedOrders.has(o.id))
                .map((order) => (
                  <div 
                    key={order.id} 
                    className="bg-slate-50 rounded-lg p-3 border"
                    data-testid={`selected-order-${order.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {order.propertyName || "Unknown Property"}
                        </p>
                        <p className="text-sm text-blue-600 font-medium mt-1">
                          {order.chemicals || order.description || "N/A"}
                        </p>
                        <p className="text-sm text-green-600 font-medium">
                          Qty: {order.quantity || "As needed"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-6 w-6 text-slate-400 hover:text-red-500"
                        onClick={() => toggleOrderSelection(order.id)}
                        data-testid={`btn-remove-order-${order.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Panel Footer - Actions */}
          <div className="border-t bg-white p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Select Vendor</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger className="w-full" data-testid="select-vendor">
                  <SelectValue placeholder="Choose a vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.length === 0 ? (
                    <div className="p-2 text-sm text-slate-500">No vendors. Add one first.</div>
                  ) : (
                    vendors.filter(v => v.isActive !== false).map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.vendorName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Email Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-full" data-testid="select-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.templateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={generateEmailContent}
              disabled={!selectedVendorId}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="btn-create-email"
            >
              <Mail className="w-4 h-4 mr-2" />
              Create Email
            </Button>
          </div>
        </div>
      </div>

      {/* Vendor Management Modal */}
      <Dialog open={showVendorModal} onOpenChange={(open) => { if (!open) resetVendorForm(); else setShowVendorModal(true); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" />
              {editingVendor ? "Edit Vendor" : "Manage Vendors"}
            </DialogTitle>
            <DialogDescription>
              {editingVendor ? "Update vendor information" : "Add and manage chemical suppliers"}
            </DialogDescription>
          </DialogHeader>

          {!editingVendor && (
            <div className="space-y-4">
              {/* Vendor List */}
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {vendors.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    No vendors yet. Add your first vendor below.
                  </div>
                ) : (
                  vendors.map((vendor) => (
                    <div key={vendor.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-medium">{vendor.vendorName}</p>
                        <p className="text-sm text-slate-500">
                          {vendor.email || vendor.phone || "No contact info"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditVendor(vendor)}
                          data-testid={`btn-edit-vendor-${vendor.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => deleteVendorMutation.mutate(vendor.id)}
                          data-testid={`btn-delete-vendor-${vendor.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Vendor
                </h4>
              </div>
            </div>
          )}

          {/* Vendor Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="vendorName">Vendor Name *</Label>
              <Input
                id="vendorName"
                value={vendorForm.vendorName}
                onChange={(e) => setVendorForm({ ...vendorForm, vendorName: e.target.value })}
                placeholder="Chemical Supply Co."
                data-testid="input-vendor-name"
              />
            </div>
            <div>
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={vendorForm.contactPerson}
                onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                placeholder="John Smith"
                data-testid="input-contact-person"
              />
            </div>
            <div>
              <Label htmlFor="vendorEmail">Email</Label>
              <Input
                id="vendorEmail"
                type="email"
                value={vendorForm.email}
                onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                placeholder="orders@supplier.com"
                data-testid="input-vendor-email"
              />
            </div>
            <div>
              <Label htmlFor="vendorPhone">Phone</Label>
              <Input
                id="vendorPhone"
                value={vendorForm.phone}
                onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                placeholder="(555) 123-4567"
                data-testid="input-vendor-phone"
              />
            </div>
            <div>
              <Label htmlFor="vendorAddress">Address</Label>
              <Input
                id="vendorAddress"
                value={vendorForm.address}
                onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                placeholder="123 Supply St, City, ST"
                data-testid="input-vendor-address"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="vendorNotes">Notes (Account #, Special Instructions)</Label>
              <Textarea
                id="vendorNotes"
                value={vendorForm.notes}
                onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                placeholder="Account #12345, Delivers on Tuesdays"
                rows={2}
                data-testid="input-vendor-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetVendorForm}>
              Cancel
            </Button>
            <Button onClick={handleSaveVendor} disabled={createVendorMutation.isPending || updateVendorMutation.isPending}>
              {editingVendor ? "Update Vendor" : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Preview Modal */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Email Preview
            </DialogTitle>
            <DialogDescription>
              Review the email before sending to {vendors.find(v => v.id === selectedVendorId)?.vendorName || "vendor"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>To</Label>
              <Input
                value={vendors.find(v => v.id === selectedVendorId)?.email || "No email on file"}
                readOnly
                className="bg-slate-50"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                data-testid="input-email-subject"
              />
            </div>
            <div>
              <Label>Message</Label>
              <div 
                className="border rounded-lg p-4 bg-white min-h-[200px] prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: emailBody }}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEmailPreview(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={copyEmailToClipboard} className="gap-2">
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </Button>
            <Button onClick={openInEmailClient} className="gap-2">
              <Send className="w-4 h-4" />
              Open in Email App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
