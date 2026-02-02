import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Wrench, Plus, X, Trash2, Camera, DollarSign, FileText, User, Calendar, Tag, Upload, ClipboardList
} from "lucide-react";
import type { RepairRequestLineItem } from "@shared/schema";

interface RepairRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface PhotoAttachment {
  url: string;
  caption: string;
}

interface FormData {
  propertyId: string;
  propertyName: string;
  customerName: string;
  customerEmail: string;
  address: string;
  requestNumber: string;
  requestDate: Date;
  priority: "low" | "medium" | "high" | "urgent";
  issueDescription: string;
  lineItems: RepairRequestLineItem[];
  photos: string[];
  photoAttachments: PhotoAttachment[];
  customerNote: string;
  officeNotes: string;
  memo: string;
  techNotes: string;
  reportedBy: string;
  reportedByName: string;
  repairTechnicianId: string;
  scheduledTime: string;
}

const generateRequestNumber = () => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `RR-${random}`;
};

export function RepairRequestForm({ open, onOpenChange, onSuccess }: RepairRequestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<FormData>({
    propertyId: "",
    propertyName: "",
    customerName: "",
    customerEmail: "",
    address: "",
    requestNumber: generateRequestNumber(),
    requestDate: new Date(),
    priority: "medium",
    issueDescription: "",
    lineItems: [],
    photos: [],
    photoAttachments: [],
    customerNote: "",
    officeNotes: "",
    memo: "",
    techNotes: "",
    reportedBy: "office_staff",
    reportedByName: "",
    repairTechnicianId: "",
    scheduledTime: "08:00",
  });

  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItem, setNewItem] = useState({
    itemName: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
  });

  const { data: customersData } = useQuery<{ customers: any[] }>({
    queryKey: ["/api/customers/stored"],
    queryFn: async () => {
      const response = await fetch("/api/customers/stored");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const customers = customersData?.customers || [];

  // Fetch repair technicians
  const { data: techniciansData } = useQuery<{ technicians: any[] }>({
    queryKey: ["/api/technicians/stored", "repair"],
    queryFn: async () => {
      const response = await fetch("/api/technicians/stored?role=repair");
      if (!response.ok) throw new Error("Failed to fetch technicians");
      return response.json();
    },
  });
  const repairTechnicians = techniciansData?.technicians || [];

  const calculateTotals = useMemo(() => {
    const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    return {
      subtotal,
      estimatedCost: subtotal,
      total: subtotal,
    };
  }, [formData.lineItems]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/repair-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create repair request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repair-requests"] });
      toast({ title: "Success", description: "Repair request created successfully" });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create repair request", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      propertyId: "",
      propertyName: "",
      customerName: "",
      customerEmail: "",
      address: "",
      requestNumber: generateRequestNumber(),
      requestDate: new Date(),
      priority: "medium",
      issueDescription: "",
      lineItems: [],
      photos: [],
      photoAttachments: [],
      customerNote: "",
      officeNotes: "",
      memo: "",
      techNotes: "",
      reportedBy: "office_staff",
      repairTechnicianId: "",
      scheduledTime: "08:00",
      reportedByName: "",
    });
    setShowAddItemForm(false);
    setNewItem({ itemName: "", description: "", quantity: 1, unitPrice: 0 });
  };

  const handleAddItem = () => {
    if (!newItem.itemName) return;
    const amount = newItem.quantity * (newItem.unitPrice * 100);
    const lineItem: RepairRequestLineItem = {
      lineNumber: formData.lineItems.length + 1,
      itemName: newItem.itemName,
      description: newItem.description || undefined,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice * 100,
      amount,
    };
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, lineItem],
    }));
    setNewItem({ itemName: "", description: "", quantity: 1, unitPrice: 0 });
    setShowAddItemForm(false);
  };

  const handleRemoveItem = (lineNumber: number) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.lineNumber !== lineNumber),
    }));
  };

  const handleSubmit = (asDraft: boolean = false) => {
    if (!formData.propertyId || !formData.issueDescription) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      propertyId: formData.propertyId,
      propertyName: formData.propertyName,
      customerName: formData.customerName || undefined,
      customerEmail: formData.customerEmail || undefined,
      address: formData.address || undefined,
      requestNumber: formData.requestNumber,
      requestDate: formData.requestDate.toISOString(),
      priority: formData.priority,
      issueDescription: formData.issueDescription,
      lineItems: formData.lineItems,
      photos: formData.photos.length > 0 ? formData.photos : undefined,
      customerNote: formData.customerNote || undefined,
      officeNotes: formData.officeNotes || undefined,
      memo: formData.memo || undefined,
      techNotes: formData.techNotes || undefined,
      reportedBy: formData.reportedBy,
      reportedByName: formData.reportedByName || undefined,
      subtotal: calculateTotals.subtotal,
      estimatedCost: calculateTotals.estimatedCost,
      totalAmount: calculateTotals.total,
      status: asDraft ? "draft" : "pending",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-wide">REPAIR REQUEST</h2>
            <p className="text-sm text-slate-300">New Request</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-300">Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(calculateTotals.total)}</p>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Office Notes Section - Top of form */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                Office Notes
                <span className="text-xs font-normal text-amber-600 ml-1">(Internal use only)</span>
              </Label>
              <Textarea
                value={formData.officeNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, officeNotes: e.target.value }))}
                placeholder="Add office notes..."
                rows={3}
                className="resize-none bg-white"
                data-testid="textarea-office-notes-top"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
              <div className="col-span-2">
                <Label className="text-xs text-slate-500 font-medium">Customer / Property</Label>
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
                  <SelectTrigger className="mt-1" data-testid="select-rr-property">
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
                <Label className="text-xs text-slate-500 font-medium">Request #</Label>
                <Input
                  value={formData.requestNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestNumber: e.target.value }))}
                  className="mt-1 h-9"
                  data-testid="input-rr-number"
                  readOnly
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 font-medium">Request Date</Label>
                <Input
                  type="date"
                  value={formData.requestDate.toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestDate: new Date(e.target.value) }))}
                  className="mt-1 h-9"
                  data-testid="input-rr-date"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 font-medium">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "low" | "medium" | "high" | "urgent") => 
                    setFormData(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger className="mt-1 h-9" data-testid="select-rr-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 font-medium">Status</Label>
                <Input
                  value="Pending Assessment"
                  className="mt-1 h-9 bg-slate-100"
                  disabled
                />
              </div>

              <div>
                <Label className="text-xs text-slate-500 font-medium">Assigned Repair Technician</Label>
                <Select
                  value={formData.repairTechnicianId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, repairTechnicianId: value }))}
                >
                  <SelectTrigger className="mt-1 h-9" data-testid="select-rr-technician">
                    <SelectValue placeholder="Select technician..." />
                  </SelectTrigger>
                  <SelectContent>
                    {repairTechnicians.map((tech: any) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.firstName} {tech.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-500 font-medium">Scheduled Time</Label>
                <Input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  className="mt-1 h-9"
                  data-testid="input-rr-scheduled-time"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" />
                Issue Description
              </Label>
              <Textarea
                value={formData.issueDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
                placeholder="Describe the repair issue..."
                rows={4}
                className="resize-none"
                data-testid="textarea-rr-description"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Line Items / Parts Needed
                </Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddItemForm(true)}
                  className="bg-[#0077b6] hover:bg-[#005f8f] text-white"
                  data-testid="button-add-item"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {showAddItemForm && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-[#0077b6]/30 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs text-slate-500">Part/Item Name</Label>
                      <Input
                        value={newItem.itemName}
                        onChange={(e) => setNewItem(prev => ({ ...prev, itemName: e.target.value }))}
                        placeholder="Enter part or item name..."
                        className="mt-1 h-8"
                        data-testid="input-item-name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        className="mt-1 h-8"
                        data-testid="input-item-quantity"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Unit Price (optional)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.unitPrice || ""}
                        onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                        placeholder="$0.00"
                        className="mt-1 h-8"
                        data-testid="input-item-price"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-slate-500">Description (optional)</Label>
                      <Input
                        value={newItem.description}
                        onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Item description..."
                        className="mt-1 h-8"
                        data-testid="input-item-description"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddItemForm(false)}
                      data-testid="button-cancel-item"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddItem}
                      disabled={!newItem.itemName}
                      className="bg-[#0077b6] hover:bg-[#005f8f] text-white"
                      data-testid="button-save-item"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {formData.lineItems.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No items added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.lineItems.map((item) => (
                    <div
                      key={item.lineNumber}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border"
                      data-testid={`line-item-${item.lineNumber}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900">{item.itemName}</p>
                        {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                        <p className="text-xs text-slate-400 mt-1">
                          Qty: {item.quantity} {item.unitPrice ? `× ${formatCurrency(item.unitPrice)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.amount ? (
                          <span className="font-medium text-slate-700">{formatCurrency(item.amount)}</span>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.lineNumber)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-remove-item-${item.lineNumber}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
                <Camera className="w-4 h-4" />
                Attachments from Office
              </Label>
              <div className="flex items-center gap-2 mb-3">
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
                    (file as any).meta.objectPath = objectPath;
                    return {
                      method: "PUT" as const,
                      url: uploadURL,
                      headers: { "Content-Type": file.type },
                    };
                  }}
                  onComplete={async (result) => {
                    const uploadedFiles = result.successful || [];
                    const newAttachments: PhotoAttachment[] = [];
                    for (const file of uploadedFiles) {
                      const objectPath = (file as any).meta?.objectPath;
                      if (objectPath) {
                        try {
                          await fetch("/api/uploads/confirm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ objectPath }),
                          });
                          newAttachments.push({ url: objectPath, caption: "" });
                        } catch (error) {
                          console.error("Failed to confirm upload:", error);
                        }
                      }
                    }
                    if (newAttachments.length > 0) {
                      setFormData(prev => ({ 
                        ...prev, 
                        photoAttachments: [...prev.photoAttachments, ...newAttachments],
                        photos: [...prev.photos, ...newAttachments.map(a => a.url)] 
                      }));
                    }
                  }}
                  buttonClassName="bg-[#0077b6] text-white hover:bg-[#005f8f]"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Add Photos
                </ObjectUploader>
                <span className="text-xs text-slate-400">Max 10 MB per photo</span>
              </div>
              {formData.photoAttachments.length > 0 ? (
                <div className="space-y-4">
                  {formData.photoAttachments.map((attachment, index) => (
                    <div key={index} className="bg-white rounded-lg border p-3">
                      <div className="flex gap-3">
                        <div className="relative group flex-shrink-0">
                          <img
                            src={attachment.url}
                            alt={`Attachment ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                photoAttachments: prev.photoAttachments.filter((_, i) => i !== index),
                                photos: prev.photos.filter(p => p !== attachment.url),
                              }));
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-remove-photo-${index}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-slate-500">Caption</Label>
                          <Input
                            value={attachment.caption}
                            onChange={(e) => {
                              const newAttachments = [...formData.photoAttachments];
                              newAttachments[index] = { ...newAttachments[index], caption: e.target.value };
                              setFormData(prev => ({ ...prev, photoAttachments: newAttachments }));
                            }}
                            placeholder="e.g., Current pump motor - note the rust on housing"
                            className="mt-1 text-sm"
                            data-testid={`input-photo-caption-${index}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400 border-2 border-dashed rounded-lg">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No attachments added yet</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border space-y-4">
              <Label className="text-sm font-medium text-slate-700">Notes</Label>
              <div>
                <Label className="text-xs text-slate-500">Customer Note (visible on request)</Label>
                <Textarea
                  value={formData.customerNote}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerNote: e.target.value }))}
                  placeholder="Note visible to customer..."
                  rows={2}
                  className="mt-1 resize-none"
                  data-testid="textarea-customer-note"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Memo (internal)</Label>
                <Textarea
                  value={formData.memo}
                  onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder="Internal memo..."
                  rows={2}
                  className="mt-1 resize-none"
                  data-testid="textarea-memo"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Tech Notes (internal)</Label>
                <Textarea
                  value={formData.techNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, techNotes: e.target.value }))}
                  placeholder="Technical notes..."
                  rows={2}
                  className="mt-1 resize-none"
                  data-testid="textarea-tech-notes"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
                <User className="w-4 h-4" />
                Reported By
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Role</Label>
                  <Select
                    value={formData.reportedBy}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, reportedBy: value }))}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-rr-reported-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service_tech">Service Tech</SelectItem>
                      <SelectItem value="repair_tech">Repair Tech</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="office_staff">Office Staff</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Name</Label>
                  <Input
                    value={formData.reportedByName}
                    onChange={(e) => setFormData(prev => ({ ...prev, reportedByName: e.target.value }))}
                    placeholder="Reporter name..."
                    className="mt-1 h-9"
                    data-testid="input-rr-reporter-name"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#1e3a5f]/5 rounded-lg border border-[#1e3a5f]/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(calculateTotals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Estimated Cost:</span>
                <span className="font-medium">{formatCurrency(calculateTotals.estimatedCost)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-base font-semibold text-slate-900">TOTAL:</span>
                <span className="text-xl font-bold text-[#1e3a5f]">{formatCurrency(calculateTotals.total)}</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-white flex items-center justify-between flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={createMutation.isPending}
            data-testid="button-save-draft"
          >
            Save Draft
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-rr"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={!formData.propertyId || !formData.issueDescription || createMutation.isPending}
              className="bg-[#f97316] hover:bg-[#ea580c] text-white"
              data-testid="button-submit-rr"
            >
              {createMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
