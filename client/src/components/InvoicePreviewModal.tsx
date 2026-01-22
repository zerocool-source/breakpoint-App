import React, { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Receipt,
  Building2,
  MapPin,
  User,
  Calendar as CalendarIcon,
  Mail,
  Phone,
  Loader2,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  FileText,
  Upload,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";

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

interface BillingContact {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  contactType: string;
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
  totalAmount: number | null;
  status: string;
  repairTechName: string | null;
  serviceTechName: string | null;
  fieldSupervisorName: string | null;
  repairForemanName: string | null;
  officeMemberName: string | null;
  reportedDate: string | null;
  completedAt: string | null;
  customerNote: string | null;
  memoOnStatement: string | null;
  techNotes: string | null;
  workType: string | null;
}

interface InvoicePreviewModalProps {
  open: boolean;
  onClose: () => void;
  estimate: Estimate | null;
  billingContacts: BillingContact[];
  loadingBillingContacts: boolean;
  onCreateInvoice: (data: {
    email: string;
    ccEmails?: string[];
    bccEmails?: string[];
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date;
    terms: string;
    customerNote: string;
    memoOnStatement: string;
    internalNotes: string;
  }) => Promise<void>;
  isCreating: boolean;
}

const COMPANY_INFO = {
  name: "Breakpoint Commercial Pool Systems",
  address: "6236 River Crest Drive Suite C",
  cityStateZip: "Riverside, CA 92507",
  phone: "(951) 453-3333",
  email: "info@breakpointpools.com",
};

const TERMS_OPTIONS = [
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "net_45", label: "Net 45" },
  { value: "net_60", label: "Net 60" },
  { value: "due_on_receipt", label: "Due on Receipt" },
];

function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(10000 + Math.random() * 90000);
  return `INV-${year}-${random}`;
}

export function InvoicePreviewModal({
  open,
  onClose,
  estimate,
  billingContacts,
  loadingBillingContacts,
  onCreateInvoice,
  isCreating,
}: InvoicePreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  const [terms, setTerms] = useState("net_30");
  
  // Notes
  const [customerNote, setCustomerNote] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [memoOnStatement, setMemoOnStatement] = useState("");
  
  // Send to
  const [selectedEmail, setSelectedEmail] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [newCcEmail, setNewCcEmail] = useState("");
  const [newBccEmail, setNewBccEmail] = useState("");
  
  // Error state
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset state when modal opens with new estimate
  useEffect(() => {
    if (estimate && open) {
      setInvoiceNumber(generateInvoiceNumber());
      setInvoiceDate(new Date());
      setDueDate(addDays(new Date(), 30));
      setTerms("net_30");
      setCustomerNote(estimate.customerNote || "");
      setInternalNotes(estimate.techNotes || "");
      setMemoOnStatement(estimate.memoOnStatement || "");
      setSelectedEmail("");
      setManualEmail("");
      setCcEmails([]);
      setBccEmails([]);
      setIsEditing(false);
      setShowConfirmation(false);
      
      // Auto-select first billing contact if available
      if (billingContacts.length > 0) {
        setSelectedEmail(billingContacts[0].email);
      }
    }
  }, [estimate, open, billingContacts]);

  // Update due date when terms change
  useEffect(() => {
    const daysMap: Record<string, number> = {
      net_15: 15,
      net_30: 30,
      net_45: 45,
      net_60: 60,
      due_on_receipt: 0,
    };
    setDueDate(addDays(invoiceDate, daysMap[terms] || 30));
  }, [terms, invoiceDate]);

  if (!estimate) return null;

  const finalEmail = selectedEmail || manualEmail;
  const items = estimate.items || [];

  const handleConfirm = async () => {
    setCreateError(null);
    try {
      await onCreateInvoice({
        email: finalEmail,
        ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
        bccEmails: bccEmails.length > 0 ? bccEmails : undefined,
        invoiceNumber,
        invoiceDate,
        dueDate,
        terms,
        customerNote,
        memoOnStatement,
        internalNotes,
      });
      setShowConfirmation(false);
      onClose();
    } catch (error: any) {
      console.error("Failed to create invoice:", error);
      setCreateError(error.message || "An error occurred while creating the invoice. Please try again.");
    }
  };

  const addCcEmail = () => {
    if (newCcEmail && !ccEmails.includes(newCcEmail)) {
      setCcEmails([...ccEmails, newCcEmail]);
      setNewCcEmail("");
    }
  };

  const addBccEmail = () => {
    if (newBccEmail && !bccEmails.includes(newBccEmail)) {
      setBccEmails([...bccEmails, newBccEmail]);
      setNewBccEmail("");
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-700 border-green-300",
      ready_to_invoice: "bg-blue-100 text-blue-700 border-blue-300",
      invoiced: "bg-purple-100 text-purple-700 border-purple-300",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getWorkTypeBadgeColor = (workType: string | null) => {
    const colors: Record<string, string> = {
      repairs: "bg-orange-100 text-orange-700 border-orange-300",
      chemicals: "bg-blue-100 text-blue-700 border-blue-300",
      other: "bg-gray-100 text-gray-700 border-gray-300",
    };
    return colors[workType || "other"] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  return (
    <>
      <Dialog open={open && !showConfirmation} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="bg-[#1E3A5F] text-white px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Receipt className="w-6 h-6" />
              Review Invoice Before Sending to QuickBooks
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              Please verify all information is correct before creating the invoice
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Invoice Summary */}
              <div className="bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Invoice Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#64748B]">Job/Estimate Title</p>
                    <p className="font-medium text-[#1E293B]">{estimate.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Property</p>
                    <p className="font-medium text-[#1E293B]">{estimate.propertyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Total Amount</p>
                    <p className="text-2xl font-bold text-[#0078D4]">
                      {formatCurrency(estimate.totalAmount)}
                    </p>
                  </div>
                  <div className="flex items-end gap-2">
                    <Badge className={getWorkTypeBadgeColor(estimate.workType)}>
                      {estimate.workType || "Other"}
                    </Badge>
                    <Badge className={getStatusBadgeColor(estimate.status)}>
                      {estimate.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Bill To / Ship To */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                  <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Bill To
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{estimate.customerName || estimate.propertyName}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[#94A3B8]">C/O:</span>{" "}
                        <span className="text-[#64748B]">—</span>
                      </div>
                      <div>
                        <span className="text-[#94A3B8]">ATTN:</span>{" "}
                        <span className="text-[#64748B]">—</span>
                      </div>
                    </div>
                    {estimate.customerEmail && (
                      <p className="text-[#64748B]">Email: {estimate.customerEmail}</p>
                    )}
                    {estimate.address && (
                      <p className="text-[#64748B]">{estimate.address}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                  <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ship To / Service Location
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{estimate.propertyName}</p>
                    {estimate.address && (
                      <p className="text-[#64748B]">{estimate.address}</p>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                    <p className="text-xs text-[#94A3B8] mb-1">Ship From:</p>
                    <p className="text-sm text-[#64748B]">{COMPANY_INFO.name}</p>
                    <p className="text-sm text-[#64748B]">{COMPANY_INFO.address}</p>
                    <p className="text-sm text-[#64748B]">{COMPANY_INFO.cityStateZip}</p>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Invoice Details
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm text-[#64748B]">Invoice Number</Label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                      data-testid="input-invoice-number"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-[#64748B]">Invoice Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full mt-1 justify-start"
                          disabled={!isEditing}
                          data-testid="button-invoice-date"
                        >
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {format(invoiceDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={invoiceDate}
                          onSelect={(date) => date && setInvoiceDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-sm text-[#64748B]">Terms</Label>
                    <Select value={terms} onValueChange={setTerms} disabled={!isEditing}>
                      <SelectTrigger className="mt-1" data-testid="select-terms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TERMS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-[#64748B]">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full mt-1 justify-start"
                          disabled={!isEditing}
                          data-testid="button-due-date"
                        >
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {format(dueDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={(date) => date && setDueDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Assignment Info */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Assignment Info
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {estimate.repairTechName && (
                    <div>
                      <p className="text-[#64748B]">Repair Tech</p>
                      <p className="font-medium">{estimate.repairTechName}</p>
                    </div>
                  )}
                  {estimate.serviceTechName && (
                    <div>
                      <p className="text-[#64748B]">Service Tech</p>
                      <p className="font-medium">{estimate.serviceTechName}</p>
                    </div>
                  )}
                  {estimate.fieldSupervisorName && (
                    <div>
                      <p className="text-[#64748B]">Field Supervisor</p>
                      <p className="font-medium">{estimate.fieldSupervisorName}</p>
                    </div>
                  )}
                  {estimate.repairForemanName && (
                    <div>
                      <p className="text-[#64748B]">Repair Foreman</p>
                      <p className="font-medium">{estimate.repairForemanName}</p>
                    </div>
                  )}
                  {estimate.officeMemberName && (
                    <div>
                      <p className="text-[#64748B]">Office Member</p>
                      <p className="font-medium">{estimate.officeMemberName}</p>
                    </div>
                  )}
                  {estimate.reportedDate && (
                    <div>
                      <p className="text-[#64748B]">Reported Date</p>
                      <p className="font-medium">
                        {format(new Date(estimate.reportedDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="font-semibold text-[#1E293B] mb-3">Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Product/Service</TableHead>
                      <TableHead className="w-[80px]">SKU</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[60px] text-right">Qty</TableHead>
                      <TableHead className="w-[80px] text-right">Rate</TableHead>
                      <TableHead className="w-[90px] text-right">Amount</TableHead>
                      <TableHead className="w-[50px] text-center">Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-[#64748B] py-8">
                          No line items
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-sm">
                            {item.serviceDate
                              ? format(new Date(item.serviceDate), "MM/dd/yy")
                              : "-"}
                          </TableCell>
                          <TableCell className="font-medium">{item.productService}</TableCell>
                          <TableCell className="text-[#64748B]">{item.sku || "-"}</TableCell>
                          <TableCell className="text-[#64748B]">{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.rate * 100)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount * 100)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.taxable ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                            ) : (
                              <span className="text-[#94A3B8]">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Subtotal:</span>
                        <span className="font-medium">
                          {formatCurrency(estimate.subtotal)}
                        </span>
                      </div>
                      {(estimate.discountAmount ?? 0) > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Discount:</span>
                          <span>-{formatCurrency(estimate.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Taxable Subtotal:</span>
                        <span>{formatCurrency(estimate.taxableSubtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">
                          Sales Tax ({(estimate.salesTaxRate || 0).toFixed(2)}%):
                        </span>
                        <span>{formatCurrency(estimate.salesTaxAmount)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[#E2E8F0] text-lg">
                        <span className="font-semibold">Invoice Total:</span>
                        <span className="font-bold text-[#0078D4]">
                          {formatCurrency(estimate.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Notes & Attachments */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Customer Notes & Attachments
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-[#64748B]">Note to Customer (visible)</Label>
                    <Textarea
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder="Add a note visible to the customer..."
                      className="mt-1 h-20"
                      disabled={!isEditing}
                      data-testid="textarea-customer-note"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-[#64748B]">Internal Notes (hidden)</Label>
                    <Textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Internal notes not visible to customer..."
                      className="mt-1 h-20"
                      disabled={!isEditing}
                      data-testid="textarea-internal-notes"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="text-sm text-[#64748B]">Memo on Statement (hidden)</Label>
                  <Input
                    value={memoOnStatement}
                    onChange={(e) => setMemoOnStatement(e.target.value)}
                    placeholder="Memo that appears on customer statements..."
                    className="mt-1"
                    disabled={!isEditing}
                    data-testid="input-memo-statement"
                  />
                </div>

                {/* Photos/Attachments */}
                {((estimate.photos && estimate.photos.length > 0) ||
                  (estimate.attachments && estimate.attachments.length > 0)) && (
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                    <Label className="text-sm text-[#64748B] mb-2 block">
                      Completion Photos & Documents
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {estimate.photos?.map((photo, index) => (
                        <div
                          key={`photo-${index}`}
                          className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#E2E8F0]"
                        >
                          <img
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {estimate.attachments?.map((attachment, index) => (
                        <div
                          key={`attachment-${index}`}
                          className="flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                        >
                          <FileText className="w-4 h-4 text-[#64748B]" />
                          <span className="text-sm text-[#1E293B]">{attachment.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Send Invoice To */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Send Invoice To
                </h3>
                
                {loadingBillingContacts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-[#64748B]" />
                    <span className="ml-2 text-sm text-[#64748B]">Loading billing contacts...</span>
                  </div>
                ) : billingContacts.length > 0 ? (
                  <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                    <SelectTrigger data-testid="select-billing-contact">
                      <SelectValue placeholder="Select billing contact..." />
                    </SelectTrigger>
                    <SelectContent>
                      {billingContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.email}>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-[#64748B]" />
                            <span>{contact.name}</span>
                            <span className="text-[#94A3B8]">({contact.email})</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {contact.contactType}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-lg">
                    <p className="text-sm text-[#D97706]">
                      No billing contacts found for this property.
                    </p>
                    <Input
                      type="email"
                      placeholder="Enter billing email manually..."
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      className="mt-2"
                      data-testid="input-manual-email"
                    />
                  </div>
                )}

                {/* CC/BCC Options */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowCcBcc(!showCcBcc)}
                    className="text-sm text-[#0078D4] hover:underline"
                  >
                    {showCcBcc ? "Hide CC/BCC" : "Add CC/BCC"}
                  </button>
                  
                  {showCcBcc && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label className="text-sm text-[#64748B]">CC</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="email"
                            value={newCcEmail}
                            onChange={(e) => setNewCcEmail(e.target.value)}
                            placeholder="Add CC email..."
                            onKeyDown={(e) => e.key === "Enter" && addCcEmail()}
                          />
                          <Button variant="outline" size="sm" onClick={addCcEmail}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {ccEmails.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {ccEmails.map((email, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {email}
                                <X
                                  className="w-3 h-3 cursor-pointer"
                                  onClick={() => setCcEmails(ccEmails.filter((_, i) => i !== index))}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm text-[#64748B]">BCC</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="email"
                            value={newBccEmail}
                            onChange={(e) => setNewBccEmail(e.target.value)}
                            placeholder="Add BCC email..."
                            onKeyDown={(e) => e.key === "Enter" && addBccEmail()}
                          />
                          <Button variant="outline" size="sm" onClick={addBccEmail}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {bccEmails.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {bccEmails.map((email, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {email}
                                <X
                                  className="w-3 h-3 cursor-pointer"
                                  onClick={() => setBccEmails(bccEmails.filter((_, i) => i !== index))}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-invoice">
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              data-testid="button-edit-details"
            >
              {isEditing ? "Done Editing" : "Edit Details"}
            </Button>
            <Button
              onClick={() => setShowConfirmation(true)}
              disabled={!finalEmail || isCreating}
              className="bg-[#0078D4] hover:bg-[#0078D4]/90"
              data-testid="button-confirm-send"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4 mr-2" />
                  Confirm & Send to QuickBooks
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={(open) => {
        if (!open) setCreateError(null);
        setShowConfirmation(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#0078D4]" />
              Confirm Invoice Creation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create this invoice in QuickBooks and send it to{" "}
              <strong>{finalEmail}</strong>?
              {ccEmails.length > 0 && (
                <>
                  <br />
                  CC: {ccEmails.join(", ")}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {createError}
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-go-back">Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isCreating}
              className="bg-[#0078D4] hover:bg-[#0078D4]/90"
              data-testid="button-yes-create"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Yes, Create Invoice"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
