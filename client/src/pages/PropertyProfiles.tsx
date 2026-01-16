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
  Calendar, Tag, Lock, FileText, Edit2, Trash2, Save, Loader2, X, Receipt
} from "lucide-react";
import type { Property, PropertyContact, PropertyBillingContact, PropertyAccessNote } from "@shared/schema";

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "$0.00";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: "bg-[#22D69A]1A text-[#22D69A] border-[#22D69A]33", label: "Active" },
  inactive: { color: "bg-slate-100 text-slate-600 border-slate-200", label: "Inactive" },
  lead: { color: "bg-[#2374AB]1A text-[#2374AB] border-[#2374AB]33", label: "Lead" },
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
  gateCode: "",
  accessInstructions: "",
  zone: "",
  notes: "",
  status: "active",
  propertyType: "commercial",
  monthlyRate: "",
};

const emptyContactForm = { name: "", role: "", phone: "", email: "", isPrimary: false };
const emptyBillingForm = { contactType: "primary", name: "", email: "" };
const emptyAccessNoteForm = { noteType: "gate_code", title: "", content: "" };

export default function PropertyProfiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);
  
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState(emptyContactForm);
  
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [billingForm, setBillingForm] = useState(emptyBillingForm);
  
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [accessForm, setAccessForm] = useState(emptyAccessNoteForm);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties");
      if (!response.ok) throw new Error("Failed to fetch properties");
      return response.json();
    },
  });

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const { data: contacts = [] } = useQuery<PropertyContact[]>({
    queryKey: ["property-contacts", selectedPropertyId],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${selectedPropertyId}/contacts`);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
    enabled: !!selectedPropertyId,
  });

  const { data: billingContacts = [] } = useQuery<PropertyBillingContact[]>({
    queryKey: ["property-billing", selectedPropertyId],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${selectedPropertyId}/billing`);
      if (!response.ok) throw new Error("Failed to fetch billing contacts");
      return response.json();
    },
    enabled: !!selectedPropertyId,
  });

  const { data: accessNotes = [] } = useQuery<PropertyAccessNote[]>({
    queryKey: ["property-access", selectedPropertyId],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${selectedPropertyId}/access-notes`);
      if (!response.ok) throw new Error("Failed to fetch access notes");
      return response.json();
    },
    enabled: !!selectedPropertyId,
  });

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

  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/properties/${selectedPropertyId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create contact");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-contacts", selectedPropertyId] });
      setShowContactDialog(false);
      setContactForm(emptyContactForm);
      toast({ title: "Contact Added" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await fetch(`/api/properties/${selectedPropertyId}/contacts/${contactId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete contact");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-contacts", selectedPropertyId] });
      toast({ title: "Contact Removed" });
    },
  });

  const createBillingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/properties/${selectedPropertyId}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create billing contact");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-billing", selectedPropertyId] });
      setShowBillingDialog(false);
      setBillingForm(emptyBillingForm);
      toast({ title: "Billing Contact Added" });
    },
  });

  const deleteBillingMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await fetch(`/api/properties/${selectedPropertyId}/billing/${contactId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete billing contact");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-billing", selectedPropertyId] });
      toast({ title: "Billing Contact Removed" });
    },
  });

  const createAccessMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/properties/${selectedPropertyId}/access-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create access note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-access", selectedPropertyId] });
      setShowAccessDialog(false);
      setAccessForm(emptyAccessNoteForm);
      toast({ title: "Access Note Added" });
    },
  });

  const deleteAccessMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(`/api/properties/${selectedPropertyId}/access-notes/${noteId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete access note");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-access", selectedPropertyId] });
      toast({ title: "Access Note Removed" });
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
                className="bg-[#2374AB] hover:bg-[#1E40AF]"
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
                <Loader2 className="w-6 h-6 animate-spin text-[#2374AB]" />
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
                          ? "bg-[#2374AB]/10 border border-[#2374AB]/30"
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
                  <Edit2 className="w-5 h-5 text-[#2374AB]" />
                  Edit Property
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={cancelEditing}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button
                    className="bg-[#2374AB] hover:bg-[#1E40AF]"
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
                      <div className="w-14 h-14 rounded-lg bg-[#2374AB]/10 flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-[#2374AB]" />
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
                            <Badge variant="outline" className="bg-[#2374AB]1A text-[#2374AB] border-[#2374AB]33">
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
                          <DollarSign className="w-4 h-4 text-[#FF8000]" /> Financial
                        </h3>
                        <div className="text-sm space-y-1">
                          <p><span className="text-slate-500">Monthly Rate:</span> {formatCurrency(selectedProperty.monthlyRate)}</p>
                          <p><span className="text-slate-500">Account Balance:</span> {formatCurrency(selectedProperty.accountBalance)}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1E293B] mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#2374AB]" /> Service Dates
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
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-[#2374AB]" />
                        Contacts
                      </CardTitle>
                      <Button
                        size="sm"
                        className="bg-[#2374AB] hover:bg-[#1E40AF]"
                        onClick={() => {
                          setContactForm(emptyContactForm);
                          setShowContactDialog(true);
                        }}
                        data-testid="button-add-contact"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Contact
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {contacts.length === 0 ? (
                        <p className="text-slate-500 text-center py-6">No contacts added yet</p>
                      ) : (
                        <div className="space-y-3">
                          {contacts.map((contact) => (
                            <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{contact.name}</p>
                                  {contact.isPrimary && (
                                    <Badge className="bg-[#2374AB]1A text-[#2374AB] text-xs">Primary</Badge>
                                  )}
                                  {contact.role && (
                                    <Badge variant="outline" className="text-xs">{contact.role}</Badge>
                                  )}
                                </div>
                                <div className="flex gap-4 text-sm text-slate-500">
                                  {contact.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" /> {contact.phone}
                                    </span>
                                  )}
                                  {contact.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" /> {contact.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteContactMutation.mutate(contact.id)}
                                data-testid={`button-delete-contact-${contact.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="billing">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-[#FF8000]" />
                        Billing Contacts
                      </CardTitle>
                      <Button
                        size="sm"
                        className="bg-[#FF8000] hover:bg-[#EA580C]"
                        onClick={() => {
                          setBillingForm(emptyBillingForm);
                          setShowBillingDialog(true);
                        }}
                        data-testid="button-add-billing"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Billing Contact
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Billing Address</h4>
                        <p className="text-sm text-slate-600">
                          {selectedProperty.billingAddress || selectedProperty.address || "Same as service address"}
                        </p>
                        <p className="text-sm text-slate-600">
                          {[
                            selectedProperty.billingCity || selectedProperty.city,
                            selectedProperty.billingState || selectedProperty.state,
                            selectedProperty.billingZip || selectedProperty.zip
                          ].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                      {billingContacts.length === 0 ? (
                        <p className="text-slate-500 text-center py-6">No billing contacts added yet</p>
                      ) : (
                        <div className="space-y-3">
                          {billingContacts.map((contact) => (
                            <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{contact.name || contact.email}</p>
                                  <Badge variant="outline" className="text-xs capitalize">{contact.contactType}</Badge>
                                </div>
                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {contact.email}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteBillingMutation.mutate(contact.id)}
                                data-testid={`button-delete-billing-${contact.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="access">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lock className="w-5 h-5 text-[#60A5FA]" />
                        Access Information
                      </CardTitle>
                      <Button
                        size="sm"
                        className="bg-[#60A5FA] hover:bg-[#3B82F6]"
                        onClick={() => {
                          setAccessForm(emptyAccessNoteForm);
                          setShowAccessDialog(true);
                        }}
                        data-testid="button-add-access"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Access Note
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {selectedProperty.gateCode && (
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">Gate Code</h4>
                          <p className="text-lg font-mono">{selectedProperty.gateCode}</p>
                        </div>
                      )}
                      {selectedProperty.accessInstructions && (
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">General Access Instructions</h4>
                          <p className="text-sm text-slate-600">{selectedProperty.accessInstructions}</p>
                        </div>
                      )}
                      {accessNotes.length === 0 ? (
                        <p className="text-slate-500 text-center py-6">No additional access notes</p>
                      ) : (
                        <div className="space-y-3">
                          {accessNotes.map((note) => (
                            <div key={note.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{note.title}</p>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {note.noteType.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                                {note.content && (
                                  <p className="text-sm text-slate-600">{note.content}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteAccessMutation.mutate(note.id)}
                                data-testid={`button-delete-access-${note.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
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
              <Building2 className="w-5 h-5 text-[#2374AB]" />
              Add Property
            </DialogTitle>
          </DialogHeader>
          <PropertyForm form={propertyForm} setForm={setPropertyForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#2374AB] hover:bg-[#1E40AF]"
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

      {/* Add Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#2374AB]" />
              Add Contact
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                placeholder="John Smith"
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={contactForm.role}
                onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                placeholder="Property Manager"
                data-testid="input-contact-role"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  data-testid="input-contact-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="john@example.com"
                  data-testid="input-contact-email"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContactDialog(false)}>Cancel</Button>
            <Button
              className="bg-[#2374AB] hover:bg-[#1E40AF]"
              onClick={() => createContactMutation.mutate(contactForm)}
              disabled={!contactForm.name || createContactMutation.isPending}
              data-testid="button-save-contact"
            >
              {createContactMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Billing Contact Dialog */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#FF8000]" />
              Add Billing Contact
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Contact Type *</Label>
              <Select value={billingForm.contactType} onValueChange={(v) => setBillingForm({ ...billingForm, contactType: v })}>
                <SelectTrigger data-testid="select-billing-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="repairs">Repairs</SelectItem>
                  <SelectItem value="chemicals">Chemicals</SelectItem>
                  <SelectItem value="accounting">Accounting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={billingForm.name}
                onChange={(e) => setBillingForm({ ...billingForm, name: e.target.value })}
                placeholder="Accounting Dept"
                data-testid="input-billing-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                value={billingForm.email}
                onChange={(e) => setBillingForm({ ...billingForm, email: e.target.value })}
                placeholder="billing@company.com"
                data-testid="input-billing-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBillingDialog(false)}>Cancel</Button>
            <Button
              className="bg-[#FF8000] hover:bg-[#EA580C]"
              onClick={() => createBillingMutation.mutate(billingForm)}
              disabled={!billingForm.email || createBillingMutation.isPending}
              data-testid="button-save-billing"
            >
              {createBillingMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add Billing Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Access Note Dialog */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#60A5FA]" />
              Add Access Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={accessForm.noteType} onValueChange={(v) => setAccessForm({ ...accessForm, noteType: v })}>
                <SelectTrigger data-testid="select-access-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gate_code">Gate Code</SelectItem>
                  <SelectItem value="key_location">Key Location</SelectItem>
                  <SelectItem value="instruction">Instruction</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={accessForm.title}
                onChange={(e) => setAccessForm({ ...accessForm, title: e.target.value })}
                placeholder="e.g., Back Gate Code"
                data-testid="input-access-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={accessForm.content}
                onChange={(e) => setAccessForm({ ...accessForm, content: e.target.value })}
                placeholder="Enter details..."
                rows={3}
                data-testid="input-access-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccessDialog(false)}>Cancel</Button>
            <Button
              className="bg-[#60A5FA] hover:bg-[#3B82F6]"
              onClick={() => createAccessMutation.mutate(accessForm)}
              disabled={!accessForm.title || createAccessMutation.isPending}
              data-testid="button-save-access"
            >
              {createAccessMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add Access Note
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
