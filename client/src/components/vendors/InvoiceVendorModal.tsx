import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, Loader2, Building2, FileText, MapPin, Droplets, Calendar, Pencil, Mail
} from "lucide-react";
import type { TechOpsEntry, ChemicalVendor, InvoiceTemplate } from "@shared/schema";
import { format } from "date-fns";

interface InvoiceVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TechOpsEntry | null;
}

export function InvoiceVendorModal({ open, onOpenChange, entry }: InvoiceVendorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState("");

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await fetch("/api/vendors");
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["invoice-templates"],
    queryFn: async () => {
      const res = await fetch("/api/invoice-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const activeVendors = useMemo(() => 
    vendors.filter((v: ChemicalVendor) => v.isActive !== false),
    [vendors]
  );

  const selectedVendor = useMemo(() => 
    vendors.find((v: ChemicalVendor) => v.id === selectedVendorId),
    [vendors, selectedVendorId]
  );

  const selectedTemplate = useMemo(() => 
    templates.find((t: InvoiceTemplate) => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  const invoicePreview = useMemo(() => {
    if (!entry || !selectedVendor) return "";

    const orderDate = entry.createdAt ? format(new Date(entry.createdAt), "MMMM d, yyyy") : "N/A";
    const header = selectedTemplate?.headerText || "Breakpoint Pool Management\nChemical Order Invoice";
    const footer = selectedTemplate?.footerText || "Thank you for your business!";
    const terms = selectedTemplate?.termsConditions || "";

    return `${header}

==============================
CHEMICAL ORDER INVOICE
==============================

Order Date: ${orderDate}
Property: ${entry.propertyName || "N/A"}
Address: ${(entry as any).propertyAddress || "N/A"}

Vendor: ${selectedVendor.vendorName}
${selectedVendor.contactPerson ? `Contact: ${selectedVendor.contactPerson}` : ""}
${selectedVendor.email ? `Email: ${selectedVendor.email}` : ""}

------------------------------
ORDER DETAILS
------------------------------
Chemicals Requested:
${entry.chemicals || "Not specified"}

Quantity:
${entry.quantity || "Not specified"}

${entry.notes ? `Notes: ${entry.notes}` : ""}

------------------------------
${terms ? `Terms: ${terms}\n\n` : ""}${footer}`;
  }, [entry, selectedVendor, selectedTemplate]);

  // Set default template when templates load
  React.useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find((t: InvoiceTemplate) => t.isDefault);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      }
    }
  }, [templates, selectedTemplateId]);

  // Update edited invoice when preview changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditedInvoice(invoicePreview);
    }
  }, [invoicePreview, isEditing]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open && entry) {
      setSelectedVendorId(entry.vendorId || "");
      setIsEditing(false);
    } else if (!open) {
      setSelectedVendorId("");
      setSelectedTemplateId("");
      setIsEditing(false);
      setEditedInvoice("");
    }
  }, [open, entry]);

  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!entry || !selectedVendor) throw new Error("Missing entry or vendor");
      
      const res = await fetch(`/api/tech-ops/${entry.id}/send-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: selectedVendor.id,
          vendorName: selectedVendor.vendorName,
          templateId: selectedTemplateId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to record invoice");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-ops"] });
      
      // Open mailto link
      if (selectedVendor?.email) {
        const subject = encodeURIComponent(`Chemical Order - ${entry?.propertyName || "N/A"} - ${format(new Date(), "MM/dd/yyyy")}`);
        const body = encodeURIComponent(isEditing ? editedInvoice : invoicePreview);
        window.open(`mailto:${selectedVendor.email}?subject=${subject}&body=${body}`, "_blank");
      }
      
      toast({ title: "Invoice recorded and email opened" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to send invoice", variant: "destructive" });
    },
  });

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#0078D4]" />
            Invoice Vendor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Vendor *</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger data-testid="select-invoice-vendor">
                  <SelectValue placeholder="Choose a vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {activeVendors.map((vendor: ChemicalVendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {vendor.vendorName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger data-testid="select-invoice-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: InvoiceTemplate) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {template.templateName}
                        {template.isDefault && " (Default)"}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedVendor && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-[#0078D4] mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-800">{selectedVendor.vendorName}</h4>
                  {selectedVendor.email && <p className="text-sm text-slate-600">{selectedVendor.email}</p>}
                  {selectedVendor.phone && <p className="text-sm text-slate-500">{selectedVendor.phone}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Invoice Preview</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(!isEditing)}
                data-testid="button-toggle-edit-invoice"
              >
                <Pencil className="w-4 h-4 mr-1" />
                {isEditing ? "Preview" : "Edit"}
              </Button>
            </div>
            {isEditing ? (
              <Textarea
                value={editedInvoice}
                onChange={(e) => setEditedInvoice(e.target.value)}
                rows={15}
                className="font-mono text-sm"
                data-testid="textarea-edit-invoice"
              />
            ) : (
              <ScrollArea className="h-[300px] border rounded-lg p-4 bg-slate-50">
                <pre className="text-sm whitespace-pre-wrap font-mono text-slate-700">
                  {invoicePreview || "Select a vendor to preview the invoice"}
                </pre>
              </ScrollArea>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {entry.propertyName || "No property"}
              </div>
              <div className="flex items-center gap-1">
                <Droplets className="w-4 h-4" />
                {entry.chemicals || "No chemicals listed"}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {entry.createdAt ? format(new Date(entry.createdAt), "MMM d, yyyy") : "N/A"}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-invoice">
            Cancel
          </Button>
          <Button
            onClick={() => sendInvoiceMutation.mutate()}
            disabled={!selectedVendorId || sendInvoiceMutation.isPending}
            className="bg-[#0078D4] hover:bg-[#1E40AF] text-white"
            data-testid="button-send-invoice"
          >
            {sendInvoiceMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
