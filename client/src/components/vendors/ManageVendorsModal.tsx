import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Pencil, Trash2, Loader2, Building2, User, Mail, Phone, MapPin, FileText,
  Check, X
} from "lucide-react";
import type { ChemicalVendor, InvoiceTemplate } from "@shared/schema";

interface ManageVendorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageVendorsModal({ open, onOpenChange }: ManageVendorsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("vendors");
  const [editingVendor, setEditingVendor] = useState<ChemicalVendor | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);

  const [vendorForm, setVendorForm] = useState({
    vendorName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    isActive: true,
  });

  const [templateForm, setTemplateForm] = useState({
    templateName: "",
    headerText: "",
    footerText: "",
    termsConditions: "",
    isDefault: false,
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await fetch("/api/vendors");
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["invoice-templates"],
    queryFn: async () => {
      const res = await fetch("/api/invoice-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (vendor: typeof vendorForm) => {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor),
      });
      if (!res.ok) throw new Error("Failed to create vendor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setShowAddVendor(false);
      resetVendorForm();
      toast({ title: "Vendor created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create vendor", variant: "destructive" });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: typeof vendorForm }) => {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update vendor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setEditingVendor(null);
      resetVendorForm();
      toast({ title: "Vendor updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update vendor", variant: "destructive" });
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
      toast({ title: "Vendor deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete vendor", variant: "destructive" });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: typeof templateForm) => {
      const res = await fetch("/api/invoice-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      setShowAddTemplate(false);
      resetTemplateForm();
      toast({ title: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: typeof templateForm }) => {
      const res = await fetch(`/api/invoice-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      setEditingTemplate(null);
      resetTemplateForm();
      toast({ title: "Template updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoice-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const resetVendorForm = () => {
    setVendorForm({
      vendorName: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      isActive: true,
    });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      templateName: "",
      headerText: "",
      footerText: "",
      termsConditions: "",
      isDefault: false,
    });
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
      isActive: vendor.isActive ?? true,
    });
  };

  const handleEditTemplate = (template: InvoiceTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      templateName: template.templateName,
      headerText: template.headerText || "",
      footerText: template.footerText || "",
      termsConditions: template.termsConditions || "",
      isDefault: template.isDefault ?? false,
    });
  };

  const handleSaveVendor = () => {
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, updates: vendorForm });
    } else {
      createVendorMutation.mutate(vendorForm);
    }
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, updates: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const handleCancelVendor = () => {
    setEditingVendor(null);
    setShowAddVendor(false);
    resetVendorForm();
  };

  const handleCancelTemplate = () => {
    setEditingTemplate(null);
    setShowAddTemplate(false);
    resetTemplateForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0078D4]" />
            Manage Vendors & Templates
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vendors" data-testid="tab-vendors">
              Vendors ({vendors.length})
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">
              Invoice Templates ({templates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="space-y-4">
            {showAddVendor || editingVendor ? (
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                <h3 className="font-semibold text-slate-800">
                  {editingVendor ? "Edit Vendor" : "Add New Vendor"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vendor Name *</Label>
                    <Input
                      value={vendorForm.vendorName}
                      onChange={(e) => setVendorForm({ ...vendorForm, vendorName: e.target.value })}
                      placeholder="ABC Chemical Supply"
                      data-testid="input-vendor-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input
                      value={vendorForm.contactPerson}
                      onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                      placeholder="John Smith"
                      data-testid="input-contact-person"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      placeholder="orders@abcchemical.com"
                      data-testid="input-vendor-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      data-testid="input-vendor-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    placeholder="123 Chemical Ave, Phoenix, AZ 85001"
                    data-testid="input-vendor-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (account numbers, special instructions)</Label>
                  <Textarea
                    value={vendorForm.notes}
                    onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                    placeholder="Account #12345, Net 30 terms..."
                    rows={3}
                    data-testid="input-vendor-notes"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelVendor} data-testid="button-cancel-vendor">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveVendor}
                    disabled={!vendorForm.vendorName || createVendorMutation.isPending || updateVendorMutation.isPending}
                    className="bg-[#0078D4] hover:bg-[#1E40AF] text-white"
                    data-testid="button-save-vendor"
                  >
                    {(createVendorMutation.isPending || updateVendorMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingVendor ? "Save Changes" : "Add Vendor"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowAddVendor(true)}
                className="w-full bg-[#0078D4] hover:bg-[#1E40AF] text-white"
                data-testid="button-add-vendor"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Vendor
              </Button>
            )}

            <ScrollArea className="h-[350px]">
              {vendorsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : vendors.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No vendors yet</p>
                  <p className="text-sm">Add your first vendor to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vendors.map((vendor: ChemicalVendor) => (
                    <div
                      key={vendor.id}
                      className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm"
                      data-testid={`vendor-card-${vendor.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-800">{vendor.vendorName}</h4>
                            <Badge className={vendor.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                              {vendor.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {vendor.contactPerson && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <User className="w-3 h-3" />
                              {vendor.contactPerson}
                            </div>
                          )}
                          {vendor.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="w-3 h-3" />
                              {vendor.email}
                            </div>
                          )}
                          {vendor.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="w-3 h-3" />
                              {vendor.phone}
                            </div>
                          )}
                          {vendor.address && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <MapPin className="w-3 h-3" />
                              {vendor.address}
                            </div>
                          )}
                          {vendor.notes && (
                            <p className="text-sm text-slate-500 italic">{vendor.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditVendor(vendor)}
                            data-testid={`button-edit-vendor-${vendor.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteVendorMutation.mutate(vendor.id)}
                            data-testid={`button-delete-vendor-${vendor.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            {showAddTemplate || editingTemplate ? (
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                <h3 className="font-semibold text-slate-800">
                  {editingTemplate ? "Edit Template" : "Add New Template"}
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Template Name *</Label>
                      <Input
                        value={templateForm.templateName}
                        onChange={(e) => setTemplateForm({ ...templateForm, templateName: e.target.value })}
                        placeholder="Standard Invoice"
                        data-testid="input-template-name"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={templateForm.isDefault}
                        onChange={(e) => setTemplateForm({ ...templateForm, isDefault: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="isDefault">Set as Default</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Header Text</Label>
                    <Textarea
                      value={templateForm.headerText}
                      onChange={(e) => setTemplateForm({ ...templateForm, headerText: e.target.value })}
                      placeholder="Company name, address, logo description..."
                      rows={2}
                      data-testid="input-template-header"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Footer Text</Label>
                    <Textarea
                      value={templateForm.footerText}
                      onChange={(e) => setTemplateForm({ ...templateForm, footerText: e.target.value })}
                      placeholder="Thank you for your business..."
                      rows={2}
                      data-testid="input-template-footer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Terms & Conditions</Label>
                    <Textarea
                      value={templateForm.termsConditions}
                      onChange={(e) => setTemplateForm({ ...templateForm, termsConditions: e.target.value })}
                      placeholder="Net 30 payment terms..."
                      rows={3}
                      data-testid="input-template-terms"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelTemplate} data-testid="button-cancel-template">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={!templateForm.templateName || createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    className="bg-[#0078D4] hover:bg-[#1E40AF] text-white"
                    data-testid="button-save-template"
                  >
                    {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingTemplate ? "Save Changes" : "Add Template"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowAddTemplate(true)}
                className="w-full bg-[#0078D4] hover:bg-[#1E40AF] text-white"
                data-testid="button-add-template"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Invoice Template
              </Button>
            )}

            <ScrollArea className="h-[350px]">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No templates yet</p>
                  <p className="text-sm">Add your first invoice template</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template: InvoiceTemplate) => (
                    <div
                      key={template.id}
                      className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm"
                      data-testid={`template-card-${template.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#0078D4]" />
                            <h4 className="font-semibold text-slate-800">{template.templateName}</h4>
                            {template.isDefault && (
                              <Badge className="bg-[#0078D4]/10 text-[#0078D4]">Default</Badge>
                            )}
                          </div>
                          {template.headerText && (
                            <p className="text-sm text-slate-600 line-clamp-1">Header: {template.headerText}</p>
                          )}
                          {template.footerText && (
                            <p className="text-sm text-slate-600 line-clamp-1">Footer: {template.footerText}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditTemplate(template)}
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
