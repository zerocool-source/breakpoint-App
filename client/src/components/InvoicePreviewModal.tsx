import React, { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
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
  Users,
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
    selectedPhotos: string[];
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
  
  // Customer/Account selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  
  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  const [terms, setTerms] = useState("net_30");
  
  // Bill To fields
  const [billToName, setBillToName] = useState("");
  const [billToCO, setBillToCO] = useState("");
  const [billToATTN, setBillToATTN] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [selectedBillToAddress, setSelectedBillToAddress] = useState("default");
  
  // Ship To fields
  const [shipToName, setShipToName] = useState("");
  const [shipToAddress, setShipToAddress] = useState("");
  const [selectedShipToAddress, setSelectedShipToAddress] = useState("default");
  
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
  
  // Attachment selections
  const [selectedAttachments, setSelectedAttachments] = useState<Set<number>>(new Set());
  const [selectAllAttachments, setSelectAllAttachments] = useState(false);
  
  // Locally added attachments
  const [localAttachments, setLocalAttachments] = useState<{ name: string; url: string; size: number }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Editable line items
  const [editableLineItems, setEditableLineItems] = useState<EstimateLineItem[]>([]);
  const [showAddLineItemForm, setShowAddLineItemForm] = useState(false);
  const [newLineItem, setNewLineItem] = useState<Partial<EstimateLineItem>>({
    productService: "",
    description: "",
    quantity: 1,
    rate: 0,
    taxable: false,
  });
  
  // Error state
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Fetch customers for the customer/account dropdown
  const { data: customersData } = useQuery<{ customers: { id: string; name: string; email: string | null }[] }>({
    queryKey: ["/api/customers"],
    enabled: open,
  });
  const customers = customersData?.customers || [];

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
      
      // Initialize Bill To fields
      setBillToName(estimate.customerName || estimate.propertyName);
      setBillToCO("");
      setBillToATTN("");
      setBillToAddress(estimate.address || "");
      setSelectedBillToAddress("default");
      
      // Initialize Ship To fields
      setShipToName(estimate.propertyName);
      setShipToAddress(estimate.address || "");
      setSelectedShipToAddress("default");
      
      // Reset attachment selections
      setSelectedAttachments(new Set());
      setSelectAllAttachments(false);
      setLocalAttachments([]);
      
      // Initialize editable line items from estimate
      setEditableLineItems(estimate.items || []);
      setShowAddLineItemForm(false);
      setNewLineItem({
        productService: "",
        description: "",
        quantity: 1,
        rate: 0,
        taxable: false,
      });
      
      // Reset customer selection - try to match by name
      setSelectedCustomerId("");
      
      // Auto-select first billing contact if available
      if (billingContacts.length > 0) {
        setSelectedEmail(billingContacts[0].email);
      }
    }
  }, [estimate, open, billingContacts]);
  
  // Auto-select customer when customers are loaded and we have an estimate
  useEffect(() => {
    if (estimate && customers.length > 0 && !selectedCustomerId) {
      // Try to find matching customer by name
      const matchingCustomer = customers.find(
        (c) => c.name.toLowerCase() === (estimate.customerName || estimate.propertyName).toLowerCase()
      );
      if (matchingCustomer) {
        setSelectedCustomerId(matchingCustomer.id);
      }
    }
  }, [estimate, customers, selectedCustomerId]);

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

  // Handle file upload using presigned URL flow
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file size (20 MB max)
    if (file.size > 20 * 1024 * 1024) {
      alert("File size exceeds 20 MB limit");
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Step 1: Request presigned upload URL
      const urlResponse = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });
      
      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }
      
      const { uploadURL, objectPath } = await urlResponse.json();
      
      // Step 2: Upload file directly to presigned URL
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }
      
      // Step 3: Confirm upload and make public
      const confirmResponse = await fetch("/api/uploads/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath }),
      });
      
      if (!confirmResponse.ok) {
        throw new Error("Failed to confirm upload");
      }
      
      // Add to local attachments with the object path as URL
      setLocalAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: objectPath,
          size: file.size,
        },
      ]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!estimate) return null;

  const finalEmail = selectedEmail || manualEmail;
  const items = editableLineItems;
  
  // Handler to add a new line item
  const handleAddLineItem = () => {
    if (!newLineItem.productService) return;
    
    const amount = (newLineItem.quantity || 1) * (newLineItem.rate || 0);
    const lineItem: EstimateLineItem = {
      lineNumber: editableLineItems.length + 1,
      productService: newLineItem.productService || "",
      description: newLineItem.description || "",
      quantity: newLineItem.quantity || 1,
      rate: newLineItem.rate || 0,
      amount: amount,
      taxable: newLineItem.taxable || false,
    };
    
    setEditableLineItems([...editableLineItems, lineItem]);
    setNewLineItem({
      productService: "",
      description: "",
      quantity: 1,
      rate: 0,
      taxable: false,
    });
    setShowAddLineItemForm(false);
  };
  
  // Handler to clear all line items
  const handleClearAllLineItems = () => {
    setEditableLineItems([]);
  };
  
  // Handler to remove a single line item
  const handleRemoveLineItem = (index: number) => {
    const newItems = editableLineItems.filter((_, i) => i !== index);
    // Renumber the line items
    const renumbered = newItems.map((item, i) => ({ ...item, lineNumber: i + 1 }));
    setEditableLineItems(renumbered);
  };
  
  // Calculate totals from editable line items
  const calculatedSubtotal = editableLineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleConfirm = async () => {
    setCreateError(null);
    try {
      // Build selected photos array based on checkbox selections
      const selectedPhotoUrls: string[] = [];
      const photos = estimate?.photos || [];
      const attachments = estimate?.attachments || [];
      
      // Add photos that are checked
      photos.forEach((photo, index) => {
        if (selectedAttachments.has(index)) {
          selectedPhotoUrls.push(photo);
        }
      });
      
      // Add attachments that are checked (using their URLs)
      attachments.forEach((attachment, index) => {
        const globalIndex = photos.length + index;
        if (selectedAttachments.has(globalIndex)) {
          selectedPhotoUrls.push(attachment.url);
        }
      });
      
      // Add local attachments that are checked
      localAttachments.forEach((attachment, index) => {
        const globalIndex = photos.length + attachments.length + index;
        if (selectedAttachments.has(globalIndex)) {
          selectedPhotoUrls.push(attachment.url);
        }
      });
      
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
        selectedPhotos: selectedPhotoUrls,
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
            <DialogTitle className="flex items-center gap-2 text-xl text-white">
              <Receipt className="w-6 h-6" />
              Review Invoice Before Sending to QuickBooks
            </DialogTitle>
            <DialogDescription className="text-white/80">
              Please verify all information is correct before creating the invoice
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Customer/Account Selection */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Customer / Account
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-[#64748B]">QuickBooks Customer Account</Label>
                    <Select
                      value={selectedCustomerId}
                      onValueChange={setSelectedCustomerId}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-customer-account">
                        <SelectValue placeholder="Select customer account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            <span className="font-medium">{customer.name}</span>
                            {customer.email && (
                              <span className="text-[#94A3B8] ml-2">({customer.email})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#94A3B8] mt-1">
                      Links to the QuickBooks customer record for billing
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Current Property</p>
                    <p className="font-medium text-[#1E293B] mt-1">{estimate.propertyName}</p>
                    <p className="text-xs text-[#94A3B8]">
                      {estimate.customerName || "No customer linked"}
                    </p>
                  </div>
                </div>
              </div>

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
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-[#64748B]">Billing Address</Label>
                        <Select value={selectedBillToAddress} onValueChange={(v) => {
                          setSelectedBillToAddress(v);
                          if (v === "custom") {
                            setBillToAddress("");
                          } else {
                            setBillToAddress(estimate.address || "");
                          }
                        }}>
                          <SelectTrigger className="mt-1" data-testid="select-bill-to-address">
                            <SelectValue placeholder="Select billing address" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default - {estimate.address || "No address"}</SelectItem>
                            <SelectItem value="custom">Enter custom address...</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-[#64748B]">Customer Name</Label>
                        <Input
                          value={billToName}
                          onChange={(e) => setBillToName(e.target.value)}
                          className="mt-1"
                          data-testid="input-bill-to-name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-[#64748B]">C/O</Label>
                          <Input
                            value={billToCO}
                            onChange={(e) => setBillToCO(e.target.value)}
                            placeholder="Care of..."
                            className="mt-1"
                            data-testid="input-bill-to-co"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-[#64748B]">ATTN</Label>
                          <Input
                            value={billToATTN}
                            onChange={(e) => setBillToATTN(e.target.value)}
                            placeholder="Attention..."
                            className="mt-1"
                            data-testid="input-bill-to-attn"
                          />
                        </div>
                      </div>
                      {selectedBillToAddress === "custom" && (
                        <div>
                          <Label className="text-xs text-[#64748B]">Address</Label>
                          <Textarea
                            value={billToAddress}
                            onChange={(e) => setBillToAddress(e.target.value)}
                            placeholder="Enter billing address..."
                            className="mt-1 h-16"
                            data-testid="textarea-bill-to-address"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">{billToName}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[#94A3B8]">C/O:</span>{" "}
                          <span className="text-[#64748B]">{billToCO || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[#94A3B8]">ATTN:</span>{" "}
                          <span className="text-[#64748B]">{billToATTN || "—"}</span>
                        </div>
                      </div>
                      {estimate.customerEmail && (
                        <p className="text-[#64748B]">Email: {estimate.customerEmail}</p>
                      )}
                      {billToAddress && (
                        <p className="text-[#64748B]">{billToAddress}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                  <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ship To / Service Location
                  </h3>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-[#64748B]">Service Location</Label>
                        <Select value={selectedShipToAddress} onValueChange={(v) => {
                          setSelectedShipToAddress(v);
                          if (v === "custom") {
                            setShipToAddress("");
                          } else {
                            setShipToAddress(estimate.address || "");
                          }
                        }}>
                          <SelectTrigger className="mt-1" data-testid="select-ship-to-address">
                            <SelectValue placeholder="Select service location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">{estimate.propertyName}</SelectItem>
                            <SelectItem value="custom">Enter custom location...</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedShipToAddress === "custom" && (
                        <>
                          <div>
                            <Label className="text-xs text-[#64748B]">Location Name</Label>
                            <Input
                              value={shipToName}
                              onChange={(e) => setShipToName(e.target.value)}
                              className="mt-1"
                              data-testid="input-ship-to-name"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-[#64748B]">Address</Label>
                            <Textarea
                              value={shipToAddress}
                              onChange={(e) => setShipToAddress(e.target.value)}
                              placeholder="Enter service location address..."
                              className="mt-1 h-16"
                              data-testid="textarea-ship-to-address"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">{shipToName}</p>
                      {shipToAddress && (
                        <p className="text-[#64748B]">{shipToAddress}</p>
                      )}
                    </div>
                  )}
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#1E293B]">Line Items</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#0078D4] border-[#0078D4]"
                      onClick={() => setShowAddLineItemForm(true)}
                      data-testid="button-add-line-item"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add product or service
                    </Button>
                    {items.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={handleClearAllLineItems}
                        data-testid="button-clear-line-items"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear all lines
                      </Button>
                    )}
                  </div>
                </div>
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
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-[#64748B] py-8">
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
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveLineItem(index)}
                              data-testid={`button-remove-line-item-${index}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {/* Add Line Item Form */}
                {showAddLineItemForm && (
                  <div className="mt-4 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <h4 className="font-medium text-[#1E293B] mb-3">Add New Line Item</h4>
                    <div className="grid grid-cols-6 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs text-[#64748B]">Product/Service</Label>
                        <Input
                          value={newLineItem.productService || ""}
                          onChange={(e) => setNewLineItem({ ...newLineItem, productService: e.target.value })}
                          placeholder="Enter product or service name"
                          className="mt-1"
                          data-testid="input-new-product-service"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-[#64748B]">Description</Label>
                        <Input
                          value={newLineItem.description || ""}
                          onChange={(e) => setNewLineItem({ ...newLineItem, description: e.target.value })}
                          placeholder="Enter description"
                          className="mt-1"
                          data-testid="input-new-description"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[#64748B]">Qty</Label>
                        <Input
                          type="number"
                          value={newLineItem.quantity || 1}
                          onChange={(e) => setNewLineItem({ ...newLineItem, quantity: parseInt(e.target.value) || 1 })}
                          className="mt-1"
                          min={1}
                          data-testid="input-new-quantity"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[#64748B]">Rate ($)</Label>
                        <Input
                          type="number"
                          value={newLineItem.rate || 0}
                          onChange={(e) => setNewLineItem({ ...newLineItem, rate: parseFloat(e.target.value) || 0 })}
                          className="mt-1"
                          step="0.01"
                          min={0}
                          data-testid="input-new-rate"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="new-taxable"
                          checked={newLineItem.taxable || false}
                          onCheckedChange={(checked) => setNewLineItem({ ...newLineItem, taxable: checked === true })}
                          data-testid="checkbox-new-taxable"
                        />
                        <Label htmlFor="new-taxable" className="text-sm text-[#64748B]">Taxable</Label>
                      </div>
                      <div className="flex-1" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddLineItemForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddLineItem}
                        disabled={!newLineItem.productService}
                        data-testid="button-save-line-item"
                      >
                        Add Line Item
                      </Button>
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Subtotal:</span>
                        <span className="font-medium">
                          {formatCurrency(calculatedSubtotal * 100)}
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

              {/* Customer Payment Options */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Customer Payment Options
                </h3>
                <Textarea
                  placeholder="Enter payment instructions for the customer (e.g., ACH details, check mailing address, online payment link)..."
                  className="h-20"
                  disabled={!isEditing}
                  data-testid="textarea-payment-instructions"
                />
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
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm text-[#64748B]">
                      Completion Photos & Documents
                    </Label>
                    <div className="flex items-center gap-3">
                      {((estimate.photos && estimate.photos.length > 0) ||
                        (estimate.attachments && estimate.attachments.length > 0) ||
                        localAttachments.length > 0) && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all-attachments"
                            checked={selectAllAttachments}
                            onCheckedChange={(checked) => {
                              setSelectAllAttachments(!!checked);
                              if (checked) {
                                const allIndexes = new Set<number>();
                                (estimate.photos || []).forEach((_, i) => allIndexes.add(i));
                                (estimate.attachments || []).forEach((_, i) => allIndexes.add(i + (estimate.photos?.length || 0)));
                                localAttachments.forEach((_, i) => allIndexes.add(i + (estimate.photos?.length || 0) + (estimate.attachments?.length || 0)));
                                setSelectedAttachments(allIndexes);
                              } else {
                                setSelectedAttachments(new Set());
                              }
                            }}
                            data-testid="checkbox-select-all-attachments"
                          />
                          <Label htmlFor="select-all-attachments" className="text-xs text-[#64748B] cursor-pointer">
                            Select All
                          </Label>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#0078D4] border-[#0078D4]"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        data-testid="button-add-attachment"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3 h-3 mr-1" />
                            Add Attachment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-[#94A3B8] mb-2">Max file size: 20 MB. Check boxes to attach to email.</p>
                  {((estimate.photos && estimate.photos.length > 0) ||
                    (estimate.attachments && estimate.attachments.length > 0) ||
                    localAttachments.length > 0) ? (
                    <div className="space-y-2">
                      {estimate.photos?.map((photo, index) => (
                        <div
                          key={`photo-${index}`}
                          className="flex items-center gap-3 p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                        >
                          <Checkbox
                            id={`photo-${index}`}
                            checked={selectedAttachments.has(index)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedAttachments);
                              if (checked) {
                                newSet.add(index);
                              } else {
                                newSet.delete(index);
                              }
                              setSelectedAttachments(newSet);
                              setSelectAllAttachments(
                                newSet.size === (estimate.photos?.length || 0) + (estimate.attachments?.length || 0) + localAttachments.length
                              );
                            }}
                            data-testid={`checkbox-photo-${index}`}
                          />
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#E2E8F0]">
                            <img
                              src={photo}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-sm text-[#1E293B]">Photo {index + 1}</span>
                          <span className="text-xs text-[#94A3B8]">Attach to email</span>
                        </div>
                      ))}
                      {estimate.attachments?.map((attachment, index) => {
                        const globalIndex = (estimate.photos?.length || 0) + index;
                        return (
                          <div
                            key={`attachment-${index}`}
                            className="flex items-center gap-3 p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                          >
                            <Checkbox
                              id={`attachment-${index}`}
                              checked={selectedAttachments.has(globalIndex)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedAttachments);
                                if (checked) {
                                  newSet.add(globalIndex);
                                } else {
                                  newSet.delete(globalIndex);
                                }
                                setSelectedAttachments(newSet);
                                setSelectAllAttachments(
                                  newSet.size === (estimate.photos?.length || 0) + (estimate.attachments?.length || 0) + localAttachments.length
                                );
                              }}
                              data-testid={`checkbox-attachment-${index}`}
                            />
                            <FileText className="w-8 h-8 text-[#64748B]" />
                            <span className="text-sm text-[#1E293B]">{attachment.name}</span>
                            <span className="text-xs text-[#94A3B8]">Attach to email</span>
                          </div>
                        );
                      })}
                      {localAttachments.map((attachment, index) => {
                        const globalIndex = (estimate.photos?.length || 0) + (estimate.attachments?.length || 0) + index;
                        const isImage = attachment.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        return (
                          <div
                            key={`local-${index}`}
                            className="flex items-center gap-3 p-2 bg-[#F0FDF4] rounded-lg border border-[#86EFAC]"
                          >
                            <Checkbox
                              id={`local-${index}`}
                              checked={selectedAttachments.has(globalIndex)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedAttachments);
                                if (checked) {
                                  newSet.add(globalIndex);
                                } else {
                                  newSet.delete(globalIndex);
                                }
                                setSelectedAttachments(newSet);
                                setSelectAllAttachments(
                                  newSet.size === (estimate.photos?.length || 0) + (estimate.attachments?.length || 0) + localAttachments.length
                                );
                              }}
                              data-testid={`checkbox-local-${index}`}
                            />
                            {isImage ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#E2E8F0]">
                                <img
                                  src={attachment.url}
                                  alt={attachment.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <FileText className="w-8 h-8 text-[#22C55E]" />
                            )}
                            <div className="flex-1">
                              <span className="text-sm text-[#1E293B]">{attachment.name}</span>
                              <Badge variant="outline" className="ml-2 text-xs text-[#22C55E] border-[#22C55E]">
                                New
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                              onClick={() => setLocalAttachments((prev) => prev.filter((_, i) => i !== index))}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-[#94A3B8] italic">No attachments</p>
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
              disabled={isCreating}
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
