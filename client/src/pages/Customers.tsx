import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
  Home, FileText, Check, Loader2, Calendar, Clock, Wrench, Droplets
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

interface Equipment {
  id: string;
  customerId: string;
  poolId: string | null;
  propertyId: string | null;
  category: string;
  equipmentType: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  quantity: number | null;
  photos: string[] | null;
  installDate: string | null;
  warrantyExpiry: string | null;
  notes: string | null;
}

interface Pool {
  id: string;
  customerId: string;
  name: string;
  poolType: string | null;
  waterType: string | null;
  gallons: number | null;
  serviceLevel: string | null;
  notes: string | null;
}

const POOL_TYPES = [
  { value: "Pool", label: "Pool", color: "bg-blue-600" },
  { value: "Spa", label: "Spa", color: "bg-purple-600" },
  { value: "Fountain", label: "Fountain", color: "bg-cyan-600" },
  { value: "Pond", label: "Pond", color: "bg-green-600" },
  { value: "Other", label: "Other", color: "bg-slate-600" },
];

const WATER_TYPES = ["Chlorine", "Salt", "Bromine", "Mineral", "Ozone", "Other"];

const EQUIPMENT_CATEGORIES = [
  { value: "filter", label: "Filter", icon: "🔲" },
  { value: "pump", label: "Pump", icon: "💧" },
  { value: "heater", label: "Heater", icon: "🔥" },
  { value: "controller", label: "Controller", icon: "🎛️" },
  { value: "feed_pump", label: "Feed Pump", icon: "💉" },
  { value: "probe", label: "Probe", icon: "📊" },
  { value: "timer", label: "Timer", icon: "⏱️" },
  { value: "fill_valve", label: "Fill Valve", icon: "🚰" },
  { value: "chlorinator", label: "Chlorinator", icon: "🧪" },
  { value: "cleaner", label: "Cleaner", icon: "🧹" },
  { value: "other", label: "Other", icon: "⚙️" },
];

const EQUIPMENT_TYPES: Record<string, string[]> = {
  filter: ["Sand", "DE", "Cartridge", "TR100C", "TR140C", "TR60C"],
  pump: ["Single Speed", "Dual Speed", "Variable Speed", "Booster"],
  heater: ["Gas", "Electric", "Heat Pump", "Solar"],
  controller: ["Automation", "IntelliCenter", "EasyTouch", "SunTouch", "Aqualink"],
  feed_pump: ["Stenner", "Rol-A-Chem", "Blue-White", "LMI", "Walchem"],
  probe: ["pH Probe", "ORP Probe", "pH/ORP Combo", "Temperature Probe"],
  timer: ["Mechanical", "Digital", "Intermatic", "Tork"],
  fill_valve: ["Auto-Fill", "Levolor", "Float Valve", "Electronic"],
  chlorinator: ["Salt Cell", "In-Line", "Floating", "Tab Feeder"],
  cleaner: ["Suction", "Pressure", "Robotic"],
  other: ["Cover", "Light", "Valve", "Blower", "Custom"],
};

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

function AddEquipmentModal({
  open,
  onClose,
  onSave,
  customerId,
  pools = [],
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Equipment>) => void;
  customerId: string;
  pools?: Pool[];
}) {
  const [formData, setFormData] = useState({
    category: "pump",
    selectedType: "",
    customType: "",
    poolId: "",
    brand: "",
    model: "",
    serialNumber: "",
    quantity: "1",
    installDate: "",
    warrantyExpiry: "",
    notes: "",
  });

  const isCustom = formData.selectedType === "Custom";
  const finalEquipmentType = isCustom ? formData.customType : formData.selectedType;

  const handleSubmit = () => {
    if (!finalEquipmentType.trim()) return;
    onSave({ 
      category: formData.category,
      equipmentType: finalEquipmentType,
      poolId: formData.poolId || null,
      brand: formData.brand || null,
      model: formData.model || null,
      serialNumber: formData.serialNumber || null,
      quantity: parseInt(formData.quantity) || 1,
      customerId,
      installDate: formData.installDate || null,
      warrantyExpiry: formData.warrantyExpiry || null,
      notes: formData.notes || null,
    });
    setFormData({ category: "pump", selectedType: "", customType: "", poolId: "", brand: "", model: "", serialNumber: "", quantity: "1", installDate: "", warrantyExpiry: "", notes: "" });
    onClose();
  };

  const availableTypes = EQUIPMENT_TYPES[formData.category] || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Equipment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value, selectedType: "", customType: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={formData.selectedType}
                onValueChange={(value) => setFormData({ ...formData, selectedType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {isCustom && (
            <div className="space-y-2">
              <Label>Custom Type Name *</Label>
              <Input
                value={formData.customType}
                onChange={(e) => setFormData({ ...formData, customType: e.target.value })}
                placeholder="Enter custom equipment type"
              />
            </div>
          )}
          {pools.length > 0 && (
            <div className="space-y-2">
              <Label>Body of Water</Label>
              <Select
                value={formData.poolId || "none"}
                onValueChange={(value) => setFormData({ ...formData, poolId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to pool/spa (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {pools.map((pool) => (
                    <SelectItem key={pool.id} value={String(pool.id)}>
                      {pool.name} ({pool.poolType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Pentair, Hayward"
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Model number"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="S/N (for warranty)"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Install Date</Label>
              <Input
                type="date"
                value={formData.installDate}
                onChange={(e) => setFormData({ ...formData, installDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Warranty Expiry</Label>
              <Input
                type="date"
                value={formData.warrantyExpiry}
                onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this equipment"
              className="min-h-[60px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!finalEquipmentType.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Equipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPoolModal({
  open,
  onClose,
  onSave,
  customerId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Pool>) => void;
  customerId: string;
}) {
  const [formData, setFormData] = useState({
    name: "",
    poolType: "Pool",
    waterType: "Chlorine",
    gallons: "",
    serviceLevel: "",
    notes: "",
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    onSave({
      name: formData.name,
      poolType: formData.poolType,
      waterType: formData.waterType,
      gallons: formData.gallons ? parseInt(formData.gallons) : null,
      serviceLevel: formData.serviceLevel || null,
      notes: formData.notes || null,
      customerId,
    });
    setFormData({ name: "", poolType: "Pool", waterType: "Chlorine", gallons: "", serviceLevel: "", notes: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Body of Water</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Main Pool, Spa, Front Fountain"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.poolType}
                onValueChange={(value) => setFormData({ ...formData, poolType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POOL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Water Type</Label>
              <Select
                value={formData.waterType}
                onValueChange={(value) => setFormData({ ...formData, waterType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WATER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gallons</Label>
              <Input
                type="number"
                value={formData.gallons}
                onChange={(e) => setFormData({ ...formData, gallons: e.target.value })}
                placeholder="e.g. 15000"
              />
            </div>
            <div className="space-y-2">
              <Label>Service Level</Label>
              <Input
                value={formData.serviceLevel}
                onChange={(e) => setFormData({ ...formData, serviceLevel: e.target.value })}
                placeholder="e.g. Weekly, Premium"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this body of water"
              className="min-h-[60px]"
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
            Add Body of Water
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BILLING_CONTACT_TYPES = [
  { value: "primary", label: "Primary Billing", description: "Default billing contact for all work types" },
  { value: "repairs", label: "Repairs", description: "Receives invoices for repair work" },
  { value: "chemicals", label: "Chemicals", description: "Receives invoices for chemical orders" },
];

function AddBillingContactModal({
  open,
  onClose,
  onSave,
  customerId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string; phone?: string; contactType: string }) => void;
  customerId: string;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    contactType: "primary",
  });

  const handleSubmit = () => {
    onSave({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      contactType: formData.contactType,
    });
    setFormData({ name: "", email: "", phone: "", contactType: "primary" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Add Billing Contact
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Contact Type <span className="text-red-500">*</span></Label>
            <Select
              value={formData.contactType}
              onValueChange={(value) => setFormData({ ...formData, contactType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_CONTACT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-slate-500">{type.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Name <span className="text-red-500">*</span></Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contact name"
            />
          </div>
          <div className="space-y-2">
            <Label>Email <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="billing@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              type="tel"
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
            disabled={!formData.name.trim() || !formData.email.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Billing Contact
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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("properties");
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showAddPool, setShowAddPool] = useState(false);
  const [showAddBillingContact, setShowAddBillingContact] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [scheduleActive, setScheduleActive] = useState(false);
  const [visitDays, setVisitDays] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "custom">("weekly");
  const [frequencyInterval, setFrequencyInterval] = useState(1);
  const [routeNotes, setRouteNotes] = useState("");
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

  const { data: equipmentData } = useQuery<{ equipment: Equipment[] }>({
    queryKey: ["/api/customers", customer.id, "equipment"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customer.id}/equipment`);
      if (!res.ok) return { equipment: [] };
      return res.json();
    },
  });

  const { data: poolsData } = useQuery<{ pools: Pool[] }>({
    queryKey: ["/api/customers", customer.id, "pools"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customer.id}/pools`);
      if (!res.ok) return { pools: [] };
      return res.json();
    },
  });

  const { data: billingContactsData } = useQuery<{ contacts: { id: string; name: string; email: string; phone: string | null; contactType: string }[] }>({
    queryKey: ["/api/customers", customer.id, "billing-contacts"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customer.id}/billing-contacts`);
      if (!res.ok) return { contacts: [] };
      return res.json();
    },
  });

  const properties = propertiesData?.properties || [];
  const contacts = contactsData?.contacts || [];
  const equipmentList = equipmentData?.equipment || [];
  const poolsList = poolsData?.pools || [];
  const billingContacts = billingContactsData?.contacts || [];

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  useEffect(() => {
    if (poolsList.length > 0 && !selectedPoolId) {
      setSelectedPoolId(poolsList[0].id);
    }
  }, [poolsList, selectedPoolId]);

  const { data: routeScheduleData } = useQuery<{ schedule: any }>({
    queryKey: ["/api/properties", selectedPropertyId, "route-schedule"],
    queryFn: async () => {
      if (!selectedPropertyId) return { schedule: null };
      const res = await fetch(`/api/properties/${selectedPropertyId}/route-schedule`);
      if (!res.ok) return { schedule: null };
      return res.json();
    },
    enabled: !!selectedPropertyId,
  });

  const { data: upcomingVisitsData } = useQuery<{ visits: { id: string; date: string; status: string; routeId: string | null; routeName: string | null; technicianName: string | null; routeColor: string | null }[] }>({
    queryKey: ["/api/properties", selectedPropertyId, "upcoming-visits"],
    queryFn: async () => {
      if (!selectedPropertyId) return { visits: [] };
      const res = await fetch(`/api/properties/${selectedPropertyId}/upcoming-visits`);
      if (!res.ok) return { visits: [] };
      return res.json();
    },
    enabled: !!selectedPropertyId,
  });

  const upcomingVisits = upcomingVisitsData?.visits || [];

  useEffect(() => {
    if (routeScheduleData?.schedule) {
      const s = routeScheduleData.schedule;
      setScheduleActive(s.isActive || false);
      setVisitDays(s.visitDays || []);
      setFrequency(s.frequency || "weekly");
      setFrequencyInterval(s.frequencyInterval || 1);
      setRouteNotes(s.routeNotes || "");
    } else {
      setScheduleActive(false);
      setVisitDays([]);
      setFrequency("weekly");
      setFrequencyInterval(1);
      setRouteNotes("");
    }
  }, [routeScheduleData]);

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

  const addEquipmentMutation = useMutation({
    mutationFn: async (data: Partial<Equipment>) => {
      const res = await fetch(`/api/customers/${customer.id}/equipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "equipment"] });
      setShowAddEquipment(false);
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (equipmentId: string) => {
      const res = await fetch(`/api/equipment/${equipmentId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "equipment"] });
    },
  });

  const addPoolMutation = useMutation({
    mutationFn: async (data: Partial<Pool>) => {
      const res = await fetch(`/api/customers/${customer.id}/pools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "pools"] });
      setShowAddPool(false);
    },
  });

  const deletePoolMutation = useMutation({
    mutationFn: async (poolId: string) => {
      const res = await fetch(`/api/pools/${poolId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "pools"] });
      if (selectedPoolId) {
        setSelectedPoolId(null);
      }
    },
  });

  const addBillingContactMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string; contactType: string }) => {
      const res = await fetch(`/api/customers/${customer.id}/billing-contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add billing contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "billing-contacts"] });
      setShowAddBillingContact(false);
      toast({ title: "Billing Contact Added", description: "The billing contact was added successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add billing contact. Please try again.", variant: "destructive" });
    },
  });

  const deleteBillingContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await fetch(`/api/customers/${customer.id}/billing-contacts/${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete billing contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "billing-contacts"] });
      toast({ title: "Billing Contact Deleted", description: "The billing contact was removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete billing contact. Please try again.", variant: "destructive" });
    },
  });

  const saveRouteScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedPropertyId) throw new Error("No property selected");
      const res = await fetch(`/api/properties/${selectedPropertyId}/route-schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", selectedPropertyId, "route-schedule"] });
    },
  });

  const handleSaveRouteSchedule = () => {
    saveRouteScheduleMutation.mutate({
      isActive: scheduleActive,
      visitDays,
      frequency,
      frequencyInterval: frequency === "custom" ? frequencyInterval : (frequency === "biweekly" ? 2 : 1),
      routeNotes,
    });
  };

  const toggleVisitDay = (day: string) => {
    setVisitDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

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
        <div className="flex items-center border-b bg-white">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-8 shrink-0 rounded-none border-r"
            onClick={() => {
              const container = document.getElementById('customer-tabs-scroll');
              if (container) container.scrollBy({ left: -150, behavior: 'smooth' });
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div id="customer-tabs-scroll" className="flex-1 overflow-x-auto scrollbar-hide">
            <TabsList className="w-max justify-start rounded-none bg-transparent px-2">
              <TabsTrigger value="properties" className="gap-1 whitespace-nowrap">
                <Home className="h-4 w-4" />
                Properties ({properties.length})
              </TabsTrigger>
              <TabsTrigger value="contacts" className="gap-1 whitespace-nowrap">
                <Users className="h-4 w-4" />
                Contacts ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1 whitespace-nowrap">
                <FileText className="h-4 w-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="route" className="gap-1 whitespace-nowrap">
                <Calendar className="h-4 w-4" />
                Route
              </TabsTrigger>
              <TabsTrigger value="water" className="gap-1 whitespace-nowrap">
                <Droplets className="h-4 w-4" />
                Bodies of Water ({poolsList.length})
              </TabsTrigger>
              <TabsTrigger value="equipment" className="gap-1 whitespace-nowrap">
                <Wrench className="h-4 w-4" />
                Equipment ({equipmentList.length})
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-1 whitespace-nowrap">
                <FileText className="h-4 w-4" />
                Billing
              </TabsTrigger>
            </TabsList>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-8 shrink-0 rounded-none border-l"
            onClick={() => {
              const container = document.getElementById('customer-tabs-scroll');
              if (container) container.scrollBy({ left: 150, behavior: 'smooth' });
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

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
              <Switch 
                checked={scheduleActive} 
                onCheckedChange={(checked) => {
                  setScheduleActive(checked);
                }}
              />
            </div>
          </div>

          {properties.length > 1 && (
            <div className="mb-4">
              <Label className="text-sm text-slate-600 mb-2 block">Select Property</Label>
              <Select value={selectedPropertyId || ""} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.street || prop.label || "Property"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {properties.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">Add a property first to configure route scheduling</p>
              </CardContent>
            </Card>
          ) : (
          <ScrollArea className="h-[calc(100vh-500px)]">
            <div className="space-y-4">
              <Card className="bg-white">
                <CardContent className="p-4">
                  <h4 className="font-medium text-slate-700 mb-3">Visit Days</h4>
                  <p className="text-xs text-slate-500 mb-3">Select days when this property should be serviced</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "monday", label: "Monday" },
                      { key: "tuesday", label: "Tuesday" },
                      { key: "wednesday", label: "Wednesday" },
                      { key: "thursday", label: "Thursday" },
                      { key: "friday", label: "Friday" },
                      { key: "saturday", label: "Saturday" },
                      { key: "sunday", label: "Sunday" }
                    ].map(({ key, label }) => {
                      const isSelected = visitDays.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleVisitDay(key)}
                          className={cn(
                            "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                            isSelected 
                              ? "bg-blue-50 border-blue-300" 
                              : "bg-slate-50 border-slate-200 hover:border-blue-200"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm",
                            isSelected 
                              ? "bg-blue-600 text-white" 
                              : "bg-slate-200 text-slate-600"
                          )}>
                            {label.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 text-left">
                            <p className={cn(
                              "text-sm font-medium",
                              isSelected ? "text-blue-700" : "text-slate-600"
                            )}>{label}</p>
                            <p className="text-xs text-slate-400">
                              {isSelected ? "Scheduled" : "Not scheduled"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <h4 className="font-medium text-slate-700 mb-3">Frequency</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="frequency" 
                        checked={frequency === "weekly"}
                        onChange={() => setFrequency("weekly")}
                        className="text-blue-600" 
                      />
                      <span className="text-sm">Every week</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="frequency" 
                        checked={frequency === "biweekly"}
                        onChange={() => setFrequency("biweekly")}
                        className="text-blue-600" 
                      />
                      <span className="text-sm">Every other week (biweekly)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="frequency" 
                        checked={frequency === "custom"}
                        onChange={() => setFrequency("custom")}
                        className="text-blue-600" 
                      />
                      <span className="text-sm">Custom interval</span>
                    </label>
                    {frequency === "custom" && (
                      <div className="flex items-center gap-2 ml-6 mt-2">
                        <span className="text-sm text-slate-600">Every</span>
                        <Input 
                          type="number" 
                          min="1" 
                          max="12" 
                          value={frequencyInterval}
                          onChange={(e) => setFrequencyInterval(parseInt(e.target.value) || 1)}
                          className="w-16 h-8 text-center"
                        />
                        <span className="text-sm text-slate-600">weeks</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <h4 className="font-medium text-slate-700 mb-3">Route Notes</h4>
                  <Textarea 
                    placeholder="Add notes about route schedule (gate codes, special instructions, etc.)"
                    className="min-h-[100px]"
                    value={routeNotes}
                    onChange={(e) => setRouteNotes(e.target.value)}
                  />
                </CardContent>
              </Card>

              {upcomingVisits.length > 0 && (
                <Card className="bg-white">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-slate-700 mb-3">Scheduled Visits</h4>
                    <p className="text-xs text-slate-500 mb-3">Upcoming service visits with assigned routes</p>
                    <div className="space-y-2">
                      {upcomingVisits.map((visit) => {
                        const visitDate = new Date(visit.date);
                        const dayName = visitDate.toLocaleDateString("en-US", { weekday: "short" });
                        const dateStr = visitDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        return (
                          <div 
                            key={visit.id} 
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
                            data-testid={`visit-${visit.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-xs",
                                visit.status === "scheduled" ? "bg-green-500" : visit.status === "completed" ? "bg-blue-500" : "bg-amber-500"
                              )}>
                                {dayName}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700">{dateStr}</p>
                                <p className="text-xs text-slate-500">
                                  {visit.status === "scheduled" ? "Scheduled" : visit.status === "completed" ? "Completed" : "Unscheduled"}
                                </p>
                              </div>
                            </div>
                            {visit.routeName ? (
                              <div className="text-right">
                                <p className="text-sm font-medium text-blue-600">{visit.routeName}</p>
                                <p className="text-xs text-slate-500">{visit.technicianName || "Unassigned"}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">Not assigned to route</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleSaveRouteSchedule}
                disabled={saveRouteScheduleMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {saveRouteScheduleMutation.isPending ? "Saving..." : "Save Route Schedule"}
              </Button>
            </div>
          </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="water" className="flex-1 m-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Bodies of Water</h3>
            <Button size="sm" onClick={() => setShowAddPool(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Add Body of Water
            </Button>
          </div>
          
          {poolsList.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Droplets className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No bodies of water recorded</p>
              <Button variant="link" size="sm" onClick={() => setShowAddPool(true)}>
                Add first pool, spa, or fountain
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded-lg overflow-x-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    const idx = poolsList.findIndex(p => p.id === selectedPoolId);
                    if (idx > 0) setSelectedPoolId(poolsList[idx - 1].id);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-2 flex-1 overflow-x-auto">
                  {poolsList.map((pool) => {
                    const typeConfig = POOL_TYPES.find(t => t.value === pool.poolType) || POOL_TYPES[0];
                    return (
                      <button
                        key={pool.id}
                        onClick={() => setSelectedPoolId(pool.id)}
                        className={cn(
                          "px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                          selectedPoolId === pool.id
                            ? `${typeConfig.color} text-white`
                            : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                        )}
                      >
                        {pool.name}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    const idx = poolsList.findIndex(p => p.id === selectedPoolId);
                    if (idx < poolsList.length - 1) setSelectedPoolId(poolsList[idx + 1].id);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {selectedPoolId && (() => {
                const selectedPool = poolsList.find(p => p.id === selectedPoolId);
                if (!selectedPool) return null;
                const typeConfig = POOL_TYPES.find(t => t.value === selectedPool.poolType) || POOL_TYPES[0];
                const poolEquipment = equipmentList.filter(e => e.poolId === selectedPoolId);
                
                return (
                  <ScrollArea className="h-[calc(100vh-550px)]">
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={cn("text-white", typeConfig.color)}>
                                {selectedPool.poolType || "Pool"}
                              </Badge>
                              {selectedPool.waterType && (
                                <Badge variant="outline">{selectedPool.waterType}</Badge>
                              )}
                            </div>
                            <h4 className="font-semibold text-lg">{selectedPool.name}</h4>
                            {selectedPool.gallons && (
                              <p className="text-sm text-slate-500">{selectedPool.gallons.toLocaleString()} gallons</p>
                            )}
                            {selectedPool.serviceLevel && (
                              <p className="text-sm text-slate-500">Service: {selectedPool.serviceLevel}</p>
                            )}
                            {selectedPool.notes && (
                              <p className="text-sm text-slate-400 mt-2">{selectedPool.notes}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-red-600"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  if (confirm("Delete this body of water and all associated equipment?")) {
                                    deletePoolMutation.mutate(selectedPool.id);
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

                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="font-medium text-slate-700">Equipment for {selectedPool.name}</h4>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setActiveTab("equipment");
                          setShowAddEquipment(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {poolEquipment.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No equipment linked to this body of water</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {poolEquipment.map((equip) => {
                          const cat = EQUIPMENT_CATEGORIES.find(c => c.value === equip.category);
                          return (
                            <Card key={equip.id} className="border-l-4 border-l-blue-400">
                              <CardContent className="p-2">
                                <div className="flex items-center gap-2">
                                  <span>{cat?.icon || "⚙️"}</span>
                                  <div>
                                    <p className="text-sm font-medium">{equip.equipmentType}</p>
                                    {equip.brand && <p className="text-xs text-slate-500">{equip.brand}</p>}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                );
              })()}
            </>
          )}
        </TabsContent>

        <TabsContent value="equipment" className="flex-1 m-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Equipment</h3>
            <Button size="sm" onClick={() => setShowAddEquipment(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Add Equipment
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-450px)]">
            {equipmentList.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No equipment recorded</p>
                <Button variant="link" size="sm" onClick={() => setShowAddEquipment(true)}>
                  Add first equipment
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {EQUIPMENT_CATEGORIES.map((cat) => {
                  const catEquipment = equipmentList.filter(e => e.category === cat.value);
                  if (catEquipment.length === 0) return null;
                  return (
                    <div key={cat.value} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                      {catEquipment.map((equip) => (
                        <Card key={equip.id} className="border-l-4 border-l-blue-400">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {equip.quantity && equip.quantity > 1 && (
                                    <span className="text-blue-600 mr-1">{equip.quantity}x</span>
                                  )}
                                  {equip.equipmentType}
                                </p>
                                {equip.brand && (
                                  <p className="text-xs text-slate-500">{equip.brand}{equip.model && ` - ${equip.model}`}</p>
                                )}
                                {equip.serialNumber && (
                                  <p className="text-xs text-slate-400">S/N: {equip.serialNumber}</p>
                                )}
                                {equip.warrantyExpiry && (
                                  <p className="text-xs text-slate-400">
                                    Warranty: {new Date(equip.warrantyExpiry).toLocaleDateString()}
                                  </p>
                                )}
                                {equip.poolId && (
                                  <p className="text-xs text-blue-500">
                                    {poolsList.find(p => p.id === equip.poolId)?.name || "Linked"}
                                  </p>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      if (confirm("Are you sure you want to delete this equipment?")) {
                                        deleteEquipmentMutation.mutate(equip.id);
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
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="billing" className="flex-1 m-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Billing Contacts</h3>
            <Button size="sm" onClick={() => setShowAddBillingContact(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Add Billing Contact
            </Button>
          </div>
          
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Billing contacts</strong> are used to route invoices based on work type. 
              Assign contacts to specific work types (Repairs, Chemicals) or as Primary billing.
            </p>
          </div>
          
          <ScrollArea className="h-[calc(100vh-500px)]">
            {billingContacts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No billing contacts yet</p>
                <Button variant="link" size="sm" onClick={() => setShowAddBillingContact(true)}>
                  Add first billing contact
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {billingContacts.map((contact) => (
                  <Card key={contact.id} className={cn(
                    "border-l-4",
                    contact.contactType === "repairs" && "border-l-[#F97316]",
                    contact.contactType === "chemicals" && "border-l-[#60A5FA]",
                    contact.contactType === "primary" && "border-l-[#1E3A8A]"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-slate-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{contact.name}</p>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs capitalize",
                                  contact.contactType === "repairs" && "border-[#F97316] text-[#F97316] bg-orange-50",
                                  contact.contactType === "chemicals" && "border-[#60A5FA] text-[#60A5FA] bg-blue-50",
                                  contact.contactType === "primary" && "border-[#1E3A8A] text-[#1E3A8A] bg-blue-50"
                                )}
                              >
                                {contact.contactType}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500">{contact.email}</p>
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
                            <DropdownMenuItem 
                              className="text-red-600"
                              onSelect={(e) => {
                                e.preventDefault();
                                if (confirm("Are you sure you want to delete this billing contact?")) {
                                  deleteBillingContactMutation.mutate(contact.id);
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

      <AddEquipmentModal
        open={showAddEquipment}
        onClose={() => setShowAddEquipment(false)}
        onSave={(data) => addEquipmentMutation.mutate(data)}
        customerId={customer.id}
        pools={poolsList}
      />

      <AddPoolModal
        open={showAddPool}
        onClose={() => setShowAddPool(false)}
        onSave={(data) => addPoolMutation.mutate(data)}
        customerId={customer.id}
      />

      <AddBillingContactModal
        open={showAddBillingContact}
        onClose={() => setShowAddBillingContact(false)}
        onSave={(data) => addBillingContactMutation.mutate(data)}
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
