import React, { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { 
  FileText, Plus, Clock, CheckCircle2, XCircle, Calendar as CalendarIcon, DollarSign, 
  Building2, User, Send, AlertCircle, Loader2, Trash2, Edit, Eye,
  ArrowRight, Mail, Receipt, Camera, X, ChevronLeft, ChevronRight,
  Wrench, UserCircle2, MapPin, Package, Tag, Paperclip, Percent, Hash,
  Users, ClipboardList, MoreVertical, Archive
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EstimateLineItem {
  lineNumber: number;
  serviceDate?: string;
  productService: string;
  description: string;
  sku?: string;
  quantity: number;
  rate: number;
  amount: number;
  taxable: boolean;
  class?: string;
}

interface Attachment {
  name: string;
  url: string;
  size: number;
}

interface Estimate {
  id: string;
  propertyId: string;
  propertyName: string;
  customerName: string | null;
  customerEmail: string | null;
  address: string | null;
  estimateNumber: string | null;
  estimateDate: string | null;
  expirationDate: string | null;
  acceptedBy: string | null;
  acceptedDate: string | null;
  location: string | null;
  tags: string[] | null;
  title: string;
  description: string | null;
  items: EstimateLineItem[];
  photos: string[] | null;
  attachments: Attachment[] | null;
  subtotal: number | null;
  discountType: string | null;
  discountValue: number | null;
  discountAmount: number | null;
  taxableSubtotal: number | null;
  salesTaxRate: number | null;
  salesTaxAmount: number | null;
  depositType: string | null;
  depositValue: number | null;
  depositAmount: number | null;
  totalAmount: number | null;
  partsTotal: number | null;
  laborTotal: number | null;
  status: string;
  createdByTechId: string | null;
  createdByTechName: string | null;
  repairTechId: string | null;
  repairTechName: string | null;
  serviceTechId: string | null;
  serviceTechName: string | null;
  fieldSupervisorId: string | null;
  fieldSupervisorName: string | null;
  officeMemberId: string | null;
  officeMemberName: string | null;
  repairForemanId: string | null;
  repairForemanName: string | null;
  approvedByManagerId: string | null;
  approvedByManagerName: string | null;
  createdAt: string;
  reportedDate: string | null;
  sentForApprovalAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  scheduledDate: string | null;
  completedAt: string | null;
  invoicedAt: string | null;
  techNotes: string | null;
  managerNotes: string | null;
  rejectionReason: string | null;
  customerNote: string | null;
  memoOnStatement: string | null;
  jobId: string | null;
  invoiceId: string | null;
  // WO tracking fields
  workType: string | null;
  woReceived: boolean | null;
  woNumber: string | null;
  // Pool WO requirement (joined from pool data)
  woRequired?: boolean;
}

interface EstimateFormData {
  propertyId: string;
  propertyName: string;
  customerName: string;
  customerEmail: string;
  address: string;
  estimateNumber: string;
  estimateDate: Date | undefined;
  expirationDate: Date | undefined;
  acceptedBy: string;
  acceptedDate: Date | undefined;
  location: string;
  tags: string[];
  title: string;
  description: string;
  status: string;
  repairTechId: string;
  repairTechName: string;
  serviceTechId: string;
  serviceTechName: string;
  fieldSupervisorId: string;
  fieldSupervisorName: string;
  officeMemberId: string;
  officeMemberName: string;
  repairForemanId: string;
  repairForemanName: string;
  reportedDate: Date | undefined;
  items: EstimateLineItem[];
  discountType: "percent" | "fixed";
  discountValue: number;
  salesTaxRate: number;
  depositType: "percent" | "fixed";
  depositValue: number;
  customerNote: string;
  memoOnStatement: string;
  techNotes: string;
  attachments: Attachment[];
  workType: string;
  woReceived: boolean;
  woNumber: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-200", icon: FileText },
  pending_approval: { label: "Pending Approval", color: "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  needs_scheduling: { label: "Needs Scheduling", color: "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]", icon: CalendarIcon },
  scheduled: { label: "Scheduled", color: "bg-[#DBEAFE] text-[#1E3A8A] border-[#93C5FD]", icon: CalendarIcon },
  completed: { label: "Completed", color: "bg-[#DBEAFE] text-[#60A5FA] border-[#93C5FD]", icon: CheckCircle2 },
  ready_to_invoice: { label: "Ready to Invoice", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Receipt },
  invoiced: { label: "Invoiced", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Receipt },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500 border-gray-200", icon: Archive },
};

const emptyFormData: EstimateFormData = {
  propertyId: "",
  propertyName: "",
  customerName: "",
  customerEmail: "",
  address: "",
  estimateNumber: "",
  estimateDate: new Date(),
  expirationDate: undefined,
  acceptedBy: "",
  acceptedDate: undefined,
  location: "",
  tags: [],
  title: "",
  description: "",
  status: "draft",
  repairTechId: "",
  repairTechName: "",
  serviceTechId: "",
  serviceTechName: "",
  fieldSupervisorId: "",
  fieldSupervisorName: "",
  officeMemberId: "",
  officeMemberName: "",
  repairForemanId: "",
  repairForemanName: "",
  reportedDate: undefined,
  items: [],
  discountType: "percent",
  discountValue: 0,
  salesTaxRate: 0,
  depositType: "percent",
  depositValue: 0,
  customerNote: "",
  memoOnStatement: "",
  techNotes: "",
  attachments: [],
  workType: "repairs",
  woReceived: false,
  woNumber: "",
};

function generateEstimateNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EST-${year}${random}`;
}

export default function Estimates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [managerNotes, setManagerNotes] = useState("");
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showSendApprovalDialog, setShowSendApprovalDialog] = useState(false);
  const [selectedApprovalEmail, setSelectedApprovalEmail] = useState("");
  const [propertyContacts, setPropertyContacts] = useState<{id: string; name: string; email: string; type: string}[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoiceEmail, setSelectedInvoiceEmail] = useState("");
  const [billingContacts, setBillingContacts] = useState<{id: string; name: string; email: string; contactType: string}[]>([]);
  const [loadingBillingContacts, setLoadingBillingContacts] = useState(false);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | undefined>(new Date());
  const [autoSelectedByWorkType, setAutoSelectedByWorkType] = useState(false);

  const [formData, setFormData] = useState<EstimateFormData>(emptyFormData);

  const { data: estimatesData, isLoading } = useQuery({
    queryKey: ["estimates"],
    queryFn: async () => {
      const response = await fetch("/api/estimates");
      if (!response.ok) throw new Error("Failed to fetch estimates");
      return response.json();
    },
    refetchInterval: 10000,
  });

  const { data: techniciansData } = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const response = await fetch("/api/technicians");
      if (!response.ok) return { technicians: [] };
      return response.json();
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) return { customers: [] };
      return response.json();
    },
  });

  const { data: repairTechsData } = useQuery({
    queryKey: ["repair-techs"],
    queryFn: async () => {
      const response = await fetch("/api/estimates/repair-techs");
      if (!response.ok) return { technicians: [] };
      return response.json();
    },
    enabled: showSchedulingModal,
  });

  const { data: metricsData } = useQuery({
    queryKey: ["estimate-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/estimates/metrics");
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: 30000,
  });

  const technicians = techniciansData?.technicians || [];
  const customers = customersData?.customers || [];
  const repairTechs = repairTechsData?.technicians || [];
  const metrics = metricsData;

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
      toast({ title: "Estimate Created", description: "Your estimate has been saved." });
      setShowFormDialog(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create estimate.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/estimates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update estimate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({ title: "Estimate Updated", description: "Your estimate has been updated." });
      setShowFormDialog(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update estimate.", variant: "destructive" });
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

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/estimates/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!response.ok) throw new Error("Failed to archive estimate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({ title: "Archived", description: "Estimate has been archived." });
      setShowDetailDialog(false);
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ id, repairTechId, repairTechName, scheduledDate }: { id: string; repairTechId: string; repairTechName: string; scheduledDate: Date }) => {
      const response = await fetch(`/api/estimates/${id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repairTechId, repairTechName, scheduledDate: scheduledDate.toISOString() }),
      });
      if (!response.ok) throw new Error("Failed to schedule estimate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["estimate-metrics"] });
      toast({ title: "Scheduled", description: "Job has been assigned to the repair technician." });
      setShowSchedulingModal(false);
      setSelectedEstimate(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to schedule estimate.", variant: "destructive" });
    },
  });

  const handleScheduleToTech = (tech: any) => {
    if (!selectedEstimate || !selectedScheduleDate) return;
    scheduleMutation.mutate({
      id: selectedEstimate.id,
      repairTechId: tech.id,
      repairTechName: tech.name,
      scheduledDate: selectedScheduleDate,
    });
  };

  const estimates: Estimate[] = estimatesData?.estimates || [];

  // Filter out archived estimates from "all" tab, show archived only in archived tab
  // Group related statuses together in tabs
  const filteredEstimates = activeTab === "all" 
    ? estimates.filter(e => e.status !== "archived")
    : activeTab === "archived"
    ? estimates.filter(e => e.status === "archived")
    : activeTab === "approved"
    ? estimates.filter(e => e.status === "approved" || e.status === "needs_scheduling")
    : activeTab === "completed"
    ? estimates.filter(e => e.status === "completed" || e.status === "ready_to_invoice")
    : estimates.filter(e => e.status === activeTab);

  const statusCounts = {
    all: estimates.filter(e => e.status !== "archived").length,
    draft: estimates.filter(e => e.status === "draft").length,
    pending_approval: estimates.filter(e => e.status === "pending_approval").length,
    approved: estimates.filter(e => e.status === "approved" || e.status === "needs_scheduling").length,
    rejected: estimates.filter(e => e.status === "rejected").length,
    scheduled: estimates.filter(e => e.status === "scheduled").length,
    completed: estimates.filter(e => e.status === "completed" || e.status === "ready_to_invoice").length,
    invoiced: estimates.filter(e => e.status === "invoiced").length,
    archived: estimates.filter(e => e.status === "archived").length,
  };

  const resetForm = () => {
    setFormData({
      ...emptyFormData,
      estimateNumber: generateEstimateNumber(),
      estimateDate: new Date(),
    });
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowFormDialog(true);
  };

  const openEditDialog = (estimate: Estimate) => {
    setIsEditing(true);
    setFormData({
      propertyId: estimate.propertyId,
      propertyName: estimate.propertyName,
      customerName: estimate.customerName || "",
      customerEmail: estimate.customerEmail || "",
      address: estimate.address || "",
      estimateNumber: estimate.estimateNumber || "",
      estimateDate: estimate.estimateDate ? new Date(estimate.estimateDate) : new Date(),
      expirationDate: estimate.expirationDate ? new Date(estimate.expirationDate) : undefined,
      acceptedBy: estimate.acceptedBy || "",
      acceptedDate: estimate.acceptedDate ? new Date(estimate.acceptedDate) : undefined,
      location: estimate.location || "",
      tags: estimate.tags || [],
      title: estimate.title,
      description: estimate.description || "",
      status: estimate.status,
      repairTechId: estimate.repairTechId || "",
      repairTechName: estimate.repairTechName || "",
      serviceTechId: estimate.serviceTechId || "",
      serviceTechName: estimate.serviceTechName || "",
      fieldSupervisorId: estimate.fieldSupervisorId || "",
      fieldSupervisorName: estimate.fieldSupervisorName || "",
      officeMemberId: estimate.officeMemberId || "",
      officeMemberName: estimate.officeMemberName || "",
      repairForemanId: estimate.repairForemanId || "",
      repairForemanName: estimate.repairForemanName || "",
      reportedDate: estimate.reportedDate ? new Date(estimate.reportedDate) : undefined,
      items: estimate.items || [],
      discountType: (estimate.discountType as "percent" | "fixed") || "percent",
      discountValue: estimate.discountValue || 0,
      salesTaxRate: estimate.salesTaxRate || 0,
      depositType: (estimate.depositType as "percent" | "fixed") || "percent",
      depositValue: estimate.depositValue || 0,
      customerNote: estimate.customerNote || "",
      memoOnStatement: estimate.memoOnStatement || "",
      techNotes: estimate.techNotes || "",
      attachments: estimate.attachments || [],
      workType: estimate.workType || "repairs",
      woReceived: estimate.woReceived || false,
      woNumber: estimate.woNumber || "",
    });
    setSelectedEstimate(estimate);
    setShowFormDialog(true);
  };

  const calculateTotals = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    
    const discountAmount = formData.discountType === "percent"
      ? subtotal * (formData.discountValue / 100)
      : formData.discountValue * 100;
    
    const taxableItems = formData.items.filter(item => item.taxable);
    const taxableSubtotalRaw = taxableItems.reduce((sum, item) => sum + item.amount, 0);
    const discountProportion = subtotal > 0 ? (taxableSubtotalRaw / subtotal) : 0;
    const taxableSubtotal = Math.max(0, taxableSubtotalRaw - (discountProportion * discountAmount));
    
    const salesTaxAmount = taxableSubtotal * (formData.salesTaxRate / 100);
    const totalAmount = subtotal - discountAmount + salesTaxAmount;
    
    const depositAmount = formData.depositType === "percent"
      ? totalAmount * (formData.depositValue / 100)
      : formData.depositValue * 100;

    return {
      subtotal,
      discountAmount,
      taxableSubtotal,
      salesTaxAmount,
      totalAmount,
      depositAmount,
    };
  }, [formData.items, formData.discountType, formData.discountValue, formData.salesTaxRate, formData.depositType, formData.depositValue]);

  const addLineItem = () => {
    const newItem: EstimateLineItem = {
      lineNumber: formData.items.length + 1,
      productService: "",
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
      taxable: false,
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const updateLineItem = (index: number, updates: Partial<EstimateLineItem>) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], ...updates };
      item.amount = item.quantity * item.rate * 100;
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const removeLineItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, lineNumber: i + 1 })),
    }));
  };

  const clearAllLines = () => {
    setFormData(prev => ({ ...prev, items: [] }));
  };

  const handleSaveEstimate = () => {
    const estimateData = {
      ...formData,
      estimateDate: formData.estimateDate?.toISOString(),
      expirationDate: formData.expirationDate?.toISOString(),
      acceptedDate: formData.acceptedDate?.toISOString(),
      reportedDate: formData.reportedDate?.toISOString(),
      subtotal: calculateTotals.subtotal,
      discountAmount: calculateTotals.discountAmount,
      taxableSubtotal: calculateTotals.taxableSubtotal,
      salesTaxAmount: calculateTotals.salesTaxAmount,
      totalAmount: calculateTotals.totalAmount,
      depositAmount: calculateTotals.depositAmount,
      createdByTechId: "tech-1",
      createdByTechName: "Service Tech",
    };

    if (isEditing && selectedEstimate) {
      updateMutation.mutate({ id: selectedEstimate.id, data: estimateData });
    } else {
      createMutation.mutate(estimateData);
    }
  };

  const openSendApprovalDialog = async (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setSelectedApprovalEmail("");
    setLoadingContacts(true);
    setShowSendApprovalDialog(true);
    
    try {
      // The propertyId in estimates refers to the customer ID
      const customerId = estimate.propertyId;
      const allContacts: {id: string; name: string; email: string; type: string}[] = [];
      
      // Fetch contacts for the customer
      const response = await fetch(`/api/customers/${customerId}/contacts`);
      if (response.ok) {
        const data = await response.json();
        const contacts = (data.contacts || []).filter((c: any) => c.email);
        allContacts.push(...contacts);
      }
      
      // Also add the customer's main email if available
      const customer = customers.find((c: any) => c.id === customerId);
      if (customer?.email && !allContacts.find((c: any) => c.email === customer.email)) {
        allContacts.unshift({ id: 'main', name: customer.name || 'Primary Contact', email: customer.email, type: 'Primary' });
      }
      
      // If estimate has customerEmail stored, add that too
      if (estimate.customerEmail && !allContacts.find((c: any) => c.email === estimate.customerEmail)) {
        allContacts.unshift({ id: 'estimate-email', name: estimate.customerName || 'Contact', email: estimate.customerEmail, type: 'Primary' });
      }
      
      setPropertyContacts(allContacts);
      if (allContacts.length > 0) {
        setSelectedApprovalEmail(allContacts[0].email);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      // If fetch fails, still try to use the estimate's stored email
      if (estimate.customerEmail) {
        setPropertyContacts([{ id: 'estimate-email', name: estimate.customerName || 'Contact', email: estimate.customerEmail, type: 'Primary' }]);
        setSelectedApprovalEmail(estimate.customerEmail);
      } else {
        setPropertyContacts([]);
      }
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSendApprovalEmail = () => {
    if (!selectedEstimate) return;
    
    // Generate email content
    const subject = encodeURIComponent(`Estimate Approval Request: ${selectedEstimate.title} - ${selectedEstimate.propertyName}`);
    const body = encodeURIComponent(`Dear Property Manager,

We are requesting approval for the following repair estimate:

Property: ${selectedEstimate.propertyName}
Estimate #: ${selectedEstimate.estimateNumber || 'N/A'}
Title: ${selectedEstimate.title}
${selectedEstimate.description ? `Description: ${selectedEstimate.description}` : ''}

Total Amount: $${((selectedEstimate.totalAmount || 0) / 100).toFixed(2)}

Please review and respond with your approval or any questions.

Thank you,
Breakpoint Pool Service`);
    
    // Open Outlook compose URL
    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(selectedApprovalEmail)}&subject=${subject}&body=${body}`;
    window.open(outlookUrl, '_blank');
    
    // Update status to pending approval
    updateStatusMutation.mutate({
      id: selectedEstimate.id,
      status: "pending_approval",
    });
    
    setShowSendApprovalDialog(false);
    toast({ title: "Approval Request Sent", description: `Email opened for ${selectedApprovalEmail}` });
  };

  const handleSendForApproval = (estimate: Estimate) => {
    openSendApprovalDialog(estimate);
  };

  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  const handleApproval = async () => {
    if (!selectedEstimate) return;
    
    if (approvalAction === "approve") {
      setIsCreatingInvoice(true);
      try {
        const invoiceResponse = await fetch("/api/quickbooks/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: selectedEstimate.propertyName,
            lineItems: selectedEstimate.items || [],
            memo: `Estimate #${selectedEstimate.estimateNumber} - ${selectedEstimate.title}`,
          }),
        });

        let invoiceData = null;
        let invoiceError = null;
        if (invoiceResponse.ok) {
          invoiceData = await invoiceResponse.json();
        } else {
          const errorData = await invoiceResponse.json().catch(() => ({}));
          invoiceError = errorData.error || "Failed to create QuickBooks invoice";
          console.warn("QuickBooks invoice creation failed:", invoiceError);
        }

        updateStatusMutation.mutate({
          id: selectedEstimate.id,
          status: "approved",
          extras: {
            approvedByManagerId: "manager-1",
            approvedByManagerName: "HOA Manager",
            managerNotes,
            invoiceId: invoiceData?.invoiceId || null,
            qbInvoiceNumber: invoiceData?.invoiceNumber || null,
          },
        }, {
          onSuccess: () => {
            if (invoiceData?.invoiceNumber) {
              toast({ 
                title: "Approved & Invoice Created", 
                description: `QuickBooks Invoice #${invoiceData.invoiceNumber} created successfully.` 
              });
            } else if (invoiceError) {
              toast({ 
                title: "Approved (Invoice Failed)", 
                description: `Estimate approved, but QuickBooks invoice creation failed: ${invoiceError}`,
                variant: "destructive"
              });
            }
          }
        });
      } catch (error) {
        console.error("Error creating invoice:", error);
        updateStatusMutation.mutate({
          id: selectedEstimate.id,
          status: "approved",
          extras: {
            approvedByManagerId: "manager-1",
            approvedByManagerName: "HOA Manager",
            managerNotes,
          },
        });
      } finally {
        setIsCreatingInvoice(false);
      }
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

  const handleNeedsScheduling = (estimate: Estimate) => {
    updateStatusMutation.mutate({
      id: estimate.id,
      status: "needs_scheduling",
    });
  };

  const openSchedulingModal = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setShowSchedulingModal(true);
  };

  const handleComplete = async (estimate: Estimate) => {
    try {
      const response = await fetch(`/api/estimates/${estimate.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to mark complete");
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates/metrics"] });
      toast({
        title: "Job Completed",
        description: "Estimate marked as completed.",
      });
    } catch (error) {
      console.error("Error completing estimate:", error);
      toast({
        title: "Error",
        description: "Failed to complete estimate.",
        variant: "destructive",
      });
    }
  };

  const handleReadyToInvoice = async (estimate: Estimate) => {
    try {
      const response = await fetch(`/api/estimates/${estimate.id}/ready-to-invoice`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to mark ready to invoice");
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates/metrics"] });
      toast({
        title: "Ready to Invoice",
        description: "Estimate marked as ready for invoicing.",
      });
    } catch (error) {
      console.error("Error marking ready to invoice:", error);
      toast({
        title: "Error",
        description: "Failed to update estimate status.",
        variant: "destructive",
      });
    }
  };

  const openInvoiceDialog = async (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setSelectedInvoiceEmail("");
    setLoadingBillingContacts(true);
    setBillingContacts([]);
    setAutoSelectedByWorkType(false);
    setShowInvoiceDialog(true);
    
    try {
      const customerId = estimate.propertyId;
      const workType = estimate.workType || "repairs";
      
      // Fetch billing contacts for the property
      const response = await fetch(`/api/customers/${customerId}/billing-contacts`);
      if (response.ok) {
        const data = await response.json();
        const contacts = data.contacts || [];
        setBillingContacts(contacts);
        
        // Auto-select billing email based on work type
        // Priority: exact match for work type > primary billing > first available
        const workTypeContact = contacts.find((c: any) => c.contactType === workType);
        const primaryContact = contacts.find((c: any) => c.contactType === "primary");
        
        if (workTypeContact) {
          setSelectedInvoiceEmail(workTypeContact.email);
          setAutoSelectedByWorkType(true);
        } else if (primaryContact) {
          setSelectedInvoiceEmail(primaryContact.email);
        } else if (contacts.length > 0) {
          setSelectedInvoiceEmail(contacts[0].email);
        }
      } else {
        // Fallback to regular contacts if no billing contacts
        const contactsResponse = await fetch(`/api/customers/${customerId}/contacts`);
        if (contactsResponse.ok) {
          const data = await contactsResponse.json();
          const contacts = (data.contacts || []).filter((c: any) => c.email).map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            contactType: 'primary',
          }));
          setBillingContacts(contacts);
          if (contacts.length > 0) {
            setSelectedInvoiceEmail(contacts[0].email);
          }
        }
      }
      
      // Also add customer main email if available
      const customer = customers.find((c: any) => c.id === customerId);
      if (customer?.email) {
        setBillingContacts(prev => {
          if (!prev.find((c: any) => c.email === customer.email)) {
            const newContacts = [{ id: 'main', name: customer.name || 'Primary Contact', email: customer.email, contactType: 'primary' }, ...prev];
            // If no email was selected yet, use the customer main email as fallback
            setSelectedInvoiceEmail(prevEmail => prevEmail || customer.email);
            return newContacts;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error fetching billing contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load billing contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingBillingContacts(false);
    }
  };

  const handleInvoice = (estimate: Estimate) => {
    openInvoiceDialog(estimate);
  };
  
  const handleCreateInvoice = async () => {
    if (!selectedEstimate) return;
    
    setIsCreatingInvoice(true);
    try {
      const invoiceResponse = await fetch("/api/quickbooks/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: selectedEstimate.propertyName,
          customerEmail: selectedInvoiceEmail,
          lineItems: selectedEstimate.items || [],
          memo: `Estimate #${selectedEstimate.estimateNumber} - ${selectedEstimate.title}`,
        }),
      });

      let invoiceData = null;
      let invoiceError = null;
      if (invoiceResponse.ok) {
        invoiceData = await invoiceResponse.json();
      } else {
        const errorData = await invoiceResponse.json().catch(() => ({}));
        invoiceError = errorData.error || "Failed to create QuickBooks invoice";
        console.warn("QuickBooks invoice creation failed:", invoiceError);
      }

      updateStatusMutation.mutate({
        id: selectedEstimate.id,
        status: "invoiced",
        extras: {
          invoiceId: invoiceData?.invoiceId || `INV-${Date.now()}`,
          qbInvoiceNumber: invoiceData?.invoiceNumber || null,
          invoicedEmail: selectedInvoiceEmail,
        },
      }, {
        onSuccess: () => {
          if (invoiceData?.invoiceNumber) {
            toast({ 
              title: "Invoice Created", 
              description: `QuickBooks Invoice #${invoiceData.invoiceNumber} created and sent to ${selectedInvoiceEmail}.` 
            });
          } else if (invoiceError) {
            toast({ 
              title: "Invoiced (QB Failed)", 
              description: `Status updated to invoiced, but QuickBooks invoice creation failed: ${invoiceError}`,
              variant: "destructive"
            });
          } else {
            toast({ 
              title: "Invoice Created", 
              description: `Invoice sent to ${selectedInvoiceEmail}.` 
            });
          }
        }
      });
      
      setShowInvoiceDialog(false);
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Invoice Error",
        description: "An error occurred while creating the invoice.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const openApprovalDialog = (estimate: Estimate, action: "approve" | "reject") => {
    setSelectedEstimate(estimate);
    setApprovalAction(action);
    setRejectionReason("");
    setManagerNotes("");
    setShowApprovalDialog(true);
  };

  const formatCurrency = (amount: number | null) => {
    return `$${((amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const DatePickerField = ({ 
    label, 
    value, 
    onChange,
    placeholder = "Pick a date"
  }: { 
    label: string; 
    value: Date | undefined; 
    onChange: (date: Date | undefined) => void;
    placeholder?: string;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal h-9"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "MM/dd/yyyy") : <span className="text-slate-400">{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const TechnicianSelect = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (id: string, name: string) => void;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      <Select
        value={value || "__none__"}
        onValueChange={(id) => {
          if (id === "__none__") {
            onChange("", "");
            return;
          }
          const tech = technicians.find((t: any) => t.id === id);
          onChange(id, tech ? `${tech.firstName} ${tech.lastName}` : "");
        }}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None</SelectItem>
          {technicians.map((tech: any) => (
            <SelectItem key={tech.id} value={tech.id}>
              {tech.firstName} {tech.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1E293B]">Estimates</h1>
            <p className="text-[#64748B] text-sm">Manage repair estimates and HOA approvals</p>
          </div>
          <Button
            onClick={openCreateDialog}
            data-testid="button-create-estimate"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Estimate
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {Object.entries(statusConfig).filter(([key]) => !["needs_scheduling", "ready_to_invoice"].includes(key)).map(([key, config]) => (
            <Card key={key} className="cursor-pointer hover:shadow-md hover:border-[#60A5FA]/50 transition-all" onClick={() => setActiveTab(key)}>
              <CardContent className="p-4 text-center">
                <config.icon className="w-6 h-6 mx-auto mb-2 text-[#1E3A8A]" />
                <p className="text-2xl font-bold text-[#1E293B]">{statusCounts[key as keyof typeof statusCounts] || 0}</p>
                <p className="text-xs text-[#64748B]">{config.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {metrics && (
          <Card className="bg-gradient-to-r from-[#1E3A8A]/5 to-[#60A5FA]/5 border-[#1E3A8A]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#1E3A8A]">Workflow Metrics</h3>
                <Badge variant="outline" className="text-xs">Last 30 days</Badge>
              </div>
              <div className="grid grid-cols-6 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-[#1E3A8A]">{metrics.conversionRate}%</p>
                  <p className="text-xs text-[#64748B]">Approval Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-600">${(metrics.approvedValue || 0).toLocaleString()}</p>
                  <p className="text-xs text-[#64748B]">Approved Value</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[#1E3A8A]">${(metrics.scheduledValue || 0).toLocaleString()}</p>
                  <p className="text-xs text-[#64748B]">Scheduled Value</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-purple-600">${(metrics.invoicedValue || 0).toLocaleString()}</p>
                  <p className="text-xs text-[#64748B]">Invoiced Value</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[#F97316]">{metrics.avgApprovalTime}h</p>
                  <p className="text-xs text-[#64748B]">Avg Approval Time</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[#60A5FA]">{metrics.avgCompletionTime}h</p>
                  <p className="text-xs text-[#64748B]">Avg Completion Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-[#F1F5F9]">
                <TabsTrigger value="all" data-testid="tab-all">All ({statusCounts.all})</TabsTrigger>
                <TabsTrigger value="draft" data-testid="tab-draft">Drafts ({statusCounts.draft})</TabsTrigger>
                <TabsTrigger value="pending_approval" data-testid="tab-pending">Pending ({statusCounts.pending_approval})</TabsTrigger>
                <TabsTrigger value="approved" data-testid="tab-approved">Approved ({statusCounts.approved})</TabsTrigger>
                <TabsTrigger value="scheduled" data-testid="tab-scheduled">Scheduled ({statusCounts.scheduled})</TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">Completed ({statusCounts.completed})</TabsTrigger>
                <TabsTrigger value="archived" data-testid="tab-archived">Archived ({statusCounts.archived})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
              </div>
            ) : filteredEstimates.length === 0 ? (
              <div className="text-center py-12 text-[#64748B]">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No estimates found</p>
                {activeTab === "all" && (
                  <Button onClick={openCreateDialog} variant="link" className="mt-2 text-[#60A5FA]">
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
                        className="flex items-center justify-between p-4 rounded-lg border border-[#E2E8F0] bg-white hover:border-[#60A5FA]/50 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedEstimate(estimate);
                          setShowDetailDialog(true);
                        }}
                        data-testid={`estimate-row-${estimate.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-2 rounded-lg bg-[#EFF6FF]">
                            <config.icon className="w-5 h-5 text-[#1E3A8A]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-[#1E293B] truncate">{estimate.title}</h3>
                              {estimate.estimateNumber && (
                                <span className="text-xs text-slate-500">#{estimate.estimateNumber}</span>
                              )}
                              <Badge className={`${config.color} border text-xs`}>
                                {config.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {estimate.propertyName}
                                {estimate.woRequired && (
                                  <Badge className="ml-1 bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0">
                                    WO Required
                                  </Badge>
                                )}
                              </span>
                              {estimate.customerName && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {estimate.customerName}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {formatDate(estimate.estimateDate || estimate.createdAt)}
                              </span>
                              {estimate.createdByTechName && (
                                <span className="flex items-center gap-1 text-slate-500">
                                  <UserCircle2 className="w-3 h-3" />
                                  {estimate.createdByTechName}
                                </span>
                              )}
                              {estimate.photos && estimate.photos.length > 0 && 
                               estimate.photos.some((p: string) => p && !p.includes('[object Object]')) ? (
                                <span className="flex items-center gap-1 text-green-600" title="Has photos attached">
                                  <Camera className="w-3 h-3" />
                                  {estimate.photos.filter((p: string) => p && !p.includes('[object Object]')).length}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-slate-400" title="No photos">
                                  <Camera className="w-3 h-3" />
                                  0
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-[#1E3A8A]">{formatCurrency(estimate.totalAmount)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(estimate);
                            }}
                            data-testid={`button-edit-${estimate.id}`}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {estimate.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendForApproval(estimate);
                              }}
                              className="bg-[#F97316] hover:bg-[#F97316]/90"
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
                            <>
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNeedsScheduling(estimate);
                                }}
                                className="bg-[#F97316] hover:bg-[#F97316]/90"
                                data-testid={`button-needs-scheduling-${estimate.id}`}
                              >
                                <CalendarIcon className="w-3 h-3 mr-1" />
                                Needs Scheduling
                              </Button>
                            </>
                          )}
                          {estimate.status === "needs_scheduling" && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSchedulingModal(estimate);
                              }}
                              className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90"
                              data-testid={`button-schedule-${estimate.id}`}
                            >
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              Schedule
                            </Button>
                          )}
                          {estimate.status === "rejected" && (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                          {estimate.status === "scheduled" && (
                            <>
                              <Badge className="bg-[#DBEAFE] text-[#1E3A8A] border-[#93C5FD]">
                                <CalendarIcon className="w-3 h-3 mr-1" />
                                Scheduled
                              </Badge>
                              {estimate.repairTechName && (
                                <span className="text-xs text-slate-500">
                                  Tech: {estimate.repairTechName}
                                </span>
                              )}
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleComplete(estimate);
                                }}
                                className="bg-[#60A5FA] hover:bg-[#60A5FA]/90"
                                data-testid={`button-complete-${estimate.id}`}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Mark Complete
                              </Button>
                            </>
                          )}
                          {estimate.status === "completed" && (
                            <>
                              <Badge className="bg-[#DBEAFE] text-[#60A5FA] border-[#93C5FD]">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReadyToInvoice(estimate);
                                }}
                                className="bg-purple-600 hover:bg-purple-700"
                                data-testid={`button-ready-invoice-${estimate.id}`}
                              >
                                <Receipt className="w-3 h-3 mr-1" />
                                Ready to Invoice
                              </Button>
                            </>
                          )}
                          {estimate.status === "ready_to_invoice" && (
                            <>
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Ready to Invoice
                              </Badge>
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
                                Invoice
                              </Button>
                            </>
                          )}
                          {estimate.status === "archived" && (
                            <Badge className="bg-gray-100 text-gray-500 border-gray-200">
                              <Archive className="w-3 h-3 mr-1" />
                              Archived
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-more-${estimate.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              {estimate.status !== "archived" && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    archiveMutation.mutate(estimate.id);
                                  }}
                                  data-testid={`menu-archive-${estimate.id}`}
                                >
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              {estimate.status === "archived" && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatusMutation.mutate({ id: estimate.id, status: "draft" });
                                  }}
                                  data-testid={`menu-restore-${estimate.id}`}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  Restore to Draft
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Are you sure you want to delete this estimate? This action cannot be undone.")) {
                                    deleteMutation.mutate(estimate.id);
                                  }
                                }}
                                className="text-red-600 focus:text-red-600"
                                data-testid={`menu-delete-${estimate.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader className="border-b pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold text-slate-900">ESTIMATE</DialogTitle>
                  <p className="text-sm text-slate-500">{isEditing ? "Edit Estimate" : "Create New Estimate"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="text-3xl font-bold text-[#1E3A8A]">{formatCurrency(calculateTotals.totalAmount)}</p>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 -mx-6">
              <div className="px-6 py-4">
                <div className="flex gap-6">
                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-500">Customer / Property</Label>
                        <Select
                          value={formData.propertyId}
                          onValueChange={(id) => {
                            const customer = customers.find((c: any) => c.id === id);
                            setFormData(prev => ({
                              ...prev,
                              propertyId: id,
                              propertyName: customer?.name || "",
                              customerName: customer?.name || "",
                              customerEmail: customer?.email || "",
                              address: customer?.address || "",
                            }));
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select customer/property..." />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer: any) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-slate-500">Estimate no.</Label>
                        <Input
                          value={formData.estimateNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, estimateNumber: e.target.value }))}
                          className="h-9"
                          data-testid="input-estimate-number"
                        />
                      </div>
                      <DatePickerField
                        label="Estimate date"
                        value={formData.estimateDate}
                        onChange={(date) => setFormData(prev => ({ ...prev, estimateDate: date }))}
                      />
                      <DatePickerField
                        label="Expiration date"
                        value={formData.expirationDate}
                        onChange={(date) => setFormData(prev => ({ ...prev, expirationDate: date }))}
                      />
                      <div>
                        <Label className="text-xs text-slate-500">Accepted by</Label>
                        <Input
                          value={formData.acceptedBy}
                          onChange={(e) => setFormData(prev => ({ ...prev, acceptedBy: e.target.value }))}
                          placeholder="Customer name"
                          className="h-9"
                          data-testid="input-accepted-by"
                        />
                      </div>
                      <DatePickerField
                        label="Accepted date"
                        value={formData.acceptedDate}
                        onChange={(date) => setFormData(prev => ({ ...prev, acceptedDate: date }))}
                      />
                      <div>
                        <Label className="text-xs text-slate-500">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Work Type</Label>
                        <Select
                          value={formData.workType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, workType: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="repairs">Repairs</SelectItem>
                            <SelectItem value="chemicals">Chemicals</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-3">
                        <ClipboardList className="w-4 h-4 text-orange-600" />
                        <Label className="text-sm font-medium text-orange-800">Work Order Tracking</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="woReceived"
                            checked={formData.woReceived}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, woReceived: !!checked }))}
                          />
                          <Label htmlFor="woReceived" className="text-sm text-slate-700">Work Order Received</Label>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">WO Number</Label>
                          <Input
                            value={formData.woNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, woNumber: e.target.value }))}
                            placeholder="Enter WO number..."
                            className="h-9"
                            data-testid="input-wo-number"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border">
                      <TechnicianSelect
                        label="Repair Tech"
                        value={formData.repairTechId}
                        onChange={(id, name) => setFormData(prev => ({ ...prev, repairTechId: id, repairTechName: name }))}
                      />
                      <TechnicianSelect
                        label="Field Supervisor"
                        value={formData.fieldSupervisorId}
                        onChange={(id, name) => setFormData(prev => ({ ...prev, fieldSupervisorId: id, fieldSupervisorName: name }))}
                      />
                      <TechnicianSelect
                        label="Office Member"
                        value={formData.officeMemberId}
                        onChange={(id, name) => setFormData(prev => ({ ...prev, officeMemberId: id, officeMemberName: name }))}
                      />
                      <TechnicianSelect
                        label="Service Tech"
                        value={formData.serviceTechId}
                        onChange={(id, name) => setFormData(prev => ({ ...prev, serviceTechId: id, serviceTechName: name }))}
                      />
                      <DatePickerField
                        label="Reported date"
                        value={formData.reportedDate}
                        onChange={(date) => setFormData(prev => ({ ...prev, reportedDate: date }))}
                      />
                      <TechnicianSelect
                        label="Repair Foreman"
                        value={formData.repairForemanId}
                        onChange={(id, name) => setFormData(prev => ({ ...prev, repairForemanId: id, repairForemanName: name }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                      <div>
                        <Label className="text-xs text-slate-500">Tags</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={formData.tags.join(", ")}
                            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))}
                            placeholder="Enter tags, separated by comma"
                            className="h-9"
                          />
                          <Button variant="link" className="text-xs text-[#60A5FA] px-0">
                            Manage tags
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Location</Label>
                        <Input
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Job site location"
                          className="h-9"
                          data-testid="input-location"
                        />
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-100 px-4 py-3 border-b flex items-center justify-between">
                        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                          <ClipboardList className="w-4 h-4" />
                          Line Items
                        </h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={clearAllLines}
                            disabled={formData.items.length === 0}
                            data-testid="button-clear-lines"
                          >
                            Clear all lines
                          </Button>
                          <Button
                            size="sm"
                            onClick={addLineItem}
                            className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90"
                            data-testid="button-add-line"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add product or service
                          </Button>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="w-10 font-semibold">#</TableHead>
                            <TableHead className="w-28 font-semibold">Service Date</TableHead>
                            <TableHead className="font-semibold">Product/Service</TableHead>
                            <TableHead className="w-24 font-semibold">SKU</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="w-16 font-semibold text-center">Qty</TableHead>
                            <TableHead className="w-24 font-semibold text-right">Rate</TableHead>
                            <TableHead className="w-24 font-semibold text-right">Amount</TableHead>
                            <TableHead className="w-12 font-semibold text-center">Tax</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.items.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={10} className="text-center py-8 text-slate-400">
                                No line items yet. Click "Add product or service" to add items.
                              </TableCell>
                            </TableRow>
                          ) : (
                            formData.items.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-center font-medium text-slate-500">{item.lineNumber}</TableCell>
                                <TableCell>
                                  <Input
                                    type="date"
                                    value={item.serviceDate || ""}
                                    onChange={(e) => updateLineItem(idx, { serviceDate: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={item.productService}
                                    onChange={(e) => updateLineItem(idx, { productService: e.target.value })}
                                    placeholder="Product/Service"
                                    className="h-8 text-sm"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={item.sku || ""}
                                    onChange={(e) => updateLineItem(idx, { sku: e.target.value })}
                                    placeholder="SKU"
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={item.description}
                                    onChange={(e) => updateLineItem(idx, { description: e.target.value })}
                                    placeholder="Description"
                                    className="h-8 text-sm"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateLineItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                    className="h-8 text-sm text-center"
                                    min={0}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.rate}
                                    onChange={(e) => updateLineItem(idx, { rate: parseFloat(e.target.value) || 0 })}
                                    className="h-8 text-sm text-right"
                                    min={0}
                                    step={0.01}
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(item.amount)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={item.taxable}
                                    onCheckedChange={(checked) => updateLineItem(idx, { taxable: !!checked })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => removeLineItem(idx)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                      <div>
                        <Label className="text-xs text-slate-500">Customer payment options</Label>
                        <p className="text-sm text-slate-600 italic">Customer can pay online via ACH, credit card, or check.</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Note to customer (visible on estimate)</Label>
                        <Textarea
                          value={formData.customerNote}
                          onChange={(e) => setFormData(prev => ({ ...prev, customerNote: e.target.value }))}
                          placeholder="Add a note that will be visible to the customer..."
                          rows={2}
                          data-testid="input-customer-note"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Memo on statement (internal, not visible to customer)</Label>
                        <Textarea
                          value={formData.memoOnStatement}
                          onChange={(e) => setFormData(prev => ({ ...prev, memoOnStatement: e.target.value }))}
                          placeholder="Internal memo..."
                          rows={2}
                          data-testid="input-memo"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Tech Notes (internal)</Label>
                        <Textarea
                          value={formData.techNotes}
                          onChange={(e) => setFormData(prev => ({ ...prev, techNotes: e.target.value }))}
                          placeholder="Internal notes for the team..."
                          rows={2}
                          data-testid="input-tech-notes"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 flex items-center gap-2">
                          <Paperclip className="w-3 h-3" />
                          Attachments
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button variant="outline" size="sm">
                            <Plus className="w-3 h-3 mr-1" />
                            Add attachment
                          </Button>
                          <span className="text-xs text-slate-400">Max 20 MB per file</span>
                        </div>
                        {formData.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {formData.attachments.map((att, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <Paperclip className="w-3 h-3 text-slate-400" />
                                <span>{att.name}</span>
                                <span className="text-xs text-slate-400">({(att.size / 1024).toFixed(1)} KB)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-72 flex-shrink-0">
                    <div className="sticky top-0 space-y-4 p-4 bg-slate-100 rounded-lg border">
                      <h4 className="font-semibold text-slate-900 text-sm">Totals</h4>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="font-medium">{formatCurrency(calculateTotals.subtotal)}</span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Discount</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant={formData.discountType === "percent" ? "default" : "outline"}
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setFormData(prev => ({ ...prev, discountType: "percent" }))}
                                data-testid="button-discount-percent"
                              >
                                <Percent className="w-3 h-3" />
                              </Button>
                              <Button
                                variant={formData.discountType === "fixed" ? "default" : "outline"}
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setFormData(prev => ({ ...prev, discountType: "fixed" }))}
                                data-testid="button-discount-fixed"
                              >
                                <DollarSign className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={formData.discountValue}
                              onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                              className="h-8 text-sm"
                              min={0}
                              data-testid="input-discount-value"
                            />
                            <span className="text-sm text-slate-500 w-24 text-right" data-testid="text-discount-amount">
                              -{formatCurrency(calculateTotals.discountAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-slate-600">Taxable subtotal</span>
                          <span className="font-medium">{formatCurrency(calculateTotals.taxableSubtotal)}</span>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Sales tax rate (%)</Label>
                          <Input
                            type="number"
                            value={formData.salesTaxRate}
                            onChange={(e) => setFormData(prev => ({ ...prev, salesTaxRate: parseFloat(e.target.value) || 0 }))}
                            className="h-8 text-sm"
                            min={0}
                            step={0.01}
                          />
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Sales tax</span>
                          <span className="font-medium">{formatCurrency(calculateTotals.salesTaxAmount)}</span>
                        </div>

                        <div className="flex justify-between text-lg font-bold border-t pt-3 border-slate-300">
                          <span>Estimate total</span>
                          <span className="text-[#1E3A8A]">{formatCurrency(calculateTotals.totalAmount)}</span>
                        </div>

                        <div className="space-y-1 border-t pt-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Deposit request</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant={formData.depositType === "percent" ? "default" : "outline"}
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setFormData(prev => ({ ...prev, depositType: "percent" }))}
                                data-testid="button-deposit-percent"
                              >
                                <Percent className="w-3 h-3" />
                              </Button>
                              <Button
                                variant={formData.depositType === "fixed" ? "default" : "outline"}
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setFormData(prev => ({ ...prev, depositType: "fixed" }))}
                                data-testid="button-deposit-fixed"
                              >
                                <DollarSign className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={formData.depositValue}
                              onChange={(e) => setFormData(prev => ({ ...prev, depositValue: parseFloat(e.target.value) || 0 }))}
                              className="h-8 text-sm"
                              min={0}
                              data-testid="input-deposit-value"
                            />
                            <span className="text-sm text-slate-500 w-24 text-right" data-testid="text-deposit-amount">
                              {formatCurrency(calculateTotals.depositAmount)}
                            </span>
                          </div>
                        </div>

                        <Button variant="link" className="text-xs text-[#60A5FA] p-0 h-auto">
                          Edit totals
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="border-t pt-4 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowFormDialog(false)}>Cancel</Button>
              <Button
                onClick={handleSaveEstimate}
                disabled={!formData.propertyName}
                className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90"
                data-testid="button-save-estimate"
              >
                {isEditing ? "Save Changes" : "Save Estimate"}
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
                  <p className="text-lg font-bold text-[#1E3A8A] mt-2">
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
                disabled={(approvalAction === "reject" && !rejectionReason) || isCreatingInvoice}
                className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                variant={approvalAction === "reject" ? "destructive" : "default"}
                data-testid="button-confirm-approval"
              >
                {isCreatingInvoice ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  approvalAction === "approve" ? "Approve" : "Reject"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSendApprovalDialog} onOpenChange={setShowSendApprovalDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#F97316]" />
                Send for Approval
              </DialogTitle>
              <DialogDescription>
                Select a contact to send the approval request email to.
              </DialogDescription>
            </DialogHeader>
            {selectedEstimate && (
              <div className="space-y-4">
                <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <h4 className="font-semibold text-[#1E293B]">{selectedEstimate.title}</h4>
                  <p className="text-sm text-[#64748B]">{selectedEstimate.propertyName}</p>
                  <p className="text-lg font-bold text-[#1E3A8A] mt-2">
                    {formatCurrency(selectedEstimate.totalAmount)}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-[#1E293B]">Send approval request to:</Label>
                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-[#64748B]" />
                      <span className="ml-2 text-sm text-[#64748B]">Loading contacts...</span>
                    </div>
                  ) : propertyContacts.length > 0 ? (
                    <Select value={selectedApprovalEmail} onValueChange={setSelectedApprovalEmail}>
                      <SelectTrigger className="mt-2" data-testid="select-approval-email">
                        <SelectValue placeholder="Select email..." />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyContacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.email}>
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3 text-[#64748B]" />
                              <span>{contact.name}</span>
                              <span className="text-[#94A3B8]">({contact.email})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-2 p-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-lg">
                      <p className="text-sm text-[#D97706]">No contacts found for this property.</p>
                      <Input
                        type="email"
                        placeholder="Enter email manually..."
                        value={selectedApprovalEmail}
                        onChange={(e) => setSelectedApprovalEmail(e.target.value)}
                        className="mt-2"
                        data-testid="input-manual-email"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowSendApprovalDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendApprovalEmail}
                disabled={!selectedApprovalEmail}
                className="bg-[#F97316] hover:bg-[#F97316]/90"
                data-testid="button-send-approval-email"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#1E3A8A]" />
                Create Invoice
              </DialogTitle>
              <DialogDescription>
                Select a billing contact to send the invoice to.
              </DialogDescription>
            </DialogHeader>
            {selectedEstimate && (
              <div className="space-y-4">
                <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <h4 className="font-semibold text-[#1E293B]">{selectedEstimate.title}</h4>
                  <p className="text-sm text-[#64748B]">{selectedEstimate.propertyName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-lg font-bold text-[#1E3A8A]">
                      {formatCurrency(selectedEstimate.totalAmount)}
                    </p>
                    {selectedEstimate.workType && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {selectedEstimate.workType}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {autoSelectedByWorkType && selectedEstimate.workType && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Auto-selected {selectedEstimate.workType} billing contact
                    </p>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium text-[#1E293B]">Send invoice to:</Label>
                  {loadingBillingContacts ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-[#64748B]" />
                      <span className="ml-2 text-sm text-[#64748B]">Loading billing contacts...</span>
                    </div>
                  ) : billingContacts.length > 0 ? (
                    <Select value={selectedInvoiceEmail} onValueChange={(email) => {
                      setSelectedInvoiceEmail(email);
                      setAutoSelectedByWorkType(false);
                    }}>
                      <SelectTrigger className="mt-2" data-testid="select-invoice-email">
                        <SelectValue placeholder="Select billing email..." />
                      </SelectTrigger>
                      <SelectContent>
                        {billingContacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.email}>
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3 text-[#64748B]" />
                              <span>{contact.name}</span>
                              <span className="text-[#94A3B8]">({contact.email})</span>
                              <Badge variant="outline" className="text-xs ml-1 capitalize">
                                {contact.contactType}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-2 p-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-lg">
                      <p className="text-sm text-[#D97706]">No billing contacts found for this property.</p>
                      <Input
                        type="email"
                        placeholder="Enter billing email manually..."
                        value={selectedInvoiceEmail}
                        onChange={(e) => setSelectedInvoiceEmail(e.target.value)}
                        className="mt-2"
                        data-testid="input-manual-invoice-email"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={!selectedInvoiceEmail || isCreatingInvoice}
                className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90"
                data-testid="button-create-invoice"
              >
                {isCreatingInvoice ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4 mr-2" />
                    Create Invoice
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSchedulingModal} onOpenChange={setShowSchedulingModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#1E3A8A]" />
                Schedule Job to Repair Technician
              </DialogTitle>
              <DialogDescription>
                Select a repair technician to assign this job.
              </DialogDescription>
            </DialogHeader>
            {selectedEstimate && (
              <div className="space-y-4">
                <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <h4 className="font-semibold text-[#1E293B]">{selectedEstimate.title}</h4>
                  <p className="text-sm text-[#64748B]">{selectedEstimate.propertyName}</p>
                  <p className="text-lg font-bold text-[#1E3A8A] mt-2">
                    {formatCurrency(selectedEstimate.totalAmount)}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-[#1E293B]">Scheduled Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left mt-2" data-testid="button-schedule-date">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {selectedScheduleDate ? format(selectedScheduleDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedScheduleDate}
                        onSelect={setSelectedScheduleDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-sm font-medium text-[#1E293B]">Select Repair Technician</Label>
                  <ScrollArea className="h-[300px] mt-2 rounded-lg border border-[#E2E8F0]">
                    {repairTechs.length === 0 ? (
                      <div className="flex items-center justify-center h-full py-8">
                        <p className="text-sm text-[#64748B]">No repair technicians available</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-2">
                        {repairTechs.map((tech: any) => (
                          <div
                            key={tech.id}
                            className="p-4 bg-white rounded-lg border border-[#E2E8F0] hover:border-[#1E3A8A] hover:shadow-md cursor-pointer transition-all"
                            onClick={() => handleScheduleToTech(tech)}
                            data-testid={`tech-card-${tech.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#1E3A8A]/10 flex items-center justify-center">
                                  <User className="w-5 h-5 text-[#1E3A8A]" />
                                </div>
                                <div>
                                  <p className="font-medium text-[#1E293B]">{tech.name}</p>
                                  <p className="text-xs text-[#64748B] capitalize">{tech.role?.replace(/_/g, " ")}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className={tech.assignedJobs > 3 ? "border-red-300 text-red-600" : "border-green-300 text-green-600"}>
                                  {tech.assignedJobs || 0} jobs scheduled
                                </Badge>
                              </div>
                            </div>
                            {tech.scheduledEstimates && tech.scheduledEstimates.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                                <p className="text-xs text-[#64748B] mb-2">Upcoming jobs:</p>
                                <div className="space-y-1">
                                  {tech.scheduledEstimates.slice(0, 3).map((e: any) => (
                                    <p key={e.id} className="text-xs text-[#94A3B8]">
                                      • {e.propertyName} - {e.title}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSchedulingModal(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Estimate Details</span>
                {selectedEstimate && (
                  <Badge className={`${statusConfig[selectedEstimate.status]?.color} border ml-4`}>
                    {statusConfig[selectedEstimate.status]?.label}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedEstimate && (
              <div className="space-y-5">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedEstimate.title}</h3>
                      {selectedEstimate.estimateNumber && (
                        <p className="text-sm text-gray-500">#{selectedEstimate.estimateNumber}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Total Amount</p>
                      <p className="text-3xl font-bold text-[#1E3A8A]">{formatCurrency(selectedEstimate.totalAmount)}</p>
                    </div>
                  </div>
                </div>

                {selectedEstimate.description && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Quote Description</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedEstimate.description}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-blue-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-gray-500">Property / Location</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedEstimate.propertyName}</p>
                      {selectedEstimate.address && (
                        <p className="text-xs text-gray-500 mt-0.5">{selectedEstimate.address}</p>
                      )}
                    </div>

                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-purple-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="w-3 h-3 text-purple-500" />
                        <span className="text-xs text-gray-500">Customer / HOA</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedEstimate.customerName || "N/A"}</p>
                      {selectedEstimate.customerEmail && (
                        <p className="text-xs text-gray-500 mt-0.5">{selectedEstimate.customerEmail}</p>
                      )}
                    </div>

                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-amber-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CalendarIcon className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-gray-500">Estimate Date</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedEstimate.estimateDate)}</p>
                      {selectedEstimate.expirationDate && (
                        <p className="text-xs text-gray-500 mt-0.5">Expires: {formatDate(selectedEstimate.expirationDate)}</p>
                      )}
                    </div>

                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-slate-400">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-gray-500">Created</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedEstimate.createdAt)}</p>
                      {selectedEstimate.createdByTechName && (
                        <p className="text-xs text-gray-500 mt-0.5">by {selectedEstimate.createdByTechName}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-orange-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Wrench className="w-3 h-3 text-orange-500" />
                        <span className="text-xs text-gray-500">Repair Tech</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedEstimate.repairTechName || "Not Assigned"}</p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-[#60A5FA]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <UserCircle2 className="w-3 h-3 text-[#60A5FA]" />
                        <span className="text-xs text-gray-500">Service Tech</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedEstimate.serviceTechName || "Not Assigned"}</p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-rose-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                        <span className="text-xs text-gray-500">Reported Date</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedEstimate.reportedDate ? formatDate(selectedEstimate.reportedDate) : "N/A"}
                      </p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-green-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-gray-500">Status</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${statusConfig[selectedEstimate.status]?.color} border text-xs`}>
                          {statusConfig[selectedEstimate.status]?.label}
                        </Badge>
                        {selectedEstimate.woRequired && (
                          <Badge className="bg-[#F97316]/10 text-[#F97316] border-[#F97316] text-xs">
                            WO Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 border-b">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Line Items
                    </h4>
                  </div>
                  {selectedEstimate.items && selectedEstimate.items.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-10 font-semibold">#</TableHead>
                          <TableHead className="font-semibold">Product / Description</TableHead>
                          <TableHead className="font-semibold">SKU</TableHead>
                          <TableHead className="font-semibold text-center w-16">Qty</TableHead>
                          <TableHead className="font-semibold text-right w-24">Rate</TableHead>
                          <TableHead className="font-semibold text-right w-28">Amount</TableHead>
                          <TableHead className="font-semibold text-center w-12">Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEstimate.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-center text-slate-500">{item.lineNumber}</TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{item.productService}</span>
                                {item.description && (
                                  <p className="text-sm text-slate-500">{item.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-500">{item.sku || "-"}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.rate * 100)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                            <TableCell className="text-center">
                              {item.taxable && <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-6 text-center text-slate-500">
                      No line items added
                    </div>
                  )}
                  
                  <div className="bg-slate-50 border-t px-4 py-3">
                    <div className="flex justify-end gap-8">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Subtotal</p>
                        <p className="font-medium">{formatCurrency(selectedEstimate.subtotal)}</p>
                      </div>
                      {(selectedEstimate.discountAmount || 0) > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Discount</p>
                          <p className="font-medium text-red-600">-{formatCurrency(selectedEstimate.discountAmount)}</p>
                        </div>
                      )}
                      {(selectedEstimate.salesTaxAmount || 0) > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Sales Tax ({selectedEstimate.salesTaxRate}%)</p>
                          <p className="font-medium">{formatCurrency(selectedEstimate.salesTaxAmount)}</p>
                        </div>
                      )}
                      <div className="text-right pl-6 border-l border-slate-300">
                        <p className="text-sm text-slate-500">Total Amount</p>
                        <p className="text-2xl font-bold text-[#1E3A8A]">{formatCurrency(selectedEstimate.totalAmount)}</p>
                      </div>
                    </div>
                    {(selectedEstimate.depositAmount || 0) > 0 && (
                      <div className="flex justify-end mt-2 pt-2 border-t border-slate-200">
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Deposit Requested</p>
                          <p className="font-medium text-green-600">{formatCurrency(selectedEstimate.depositAmount)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 border-b">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Photos {selectedEstimate.photos && selectedEstimate.photos.length > 0 && 
                        selectedEstimate.photos.some((p: string) => p && !p.includes('[object Object]')) 
                        ? `(${selectedEstimate.photos.filter((p: string) => p && !p.includes('[object Object]')).length})` 
                        : ''}
                    </h4>
                  </div>
                  <div className="p-4">
                    {selectedEstimate.photos && selectedEstimate.photos.length > 0 && 
                     selectedEstimate.photos.some((p: string) => p && !p.includes('[object Object]')) ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {selectedEstimate.photos
                          .filter((photo: string) => photo && !photo.includes('[object Object]'))
                          .map((photo: string, idx: number) => (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-[#60A5FA] hover:shadow-md transition-all group"
                            onClick={() => {
                              const validPhotos = selectedEstimate.photos?.filter((p: string) => p && !p.includes('[object Object]')) || [];
                              setCurrentPhotoIndex(validPhotos.indexOf(photo));
                              setShowPhotoLightbox(true);
                            }}
                            data-testid={`photo-thumbnail-${idx}`}
                          >
                            <img
                              src={photo}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <Camera className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No photos attached</p>
                        <p className="text-xs text-gray-400 mt-1">Photos sent from the mobile app will appear here</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedEstimate.customerNote && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Note to Customer
                    </p>
                    <p className="text-slate-700 mt-1">{selectedEstimate.customerNote}</p>
                  </div>
                )}

                {selectedEstimate.techNotes && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      Tech Notes
                    </p>
                    <p className="text-slate-600 mt-1">{selectedEstimate.techNotes}</p>
                  </div>
                )}

                {selectedEstimate.rejectionReason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Rejection Reason
                    </p>
                    <p className="text-red-600 mt-1">{selectedEstimate.rejectionReason}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailDialog(false);
                      openEditDialog(selectedEstimate);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(selectedEstimate.id)}
                    data-testid="button-delete-estimate"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {showPhotoLightbox && selectedEstimate?.photos && (
          <Dialog open={showPhotoLightbox} onOpenChange={setShowPhotoLightbox}>
            <DialogContent className="max-w-4xl">
              <div className="relative">
                <img 
                  src={selectedEstimate.photos[currentPhotoIndex]} 
                  alt={`Photo ${currentPhotoIndex + 1}`}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                  {currentPhotoIndex + 1} / {selectedEstimate.photos.length}
                </div>
                {selectedEstimate.photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? selectedEstimate.photos!.length - 1 : prev - 1)}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      onClick={() => setCurrentPhotoIndex(prev => prev === selectedEstimate.photos!.length - 1 ? 0 : prev + 1)}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
