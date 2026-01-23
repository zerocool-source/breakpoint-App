import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronDown, ChevronRight, Plus, Image, Trash2, X, Clock, FileText, MoreHorizontal, Sun, Snowflake, MapPin, Route, Users, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TechnicianPropertyWithSchedule {
  id: string;
  technicianId: string;
  propertyId: string;
  propertyName: string | null;
  customerName: string | null;
  address: string | null;
  assignedAt: string;
  scheduleId: string | null;
  summerVisitDays: string[] | null;
  winterVisitDays: string[] | null;
  activeSeason: string | null;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEKEND_DAYS = ["Sat", "Sun"];
const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_MAPPING: Record<string, string> = {
  "monday": "Mon", "tuesday": "Tue", "wednesday": "Wed", "thursday": "Thu", 
  "friday": "Fri", "saturday": "Sat", "sunday": "Sun",
  "Mon": "Mon", "Tue": "Tue", "Wed": "Wed", "Thu": "Thu", 
  "Fri": "Fri", "Sat": "Sat", "Sun": "Sun"
};

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  truckNumber: string | null;
  commissionPercent: number | null;
  active: boolean;
  role: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-[#0078D4]",
    "bg-[#22D69A]", 
    "bg-[#17BEBB]",
    "bg-[#FF8000]",
    "bg-pink-600",
    "bg-[#17BEBB]",
    "bg-[#0078D4]",
    "bg-[#17BEBB]",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function AddTechnicianModal({ 
  open, 
  onClose, 
  onAdd 
}: { 
  open: boolean; 
  onClose: () => void;
  onAdd: (tech: { firstName: string; lastName: string; phone: string; email: string }) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    onAdd({ firstName: firstName.trim(), lastName: lastName.trim(), phone, email });
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    onClose();
  };

  const handleClose = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0">
        <DialogHeader className="bg-[#0078D4] text-white px-4 py-3 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold">Add Technician</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 bg-slate-100">
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                <Image className="w-8 h-8 text-slate-400" />
              </div>
              <button className="text-[#0078D4] text-sm font-medium hover:underline">
                Add Photo
              </button>
            </div>
            
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div className="space-y-3">
                <Input
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-white"
                  data-testid="input-first-name"
                />
                <Input
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-white"
                  data-testid="input-last-name"
                />
              </div>
              <div>
                <Input
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white"
                  data-testid="input-phone"
                />
              </div>
              <div>
                <Input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white"
                  data-testid="input-email"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button 
              onClick={handleSubmit}
              disabled={!firstName.trim() || !lastName.trim()}
              className="bg-[#0078D4] hover:bg-[#0078D4] text-white px-8"
              data-testid="button-add-tech-submit"
            >
              ADD TECH
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditTechnicianModal({ 
  open, 
  onClose, 
  technician,
  onSave,
  onDelete
}: { 
  open: boolean; 
  onClose: () => void;
  technician: Technician | null;
  onSave: (id: string, data: { firstName: string; lastName: string; phone: string; email: string; truckNumber: string; commissionPercent: number }) => void;
  onDelete: (id: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [truckNumber, setTruckNumber] = useState("");
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (technician) {
      setFirstName(technician.firstName || "");
      setLastName(technician.lastName || "");
      setPhone(technician.phone || "");
      setEmail(technician.email || "");
      setTruckNumber(technician.truckNumber || "");
      setCommissionPercent(technician.commissionPercent || 0);
    }
  }, [technician]);

  const handleSubmit = () => {
    if (!technician || !firstName.trim() || !lastName.trim()) return;
    onSave(technician.id, { firstName: firstName.trim(), lastName: lastName.trim(), phone, email, truckNumber, commissionPercent });
    onClose();
  };

  const handleDelete = () => {
    if (!technician) return;
    onDelete(technician.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleClose = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setTruckNumber("");
    setCommissionPercent(0);
    onClose();
  };

  if (!technician) return null;

  const fullName = `${technician.firstName} ${technician.lastName}`.trim();
  const initials = getInitials(technician.firstName, technician.lastName);
  const avatarColor = getAvatarColor(fullName);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] p-0 gap-0">
          <DialogHeader className="bg-[#0078D4] text-white px-4 py-3 rounded-t-lg">
            <DialogTitle className="text-lg font-semibold">Edit Technician</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 bg-slate-100">
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-16 h-16 rounded-lg flex items-center justify-center text-white text-xl font-semibold",
                  avatarColor
                )}>
                  {initials}
                </div>
                <button className="text-[#0078D4] text-sm font-medium hover:underline">
                  Change Photo
                </button>
              </div>
              
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <Input
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="bg-white"
                      data-testid="input-edit-first-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <Input
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-white"
                      data-testid="input-edit-last-name"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <Input
                      placeholder="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-white"
                      data-testid="input-edit-phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Truck #</label>
                    <Input
                      placeholder="Truck Number"
                      value={truckNumber}
                      onChange={(e) => setTruckNumber(e.target.value)}
                      className="bg-white"
                      data-testid="input-edit-truck-number"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <Input
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white"
                      data-testid="input-edit-email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Commission %</label>
                    <Input
                      type="number"
                      placeholder="0"
                      min={0}
                      max={100}
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(parseInt(e.target.value) || 0)}
                      className="bg-white"
                      data-testid="input-edit-commission"
                    />
                    <p className="text-xs text-slate-500 mt-1">Parts commission on service repairs</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2"
                data-testid="button-delete-tech"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!firstName.trim() || !lastName.trim()}
                className="bg-[#0078D4] hover:bg-[#0078D4] text-white px-8"
                data-testid="button-save-tech"
              >
                SAVE CHANGES
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Technician</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {fullName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface FieldEntry {
  id: string;
  technicianId: string | null;
  technicianName: string | null;
  entryType: string;
  payload: string | null;
  submittedAt: string;
}

interface TechnicianProperty {
  id: string;
  technicianId: string;
  propertyId: string;
  propertyName: string | null;
  customerName: string | null;
  address: string | null;
  assignedAt: string;
}

interface Customer {
  id: string;
  name: string;
  address: string | null;
}

function ServiceLogSidebar({
  technician,
  onClose,
}: {
  technician: Technician | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"log" | "properties">("properties");
  const [propertySearch, setPropertySearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ entries: FieldEntry[] }>({
    queryKey: ["/api/technicians", technician?.id, "entries"],
    queryFn: async () => {
      const res = await fetch(`/api/technicians/${technician?.id}/entries`);
      if (!res.ok) throw new Error("Failed to fetch entries");
      return res.json();
    },
    enabled: !!technician && activeTab === "log",
  });

  const { data: propertiesData, isLoading: propertiesLoading } = useQuery<TechnicianProperty[]>({
    queryKey: ["/api/technician-properties", technician?.id],
    queryFn: async () => {
      const res = await fetch(`/api/technician-properties/${technician?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!technician,
  });

  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) return { customers: [] };
      return res.json();
    },
  });

  const assignedProperties = propertiesData || [];
  const customers = customersData?.customers || [];
  const assignedPropertyIds = new Set(assignedProperties.map(p => p.propertyId));
  
  const filteredCustomers = customers.filter(c => 
    !assignedPropertyIds.has(c.id) &&
    c.name.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const addPropertyMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const customer = customers.find(c => c.id === customerId);
      const res = await fetch("/api/technician-properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId: technician?.id,
          propertyId: customerId,
          propertyName: customer?.name,
          customerName: customer?.name,
          address: customer?.address,
          assignedByName: "Office Staff",
        }),
      });
      if (!res.ok) throw new Error("Failed to assign property");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-properties", technician?.id] });
      setPropertySearch("");
    },
  });

  const removePropertyMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/technician-properties/${assignmentId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-properties", technician?.id] });
    },
  });

  const entries = data?.entries || [];

  const parsePayload = (payload: string | null) => {
    if (!payload) return {};
    try {
      return JSON.parse(payload);
    } catch (_e) {
      return { raw: payload };
    }
  };

  const fullName = technician
    ? `${technician.firstName} ${technician.lastName}`.trim()
    : "";
  const initials = technician
    ? getInitials(technician.firstName, technician.lastName)
    : "";
  const avatarColor = getAvatarColor(fullName);

  return (
    <Sheet open={!!technician} onOpenChange={() => onClose()}>
      <SheetContent className="w-[450px] sm:w-[500px] p-0">
        <SheetHeader className="bg-[#0078D4] text-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold",
                avatarColor
              )}
            >
              {initials}
            </div>
            <div>
              <SheetTitle className="text-white text-lg">{fullName}</SheetTitle>
              <p className="text-blue-200 text-sm">Service Technician</p>
            </div>
          </div>
        </SheetHeader>

        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab("properties")}
              className={cn(
                "flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors",
                activeTab === "properties"
                  ? "border-[#0078D4] text-[#0078D4]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              Assigned Properties
            </button>
            <button
              onClick={() => setActiveTab("log")}
              className={cn(
                "flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors",
                activeTab === "log"
                  ? "border-[#0078D4] text-[#0078D4]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              Service Log
            </button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)]">
          {activeTab === "properties" ? (
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search properties to add..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-properties"
                />
              </div>
              
              {propertySearch && filteredCustomers.length > 0 && (
                <div className="border rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto">
                  {filteredCustomers.slice(0, 10).map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => addPropertyMutation.mutate(customer.id)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-b-0"
                      data-testid={`add-property-${customer.id}`}
                    >
                      <p className="font-medium text-sm text-slate-700">{customer.name}</p>
                      {customer.address && (
                        <p className="text-xs text-slate-500">{customer.address}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {propertiesLoading ? (
                <div className="text-center py-8 text-slate-500">Loading properties...</div>
              ) : assignedProperties.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No properties assigned</p>
                  <p className="text-xs mt-1">Search above to add properties</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedProperties.map((prop) => (
                    <div
                      key={prop.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
                      data-testid={`assigned-property-${prop.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-slate-700 truncate">
                          {prop.propertyName || prop.customerName || "Unknown"}
                        </p>
                        {prop.address && (
                          <p className="text-xs text-slate-500 truncate">{prop.address}</p>
                        )}
                        <p className="text-xs text-slate-400">
                          Assigned {new Date(prop.assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        onClick={() => removePropertyMutation.mutate(prop.id)}
                        data-testid={`remove-property-${prop.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {isLoading ? (
                <div className="text-center py-12 text-slate-500">
                  Loading service entries...
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No service entries found</p>
                  <p className="text-sm mt-1">
                    Entries will appear here when synced from the field app
                  </p>
                </div>
              ) : (
                entries.map((entry) => {
                  const payload = parsePayload(entry.payload);
                  const submittedDate = new Date(entry.submittedAt);

                  return (
                    <div
                      key={entry.id}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                      data-testid={`entry-${entry.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {entry.entryType}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {format(submittedDate, "MMM d, yyyy h:mm a")}
                        </div>
                      </div>
                      {payload.notes && (
                        <p className="text-sm text-slate-700 mt-2">
                          {payload.notes}
                        </p>
                      )}
                      {payload.raw && (
                        <p className="text-sm text-slate-700 mt-2">
                          {payload.raw}
                        </p>
                      )}
                      {Object.keys(payload).length > 0 &&
                        !payload.notes &&
                        !payload.raw && (
                          <pre className="text-xs text-slate-600 mt-2 bg-white p-2 rounded border overflow-auto">
                            {JSON.stringify(payload, null, 2)}
                          </pre>
                        )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

const ITEMS_PER_PAGE = 11;

function ScheduleDayCircles({ 
  days, 
  activeDays, 
  label 
}: { 
  days: string[]; 
  activeDays: string[];
  label: string;
}) {
  const normalizedActiveDays = activeDays.map(d => DAY_MAPPING[d.toLowerCase()] || DAY_MAPPING[d] || d);
  
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-500 w-16">{label}:</span>
      <div className="flex gap-1">
        {days.map((day) => {
          const isActive = normalizedActiveDays.includes(day);
          return (
            <div
              key={day}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border transition-colors",
                isActive 
                  ? "bg-[#0078D4] text-white border-[#0078D4]" 
                  : "bg-slate-100 text-slate-400 border-slate-200"
              )}
              title={day}
            >
              {day.charAt(0)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PropertyActionMenu({
  property,
  onRemove,
  onExtendedCover,
  onSplitRoute,
  onGenerateStops,
}: {
  property: TechnicianPropertyWithSchedule;
  onRemove: () => void;
  onExtendedCover: () => void;
  onSplitRoute: () => void;
  onGenerateStops: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          data-testid={`button-property-actions-${property.id}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          onClick={onExtendedCover} 
          className="gap-2"
          data-testid={`menu-item-extended-cover-${property.id}`}
        >
          <CalendarDays className="w-4 h-4" />
          Extended Cover
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onSplitRoute} 
          className="gap-2"
          data-testid={`menu-item-split-route-${property.id}`}
        >
          <Users className="w-4 h-4" />
          Split Route
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onGenerateStops} 
          className="gap-2"
          data-testid={`menu-item-generate-stops-${property.id}`}
        >
          <Route className="w-4 h-4" />
          Generate Stops from Assignments
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onRemove} 
          className="gap-2 text-red-600 focus:text-red-600"
          data-testid={`menu-item-remove-property-${property.id}`}
        >
          <Trash2 className="w-4 h-4" />
          Remove Property
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TechnicianExpandableRow({
  tech,
  fullName,
  initials,
  avatarColor,
  isExpanded,
  propertyCount,
  globalSeason,
  onToggleExpand,
  onViewTech,
  onEditTech,
  onToggleStatus,
  onRemoveProperty,
  onUpdateSeason,
}: {
  tech: Technician;
  fullName: string;
  initials: string;
  avatarColor: string;
  isExpanded: boolean;
  propertyCount: number;
  globalSeason: "summer" | "winter";
  onToggleExpand: () => void;
  onViewTech: () => void;
  onEditTech: () => void;
  onToggleStatus: (checked: boolean) => void;
  onRemoveProperty: (id: string) => void;
  onUpdateSeason: (propertyId: string, season: string) => void;
}) {
  const { data: properties, isLoading: propertiesLoading } = useQuery<TechnicianPropertyWithSchedule[]>({
    queryKey: ["/api/technician-properties", tech.id],
    queryFn: async () => {
      const res = await fetch(`/api/technician-properties/${tech.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isExpanded,
  });

  return (
    <>
      <tr 
        className={cn(
          "hover:bg-slate-50 transition-colors cursor-pointer",
          isExpanded && "bg-slate-50"
        )}
        data-testid={`row-technician-${tech.id}`}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onToggleExpand}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
              data-testid={`button-expand-${tech.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
              avatarColor
            )}>
              {initials}
            </div>
            <span 
              className="font-medium text-[#0078D4] hover:underline cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onViewTech(); }}
              data-testid={`link-tech-name-${tech.id}`}
            >
              {fullName || "Unknown"}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 text-slate-600">
          {tech.phone || "-"}
        </td>
        <td className="px-6 py-4 text-slate-600">
          {tech.email || "-"}
        </td>
        <td className="px-6 py-4 text-slate-600">
          {tech.truckNumber ? (
            <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium text-sm">
              #{tech.truckNumber}
            </span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </td>
        <td className="px-6 py-4 text-center">
          {tech.commissionPercent ? (
            <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium text-sm">
              {tech.commissionPercent}%
            </span>
          ) : (
            <span className="text-slate-400">0%</span>
          )}
        </td>
        <td className="px-6 py-4 text-center">
          {propertyCount > 0 ? (
            <span 
              className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 font-medium text-sm cursor-pointer hover:bg-green-200"
              onClick={onToggleExpand}
              data-testid={`badge-property-count-${tech.id}`}
            >
              {propertyCount}
            </span>
          ) : (
            <span className="text-slate-400" data-testid={`text-no-properties-${tech.id}`}>0</span>
          )}
        </td>
        <td className="px-6 py-4">
          <div className="flex justify-center">
            <Switch 
              checked={tech.active} 
              onCheckedChange={onToggleStatus}
              className="data-[state=checked]:bg-[#0078D4]"
              data-testid={`switch-status-${tech.id}`}
            />
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <Button 
            variant="link" 
            className="text-[#0078D4] hover:text-blue-800 p-0 h-auto"
            onClick={onEditTech}
            data-testid={`button-edit-${tech.id}`}
          >
            Edit
          </Button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50/50">
          <td colSpan={8} className="px-6 py-3">
            <div className="ml-12 space-y-2">
              {propertiesLoading ? (
                <div className="text-sm text-slate-500 py-2">Loading properties...</div>
              ) : !properties || properties.length === 0 ? (
                <div className="text-sm text-slate-500 py-2">No properties assigned</div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                    <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-600 uppercase">
                      <div className="col-span-3">Property</div>
                      <div className="col-span-3">Weekdays</div>
                      <div className="col-span-2">Weekend</div>
                      <div className="col-span-2">Season</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {properties.map((property) => {
                      const activeSeason = property.activeSeason || globalSeason;
                      const visitDays = activeSeason === "summer" 
                        ? (property.summerVisitDays || []) 
                        : (property.winterVisitDays || []);
                      
                      return (
                        <div 
                          key={property.id} 
                          className="px-4 py-3 hover:bg-slate-50"
                          data-testid={`row-property-${property.id}`}
                        >
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-3">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <div>
                                  <p className="font-medium text-sm text-slate-900">{property.propertyName || "Unnamed Property"}</p>
                                  {property.address && (
                                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{property.address}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="col-span-3">
                              <ScheduleDayCircles days={WEEKDAYS} activeDays={visitDays} label="Week" />
                            </div>
                            <div className="col-span-2">
                              <ScheduleDayCircles days={WEEKEND_DAYS} activeDays={visitDays} label="End" />
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => onUpdateSeason(property.propertyId, activeSeason === "summer" ? "winter" : "summer")}
                                        className={cn(
                                          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
                                          activeSeason === "summer" 
                                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                        )}
                                        data-testid={`button-toggle-season-${property.id}`}
                                      >
                                        {activeSeason === "summer" ? (
                                          <>
                                            <Sun className="w-3 h-3" />
                                            Summer
                                          </>
                                        ) : (
                                          <>
                                            <Snowflake className="w-3 h-3" />
                                            Winter
                                          </>
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Click to switch to {activeSeason === "summer" ? "winter" : "summer"} schedule</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <PropertyActionMenu
                                property={property}
                                onRemove={() => onRemoveProperty(property.id)}
                                onExtendedCover={() => console.log("Extended Cover", property)}
                                onSplitRoute={() => console.log("Split Route", property)}
                                onGenerateStops={() => console.log("Generate Stops", property)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ServiceTechs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [viewingTech, setViewingTech] = useState<Technician | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTechs, setExpandedTechs] = useState<Set<string>>(new Set());
  const [globalSeason, setGlobalSeason] = useState<"summer" | "winter">("summer");
  const queryClient = useQueryClient();

  const { data: techniciansData, isLoading } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians/stored", "service"],
    queryFn: async () => {
      const res = await fetch("/api/technicians/stored?role=service");
      if (!res.ok) throw new Error("Failed to fetch technicians");
      return res.json();
    },
  });

  const technicians = techniciansData?.technicians || [];

  const { data: propertyCountsData } = useQuery<{ counts: Record<string, number> }>({
    queryKey: ["/api/technician-properties/counts"],
    queryFn: async () => {
      const res = await fetch("/api/technician-properties/counts");
      if (!res.ok) throw new Error("Failed to fetch property counts");
      return res.json();
    },
  });

  const propertyCounts = propertyCountsData?.counts || {};

  const addTechnicianMutation = useMutation({
    mutationFn: async (tech: { firstName: string; lastName: string; phone: string; email: string }) => {
      const res = await fetch("/api/technicians/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tech, role: "service", active: true }),
      });
      if (!res.ok) throw new Error("Failed to add technician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "service"] });
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { firstName: string; lastName: string; phone: string; email: string; truckNumber: string } }) => {
      const res = await fetch(`/api/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update technician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "service"] });
    },
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/technicians/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete technician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "service"] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Failed to update technician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "service"] });
    },
  });

  const removePropertyMutation = useMutation({
    mutationFn: async (propertyAssignmentId: string) => {
      const res = await fetch(`/api/property-technicians/${propertyAssignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove property");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/technician-properties/counts"] });
    },
  });

  const updatePropertySeasonMutation = useMutation({
    mutationFn: async ({ propertyId, activeSeason }: { propertyId: string; activeSeason: string }) => {
      const res = await fetch(`/api/property-schedule/by-property/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeSeason }),
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-properties"] });
    },
  });

  const toggleTechExpanded = (techId: string) => {
    setExpandedTechs(prev => {
      const next = new Set(prev);
      if (next.has(techId)) {
        next.delete(techId);
      } else {
        next.add(techId);
      }
      return next;
    });
  };

  const filteredTechnicians = technicians
    .filter((tech) => {
      const fullName = `${tech.firstName || ""} ${tech.lastName || ""}`.toLowerCase();
      const phone = (tech.phone || "").toLowerCase();
      const email = (tech.email || "").toLowerCase();
      const matchesSearch = 
        fullName.includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery.toLowerCase()) ||
        email.includes(searchQuery.toLowerCase());
      
      if (filterStatus === "active") return matchesSearch && tech.active;
      if (filterStatus === "inactive") return matchesSearch && !tech.active;
      return matchesSearch;
    })
    .sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const totalPages = Math.ceil(filteredTechnicians.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTechnicians = filteredTechnicians.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Service Technicians</h1>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="bg-[#0078D4] hover:bg-[#0078D4]" data-testid="dropdown-filter-status">
                Filter: {filterStatus === "all" ? "All" : filterStatus === "active" ? "Active" : "Inactive"}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("active")}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("inactive")}>Inactive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "gap-2 transition-colors",
                    globalSeason === "summer" 
                      ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100" 
                      : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  )}
                  onClick={() => setGlobalSeason(globalSeason === "summer" ? "winter" : "summer")}
                  data-testid="button-toggle-season"
                >
                  {globalSeason === "summer" ? (
                    <>
                      <Sun className="w-4 h-4" />
                      Summer Schedule
                    </>
                  ) : (
                    <>
                      <Snowflake className="w-4 h-4" />
                      Winter Schedule
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle between summer and winter schedule view</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="tech name, phone #, email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-techs"
            />
          </div>

          <Button 
            className="bg-[#0078D4] hover:bg-[#0078D4] ml-auto" 
            onClick={() => setShowAddModal(true)}
            data-testid="button-add-technician"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tech
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Technicians
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Phone
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Truck #
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Commission %
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Properties
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Loading technicians...
                  </td>
                </tr>
              ) : filteredTechnicians.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    {searchQuery ? "No technicians match your search" : "No service technicians found. Click 'Add Tech' to add one."}
                  </td>
                </tr>
              ) : (
                paginatedTechnicians.map((tech) => {
                  const fullName = `${tech.firstName || ""} ${tech.lastName || ""}`.trim();
                  const initials = getInitials(tech.firstName, tech.lastName);
                  const avatarColor = getAvatarColor(fullName);
                  const isExpanded = expandedTechs.has(tech.id);
                  const propertyCount = propertyCounts[tech.id] || 0;
                  
                  return (
                    <TechnicianExpandableRow
                      key={tech.id}
                      tech={tech}
                      fullName={fullName}
                      initials={initials}
                      avatarColor={avatarColor}
                      isExpanded={isExpanded}
                      propertyCount={propertyCount}
                      globalSeason={globalSeason}
                      onToggleExpand={() => toggleTechExpanded(tech.id)}
                      onViewTech={() => setViewingTech(tech)}
                      onEditTech={() => setEditingTech(tech)}
                      onToggleStatus={(checked) => toggleStatusMutation.mutate({ id: tech.id, active: checked })}
                      onRemoveProperty={(id) => removePropertyMutation.mutate(id)}
                      onUpdateSeason={(propertyId, season) => updatePropertySeasonMutation.mutate({ propertyId, activeSeason: season })}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border border-slate-200 rounded-lg">
          <div className="text-sm text-slate-600">
            Showing {filteredTechnicians.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredTechnicians.length)} of {filteredTechnicians.length} technicians
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 px-3"
                data-testid="button-first-page"
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3"
                data-testid="button-prev-page"
              >
                Prev
              </Button>
              
              {getPageNumbers().map((page, idx) => (
                typeof page === "number" ? (
                  <Button
                    key={idx}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "h-8 w-8",
                      currentPage === page && "bg-[#0078D4] hover:bg-[#0078D4]"
                    )}
                    data-testid={`button-page-${page}`}
                  >
                    {page}
                  </Button>
                ) : (
                  <span key={idx} className="px-2 text-slate-400">...</span>
                )
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3"
                data-testid="button-next-page"
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 px-3"
                data-testid="button-last-page"
              >
                Last
              </Button>
            </div>
          )}
        </div>
      </div>

      <AddTechnicianModal 
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(tech) => addTechnicianMutation.mutate(tech)}
      />

      <EditTechnicianModal
        open={!!editingTech}
        onClose={() => setEditingTech(null)}
        technician={editingTech}
        onSave={(id, data) => updateTechnicianMutation.mutate({ id, data })}
        onDelete={(id) => deleteTechnicianMutation.mutate(id)}
      />

      <ServiceLogSidebar
        technician={viewingTech}
        onClose={() => setViewingTech(null)}
      />
    </AppLayout>
  );
}
