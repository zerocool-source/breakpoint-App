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
  ArrowRight, Mail, Receipt, Camera, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Wrench, UserCircle2, MapPin, Package, Tag, Paperclip, Percent, Hash,
  Users, ClipboardList, MoreVertical, Archive, Wind, Phone, Search, Inbox, Smartphone
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
import { ObjectUploader } from "@/components/ObjectUploader";
import { InvoicePreviewModal } from "@/components/InvoicePreviewModal";
import { ImageIcon, Upload } from "lucide-react";

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
  // Customer approval tracking
  approvalToken: string | null;
  approvalTokenExpiresAt: string | null;
  approvalSentTo: string | null;
  approvalSentAt: string | null;
  customerApproverName: string | null;
  customerApproverTitle: string | null;
  // WO tracking fields
  workType: string | null;
  woReceived: boolean | null;
  woNumber: string | null;
  // Pool WO requirement (joined from pool data)
  woRequired?: boolean;
  // Source tracking
  sourceType: string | null;
  sourceRepairJobId: string | null;
  sourceEmergencyId: string | null;
  serviceRepairCount: number | null;
  // Conversion tracking
  convertedByUserId: string | null;
  convertedByUserName: string | null;
  convertedAt: string | null;
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
  photos: string[];
  workType: string;
  woReceived: boolean;
  woNumber: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-200", icon: FileText },
  pending_approval: { label: "Sent for Approval", color: "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]", icon: Clock },
  approved: { label: "Approved", color: "bg-[#22D69A]1A text-[#22D69A] border-[#22D69A]33", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  needs_scheduling: { label: "Needs Scheduling", color: "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]", icon: CalendarIcon },
  scheduled: { label: "Scheduled", color: "bg-[#DBEAFE] text-[#0078D4] border-[#93C5FD]", icon: CalendarIcon },
  completed: { label: "Completed", color: "bg-[#DBEAFE] text-[#60A5FA] border-[#93C5FD]", icon: CheckCircle2 },
  ready_to_invoice: { label: "Ready to Invoice", color: "bg-[#17BEBB]1A text-[#0D9488] border-[#17BEBB]33", icon: Receipt },
  invoiced: { label: "Invoiced", color: "bg-[#17BEBB]1A text-[#0D9488] border-[#17BEBB]33", icon: Receipt },
  paid: { label: "Paid", color: "bg-green-100 text-green-700 border-green-300", icon: DollarSign },
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
  photos: [],
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
  const [approvalSubject, setApprovalSubject] = useState("");
  const [approvalMessage, setApprovalMessage] = useState("");
  const [propertyContacts, setPropertyContacts] = useState<{id: string; name: string; email: string; type: string}[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoiceEmail, setSelectedInvoiceEmail] = useState("");
  const [billingContacts, setBillingContacts] = useState<{id: string; name: string; email: string; contactType: string}[]>([]);
  const [loadingBillingContacts, setLoadingBillingContacts] = useState(false);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | undefined>(new Date());
  const [autoSelectedByWorkType, setAutoSelectedByWorkType] = useState(false);
  const [approvalStep, setApprovalStep] = useState<"confirm" | "schedule">("confirm");
  const [deadlineValue, setDeadlineValue] = useState<number>(24);
  const [deadlineUnit, setDeadlineUnit] = useState<"hours" | "days">("hours");
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [selectedTechName, setSelectedTechName] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [valueFilter, setValueFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [revenueFlowPeriod, setRevenueFlowPeriod] = useState<"today" | "week" | "month" | "30days">("30days");
  const [selectedSRIds, setSelectedSRIds] = useState<Set<string>>(new Set());
  const [showBatchInvoiceDialog, setShowBatchInvoiceDialog] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"combined" | "separate">("separate");
  const [showVerbalApprovalDialog, setShowVerbalApprovalDialog] = useState(false);
  const [verbalApproverName, setVerbalApproverName] = useState("");
  const [verbalApproverTitle, setVerbalApproverTitle] = useState("");
  const [officeStaffName, setOfficeStaffName] = useState("");
  const [approvedByMethod, setApprovedByMethod] = useState<"email" | "phone" | "other">("phone");
  const [otherMethodDetails, setOtherMethodDetails] = useState("");
  const [fieldInboxExpanded, setFieldInboxExpanded] = useState(true);

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
    enabled: showSchedulingModal || (showApprovalDialog && approvalStep === "schedule"),
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

  // Windy Day Cleanup pending count for metric display
  const { data: windyDayPendingData } = useQuery({
    queryKey: ["windy-day-pending-count"],
    queryFn: async () => {
      const response = await fetch("/api/tech-ops/windy-day-pending-count");
      if (!response.ok) return { count: 0 };
      return response.json();
    },
    refetchInterval: 30000,
  });

  const technicians = techniciansData?.technicians || [];
  const customers = customersData?.customers || [];
  const repairTechs = repairTechsData?.technicians || [];
  const metrics = metricsData;
  const windyDayPending = windyDayPendingData?.count || 0;

  const inferSourceType = (estimate: Estimate): string => {
    if (estimate.sourceType) {
      const st = estimate.sourceType.toLowerCase();
      if (st === "repair_tech" || st === "field") return "repair_tech";
      if (st === "service_tech" || st === "service_repair") return "service_tech";
      if (st === "emergency" || st === "sos") return "emergency";
      if (st === "office_staff" || st === "manual" || st === "office") return "office_staff";
    }
    if (estimate.sourceEmergencyId) return "emergency";
    if (estimate.sourceRepairJobId || (estimate.serviceRepairCount && estimate.serviceRepairCount > 0)) return "service_tech";
    if (estimate.createdByTechId && estimate.createdByTechName) return "repair_tech";
    return "office_staff";
  };

  const getSourceLabel = (estimate: Estimate): string => {
    const sourceType = inferSourceType(estimate);
    switch (sourceType) {
      case "repair_tech": return "Field Estimate";
      case "service_tech": return "SR Estimate";
      case "office_staff": return "Office Estimate";
      case "emergency": return "SOS Estimate";
      default: return "Office Estimate";
    }
  };

  const getSourceBadgeColor = (estimate: Estimate): string => {
    const sourceType = inferSourceType(estimate);
    switch (sourceType) {
      case "repair_tech": return "bg-[#17BEBB33] text-[#0D9488]";
      case "service_tech": return "bg-[#17BEBB33] text-[#0D9488]";
      case "office_staff": return "bg-[#17BEBB33] text-[#0D9488]";
      case "emergency": return "bg-[#EF4444]/20 text-[#EF4444]";
      default: return "bg-[#17BEBB33] text-[#0D9488]";
    }
  };

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
    mutationFn: async ({ id, status, extras, skipDialogClose }: { id: string; status: string; extras?: any; skipDialogClose?: boolean }) => {
      const response = await fetch(`/api/estimates/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extras }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      const data = await response.json();
      return { ...data, skipDialogClose };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      // Don't close dialog if skipDialogClose is true (for two-step approval flow)
      if (!data?.skipDialogClose) {
        toast({ title: "Status Updated", description: "Estimate status has been updated." });
        setShowApprovalDialog(false);
        setShowDetailDialog(false);
      }
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

  const sourceMetrics = useMemo(() => {
    const repairTech = estimates.filter((e: Estimate) => inferSourceType(e) === "repair_tech");
    const serviceTech = estimates.filter((e: Estimate) => inferSourceType(e) === "service_tech");
    const officeStaff = estimates.filter((e: Estimate) => inferSourceType(e) === "office_staff");
    
    return {
      repairTech: {
        count: repairTech.length,
        totalValue: repairTech.reduce((sum: number, e: Estimate) => sum + (e.totalAmount || 0), 0),
      },
      serviceTech: {
        count: serviceTech.length,
        totalValue: serviceTech.reduce((sum: number, e: Estimate) => sum + (e.totalAmount || 0), 0),
      },
      officeStaff: {
        count: officeStaff.length,
        totalValue: officeStaff.reduce((sum: number, e: Estimate) => sum + (e.totalAmount || 0), 0),
      },
    };
  }, [estimates]);

  // Field Estimates Inbox - estimates submitted from mobile app by repair techs/foremen awaiting review
  const fieldInboxEstimates = useMemo(() => {
    return estimates.filter((e: Estimate) => {
      const sourceType = inferSourceType(e);
      // Show estimates from repair techs or foremen (check multiple indicators)
      const isFromField = 
        sourceType === "repair_tech" || 
        e.sourceType === "repair_tech" || 
        e.sourceType === "field" ||
        e.sourceType === "foreman" ||
        e.sourceType === "repair_foreman" ||
        e.repairForemanId ||
        e.createdByTechId; // Any estimate created by a tech in the field
      
      // Include draft and other pre-approval statuses awaiting office review
      const isPendingReview = e.status === "draft" || e.status === "submitted" || e.status === "needs_review";
      
      // Show recent field submissions (last 90 days) to ensure nothing is missed
      const isRecent = e.createdAt && new Date(e.createdAt) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      return isFromField && isPendingReview && isRecent;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [estimates]);

  // Calculate revenue flow values based on selected time period
  const revenueFlowValues = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let cutoffDate: Date;
    switch (revenueFlowPeriod) {
      case "today":
        cutoffDate = startOfDay;
        break;
      case "week":
        cutoffDate = startOfWeek;
        break;
      case "month":
        cutoffDate = startOfMonth;
        break;
      case "30days":
      default:
        cutoffDate = thirtyDaysAgo;
        break;
    }

    const isInPeriod = (dateStr: string | null) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return date >= cutoffDate;
    };

    // Calculate values for each stage based on when they entered that stage
    const approvedValue = estimates
      .filter((e: Estimate) => (e.status === "approved" || e.status === "needs_scheduling") && isInPeriod(e.approvedAt))
      .reduce((sum: number, e: Estimate) => sum + (e.totalAmount || 0), 0);

    const scheduledValue = estimates
      .filter((e: Estimate) => e.status === "scheduled" && isInPeriod(e.scheduledDate))
      .reduce((sum: number, e: Estimate) => sum + (e.totalAmount || 0), 0);

    const readyValue = estimates
      .filter((e: Estimate) => (e.status === "completed" || e.status === "ready_to_invoice") && isInPeriod(e.completedAt))
      .reduce((sum: number, e: Estimate) => sum + (e.totalAmount || 0), 0);

    const invoicedValue = estimates
      .filter((e: Estimate) => e.status === "invoiced" && isInPeriod(e.invoicedAt))
      .reduce((sum: number, e: Estimate) => sum + (e.totalAmount || 0), 0);

    const paidValue = estimates
      .filter((e: Estimate) => e.status === "paid" && isInPeriod(e.invoicedAt))
      .reduce((sum: number, e: Estimate) => sum + (e.totalAmount || 0), 0);

    return { approvedValue, scheduledValue, readyValue, invoicedValue, paidValue };
  }, [estimates, revenueFlowPeriod]);

  // Get unique customer names for filter dropdown - combine customers from API and estimates
  const uniqueCustomers = useMemo(() => {
    const customerSet = new Set<string>();
    // Add customers from the customers API
    customers.forEach((c: any) => {
      if (c.name) customerSet.add(c.name);
    });
    // Also add any customer names from estimates that might not be in the customers list
    estimates.forEach((e: Estimate) => {
      if (e.customerName) customerSet.add(e.customerName);
    });
    return Array.from(customerSet).sort();
  }, [estimates, customers]);

  // Filter out archived estimates from "all" tab, show archived only in archived tab
  // Group related statuses together in tabs
  const filteredEstimates = useMemo(() => {
    let result = activeTab === "all" 
      ? estimates.filter((e: Estimate) => e.status !== "archived")
      : activeTab === "archived"
      ? estimates.filter((e: Estimate) => e.status === "archived")
      : activeTab === "approved"
      ? estimates.filter((e: Estimate) => e.status === "approved" || e.status === "needs_scheduling")
      : activeTab === "completed"
      ? estimates.filter((e: Estimate) => e.status === "completed" || e.status === "ready_to_invoice")
      : estimates.filter((e: Estimate) => e.status === activeTab);

    // Apply customer filter
    if (customerFilter !== "all") {
      result = result.filter((e: Estimate) => e.customerName === customerFilter);
    }

    // Apply source filter (use inferSourceType for intelligent detection)
    if (sourceFilter !== "all") {
      result = result.filter((e: Estimate) => inferSourceType(e) === sourceFilter);
    }

    // Apply date range filter
    if (dateFrom) {
      result = result.filter((e: Estimate) => {
        const estimateDate = e.estimateDate ? new Date(e.estimateDate) : e.createdAt ? new Date(e.createdAt) : null;
        return estimateDate && estimateDate >= dateFrom;
      });
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter((e: Estimate) => {
        const estimateDate = e.estimateDate ? new Date(e.estimateDate) : e.createdAt ? new Date(e.createdAt) : null;
        return estimateDate && estimateDate <= endDate;
      });
    }

    // Apply value filter ($500 threshold = 50000 cents)
    if (valueFilter === "under500") {
      result = result.filter((e: Estimate) => (e.totalAmount || 0) < 50000);
    } else if (valueFilter === "500plus") {
      result = result.filter((e: Estimate) => (e.totalAmount || 0) >= 50000);
    }

    // Apply search filter (estimate number, service repair ID, property name, title)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((e: Estimate) => {
        const estimateNumber = (e.estimateNumber || "").toLowerCase();
        const sourceRepairId = (e.sourceRepairJobId || "").toLowerCase();
        const propertyName = (e.propertyName || "").toLowerCase();
        const title = (e.title || "").toLowerCase();
        return estimateNumber.includes(query) || 
               sourceRepairId.includes(query) || 
               propertyName.includes(query) ||
               title.includes(query);
      });
    }

    return result;
  }, [estimates, activeTab, customerFilter, sourceFilter, dateFrom, dateTo, valueFilter, searchQuery]);

  const statusCounts = {
    all: estimates.filter(e => e.status !== "archived").length,
    draft: estimates.filter(e => e.status === "draft").length,
    pending_approval: estimates.filter(e => e.status === "pending_approval").length,
    approved: estimates.filter(e => e.status === "approved" || e.status === "needs_scheduling").length,
    rejected: estimates.filter(e => e.status === "rejected").length,
    scheduled: estimates.filter(e => e.status === "scheduled").length,
    completed: estimates.filter(e => e.status === "completed" || e.status === "ready_to_invoice").length,
    invoiced: estimates.filter(e => e.status === "invoiced").length,
    paid: estimates.filter(e => e.status === "paid").length,
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
      photos: estimate.photos || [],
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
    const estimateData: Record<string, any> = {
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
      // Preserve existing sourceType when editing
      updateMutation.mutate({ id: selectedEstimate.id, data: estimateData });
    } else {
      // Only set office_staff for new estimates created via the UI
      estimateData.sourceType = "office_staff";
      createMutation.mutate(estimateData);
    }
  };

  const openSendApprovalDialog = async (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setSelectedApprovalEmail("");
    setApprovalSubject(`Estimate Approval Request: ${estimate.title || 'Pool Service Estimate'} - ${estimate.propertyName}`);
    setApprovalMessage("");
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

  const handleSendApprovalEmail = async () => {
    if (!selectedEstimate || !selectedApprovalEmail) return;
    
    try {
      // Call the API to send the approval email via Microsoft Graph
      const response = await fetch(`/api/estimates/${selectedEstimate.id}/send-for-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: selectedApprovalEmail,
          subject: approvalSubject,
          customMessage: approvalMessage,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send for approval");
      }
      
      const { message } = await response.json();
      
      // Refresh estimates list
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates/metrics"] });
      
      setShowSendApprovalDialog(false);
      toast({ 
        title: "Email Sent", 
        description: message || `Approval email sent successfully to ${selectedApprovalEmail}` 
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send approval email", 
        variant: "destructive" 
      });
    }
  };

  const handleSendForApproval = (estimate: Estimate) => {
    openSendApprovalDialog(estimate);
  };

  const openVerbalApprovalDialog = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setVerbalApproverName("");
    setVerbalApproverTitle("");
    setOfficeStaffName("");
    setApprovedByMethod("phone");
    setOtherMethodDetails("");
    setShowVerbalApprovalDialog(true);
  };


  const handleVerbalApproval = async () => {
    if (!selectedEstimate || !verbalApproverName.trim() || !officeStaffName.trim()) return;
    
    try {
      const response = await fetch(`/api/estimates/${selectedEstimate.id}/verbal-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          approverName: verbalApproverName.trim(),
          approverTitle: verbalApproverTitle.trim() || null,
          officeStaffName: officeStaffName.trim(),
          approvedByMethod,
          otherMethodDetails: approvedByMethod === "other" ? otherMethodDetails.trim() : null,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record verbal approval");
      }
      
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates/metrics"] });
      
      setShowVerbalApprovalDialog(false);
      setVerbalApproverName("");
      setVerbalApproverTitle("");
      setOfficeStaffName("");
      setApprovedByMethod("phone");
      setOtherMethodDetails("");
      toast({ 
        title: "Verbal Approval Recorded", 
        description: `Estimate approved by ${verbalApproverName}. Ready for scheduling.` 
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to record verbal approval", 
        variant: "destructive" 
      });
    }
  };

  const handleVerbalDecline = async () => {
    if (!selectedEstimate || !verbalApproverName.trim() || !officeStaffName.trim()) return;
    
    try {
      const response = await fetch(`/api/estimates/${selectedEstimate.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rejectionReason: `Verbally declined by ${verbalApproverName.trim()}${verbalApproverTitle.trim() ? ` (${verbalApproverTitle.trim()})` : ""} - Recorded by: ${officeStaffName.trim()} via ${approvedByMethod}`,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to record verbal decline");
      }
      
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates/metrics"] });
      
      setShowVerbalApprovalDialog(false);
      setVerbalApproverName("");
      setVerbalApproverTitle("");
      setOfficeStaffName("");
      setApprovedByMethod("phone");
      setOtherMethodDetails("");
      toast({ 
        title: "Verbal Decline Recorded", 
        description: `Estimate declined by ${verbalApproverName}.` 
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to record verbal decline", 
        variant: "destructive" 
      });
    }
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
            memo: `EST#${selectedEstimate.estimateNumber} - ${selectedEstimate.title}`,
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
          skipDialogClose: true,
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
                title: "Approved", 
                description: `Estimate approved. QuickBooks Invoice #${invoiceData.invoiceNumber} created.` 
              });
            } else {
              toast({ 
                title: "Approved", 
                description: `Estimate approved successfully.`,
              });
            }
            // Move to schedule step instead of closing
            setApprovalStep("schedule");
          }
        });
      } catch (error) {
        console.error("Error creating invoice:", error);
        updateStatusMutation.mutate({
          id: selectedEstimate.id,
          status: "approved",
          skipDialogClose: true,
          extras: {
            approvedByManagerId: "manager-1",
            approvedByManagerName: "HOA Manager",
            managerNotes,
          },
        }, {
          onSuccess: () => {
            toast({ 
              title: "Approved", 
              description: `Estimate approved successfully.`,
            });
            setApprovalStep("schedule");
          }
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

  const handleScheduleFromApproval = async () => {
    if (!selectedEstimate || !selectedTechId) return;
    
    // Calculate deadline
    const deadlineAt = new Date();
    if (deadlineUnit === "hours") {
      deadlineAt.setHours(deadlineAt.getHours() + deadlineValue);
    } else {
      deadlineAt.setDate(deadlineAt.getDate() + deadlineValue);
    }
    
    try {
      const response = await fetch(`/api/estimates/${selectedEstimate.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairTechId: selectedTechId,
          repairTechName: selectedTechName,
          scheduledDate: selectedScheduleDate?.toISOString(),
          deadlineAt: deadlineAt.toISOString(),
          deadlineUnit,
          deadlineValue,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to schedule");
      
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      queryClient.invalidateQueries({ queryKey: ["service-repairs"] });
      
      toast({
        title: "Job Scheduled",
        description: `Assigned to ${selectedTechName}. Deadline: ${deadlineValue} ${deadlineUnit}.`,
      });
      setShowApprovalDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule job.",
        variant: "destructive",
      });
    }
  };

  const handleScheduleLater = async () => {
    if (!selectedEstimate) return;
    
    try {
      const response = await fetch(`/api/estimates/${selectedEstimate.id}/needs-scheduling`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) throw new Error("Failed to update");
      
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      
      toast({
        title: "Added to Queue",
        description: "Estimate added to scheduling queue.",
      });
      setShowApprovalDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update estimate.",
        variant: "destructive",
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
  
  const handleCreateInvoice = async (invoiceData: {
    email?: string;
    sendEmail: boolean;
    ccEmails?: string[];
    bccEmails?: string[];
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date;
    terms: string;
    customerNote: string;
    memoOnStatement: string;
    internalNotes: string;
    selectedPhotos: string[];
  }) => {
    console.log("==============================================");
    console.log("INVOICE BUTTON CLICKED - handleCreateInvoice started");
    console.log("==============================================");
    console.log("Invoice Data received:", invoiceData);
    console.log("=== SELECTED PHOTOS DEBUG ===");
    console.log("selectedPhotos from invoiceData:", invoiceData.selectedPhotos);
    console.log("selectedPhotos type:", typeof invoiceData.selectedPhotos);
    console.log("selectedPhotos is array:", Array.isArray(invoiceData.selectedPhotos));
    console.log("selectedPhotos length:", invoiceData.selectedPhotos?.length || 0);
    if (invoiceData.selectedPhotos && invoiceData.selectedPhotos.length > 0) {
      console.log("Photos to upload:");
      invoiceData.selectedPhotos.forEach((url: string, idx: number) => {
        console.log(`  ${idx + 1}. ${url}`);
      });
    } else {
      console.log("WARNING: No photos selected for upload!");
    }
    console.log("=== END SELECTED PHOTOS DEBUG ===");
    
    if (!selectedEstimate) {
      console.error("ERROR: No estimate selected, aborting");
      return;
    }
    
    console.log("Selected Estimate:", selectedEstimate);
    console.log("Estimate ID:", selectedEstimate.id);
    console.log("Property Name:", selectedEstimate.propertyName);
    console.log("Line Items:", selectedEstimate.items);
    console.log("Estimate Photos:", selectedEstimate.photos);
    console.log("Estimate Attachments:", selectedEstimate.attachments);
    
    setIsCreatingInvoice(true);
    console.log("Step 1: Setting isCreatingInvoice to true");
    
    try {
      console.log("Step 2: Preparing invoice payload...");
      
      const payload = {
        customerName: selectedEstimate.propertyName,
        customerEmail: invoiceData.email,
        sendEmail: invoiceData.sendEmail,
        ccEmails: invoiceData.ccEmails,
        bccEmails: invoiceData.bccEmails,
        lineItems: selectedEstimate.items || [],
        memo: `EST#${selectedEstimate.estimateNumber} - ${selectedEstimate.title}`,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate.toISOString(),
        dueDate: invoiceData.dueDate.toISOString(),
        terms: invoiceData.terms,
        customerNote: invoiceData.customerNote,
        memoOnStatement: invoiceData.memoOnStatement,
        internalNotes: invoiceData.internalNotes,
        selectedPhotos: invoiceData.selectedPhotos || [],
        estimateId: selectedEstimate.id,
        estimateNumber: selectedEstimate.estimateNumber,
        propertyId: selectedEstimate.propertyId,
        propertyName: selectedEstimate.propertyName,
        serviceTechId: selectedEstimate.serviceTechId,
        serviceTechName: selectedEstimate.serviceTechName,
        repairTechId: selectedEstimate.repairTechId,
        repairTechName: selectedEstimate.repairTechName,
        sentByUserId: "office-user-1",
        sentByUserName: "Office Staff",
      };
      
      console.log("Step 3: Invoice payload prepared:", JSON.stringify(payload, null, 2));
      console.log("Step 4: Calling QuickBooks API at /api/quickbooks/invoice...");
      
      const invoiceResponse = await fetch("/api/quickbooks/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      console.log("Step 5: API Response received");
      console.log("Response Status:", invoiceResponse.status);
      console.log("Response OK:", invoiceResponse.ok);

      let qbInvoiceData = null;
      let invoiceError = null;
      let isQbNotConnected = false;
      
      console.log("Step 6: Processing API response...");
      
      if (invoiceResponse.ok) {
        console.log("Step 6a: Response OK, parsing JSON...");
        qbInvoiceData = await invoiceResponse.json();
        console.log("=== SUCCESS: QuickBooks Invoice Created ===");
        console.log("Response Data:", qbInvoiceData);
        console.log("QuickBooks Invoice ID:", qbInvoiceData.invoiceId);
        console.log("QuickBooks DocNumber:", qbInvoiceData.invoiceNumber);
        console.log("Local Invoice ID:", qbInvoiceData.localInvoiceId);
      } else {
        console.log("Step 6b: Response NOT OK, handling error...");
        const errorData = await invoiceResponse.json().catch(() => ({}));
        invoiceError = errorData.error || errorData.message || "Failed to create QuickBooks invoice";
        isQbNotConnected = errorData.code === "QB_NOT_CONNECTED" || invoiceResponse.status === 401;
        
        console.error("=== QuickBooks Invoice Creation FAILED ===");
        console.error("Status:", invoiceResponse.status);
        console.error("Error:", invoiceError);
        console.error("Full Error Data:", errorData);
        if (errorData.realmId) {
          console.error("Realm ID Used:", errorData.realmId);
          console.error("Is Sandbox:", errorData.isSandbox);
        }
        if (errorData.details) {
          console.error("QuickBooks Error Details:", errorData.details);
        }
        
        // If QB is not connected, show a specific error and don't proceed
        if (isQbNotConnected) {
          toast({
            title: "QuickBooks Not Connected",
            description: "Please connect to QuickBooks in Settings before sending invoices. Your authorization may have expired.",
            variant: "destructive",
          });
          setShowInvoiceDialog(false);
          setIsCreatingInvoice(false);
          return;
        }
        
        // Show the specific error from QuickBooks
        toast({
          title: "QuickBooks Error",
          description: invoiceError,
          variant: "destructive",
        });
        setShowInvoiceDialog(false);
        setIsCreatingInvoice(false);
        return;
      }

      console.log("Step 7: Updating estimate status to 'invoiced'...");
      updateStatusMutation.mutate({
        id: selectedEstimate.id,
        status: "invoiced",
        extras: {
          invoiceId: qbInvoiceData?.localInvoiceId || qbInvoiceData?.invoiceId || invoiceData.invoiceNumber,
          qbInvoiceNumber: qbInvoiceData?.invoiceNumber || null,
          invoicedEmail: invoiceData.email,
        },
      }, {
        onSuccess: () => {
          // Invalidate invoices query so the new invoice appears in the Invoices page
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          
          if (qbInvoiceData?.invoiceId) {
            // Use the message from the API which includes email status
            const successMessage = qbInvoiceData.message || 
              `Invoice Created! QB Invoice ID: ${qbInvoiceData.invoiceId}`;
            
            toast({ 
              title: qbInvoiceData.emailSent ? "Invoice Created & Emailed!" : "Invoice Created in QuickBooks!", 
              description: successMessage,
              duration: 10000, // Show for 10 seconds
            });
            console.log("=== Invoice Successfully Synced to QuickBooks ===");
            console.log("QuickBooks Invoice ID:", qbInvoiceData.invoiceId);
            console.log("QuickBooks DocNumber:", qbInvoiceData.invoiceNumber);
            console.log("Total Amount:", qbInvoiceData.totalAmount);
            console.log("Local Invoice Number:", qbInvoiceData.localInvoiceNumber);
          } else if (invoiceError) {
            toast({ 
              title: "Invoiced (QB Failed)", 
              description: `Status updated to invoiced, but QuickBooks failed: ${invoiceError}`,
              variant: "destructive"
            });
          } else {
            toast({ 
              title: "Invoice Created Successfully", 
              description: `Invoice ${invoiceData.invoiceNumber} sent to ${invoiceData.email}.` 
            });
          }
        }
      });
      
      setShowInvoiceDialog(false);
      console.log("Step 8: Invoice dialog closed, process complete");
    } catch (error: any) {
      console.error("==============================================");
      console.error("INVOICE CREATION ERROR - Caught in catch block");
      console.error("==============================================");
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      toast({
        title: "Invoice Error",
        description: `An error occurred: ${error?.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      console.log("Step FINAL: Cleanup - setting isCreatingInvoice to false");
      setIsCreatingInvoice(false);
    }
  };

  const openApprovalDialog = async (estimate: Estimate, action: "approve" | "reject") => {
    setSelectedEstimate(estimate);
    setApprovalAction(action);
    setRejectionReason("");
    setManagerNotes("");
    setDeadlineValue(24);
    setDeadlineUnit("hours");
    setSelectedTechId("");
    setSelectedTechName("");
    setSelectedScheduleDate(new Date());
    
    if (action === "approve") {
      // Skip confirmation step - go directly to schedule and auto-approve
      setApprovalStep("schedule");
      setShowApprovalDialog(true);
      
      // Auto-approve the estimate in the background
      try {
        await fetch(`/api/estimates/${estimate.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
        queryClient.invalidateQueries({ queryKey: ["estimates"] });
        toast({ title: "Approved", description: "Estimate approved. Now schedule the job." });
      } catch (error) {
        console.error("Error approving estimate:", error);
      }
    } else {
      // For reject, still show confirm step
      setApprovalStep("confirm");
      setShowApprovalDialog(true);
    }
  };

  const formatCurrency = (amount: number | null) => {
    return `$${((amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  // Selection helpers - for all estimates under $500 when that filter is active
  const isUnder500Selectable = (estimate: Estimate) => {
    return (estimate.totalAmount || 0) < 50000; // $500 in cents
  };

  const selectableUnder500Estimates = useMemo(() => {
    return filteredEstimates.filter(isUnder500Selectable);
  }, [filteredEstimates]);
  
  // Check if Under $500 filter is active
  const isUnder500FilterActive = valueFilter === "under500";

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedSRIds(new Set());
  }, [valueFilter]);

  const toggleUnder500Selection = (id: string) => {
    setSelectedSRIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllUnder500 = () => {
    const allIds = selectableUnder500Estimates.map(e => e.id);
    setSelectedSRIds(new Set(allIds));
  };

  const deselectAllUnder500 = () => {
    setSelectedSRIds(new Set());
  };

  const getSelectedUnder500Estimates = () => {
    return filteredEstimates.filter(e => selectedSRIds.has(e.id));
  };

  const getItemCountLabel = (estimate: Estimate) => {
    const count = estimate.items?.length || 0;
    if (inferSourceType(estimate) === "service_tech") {
      return `${count}-SR`;
    }
    return `${count} items`;
  };

  const getEstimateTitle = (estimate: Estimate) => {
    if (inferSourceType(estimate) === "service_tech") {
      return estimate.title.startsWith("SR.") ? estimate.title : `SR. ${estimate.title}`;
    }
    return estimate.title;
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

  const statusCardColors: Record<string, string> = {
    draft: "border-b-slate-400",
    pending_approval: "border-b-[#FF6A00]",
    approved: "border-b-[#2CA01C]",
    rejected: "border-b-red-500",
    scheduled: "border-b-[#0077C5]",
    completed: "border-b-[#0077C5]",
    invoiced: "border-b-#17BEBB",
    archived: "border-b-gray-400",
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 bg-[#F3F4F6] min-h-screen">
        {/* QuickBooks-style Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#1E293B]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Estimates</h1>
            <Button
              onClick={openCreateDialog}
              className="bg-[#0077C5] hover:bg-[#005fa3] text-white"
              data-testid="button-create-estimate"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Estimate
            </Button>
          </div>
        </div>

        {/* Field Estimates Inbox - Estimates from repair techs in the field */}
        <div className="bg-gradient-to-r from-[#0077C5]/5 to-[#14b8a6]/5 rounded-lg shadow-sm border border-[#0077C5]/20" data-testid="field-estimates-inbox">
          <div 
            className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-[#0077C5]/5 transition-colors rounded-t-lg"
            onClick={() => setFieldInboxExpanded(!fieldInboxExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#0077C5] shadow-sm">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B] flex items-center gap-2">
                  Field Estimates Inbox
                  {fieldInboxEstimates.length > 0 ? (
                    <Badge className="bg-[#f97316] text-white border-0 text-xs px-2 py-0.5">
                      {fieldInboxEstimates.length} new
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-400 text-white border-0 text-xs px-2 py-0.5">
                      0 pending
                    </Badge>
                  )}
                </h2>
                <p className="text-sm text-[#6B7280]">Estimates submitted by repair technicians & foremen from mobile app</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-[#6B7280]">
              {fieldInboxExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>
          
          {fieldInboxExpanded && (
            <div className="px-6 pb-4">
              {fieldInboxEstimates.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
                  <div className="p-3 rounded-full bg-slate-100 w-fit mx-auto mb-3">
                    <Inbox className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-[#6B7280] font-medium">No field estimates pending review</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Estimates from repair technicians in the field will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fieldInboxEstimates.slice(0, 5).map((estimate) => (
                    <div 
                      key={estimate.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer hover:border-[#0077C5]/40"
                      onClick={() => {
                        setSelectedEstimate(estimate);
                        setShowDetailDialog(true);
                      }}
                      data-testid={`field-inbox-estimate-${estimate.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-[#14b8a6]/10 mt-0.5">
                            <Wrench className="w-4 h-4 text-[#14b8a6]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-[#1E293B]">{estimate.propertyName}</h3>
                              {estimate.estimateNumber && (
                                <span className="text-xs text-[#6B7280] bg-slate-100 px-2 py-0.5 rounded">
                                  #{estimate.estimateNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#1E293B] mt-0.5">{estimate.title}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-[#6B7280]">
                              {estimate.createdByTechName && (
                                <span className="flex items-center gap-1">
                                  <UserCircle2 className="w-3.5 h-3.5" />
                                  {estimate.createdByTechName}
                                </span>
                              )}
                              {estimate.repairForemanName && (
                                <span className="flex items-center gap-1 text-[#0077C5]">
                                  <Users className="w-3.5 h-3.5" />
                                  Foreman: {estimate.repairForemanName}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {format(new Date(estimate.createdAt), "MMM d, h:mm a")}
                              </span>
                            </div>
                            {estimate.techNotes && (
                              <p className="text-xs text-[#6B7280] mt-2 bg-slate-50 px-3 py-2 rounded-lg border-l-2 border-[#14b8a6]">
                                <span className="font-medium">Tech Notes:</span> {estimate.techNotes.substring(0, 100)}{estimate.techNotes.length > 100 ? "..." : ""}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <span className="text-lg font-bold text-[#1E293B]">
                            ${((estimate.totalAmount || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          {estimate.photos && estimate.photos.length > 0 && (
                            <span className="text-xs text-[#6B7280] flex items-center gap-1">
                              <Camera className="w-3.5 h-3.5" />
                              {estimate.photos.length} photo{estimate.photos.length > 1 ? "s" : ""}
                            </span>
                          )}
                          <Button 
                            size="sm" 
                            className="bg-[#0077C5] hover:bg-[#005fa3] text-white text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEstimate(estimate);
                              setShowDetailDialog(true);
                            }}
                            data-testid={`review-field-estimate-${estimate.id}`}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {fieldInboxEstimates.length > 5 && (
                    <div className="text-center pt-2">
                      <Button 
                        variant="link" 
                        className="text-[#0077C5]"
                        onClick={() => {
                          setSourceFilter("repair_tech");
                          setActiveTab("draft");
                        }}
                        data-testid="view-all-field-estimates"
                      >
                        View all {fieldInboxEstimates.length} field estimates
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Light Theme Workflow Metrics */}
        {metrics && (
          <div className="space-y-6">
            {/* Pipeline Status Row */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                <div className="relative z-10 flex items-center justify-between">
                  {[
                    { key: "draft", label: "Draft", count: statusCounts.draft, bgColor: "bg-slate-100", textColor: "text-slate-600", activeBg: "bg-slate-200" },
                    { key: "pending_approval", label: "Pending", count: statusCounts.pending_approval, bgColor: "bg-[#f97316]", textColor: "text-white", highlight: true },
                    { key: "approved", label: "Approved", count: statusCounts.approved, bgColor: "bg-slate-100", textColor: "text-slate-600", activeBg: "bg-slate-200" },
                    { key: "rejected", label: "Rejected", count: statusCounts.rejected, bgColor: "bg-slate-100", textColor: "text-slate-400", activeBg: "bg-slate-200" },
                    { key: "scheduled", label: "Scheduled", count: statusCounts.scheduled, bgColor: statusCounts.scheduled > 0 ? "bg-[#0077b6]" : "border-2 border-[#0077b6] bg-white", textColor: statusCounts.scheduled > 0 ? "text-white" : "text-[#0077b6]" },
                    { key: "completed", label: "Completed", count: statusCounts.completed, bgColor: "bg-[#14b8a6]", textColor: "text-white", highlight: statusCounts.completed > 0 },
                    { key: "invoiced", label: "Invoiced", count: statusCounts.invoiced, bgColor: statusCounts.invoiced > 0 ? "bg-[#0077b6]" : "bg-slate-100", textColor: statusCounts.invoiced > 0 ? "text-white" : "text-slate-600" },
                    { key: "paid", label: "Paid", count: statusCounts.paid, bgColor: "bg-[#22c55e]", textColor: "text-white", highlight: statusCounts.paid > 0 },
                    { key: "archived", label: "Archived", count: statusCounts.archived, bgColor: "bg-slate-100", textColor: "text-slate-400" },
                  ].map((stage) => (
                    <div key={stage.key} className="flex flex-col items-center">
                      <div 
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${stage.bgColor} ${stage.textColor} transition-all cursor-pointer hover:scale-105 hover:shadow-md`}
                        onClick={() => setActiveTab(stage.key)}
                      >
                        {stage.count}
                      </div>
                      <span className="text-xs text-slate-500 mt-2">{stage.label}</span>
                      {stage.highlight && stage.count > 0 && (
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${stage.bgColor}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4">
              {/* Approval Rate Gauge */}
              <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center justify-center">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle 
                      cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="8"
                      strokeDasharray={`${(metrics.conversionRate / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#22c55e]">{metrics.conversionRate}%</span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mt-3 font-medium">Approval Rate</p>
                <p className="text-xs text-slate-400">Target: 75%</p>
              </div>

              {/* Revenue Flow */}
              <div className="bg-white rounded-2xl shadow-sm p-5 col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-slate-700">Revenue Flow</h4>
                  <div className="flex gap-1">
                    {[
                      { key: "today", label: "Today" },
                      { key: "week", label: "This Week" },
                      { key: "month", label: "This Month" },
                      { key: "30days", label: "Last 30 Days" },
                    ].map((period) => (
                      <button
                        key={period.key}
                        onClick={() => setRevenueFlowPeriod(period.key as typeof revenueFlowPeriod)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                          revenueFlowPeriod === period.key
                            ? "bg-[#0077b6] text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative flex items-center justify-between">
                  <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-slate-200 -translate-y-1/2" />
                  {[
                    { label: "Approved", value: revenueFlowValues.approvedValue, color: "#f97316" },
                    { label: "Scheduled", value: revenueFlowValues.scheduledValue, color: "#0077b6" },
                    { label: "Ready", value: revenueFlowValues.readyValue, color: "#14b8a6" },
                    { label: "Invoiced", value: revenueFlowValues.invoicedValue, color: "#0077b6" },
                    { label: "Paid", value: revenueFlowValues.paidValue, color: "#22c55e" },
                  ].map((item, idx) => (
                    <div key={idx} className="relative z-10 flex flex-col items-center">
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                        style={{ backgroundColor: item.color }}
                      >
                        ${Math.round((item.value || 0) / 1000)}k
                      </div>
                      <span className="text-xs text-slate-500 mt-2">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Metrics */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h4 className="text-sm font-medium text-slate-700 mb-4">Time Metrics</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-500">Avg Approval</span>
                      <span className="text-[#f97316] font-semibold">{metrics.avgApprovalTime}h</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#f97316] rounded-full" style={{ width: `${Math.min((metrics.avgApprovalTime || 0) / 48 * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-500">Avg Completion</span>
                      <span className="text-slate-400 font-semibold">{metrics.avgCompletionTime}h</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: `${Math.min((metrics.avgCompletionTime || 0) / 48 * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 gap-4">
              {/* By Source - Donut Chart */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h4 className="text-sm font-medium text-slate-700 mb-4">By Source</h4>
                <div className="flex items-center gap-6">
                  {/* Donut Chart */}
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                      {(() => {
                        const total = sourceMetrics.repairTech.count + sourceMetrics.serviceTech.count + sourceMetrics.officeStaff.count;
                        const repairPct = total > 0 ? (sourceMetrics.repairTech.count / total) * 100 : 0;
                        const servicePct = total > 0 ? (sourceMetrics.serviceTech.count / total) * 100 : 0;
                        const officePct = total > 0 ? (sourceMetrics.officeStaff.count / total) * 100 : 0;
                        const circumference = 251.2;
                        return (
                          <>
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#0077b6" strokeWidth="12" strokeDasharray={`${(repairPct / 100) * circumference} ${circumference}`} strokeDashoffset="0" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#14b8a6" strokeWidth="12" strokeDasharray={`${(servicePct / 100) * circumference} ${circumference}`} strokeDashoffset={`${-(repairPct / 100) * circumference}`} />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#6b7280" strokeWidth="12" strokeDasharray={`${(officePct / 100) * circumference} ${circumference}`} strokeDashoffset={`${-((repairPct + servicePct) / 100) * circumference}`} />
                          </>
                        );
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-xl font-bold text-slate-700">{sourceMetrics.repairTech.count + sourceMetrics.serviceTech.count + sourceMetrics.officeStaff.count}</span>
                        <p className="text-xs text-slate-400">total</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex-1 space-y-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                      onClick={() => setSourceFilter("repair_tech")}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#0077b6]" />
                        <span className="text-sm text-slate-700">Repair Technician</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-slate-700">{sourceMetrics.repairTech.count}</span>
                        <span className="text-xs text-slate-400 ml-2">${(sourceMetrics.repairTech.totalValue / 100 / 1000).toFixed(1)}k</span>
                      </div>
                    </div>
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                      onClick={() => setSourceFilter("service_tech")}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#14b8a6]" />
                        <span className="text-sm text-slate-700">Service Technician</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-slate-700">{sourceMetrics.serviceTech.count}</span>
                        <span className="text-xs text-slate-400 ml-2">${(sourceMetrics.serviceTech.totalValue / 100 / 1000).toFixed(1)}k</span>
                      </div>
                    </div>
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                      onClick={() => setSourceFilter("office_staff")}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#6b7280]" />
                        <span className="text-sm text-slate-700">Office Entry</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-slate-700">{sourceMetrics.officeStaff.count}</span>
                        <span className="text-xs text-slate-400 ml-2">${(sourceMetrics.officeStaff.totalValue / 100 / 1000).toFixed(1)}k</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QuickBooks-style Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* QuickBooks-style Filter Bar */}
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-4 flex-wrap" data-testid="estimate-filters">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search estimate # or SR #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[220px] border-gray-300 text-sm"
                  data-testid="input-search-estimates"
                />
              </div>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-[180px] border-gray-300 bg-white text-sm" data-testid="filter-customer">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {uniqueCustomers.map((customer) => (
                    <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[160px] border-gray-300 bg-white text-sm" data-testid="filter-source">
                  <SelectValue placeholder="Estimate Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="repair_tech">Repair Technician</SelectItem>
                  <SelectItem value="service_tech">Service Technician</SelectItem>
                  <SelectItem value="office_staff">Office Entry</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[130px] justify-start text-left font-normal border-gray-300 text-sm" data-testid="filter-date-from">
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#6B7280]" />
                    {dateFrom ? format(dateFrom, "MMM d") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[130px] justify-start text-left font-normal border-gray-300 text-sm" data-testid="filter-date-to">
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#6B7280]" />
                    {dateTo ? format(dateTo, "MMM d") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>

              {(customerFilter !== "all" || sourceFilter !== "all" || dateFrom || dateTo || valueFilter !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomerFilter("all");
                    setSourceFilter("all");
                    setDateFrom(undefined);
                    setDateTo(undefined);
                    setValueFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-[#6B7280] hover:text-[#1E293B] text-sm"
                  data-testid="button-clear-filters"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* QuickBooks-style Tabs with Value Filter */}
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-transparent h-auto p-0 gap-1">
                <TabsTrigger value="all" className="data-[state=active]:bg-[#0077C5] data-[state=active]:text-white rounded-full px-3 py-1.5 text-sm" data-testid="tab-all">All ({statusCounts.all})</TabsTrigger>
                <TabsTrigger value="draft" className="data-[state=active]:bg-[#0077C5] data-[state=active]:text-white rounded-full px-3 py-1.5 text-sm" data-testid="tab-draft">Drafts ({statusCounts.draft})</TabsTrigger>
                <TabsTrigger value="pending_approval" className="data-[state=active]:bg-[#FF6A00] data-[state=active]:text-white rounded-full px-3 py-1.5 text-sm" data-testid="tab-pending">Pending ({statusCounts.pending_approval})</TabsTrigger>
                <TabsTrigger value="approved" className="data-[state=active]:bg-[#2CA01C] data-[state=active]:text-white rounded-full px-3 py-1.5 text-sm" data-testid="tab-approved">Approved ({statusCounts.approved})</TabsTrigger>
                <TabsTrigger value="scheduled" className="data-[state=active]:bg-[#0077C5] data-[state=active]:text-white rounded-full px-3 py-1.5 text-sm" data-testid="tab-scheduled">Scheduled ({statusCounts.scheduled})</TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-[#0077C5] data-[state=active]:text-white rounded-full px-3 py-1.5 text-sm" data-testid="tab-completed">Completed ({statusCounts.completed})</TabsTrigger>
                <TabsTrigger value="archived" className="data-[state=active]:bg-gray-500 data-[state=active]:text-white rounded-full px-3 py-1.5 text-sm" data-testid="tab-archived">Archived ({statusCounts.archived})</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Value Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#f9fafb] rounded-lg p-1 border border-gray-200" role="group" aria-label="Filter by estimate value">
              <button
                onClick={() => setValueFilter("all")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${valueFilter === "all" ? "bg-white shadow-sm text-[#1E293B] font-medium border border-gray-200" : "text-[#6B7280] hover:text-[#1E293B] hover:bg-white/50"}`}
                data-testid="filter-value-all"
                aria-pressed={valueFilter === "all"}
              >
                All Values
              </button>
              <button
                onClick={() => setValueFilter("under500")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${valueFilter === "under500" ? "bg-white shadow-sm text-[#1E293B] font-medium border border-gray-200" : "text-[#6B7280] hover:text-[#1E293B] hover:bg-white/50"}`}
                data-testid="filter-value-under500"
                aria-pressed={valueFilter === "under500"}
              >
                Under $500
              </button>
              <button
                onClick={() => setValueFilter("500plus")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${valueFilter === "500plus" ? "bg-white shadow-sm text-[#1E293B] font-medium border border-gray-200" : "text-[#6B7280] hover:text-[#1E293B] hover:bg-white/50"}`}
                data-testid="filter-value-500plus"
                aria-pressed={valueFilter === "500plus"}
              >
                $500 & Above
              </button>
            </div>
          </div>

          {/* Bulk Invoice Selection Header - shows when Under $500 filter is active */}
          {isUnder500FilterActive && selectableUnder500Estimates.length > 0 && (
            <div className="px-5 py-3 bg-[#0078D4]1A border-b border-[#0078D4]33 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedSRIds.size > 0 && selectedSRIds.size === selectableUnder500Estimates.length}
                    onCheckedChange={(checked) => {
                      if (checked) selectAllUnder500();
                      else deselectAllUnder500();
                    }}
                    className="border-blue-400 data-[state=checked]:bg-[#0078D4] data-[state=checked]:border-[#0078D4]"
                    data-testid="checkbox-select-all-under500"
                  />
                  <span className="text-sm text-[#0078D4] font-medium">
                    {selectedSRIds.size === 0 
                      ? `Select all (${selectableUnder500Estimates.length} estimates)`
                      : `${selectedSRIds.size} selected`}
                  </span>
                </div>
                {selectedSRIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllUnder500}
                    className="text-[#0078D4] hover:text-blue-800 hover:bg-[#0078D4]1A"
                    data-testid="button-deselect-all"
                  >
                    Clear selection
                  </Button>
                )}
              </div>
              <Button
                onClick={() => setShowBatchInvoiceDialog(true)}
                disabled={selectedSRIds.size === 0}
                className={`${selectedSRIds.size === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#0077C5] hover:bg-[#005fa3] text-white"}`}
                data-testid="button-invoice-selected"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Invoice Selected {selectedSRIds.size > 0 ? `(${selectedSRIds.size})` : ""}
              </Button>
            </div>
          )}

          {/* QuickBooks-style List Content */}
          <div className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#0077C5]" />
              </div>
            ) : filteredEstimates.length === 0 ? (
              <div className="text-center py-12 text-[#6B7280]">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No estimates found</p>
                {activeTab === "all" && (
                  <Button onClick={openCreateDialog} variant="link" className="mt-2 text-[#0077C5]">
                    Create your first estimate
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-gray-100">
                  {filteredEstimates.map((estimate) => {
                    const config = statusConfig[estimate.status] || statusConfig.draft;
                    const isSelectable = isUnder500FilterActive && isUnder500Selectable(estimate);
                    const isSelected = selectedSRIds.has(estimate.id);
                    return (
                      <div
                        key={estimate.id}
                        className={`flex items-center justify-between px-5 py-4 bg-white hover:bg-[#f9fafb] hover:shadow-md transition-all cursor-pointer border-l-4 ${isSelected ? "border-l-#0078D4 bg-[#0078D4]1A/30" : "border-l-transparent"} hover:border-l-[#0077C5]`}
                        onClick={() => {
                          setSelectedEstimate(estimate);
                          setShowDetailDialog(true);
                        }}
                        data-testid={`estimate-row-${estimate.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {/* Checkbox for bulk invoice selection when Under $500 filter is active */}
                          {isSelectable && (
                            <div 
                              onClick={(e) => e.stopPropagation()} 
                              className="flex items-center"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleUnder500Selection(estimate.id)}
                                className="border-blue-400 data-[state=checked]:bg-[#0078D4] data-[state=checked]:border-[#0078D4]"
                                data-testid={`checkbox-under500-${estimate.id}`}
                              />
                            </div>
                          )}
                          <div className="p-2.5 rounded-lg bg-[#f0f9ff] border border-[#e0f2fe]">
                            <FileText className="w-5 h-5 text-[#0077C5]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[17px] font-bold text-[#1E293B]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                              {estimate.propertyName}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <span className="text-[14px] font-medium text-[#1E293B]">{getEstimateTitle(estimate)}</span>
                              {estimate.estimateNumber && (
                                <span className="text-[13px] text-[#6B7280]">EST#{estimate.estimateNumber}</span>
                              )}
                              {estimate.items && estimate.items.length > 0 && inferSourceType(estimate) === "service_tech" && (
                                <span className="text-[13px] text-[#6B7280]">- {estimate.items.length} items</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-[13px] text-[#6B7280] mt-1">
                              <span className="flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                {formatDate(estimate.estimateDate || estimate.createdAt)}
                              </span>
                              {estimate.photos && estimate.photos.length > 0 && 
                               estimate.photos.some((p: string) => p && !p.includes('[object Object]')) && (
                                <span className="flex items-center gap-1 text-[#2CA01C]" title="Has photos attached">
                                  <Camera className="w-3.5 h-3.5" />
                                  {estimate.photos.filter((p: string) => p && !p.includes('[object Object]')).length}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-3 flex-wrap">
                              <button 
                                className={`${getSourceBadgeColor(estimate)} text-[12px] font-semibold px-4 py-1.5 rounded-md shadow-sm border-0 cursor-default`}
                                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                              >
                                {getSourceLabel(estimate)}
                              </button>
                              {estimate.tags?.includes("urgent") && (
                                <Badge className="bg-red-100 text-red-700 border-red-200 text-[12px] font-semibold px-3 py-1" data-testid={`badge-urgent-${estimate.id}`}>
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Urgent
                                </Badge>
                              )}
                              {estimate.convertedByUserName ? (
                                <span className="text-[13px] font-medium text-[#374151] bg-[#FF8000]1A px-2.5 py-1 rounded-md border border-[#FF8000]33" data-testid={`text-converted-by-${estimate.id}`}>
                                  Converted by: <span className="font-semibold text-[#D35400]">{estimate.convertedByUserName}</span>
                                </span>
                              ) : (estimate.createdByTechName || estimate.officeMemberName) ? (
                                <span className="text-[13px] font-medium text-[#374151] bg-gray-100 px-2.5 py-1 rounded-md" data-testid={`text-created-by-${estimate.id}`}>
                                  Created by: <span className="font-semibold text-[#1E293B]">{estimate.createdByTechName || estimate.officeMemberName}</span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-right mr-4">
                            <p className="text-[18px] font-bold text-[#1E293B]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{formatCurrency(estimate.totalAmount)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-[#6B7280] hover:text-[#1E293B] hover:border-gray-400"
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  className="bg-[#FF6A00] hover:bg-[#e55f00] text-white"
                                  data-testid={`button-send-approval-${estimate.id}`}
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  Send for Approval
                                  <ChevronDown className="w-3 h-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => handleSendForApproval(estimate)}>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Send Email for Approval
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openVerbalApprovalDialog(estimate)}>
                                  <Phone className="w-4 h-4 mr-2" />
                                  Log Verbal Approval
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {estimate.status === "pending_approval" && (
                            <>
                              <Badge className="bg-[#FF8000]1A text-[#D35400] border-[#FF8000]33 rounded-full">
                                <Clock className="w-3 h-3 mr-1" />
                                Sent for Approval
                              </Badge>
                              {estimate.approvalSentTo && (
                                <div className="flex items-center gap-1 text-xs text-[#D35400] bg-[#FF8000]1A px-2 py-1 rounded-full">
                                  <Mail className="w-3 h-3" />
                                  <span>Sent to {estimate.approvalSentTo}</span>
                                </div>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[#D35400] border-[#FF8000] hover:bg-[#FF8000]1A"
                                    data-testid={`button-resend-approval-${estimate.id}`}
                                  >
                                    <Send className="w-3 h-3 mr-1" />
                                    Resend
                                    <ChevronDown className="w-3 h-3 ml-1" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={() => handleSendForApproval(estimate)}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Resend Approval Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openVerbalApprovalDialog(estimate)}>
                                    <Phone className="w-4 h-4 mr-2" />
                                    Log Verbal Approval
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                          {estimate.status === "approved" && (
                            <>
                              <Badge className="bg-[#ECFDF5] text-[#2CA01C] border-[#A7F3D0] rounded-full">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                              {estimate.customerApproverName && (
                                <div className="flex items-center gap-1 text-xs text-[#16A679] bg-[#22D69A]1A px-2 py-1 rounded-full">
                                  <User className="w-3 h-3" />
                                  <span>
                                    {estimate.customerApproverName}
                                    {estimate.customerApproverTitle && ` (${estimate.customerApproverTitle})`}
                                  </span>
                                  {estimate.approvedAt && (
                                    <span className="text-[#16A679]">
                                      • {new Date(estimate.approvedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              )}
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNeedsScheduling(estimate);
                                }}
                                className="bg-[#FF6A00] hover:bg-[#e55f00] text-white"
                                data-testid={`button-needs-scheduling-${estimate.id}`}
                              >
                                <CalendarIcon className="w-3 h-3 mr-1" />
                                Needs Scheduling
                              </Button>
                            </>
                          )}
                          {estimate.status === "needs_scheduling" && (
                            <>
                              <Badge className="bg-[#FEF3C7] text-[#D97706] border-[#FCD34D] rounded-full">
                                <CalendarIcon className="w-3 h-3 mr-1" />
                                Needs Scheduling
                              </Badge>
                              {estimate.customerApproverName && (
                                <div className="flex items-center gap-1 text-xs text-[#16A679] bg-[#22D69A]1A px-2 py-1 rounded-full">
                                  <User className="w-3 h-3" />
                                  <span>
                                    {estimate.customerApproverName}
                                    {estimate.customerApproverTitle && ` (${estimate.customerApproverTitle})`}
                                  </span>
                                  {estimate.approvedAt && (
                                    <span className="text-[#16A679]">
                                      • {new Date(estimate.approvedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              )}
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSchedulingModal(estimate);
                                }}
                                className="bg-[#0077C5] hover:bg-[#005fa3] text-white"
                                data-testid={`button-schedule-${estimate.id}`}
                              >
                                <CalendarIcon className="w-3 h-3 mr-1" />
                                Schedule
                              </Button>
                            </>
                          )}
                          {estimate.status === "rejected" && (
                            <>
                              <Badge className="bg-red-50 text-red-700 border-red-200 rounded-full">
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </Badge>
                              {estimate.rejectionReason && (
                                <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded max-w-[200px] truncate" title={estimate.rejectionReason}>
                                  <span>Reason: {estimate.rejectionReason}</span>
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(estimate);
                                }}
                                className="text-slate-600 border-slate-300 hover:bg-slate-50"
                                data-testid={`button-revise-${estimate.id}`}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Revise & Resend
                              </Button>
                            </>
                          )}
                          {estimate.status === "scheduled" && (
                            <>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="outline" size="sm" className="bg-[#f0f9ff] text-[#0077C5] border-[#e0f2fe] hover:bg-[#e0f2fe]">
                                    <Wrench className="w-3 h-3 mr-1" />
                                    In Progress
                                    <ChevronDown className="w-3 h-3 ml-1" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSchedulingModal(estimate);
                                    }}
                                  >
                                    <Users className="w-4 h-4 mr-2" />
                                    Reassign to Another Tech
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatusMutation.mutate({ 
                                        id: estimate.id, 
                                        status: "needs_scheduling",
                                        extras: { repairTechId: null, repairTechName: null, scheduledDate: null }
                                      });
                                    }}
                                  >
                                    <CalendarIcon className="w-4 h-4 mr-2" />
                                    Move to Needs Scheduling
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              {estimate.repairTechName && (
                                <span className="text-xs text-slate-500">
                                  Tech: {estimate.repairTechName}
                                </span>
                              )}
                              {estimate.scheduledDate && (
                                <span className="text-xs text-slate-400">
                                  {format(new Date(estimate.scheduledDate), "MMM d")}
                                </span>
                              )}
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
                                className="bg-[#17BEBB] hover:bg-[#17BEBB]"
                                data-testid={`button-ready-invoice-${estimate.id}`}
                              >
                                <Receipt className="w-3 h-3 mr-1" />
                                Ready to Invoice
                              </Button>
                            </>
                          )}
                          {estimate.status === "ready_to_invoice" && (
                            <>
                              <Badge className="bg-[#17BEBB]1A text-[#0D9488] border-[#17BEBB]33">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Ready to Invoice
                              </Badge>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInvoice(estimate);
                                }}
                                className="bg-[#17BEBB] hover:bg-[#17BEBB]"
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
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentTags = estimate.tags || [];
                                  const hasUrgent = currentTags.includes("urgent");
                                  const newTags = hasUrgent 
                                    ? currentTags.filter(t => t !== "urgent")
                                    : [...currentTags, "urgent"];
                                  updateMutation.mutate({ id: estimate.id, data: { tags: newTags } });
                                }}
                                data-testid={`menu-urgent-${estimate.id}`}
                              >
                                <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                                {estimate.tags?.includes("urgent") ? "Remove Urgent Tag" : "Mark as Urgent"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
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
          </div>
        </div>

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
                  <p className="text-3xl font-bold text-[#0078D4]">{formatCurrency(calculateTotals.totalAmount)}</p>
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

                    <div className="p-4 bg-[#FF8000]1A rounded-lg border border-[#FF8000]33">
                      <div className="flex items-center gap-2 mb-3">
                        <ClipboardList className="w-4 h-4 text-[#D35400]" />
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
                            className="bg-[#0078D4] hover:bg-[#0078D4]/90"
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
                          <Camera className="w-3 h-3" />
                          Supporting Photos (optional)
                        </Label>
                        <p className="text-xs text-slate-400 mt-0.5 mb-2">
                          Upload photos of equipment, damage, before/after shots - these will be included in approval emails and PDFs
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <ObjectUploader
                            maxNumberOfFiles={10}
                            maxFileSize={10485760}
                            onGetUploadParameters={async (file) => {
                              const res = await fetch("/api/uploads/request-url", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  name: file.name,
                                  size: file.size,
                                  contentType: file.type,
                                }),
                              });
                              const { uploadURL, objectPath } = await res.json();
                              // Store objectPath in file meta for later retrieval
                              (file as any).meta.objectPath = objectPath;
                              return {
                                method: "PUT" as const,
                                url: uploadURL,
                                headers: { "Content-Type": file.type },
                              };
                            }}
                            onComplete={async (result) => {
                              const uploadedFiles = result.successful || [];
                              const newPhotoUrls: string[] = [];
                              for (const file of uploadedFiles) {
                                const objectPath = (file as any).meta?.objectPath;
                                if (objectPath) {
                                  // Confirm upload and set ACL to public
                                  try {
                                    await fetch("/api/uploads/confirm", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ objectPath }),
                                    });
                                    newPhotoUrls.push(objectPath);
                                  } catch (error) {
                                    console.error("Failed to confirm upload:", error);
                                  }
                                }
                              }
                              if (newPhotoUrls.length > 0) {
                                setFormData(prev => ({ 
                                  ...prev, 
                                  photos: [...prev.photos, ...newPhotoUrls] 
                                }));
                              }
                            }}
                            buttonClassName="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            Upload Photos
                          </ObjectUploader>
                          <span className="text-xs text-slate-400">Max 10 MB per photo</span>
                        </div>
                        {formData.photos.length > 0 && (
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            {formData.photos.map((photo, idx) => (
                              <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                                <img 
                                  src={photo} 
                                  alt={`Photo ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    photos: prev.photos.filter((_, i) => i !== idx)
                                  }))}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`button-remove-photo-${idx}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
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
                          <span className="text-[#0078D4]">{formatCurrency(calculateTotals.totalAmount)}</span>
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
                className="bg-[#0078D4] hover:bg-[#0078D4]/90"
                data-testid="button-save-estimate"
              >
                {isEditing ? "Save Changes" : "Save Estimate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent className={approvalStep === "schedule" ? "max-w-2xl" : ""}>
            <DialogHeader>
              <DialogTitle>
                {approvalAction === "reject" 
                  ? "Reject Estimate" 
                  : approvalStep === "confirm" 
                    ? "Approve Estimate" 
                    : "Schedule Job"}
              </DialogTitle>
              <DialogDescription>
                {approvalAction === "reject"
                  ? "Please provide a reason for rejecting this estimate."
                  : approvalStep === "confirm"
                    ? "Approving this estimate will allow it to be scheduled as a job."
                    : "Assign to a repair technician or add to the scheduling queue."}
              </DialogDescription>
            </DialogHeader>
            {selectedEstimate && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold">{selectedEstimate.title}</h4>
                  <p className="text-sm text-slate-600">{selectedEstimate.propertyName}</p>
                  <p className="text-lg font-bold text-[#0078D4] mt-2">
                    {formatCurrency(selectedEstimate.totalAmount)}
                  </p>
                </div>
                
                {approvalAction === "reject" ? (
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
                ) : approvalStep === "confirm" ? (
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Scheduled Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left mt-1" data-testid="button-schedule-date-approval">
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
                        <Label className="text-sm font-medium">Deadline Timer</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            value={deadlineValue}
                            onChange={(e) => setDeadlineValue(parseInt(e.target.value) || 24)}
                            min={1}
                            className="w-20"
                            data-testid="input-deadline-value"
                          />
                          <Select value={deadlineUnit} onValueChange={(v: "hours" | "days") => setDeadlineUnit(v)}>
                            <SelectTrigger className="flex-1" data-testid="select-deadline-unit">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Job expires and returns to queue if not completed
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Select Repair Technician</Label>
                      <ScrollArea className="h-[200px] mt-2 rounded-lg border border-[#E2E8F0]">
                        {repairTechs.length === 0 ? (
                          <div className="flex items-center justify-center h-full py-8">
                            <p className="text-sm text-[#64748B]">No repair technicians available</p>
                          </div>
                        ) : (
                          <div className="p-2 space-y-2">
                            {repairTechs.map((tech: any) => (
                              <div
                                key={tech.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedTechId === tech.id 
                                    ? "border-[#0078D4] bg-[#0078D4]/5 ring-2 ring-[#0078D4]" 
                                    : "border-[#E2E8F0] hover:border-[#0078D4] hover:shadow-sm"
                                }`}
                                onClick={() => {
                                  setSelectedTechId(tech.id);
                                  setSelectedTechName(tech.name);
                                }}
                                data-testid={`tech-select-${tech.id}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#0078D4]/10 flex items-center justify-center">
                                      <User className="w-4 h-4 text-[#0078D4]" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-[#1E293B] text-sm">{tech.name}</p>
                                      <p className="text-xs text-[#64748B]">{tech.assignedJobs || 0} jobs assigned</p>
                                    </div>
                                  </div>
                                  {selectedTechId === tech.id && (
                                    <CheckCircle2 className="w-5 h-5 text-[#0078D4]" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Cancel</Button>
              {approvalAction === "reject" ? (
                <Button
                  onClick={handleApproval}
                  disabled={!rejectionReason}
                  variant="destructive"
                  data-testid="button-confirm-rejection"
                >
                  Reject
                </Button>
              ) : approvalStep === "confirm" ? (
                <Button
                  onClick={handleApproval}
                  disabled={isCreatingInvoice}
                  className="bg-[#22D69A] hover:bg-[#22D69A]"
                  data-testid="button-confirm-approval"
                >
                  {isCreatingInvoice ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleScheduleLater}
                    data-testid="button-schedule-later"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Later
                  </Button>
                  <Button
                    onClick={handleScheduleFromApproval}
                    disabled={!selectedTechId}
                    className="bg-[#0078D4] hover:bg-[#0078D4]/90"
                    data-testid="button-schedule-now"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSendApprovalDialog} onOpenChange={setShowSendApprovalDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#D35400]" />
                Send for Approval
              </DialogTitle>
              <DialogDescription>
                Customize and send the approval request email.
              </DialogDescription>
            </DialogHeader>
            {selectedEstimate && (
              <div className="space-y-4">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-[#1E293B]">{selectedEstimate.title}</h4>
                      <p className="text-sm text-[#64748B]">{selectedEstimate.propertyName}</p>
                    </div>
                    <p className="text-lg font-bold text-[#0078D4]">
                      {formatCurrency(selectedEstimate.totalAmount)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-[#1E293B]">Recipient</Label>
                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-[#64748B]" />
                      <span className="ml-2 text-sm text-[#64748B]">Loading contacts...</span>
                    </div>
                  ) : propertyContacts.length > 0 ? (
                    <Select value={selectedApprovalEmail} onValueChange={setSelectedApprovalEmail}>
                      <SelectTrigger className="mt-1" data-testid="select-approval-email">
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
                    <div className="mt-1">
                      <Input
                        type="email"
                        placeholder="Enter email address..."
                        value={selectedApprovalEmail}
                        onChange={(e) => setSelectedApprovalEmail(e.target.value)}
                        data-testid="input-manual-email"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-[#1E293B]">Subject Line</Label>
                  <Input
                    value={approvalSubject}
                    onChange={(e) => setApprovalSubject(e.target.value)}
                    placeholder="Email subject..."
                    className="mt-1"
                    data-testid="input-approval-subject"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-[#1E293B]">
                    Personal Message <span className="text-[#94A3B8] font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    value={approvalMessage}
                    onChange={(e) => setApprovalMessage(e.target.value)}
                    placeholder="Add a personal note to the customer... (e.g., 'Please review at your earliest convenience' or 'This covers the repairs we discussed on Monday')"
                    className="mt-1 min-h-[80px]"
                    data-testid="textarea-approval-message"
                  />
                  <p className="text-xs text-[#94A3B8] mt-1">
                    This message will appear at the top of the email before the estimate details.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowSendApprovalDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendApprovalEmail}
                disabled={!selectedApprovalEmail || !approvalSubject.trim()}
                className="bg-[#FF8000] hover:bg-[#FF8000]/90"
                data-testid="button-send-approval-email"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Verbal Approval Dialog */}
        <Dialog open={showVerbalApprovalDialog} onOpenChange={setShowVerbalApprovalDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#2CA01C]" />
                Log Verbal Approval
              </DialogTitle>
              <DialogDescription>
                For special situations when approval was received verbally (phone, in-person, etc.)
              </DialogDescription>
            </DialogHeader>
            {selectedEstimate && (
              <div className="space-y-4">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-[#1E293B]">{selectedEstimate.title}</h4>
                      <p className="text-sm text-[#64748B]">{selectedEstimate.propertyName}</p>
                    </div>
                    <p className="text-lg font-bold text-[#0078D4]">
                      {formatCurrency(selectedEstimate.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#FF8000]1A border border-[#FF8000]33 rounded-lg">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    This bypasses email approval. Use only for confirmed verbal approvals.
                  </p>
                </div>
                
                {/* Property Section */}
                <div className="space-y-3">
                  <span className="inline-block px-3 py-1 bg-[#FF8000] text-white text-sm font-medium rounded-md">
                    Property
                  </span>
                  
                  <div>
                    <Label className="text-sm font-medium text-[#1E293B]">
                      Name of Approver at Property <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={verbalApproverName}
                      onChange={(e) => setVerbalApproverName(e.target.value)}
                      placeholder="Who verbally approved this estimate?"
                      className="mt-1"
                      data-testid="input-verbal-approver-name"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-[#64748B]">
                      Title <span className="font-normal">(optional)</span>
                    </Label>
                    <Input
                      value={verbalApproverTitle}
                      onChange={(e) => setVerbalApproverTitle(e.target.value)}
                      placeholder="e.g., Property Manager, HOA President"
                      className="mt-1"
                      data-testid="input-verbal-approver-title"
                    />
                  </div>
                </div>
                
                {/* Office Staff Section */}
                <div className="space-y-3">
                  <span className="inline-block px-3 py-1 bg-[#FF8000] text-white text-sm font-medium rounded-md">
                    Office Staff
                  </span>
                  
                  <div>
                    <Label className="text-sm font-medium text-[#1E293B]">
                      Recipient (of the approval) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={officeStaffName}
                      onChange={(e) => setOfficeStaffName(e.target.value)}
                      placeholder="Name"
                      className="mt-1"
                      data-testid="input-office-staff-name"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#1E293B]">
                      Approved by: <span className="text-red-500">*</span>
                    </Label>
                    <Select value={approvedByMethod} onValueChange={(val: "email" | "phone" | "other") => setApprovedByMethod(val)}>
                      <SelectTrigger className="mt-1" data-testid="select-approved-by-method">
                        <SelectValue placeholder="Select one of the following" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {approvedByMethod === "other" && (
                    <div>
                      <Label className="text-sm text-[#64748B]">
                        Please specify
                      </Label>
                      <Input
                        value={otherMethodDetails}
                        onChange={(e) => setOtherMethodDetails(e.target.value.slice(0, 100))}
                        placeholder="Describe how approval was received"
                        className="mt-1"
                        maxLength={100}
                        data-testid="input-other-method-details"
                      />
                      <p className="text-xs text-[#94A3B8] mt-1 text-right">
                        {otherMethodDetails.length}/100
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowVerbalApprovalDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleVerbalDecline}
                disabled={!verbalApproverName.trim() || !officeStaffName.trim()}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                data-testid="button-confirm-verbal-decline"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={handleVerbalApproval}
                disabled={!verbalApproverName.trim() || !officeStaffName.trim()}
                className="bg-[#2CA01C] hover:bg-[#249017]"
                data-testid="button-confirm-verbal-approval"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <InvoicePreviewModal
          open={showInvoiceDialog}
          onClose={() => setShowInvoiceDialog(false)}
          estimate={selectedEstimate}
          billingContacts={billingContacts}
          loadingBillingContacts={loadingBillingContacts}
          onCreateInvoice={handleCreateInvoice}
          isCreating={isCreatingInvoice}
        />

        <Dialog open={showSchedulingModal} onOpenChange={setShowSchedulingModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#0078D4]" />
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
                  <p className="text-lg font-bold text-[#0078D4] mt-2">
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
                            className="p-4 bg-white rounded-lg border border-[#E2E8F0] hover:border-[#0078D4] hover:shadow-md cursor-pointer transition-all"
                            onClick={() => handleScheduleToTech(tech)}
                            data-testid={`tech-card-${tech.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#0078D4]/10 flex items-center justify-center">
                                  <User className="w-5 h-5 text-[#0078D4]" />
                                </div>
                                <div>
                                  <p className="font-medium text-[#1E293B]">{tech.name}</p>
                                  <p className="text-xs text-[#64748B] capitalize">{tech.role?.replace(/_/g, " ")}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className={tech.assignedJobs > 3 ? "border-red-300 text-red-600" : "border-green-300 text-[#22D69A]"}>
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
                        <p className="text-sm text-gray-500">EST#{selectedEstimate.estimateNumber}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Total Amount</p>
                      <p className="text-3xl font-bold text-[#0078D4]">{formatCurrency(selectedEstimate.totalAmount)}</p>
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
                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-#0078D4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 className="w-3 h-3 text-[#0078D4]" />
                        <span className="text-xs text-gray-500">Property / Location</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedEstimate.propertyName}</p>
                      {selectedEstimate.address && (
                        <p className="text-xs text-gray-500 mt-0.5">{selectedEstimate.address}</p>
                      )}
                    </div>

                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-#17BEBB">
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="w-3 h-3 text-[#0D9488]" />
                        <span className="text-xs text-gray-500">Customer / HOA</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedEstimate.customerName || "N/A"}</p>
                      {selectedEstimate.customerEmail && (
                        <p className="text-xs text-gray-500 mt-0.5">{selectedEstimate.customerEmail}</p>
                      )}
                    </div>

                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-#FF8000">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CalendarIcon className="w-3 h-3 text-[#D35400]" />
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
                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-#FF8000">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Wrench className="w-3 h-3 text-[#D35400]" />
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

                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-[#EF4444]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-3 h-3 text-[#EF4444]" />
                        <span className="text-xs text-gray-500">Reported Date</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedEstimate.reportedDate ? formatDate(selectedEstimate.reportedDate) : "N/A"}
                      </p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-md p-3 border-l-2 border-l-#22D69A">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3 h-3 text-[#22D69A]" />
                        <span className="text-xs text-gray-500">Status</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${statusConfig[selectedEstimate.status]?.color} border text-xs`}>
                          {statusConfig[selectedEstimate.status]?.label}
                        </Badge>
                        {selectedEstimate.woRequired && (
                          <Badge className="bg-[#FF8000]/10 text-[#D35400] border-[#FF8000] text-xs">
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
                              {item.taxable && <CheckCircle2 className="w-4 h-4 text-[#22D69A] mx-auto" />}
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
                        <p className="text-2xl font-bold text-[#0078D4]">{formatCurrency(selectedEstimate.totalAmount)}</p>
                      </div>
                    </div>
                    {(selectedEstimate.depositAmount || 0) > 0 && (
                      <div className="flex justify-end mt-2 pt-2 border-t border-slate-200">
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Deposit Requested</p>
                          <p className="font-medium text-[#22D69A]">{formatCurrency(selectedEstimate.depositAmount)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Response Details Section - shows when estimate is approved or rejected */}
                {(selectedEstimate.status === "approved" || selectedEstimate.status === "needs_scheduling" || selectedEstimate.status === "scheduled" || selectedEstimate.status === "completed" || selectedEstimate.status === "rejected") && (
                  <div className={`border rounded-lg overflow-hidden ${selectedEstimate.status === "rejected" ? "border-red-200" : "border-[#22D69A]33"}`}>
                    <div className={`px-4 py-3 border-b ${selectedEstimate.status === "rejected" ? "bg-red-50" : "bg-[#22D69A]1A"}`}>
                      <h4 className={`font-semibold flex items-center gap-2 ${selectedEstimate.status === "rejected" ? "text-red-800" : "text-green-800"}`}>
                        {selectedEstimate.status === "rejected" ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Customer Response
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Response</p>
                          <p className={`font-semibold ${selectedEstimate.status === "rejected" ? "text-red-600" : "text-[#22D69A]"}`}>
                            {selectedEstimate.status === "rejected" ? "Declined" : "Approved"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Responded By</p>
                          <p className="font-medium text-slate-900">
                            {selectedEstimate.customerApproverName || "Unknown"}
                            {selectedEstimate.customerApproverTitle && (
                              <span className="text-slate-500 font-normal"> ({selectedEstimate.customerApproverTitle})</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Response Date</p>
                          <p className="font-medium text-slate-900">
                            {selectedEstimate.status === "rejected" && selectedEstimate.rejectedAt
                              ? formatDate(selectedEstimate.rejectedAt)
                              : selectedEstimate.approvedAt
                              ? formatDate(selectedEstimate.approvedAt)
                              : selectedEstimate.acceptedDate
                              ? formatDate(selectedEstimate.acceptedDate)
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Sent To</p>
                          <p className="font-medium text-slate-900">{selectedEstimate.approvalSentTo || "N/A"}</p>
                        </div>
                      </div>
                      {selectedEstimate.status === "rejected" && selectedEstimate.rejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md">
                          <p className="text-xs text-red-600 uppercase tracking-wide mb-1">Reason for Declining</p>
                          <p className="text-sm text-red-800">{selectedEstimate.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                  <div className="p-4 bg-[#0078D4]1A rounded-lg border border-[#0078D4]33">
                    <p className="text-sm font-semibold text-[#0078D4] flex items-center gap-2">
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

        {/* Batch Invoice Dialog for Under $500 Estimates */}
        <Dialog open={showBatchInvoiceDialog} onOpenChange={setShowBatchInvoiceDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#0077C5]">
                <Receipt className="w-5 h-5" />
                Invoice Selected Estimates
              </DialogTitle>
              <DialogDescription>
                Create invoices for the selected estimates under $500
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Invoice Type Selection */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">How would you like to invoice?</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-[#0077C5] transition-colors">
                    <input 
                      type="radio" 
                      name="invoiceType" 
                      value="combined"
                      checked={invoiceType === "combined"}
                      onChange={() => setInvoiceType("combined")}
                      className="w-4 h-4 text-[#0077C5] focus:ring-[#0077C5]"
                      data-testid="radio-combined-invoice"
                    />
                    <div>
                      <p className="font-medium text-gray-800">One Combined Invoice</p>
                      <p className="text-xs text-gray-500">Batch all selected estimates into a single invoice</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-[#0077C5] transition-colors">
                    <input 
                      type="radio" 
                      name="invoiceType" 
                      value="separate"
                      checked={invoiceType === "separate"}
                      onChange={() => setInvoiceType("separate")}
                      className="w-4 h-4 text-[#0077C5] focus:ring-[#0077C5]"
                      data-testid="radio-separate-invoices"
                    />
                    <div>
                      <p className="font-medium text-gray-800">Separate Invoices</p>
                      <p className="text-xs text-gray-500">Create individual invoices for each estimate</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-[#0078D4]1A border border-[#0078D4]33 rounded-lg p-4">
                <p className="text-sm font-medium text-[#0077C5] mb-2">Selected Estimates ({selectedSRIds.size})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getSelectedUnder500Estimates().map((est) => (
                    <div key={est.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-[#0078D4]1A">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{getEstimateTitle(est)}</p>
                        <p className="text-xs text-gray-500">{est.propertyName}</p>
                      </div>
                      <span className="font-semibold text-[#0077C5]">{formatCurrency(est.totalAmount)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#0078D4]33 flex justify-between">
                  <span className="text-sm font-medium text-[#0077C5]">Total</span>
                  <span className="text-lg font-bold text-[#0077C5]">
                    {formatCurrency(getSelectedUnder500Estimates().reduce((sum, e) => sum + (e.totalAmount || 0), 0))}
                  </span>
                </div>
              </div>

              <div className="bg-[#FF8000]1A border border-[#FF8000]33 rounded-lg p-3">
                <p className="text-sm text-[#D35400] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  This will mark all selected estimates as invoiced
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBatchInvoiceDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#0077C5] hover:bg-[#005fa3]"
                onClick={async () => {
                  try {
                    const selectedIds = Array.from(selectedSRIds);
                    const invoiceMode = invoiceType;
                    for (const id of selectedIds) {
                      await fetch(`/api/estimates/${id}/status`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          status: "invoiced",
                          invoiceMode: invoiceMode
                        }),
                      });
                    }
                    queryClient.invalidateQueries({ queryKey: ["estimates"] });
                    toast({
                      title: "Marked as Invoiced",
                      description: invoiceMode === "combined" 
                        ? `${selectedIds.length} estimates marked for combined invoice`
                        : `${selectedIds.length} estimates marked as separately invoiced`,
                    });
                    setSelectedSRIds(new Set());
                    setShowBatchInvoiceDialog(false);
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to update estimates",
                      variant: "destructive",
                    });
                  }
                }}
                data-testid="button-confirm-batch-invoice"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Mark as Invoiced ({selectedSRIds.size})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
