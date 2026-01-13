import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Plus, Search, MapPin, Phone, Mail, User, DollarSign,
  Calendar, Tag, Lock, FileText, Edit2, Trash2, Save, Loader2, X
} from "lucide-react";
import type { Property } from "@shared/schema";

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "$0.00";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: "bg-green-100 text-green-700 border-green-200", label: "Active" },
  inactive: { color: "bg-slate-100 text-slate-600 border-slate-200", label: "Inactive" },
  lead: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Lead" },
};

const propertyTypeConfig: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  hoa: "HOA/Community",
};

const emptyPropertyForm = {
  name: "",
  customerName: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  billingAddress: "",
  billingCity: "",
  billingState: "",
  billingZip: "",
  primaryContactName: "",
  primaryContactPhone: "",
  primaryContactEmail: "",
  secondaryContactName: "",
  secondaryContactPhone: "",
  secondaryContactEmail: "",
  gateCode: "",
  accessInstructions: "",
  zone: "",
  notes: "",
  status: "active",
  propertyType: "commercial",
  monthlyRate: "",
};

export default function PropertyProfiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties");
      if (!response.ok) throw new Error("Failed to fetch properties");
      return response.json();
    },
  });

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const filteredProperties = properties.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.zone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create property");
      return response.json();
    },
    onSuccess: (newProperty) => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setShowAddDialog(false);
      setPropertyForm(emptyPropertyForm);
      setSelectedPropertyId(newProperty.id);
      toast({ title: "Property Created", description: "Property profile has been added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create property", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update property");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setIsEditing(false);
      toast({ title: "Property Updated", description: "Property profile has been saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update property", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete property");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setSelectedPropertyId(null);
      toast({ title: "Property Deleted", description: "Property profile has been removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete property", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    const data = {
      ...propertyForm,
      monthlyRate: propertyForm.monthlyRate ? Math.round(parseFloat(propertyForm.monthlyRate) * 100) : null,
    };
    createMutation.mutate(data);
  };

  const handleSaveEdit = () => {
    if (!selectedProperty) return;
    const data = {
      ...propertyForm,
      monthlyRate: propertyForm.monthlyRate ? Math.round(parseFloat(propertyForm.monthlyRate) * 100) : null,
    };
    updateMutation.mutate({ id: selectedProperty.id, data });
  };

  const startEditing = () => {
    if (!selectedProperty) return;
    setPropertyForm({
      name: selectedProperty.name || "",
      customerName: selectedProperty.customerName || "",
      address: selectedProperty.address || "",
      city: selectedProperty.city || "",
      state: selectedProperty.state || "",
      zip: selectedProperty.zip || "",
      billingAddress: selectedProperty.billingAddress || "",
      billingCity: selectedProperty.billingCity || "",
      billingState: selectedProperty.billingState || "",
      billingZip: selectedProperty.billingZip || "",
      primaryContactName: selectedProperty.primaryContactName || "",
      primaryContactPhone: selectedProperty.primaryContactPhone || "",
      primaryContactEmail: selectedProperty.primaryContactEmail || "",
      secondaryContactName: selectedProperty.secondaryContactName || "",
      secondaryContactPhone: selectedProperty.secondaryContactPhone || "",
      secondaryContactEmail: selectedProperty.secondaryContactEmail || "",
      gateCode: selectedProperty.gateCode || "",
      accessInstructions: selectedProperty.accessInstructions || "",
      zone: selectedProperty.zone || "",
      notes: selectedProperty.notes || "",
      status: selectedProperty.status || "active",
      propertyType: selectedProperty.propertyType || "commercial",
      monthlyRate: selectedProperty.monthlyRate ? (selectedProperty.monthlyRate / 100).toString() : "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setPropertyForm(emptyPropertyForm);
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-80 border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1E293B]">Properties</h2>
              <Button
                size="sm"
                className="bg-[#1E3A8A] hover:bg-[#1E40AF]"
                onClick={() => {
                  setPropertyForm(emptyPropertyForm);
                  setShowAddDialog(true);
                }}
                data-testid="button-add-property"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search properties..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-properties"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#1E3A8A]" />
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No properties found</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredProperties.map((property) => {
                  const config = statusConfig[property.status || "active"];
                  return (
                    <div
                      key={property.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedPropertyId === property.id
                          ? "bg-[#1E3A8A]/10 border border-[#1E3A8A]/30"
                          : "hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setSelectedPropertyId(property.id);
                        setIsEditing(false);
                      }}
                      data-testid={`property-item-${property.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1E293B] truncate">{property.name}</p>
                          {property.customerName && (
                            <p className="text-xs text-slate-500 truncate">{property.customerName}</p>
                          )}
                        </div>
                        <Badge className={`${config.color} text-xs ml-2`}>{config.label}</Badge>
                      </div>
                      {property.address && (
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {property.address}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto bg-slate-50/50">
          {!selectedProperty ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Building2 className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Select a property to view details</p>
              <p className="text-sm mt-1">Or click + to add a new property</p>
            </div>
          ) : isEditing ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-[#1E3A8A]" />
                  Edit Property
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={cancelEditing}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button
                    className="bg-[#1E3A8A] hover:bg-[#1E40AF]"
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending}
                    data-testid="button-save-property"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <PropertyForm form={propertyForm} setForm={setPropertyForm} />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-[#1E3A8A]/10 flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-[#1E3A8A]" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-[#1E293B]">{selectedProperty.name}</h1>
                        {selectedProperty.customerName && (
                          <p className="text-slate-500">{selectedProperty.customerName}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={statusConfig[selectedProperty.status || "active"]?.color}>
                            {statusConfig[selectedProperty.status || "active"]?.label}
                          </Badge>
                          {selectedProperty.propertyType && (
                            <Badge variant="outline">
                              {propertyTypeConfig[selectedProperty.propertyType] || selectedProperty.propertyType}
                            </Badge>
                          )}
                          {selectedProperty.zone && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Tag className="w-3 h-3 mr-1" />
                              {selectedProperty.zone}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={startEditing} data-testid="button-edit-property">
                        <Edit2 className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(selectedProperty.id)}
                        disabled={deleteMutation.isPending}
                        data-testid="button-delete-property"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="info" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                  <TabsTrigger value="access">Access</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                  <Card>
                    <CardContent className="pt-6 grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#60A5FA]" /> Service Address
                        </h3>
                        <div className="text-sm space-y-1">
                          <p>{selectedProperty.address || "—"}</p>
                          <p>{[selectedProperty.city, selectedProperty.state, selectedProperty.zip].filter(Boolean).join(", ") || "—"}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-[#F97316]" /> Financial
                        </h3>
                        <div className="text-sm space-y-1">
                          <p><span className="text-slate-500">Monthly Rate:</span> {formatCurrency(selectedProperty.monthlyRate)}</p>
                          <p><span className="text-slate-500">Account Balance:</span> {formatCurrency(selectedProperty.accountBalance)}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#1E3A8A]" /> Service Dates
                        </h3>
                        <div className="text-sm space-y-1">
                          <p><span className="text-slate-500">Last Service:</span> {formatDate(selectedProperty.lastServiceDate)}</p>
                          <p><span className="text-slate-500">Next Service:</span> {formatDate(selectedProperty.nextServiceDate)}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" /> Notes
                        </h3>
                        <p className="text-sm text-slate-600">{selectedProperty.notes || "No notes"}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="contacts">
                  <Card>
                    <CardContent className="pt-6 grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-[#1E293B] flex items-center gap-2">
                          <User className="w-4 h-4 text-[#1E3A8A]" /> Primary Contact
                        </h3>
                        <div className="text-sm space-y-2">
                          <p className="font-medium">{selectedProperty.primaryContactName || "—"}</p>
                          {selectedProperty.primaryContactPhone && (
                            <p className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-3 h-3" /> {selectedProperty.primaryContactPhone}
                            </p>
                          )}
                          {selectedProperty.primaryContactEmail && (
                            <p className="flex items-center gap-2 text-slate-600">
                              <Mail className="w-3 h-3" /> {selectedProperty.primaryContactEmail}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-semibold text-[#1E293B] flex items-center gap-2">
                          <User className="w-4 h-4 text-[#60A5FA]" /> Secondary Contact
                        </h3>
                        <div className="text-sm space-y-2">
                          <p className="font-medium">{selectedProperty.secondaryContactName || "—"}</p>
                          {selectedProperty.secondaryContactPhone && (
                            <p className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-3 h-3" /> {selectedProperty.secondaryContactPhone}
                            </p>
                          )}
                          {selectedProperty.secondaryContactEmail && (
                            <p className="flex items-center gap-2 text-slate-600">
                              <Mail className="w-3 h-3" /> {selectedProperty.secondaryContactEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="billing">
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#F97316]" /> Billing Address
                      </h3>
                      <div className="text-sm space-y-1">
                        <p>{selectedProperty.billingAddress || selectedProperty.address || "Same as service address"}</p>
                        <p>
                          {[
                            selectedProperty.billingCity || selectedProperty.city,
                            selectedProperty.billingState || selectedProperty.state,
                            selectedProperty.billingZip || selectedProperty.zip
                          ].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="access">
                  <Card>
                    <CardContent className="pt-6 grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-[#F97316]" /> Gate Code
                        </h3>
                        <p className="text-lg font-mono bg-slate-100 px-3 py-2 rounded inline-block">
                          {selectedProperty.gateCode || "—"}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#1E3A8A]" /> Access Instructions
                        </h3>
                        <p className="text-sm text-slate-600">
                          {selectedProperty.accessInstructions || "No special access instructions"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Add Property Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1E3A8A]" />
              Add Property
            </DialogTitle>
          </DialogHeader>
          <PropertyForm form={propertyForm} setForm={setPropertyForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#1E3A8A] hover:bg-[#1E40AF]"
              onClick={handleCreate}
              disabled={!propertyForm.name || createMutation.isPending}
              data-testid="button-create-property"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Add Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function PropertyForm({ form, setForm }: { form: typeof emptyPropertyForm; setForm: (f: typeof emptyPropertyForm) => void }) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h3 className="font-medium text-[#1E293B] mb-3">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Property Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Sunset Palms HOA"
              data-testid="input-property-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Customer/Account Name</Label>
            <Input
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="e.g., Sunset Property Management"
              data-testid="input-customer-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Property Type</Label>
            <Select value={form.propertyType} onValueChange={(v) => setForm({ ...form, propertyType: v })}>
              <SelectTrigger data-testid="select-property-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="hoa">HOA/Community</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Service Address */}
      <div>
        <h3 className="font-medium text-[#1E293B] mb-3">Service Address</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Street Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main St"
              data-testid="input-address"
            />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="City"
              data-testid="input-city"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="FL"
                data-testid="input-state"
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                placeholder="33701"
                data-testid="input-zip"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Primary Contact */}
      <div>
        <h3 className="font-medium text-[#1E293B] mb-3">Primary Contact</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.primaryContactName}
              onChange={(e) => setForm({ ...form, primaryContactName: e.target.value })}
              placeholder="John Smith"
              data-testid="input-primary-contact-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.primaryContactPhone}
              onChange={(e) => setForm({ ...form, primaryContactPhone: e.target.value })}
              placeholder="(555) 123-4567"
              data-testid="input-primary-contact-phone"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={form.primaryContactEmail}
              onChange={(e) => setForm({ ...form, primaryContactEmail: e.target.value })}
              placeholder="john@example.com"
              data-testid="input-primary-contact-email"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Access & Zone */}
      <div>
        <h3 className="font-medium text-[#1E293B] mb-3">Access & Zone</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Gate Code</Label>
            <Input
              value={form.gateCode}
              onChange={(e) => setForm({ ...form, gateCode: e.target.value })}
              placeholder="#1234"
              data-testid="input-gate-code"
            />
          </div>
          <div className="space-y-2">
            <Label>Zone / Territory</Label>
            <Input
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              placeholder="Zone A"
              data-testid="input-zone"
            />
          </div>
          <div className="space-y-2">
            <Label>Monthly Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.monthlyRate}
              onChange={(e) => setForm({ ...form, monthlyRate: e.target.value })}
              placeholder="150.00"
              data-testid="input-monthly-rate"
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>Access Instructions</Label>
          <Textarea
            value={form.accessInstructions}
            onChange={(e) => setForm({ ...form, accessInstructions: e.target.value })}
            placeholder="Special access instructions for technicians..."
            rows={2}
            data-testid="input-access-instructions"
          />
        </div>
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Additional notes about this property..."
          rows={3}
          data-testid="input-notes"
        />
      </div>
    </div>
  );
}
