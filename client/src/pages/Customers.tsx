import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, Users, Building2, User, MapPin, Phone, Mail,
  MoreVertical, X, ChevronLeft, ChevronRight, Tag, Edit, Trash2,
  Home, FileText, Check, Loader2, Calendar, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  externalId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string | null;
  poolCount: number | null;
  tags: string | null;
  notes: string | null;
}

interface Property {
  id: string;
  customerId: string;
  label: string;
  street: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  routeScheduleId: string | null;
  serviceLevel: string | null;
}

interface Contact {
  id: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-green-500" },
  { value: "inactive", label: "Inactive", color: "bg-red-500" },
  { value: "lead", label: "Lead", color: "bg-blue-500" },
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
];

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"
];

const ITEMS_PER_PAGE = 15;

function CustomerListItem({ 
  customer, 
  isSelected,
  onClick 
}: { 
  customer: Customer; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = STATUS_OPTIONS.find(s => s.value === customer.status) || STATUS_OPTIONS[0];
  const tags = customer.tags ? customer.tags.split(",").filter(Boolean) : [];

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors",
        isSelected && "bg-blue-50 border-l-4 border-l-blue-600"
      )}
      data-testid={`customer-row-${customer.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{customer.name}</h3>
            <Badge className={cn("text-white text-xs", status.color)}>
              {status.label}
            </Badge>
          </div>
          {customer.address && (
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {customer.address}{customer.city && `, ${customer.city}`}{customer.state && `, ${customer.state}`}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {customer.email}
              </span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag.trim()}
                </Badge>
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-slate-400">+{tags.length - 3} more</span>
              )}
            </div>
          )}
        </div>
        <div className="text-right text-sm text-slate-500">
          {customer.poolCount !== null && customer.poolCount > 0 && (
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {customer.poolCount} {customer.poolCount === 1 ? "pool" : "pools"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AddCustomerModal({
  open,
  onClose,
  onSave,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Customer>) => void;
  customer?: Customer | null;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    status: "active",
    tags: "",
    notes: "",
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zip: customer.zip || "",
        status: customer.status || "active",
        tags: customer.tags || "",
        notes: customer.notes || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        status: "active",
        tags: "",
        notes: "",
      });
    }
  }, [customer, open]);

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Customer name"
                data-testid="input-customer-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                data-testid="input-customer-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                data-testid="input-customer-phone"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
              data-testid="input-customer-address"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="ZIP Code"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="VIP, Commercial, Weekly"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this customer..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {customer ? "Save Changes" : "Add Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPropertyModal({
  open,
  onClose,
  onSave,
  customerId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Property>) => void;
  customerId: string;
}) {
  const [formData, setFormData] = useState({
    label: "Primary",
    street: "",
    city: "",
    state: "",
    zip: "",
    serviceLevel: "",
  });

  const handleSubmit = () => {
    if (!formData.street.trim()) return;
    onSave({ ...formData, customerId });
    setFormData({ label: "Primary", street: "", city: "", state: "", zip: "", serviceLevel: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Property</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Select
              value={formData.label}
              onValueChange={(value) => setFormData({ ...formData, label: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Primary">Primary</SelectItem>
                <SelectItem value="Billing">Billing</SelectItem>
                <SelectItem value="Service">Service</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Street Address *</Label>
            <Input
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Service Level</Label>
            <Select
              value={formData.serviceLevel}
              onValueChange={(value) => setFormData({ ...formData, serviceLevel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="ondemand">On Demand</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.street.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Property
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddContactModal({
  open,
  onClose,
  onSave,
  customerId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Contact>) => void;
  customerId: string;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "Primary",
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    onSave({ ...formData, customerId });
    setFormData({ name: "", email: "", phone: "", type: "Primary" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contact name"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Primary">Primary</SelectItem>
                <SelectItem value="Billing">Billing</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetailPanel({
  customer,
  onClose,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState("properties");
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const queryClient = useQueryClient();

  const status = STATUS_OPTIONS.find(s => s.value === customer.status) || STATUS_OPTIONS[0];
  const tags = customer.tags ? customer.tags.split(",").filter(Boolean) : [];

  const { data: propertiesData } = useQuery<{ properties: Property[] }>({
    queryKey: ["/api/customers", customer.id, "properties"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customer.id}/properties`);
      if (!res.ok) return { properties: [] };
      return res.json();
    },
  });

  const { data: contactsData } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["/api/customers", customer.id, "contacts"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customer.id}/contacts`);
      if (!res.ok) return { contacts: [] };
      return res.json();
    },
  });

  const properties = propertiesData?.properties || [];
  const contacts = contactsData?.contacts || [];

  const addPropertyMutation = useMutation({
    mutationFn: async (data: Partial<Property>) => {
      const res = await fetch(`/api/customers/${customer.id}/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "properties"] });
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const res = await fetch(`/api/customers/${customer.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "contacts"] });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const res = await fetch(`/api/customers/${customer.id}/properties/${propertyId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "properties"] });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await fetch(`/api/customers/${customer.id}/contacts/${contactId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "contacts"] });
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">{customer.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn("text-white text-xs", status.color)}>
                {status.label}
              </Badge>
              {customer.poolCount !== null && customer.poolCount > 0 && (
                <span className="text-xs text-slate-500">
                  {customer.poolCount} {customer.poolCount === 1 ? "pool" : "pools"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-b space-y-3">
        {customer.address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{customer.address}{customer.city && `, ${customer.city}`}{customer.state && `, ${customer.state}`} {customer.zip}</span>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-slate-400" />
            <span>{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-slate-400" />
            <span>{customer.email}</span>
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-slate-400" />
            {tags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag.trim()}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-white px-4">
          <TabsTrigger value="properties" className="gap-1">
            <Home className="h-4 w-4" />
            Properties ({properties.length})
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1">
            <Users className="h-4 w-4" />
            Contacts ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1">
            <FileText className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="route" className="gap-1">
            <Calendar className="h-4 w-4" />
            Route
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="flex-1 m-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Properties</h3>
            <Button size="sm" onClick={() => setShowAddProperty(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Add Property
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-450px)]">
            {properties.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No properties yet</p>
                <Button variant="link" size="sm" onClick={() => setShowAddProperty(true)}>
                  Add first property
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.map((prop) => (
                  <Card key={prop.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{prop.label}</Badge>
                            {prop.routeScheduleId && (
                              <Badge className="bg-green-500 text-white text-xs">Scheduled</Badge>
                            )}
                          </div>
                          <p className="mt-2 font-medium">{prop.street}</p>
                          <p className="text-sm text-slate-500">
                            {prop.city && `${prop.city}, `}{prop.state} {prop.zip}
                          </p>
                          {prop.serviceLevel && (
                            <p className="text-xs text-slate-400 mt-1">Service: {prop.serviceLevel}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onSelect={(e) => {
                                e.preventDefault();
                                if (confirm("Are you sure you want to delete this property?")) {
                                  deletePropertyMutation.mutate(prop.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 m-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Contacts</h3>
            <Button size="sm" onClick={() => setShowAddContact(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Add Contact
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-450px)]">
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No contacts yet</p>
                <Button variant="link" size="sm" onClick={() => setShowAddContact(true)}>
                  Add first contact
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <Card key={contact.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-slate-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{contact.name}</p>
                              <Badge variant="outline" className="text-xs">{contact.type}</Badge>
                            </div>
                            {contact.email && (
                              <p className="text-sm text-slate-500">{contact.email}</p>
                            )}
                            {contact.phone && (
                              <p className="text-sm text-slate-500">{contact.phone}</p>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onSelect={(e) => {
                                e.preventDefault();
                                if (confirm("Are you sure you want to delete this contact?")) {
                                  deleteContactMutation.mutate(contact.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 m-0 p-4">
          <h3 className="font-semibold text-slate-700 mb-4">Notes</h3>
          <div className="bg-white rounded-lg border p-4 min-h-[200px]">
            {customer.notes ? (
              <p className="text-slate-600 whitespace-pre-wrap">{customer.notes}</p>
            ) : (
              <p className="text-slate-400 italic">No notes for this customer</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="route" className="flex-1 m-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Route Schedule</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Activate Route Schedule</span>
              <Switch />
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-4">
              <Card className="bg-white">
                <CardContent className="p-4">
                  <h4 className="font-medium text-slate-700 mb-3">Weekly Schedule</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                      <div key={day} className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                          {day.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-600">{day}</p>
                          <p className="text-xs text-slate-400">Not scheduled</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <h4 className="font-medium text-slate-700 mb-3">How Often</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="frequency" defaultChecked className="text-blue-600" />
                      <span className="text-sm">Once a week</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="frequency" className="text-blue-600" />
                      <span className="text-sm">Every other week</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="frequency" className="text-blue-600" />
                      <span className="text-sm">Every (x) weeks</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <h4 className="font-medium text-slate-700 mb-3">Multiple Visits Per Week</h4>
                  <div className="flex gap-2">
                    {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
                      <Button 
                        key={day} 
                        variant="outline" 
                        size="sm"
                        className="text-xs px-2 py-1"
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <h4 className="font-medium text-slate-700 mb-3">Route Notes</h4>
                  <Textarea 
                    placeholder="Add notes about route schedule..."
                    className="min-h-[100px]"
                  />
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <AddPropertyModal
        open={showAddProperty}
        onClose={() => setShowAddProperty(false)}
        onSave={(data) => addPropertyMutation.mutate(data)}
        customerId={customer.id}
      />

      <AddContactModal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
        onSave={(data) => addContactMutation.mutate(data)}
        customerId={customer.id}
      />
    </div>
  );
}

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const queryClient = useQueryClient();

  const { data: customersData, isLoading } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/customers"],
  });

  const customers = customersData?.customers || [];

  const addCustomerMutation = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowAddCustomer(false);
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditingCustomer(null);
      if (selectedCustomer) {
        queryClient.invalidateQueries({ queryKey: ["/api/customers", selectedCustomer.id] });
      }
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setSelectedCustomer(null);
    },
  });

  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.address || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.tags || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-60px)]">
        <div className={cn(
          "flex flex-col border-r bg-white transition-all duration-300",
          selectedCustomer ? "w-1/2" : "w-full"
        )}>
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
              <Button 
                onClick={() => setShowAddCustomer(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Customer
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search customers by name, address, email, phone, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-customers"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : paginatedCustomers.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{searchQuery || statusFilter !== "all" ? "No customers match your search" : "No customers yet"}</p>
                {!searchQuery && statusFilter === "all" && (
                  <Button variant="link" onClick={() => setShowAddCustomer(true)}>
                    Add your first customer
                  </Button>
                )}
              </div>
            ) : (
              paginatedCustomers.map((customer) => (
                <CustomerListItem
                  key={customer.id}
                  customer={customer}
                  isSelected={selectedCustomer?.id === customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                />
              ))
            )}
          </ScrollArea>

          <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Showing {filteredCustomers.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredCustomers.length)} of {filteredCustomers.length} customers
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            )}
          </div>
        </div>

        {selectedCustomer && (
          <div className="flex-1 bg-slate-50 overflow-hidden">
            <CustomerDetailPanel
              customer={selectedCustomer}
              onClose={() => setSelectedCustomer(null)}
              onEdit={() => setEditingCustomer(selectedCustomer)}
              onDelete={() => {
                if (confirm("Are you sure you want to delete this customer?")) {
                  deleteCustomerMutation.mutate(selectedCustomer.id);
                }
              }}
            />
          </div>
        )}
      </div>

      <AddCustomerModal
        open={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSave={(data) => addCustomerMutation.mutate(data)}
      />

      <AddCustomerModal
        open={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSave={(data) => {
          if (editingCustomer) {
            updateCustomerMutation.mutate({ id: editingCustomer.id, data });
          }
        }}
        customer={editingCustomer}
      />
    </AppLayout>
  );
}
