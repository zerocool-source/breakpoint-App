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
import { 
  Search, ChevronDown, ChevronRight, Plus, Image, Trash2, X, Clock, FileText, 
  MoreHorizontal, Sun, Snowflake, MapPin, Route, Users, CalendarDays, Edit2,
  CheckCircle2, Calendar, GripVertical, Eye, Pencil, Building2, Droplets, Wrench,
  Shield, Split, AlertCircle, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

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

interface CustomerAddress {
  id: string;
  customerId: string;
  addressType: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
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

interface RouteStop {
  id: string;
  propertyName: string;
  propertyId: string;
  address?: string;
  waterBodyType?: string;
  scheduledDate?: string;
  notes?: string;
  status: string;
  isCoverage?: boolean;
  technicianName?: string;
}

interface RouteOverride {
  id: string;
  date: string;
  startDate: string | null;
  endDate: string | null;
  coverageType: string;
  propertyId: string;
  propertyName: string | null;
  originalTechnicianId: string | null;
  originalTechnicianName: string | null;
  coveringTechnicianId: string | null;
  coveringTechnicianName: string | null;
  overrideType: string;
  reason: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

const COVERAGE_REASONS = ["Vacation", "Sick", "Training", "Other"];

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-gradient-to-br from-blue-500 to-blue-700",
    "bg-gradient-to-br from-emerald-500 to-emerald-700", 
    "bg-gradient-to-br from-cyan-500 to-cyan-700",
    "bg-gradient-to-br from-orange-500 to-orange-700",
    "bg-gradient-to-br from-pink-500 to-pink-700",
    "bg-gradient-to-br from-purple-500 to-purple-700",
    "bg-gradient-to-br from-indigo-500 to-indigo-700",
    "bg-gradient-to-br from-teal-500 to-teal-700",
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
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-slate-900 border-slate-700">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Service Technician
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-700 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-500">
              <Image className="w-8 h-8 text-slate-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                  data-testid="input-first-name"
                />
                <Input
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                  data-testid="input-last-name"
                />
              </div>
            </div>
          </div>
          <Input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
            data-testid="input-phone"
          />
          <Input
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
            data-testid="input-email"
          />
          
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              variant="ghost" 
              onClick={handleClose}
              className="text-slate-300 hover:text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!firstName.trim() || !lastName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-add-tech-submit"
            >
              Add Technician
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

  if (!technician) return null;

  const fullName = `${technician.firstName} ${technician.lastName}`.trim();
  const initials = getInitials(technician.firstName, technician.lastName);
  const avatarColor = getAvatarColor(fullName);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-white border-slate-200">
          <DialogHeader className="bg-blue-600 text-white px-6 py-4 rounded-t-lg flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Edit Technician
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-semibold shadow-lg",
                avatarColor
              )}>
                {initials}
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900"
                      data-testid="input-edit-first-name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900"
                      data-testid="input-edit-last-name"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                  data-testid="input-edit-phone"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                  data-testid="input-edit-email"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Truck #</label>
                <Input
                  value={truckNumber}
                  onChange={(e) => setTruckNumber(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                  data-testid="input-edit-truck-number"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Commission %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(parseInt(e.target.value) || 0)}
                  className="bg-white border-slate-300 text-slate-900"
                  data-testid="input-edit-commission"
                />
              </div>
            </div>
            
            <div className="flex justify-between pt-4 border-t border-slate-200">
              <Button 
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
                data-testid="button-delete-tech"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!firstName.trim() || !lastName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-save-tech"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Delete Technician</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to delete {fullName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface Customer {
  id: string;
  name: string;
  address: string | null;
}

// Scheduled Stops Side Panel
function ScheduledStopsPanel({
  technician,
  open,
  onClose,
}: {
  technician: Technician | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  
  const { data: stops, isLoading } = useQuery<RouteStop[]>({
    queryKey: ["/api/technician-stops", technician?.id],
    queryFn: async () => {
      const res = await fetch(`/api/technician-stops/${technician?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!technician && open,
  });

  const updateStopMutation = useMutation({
    mutationFn: async ({ stopId, status }: { stopId: string; status: string }) => {
      const res = await fetch(`/api/route-stops/${stopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update stop");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-stops", technician?.id] });
    },
  });

  if (!technician) return null;

  const fullName = `${technician.firstName} ${technician.lastName}`.trim();
  const initials = getInitials(technician.firstName, technician.lastName);
  const avatarColor = getAvatarColor(fullName);

  const sortedStops = [...(stops || [])].sort((a, b) => {
    if (!a.scheduledDate && !b.scheduledDate) return 0;
    if (!a.scheduledDate) return 1;
    if (!b.scheduledDate) return -1;
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-[420px] sm:w-[480px] p-0 bg-white border-slate-200"
        hideCloseButton={true}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold",
                avatarColor
              )}>
                {initials}
              </div>
              <div className="flex-1">
                <h2 className="text-white text-lg font-semibold">{fullName}</h2>
                <p className="text-blue-200 text-sm">Scheduled Stops</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                data-testid="button-close-stops-panel"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Route className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Stops</p>
                <p className="text-sm font-semibold text-slate-900">{sortedStops.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Completed</p>
                <p className="text-sm font-semibold text-slate-900">
                  {sortedStops.filter(s => s.status === "completed").length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Coverage</p>
                <p className="text-sm font-semibold text-slate-900">
                  {sortedStops.filter(s => s.isCoverage).length}
                </p>
              </div>
            </div>
          </div>

          {/* Stops List */}
          <ScrollArea className="flex-1 bg-slate-50">
            <div className="p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : sortedStops.length === 0 ? (
                <div className="text-center py-12">
                  <Route className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No scheduled stops</p>
                  <p className="text-slate-400 text-sm mt-1">Stops will appear here when scheduled</p>
                </div>
              ) : (
                sortedStops.map((stop, index) => (
                  <div 
                    key={stop.id}
                    className={cn(
                      "bg-white border rounded-xl p-4 hover:shadow-md transition-all group",
                      stop.status === "completed" ? "border-green-200 bg-green-50/50" : "border-slate-200"
                    )}
                    data-testid={`panel-stop-${stop.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Stop Number */}
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        stop.status === "completed" ? "bg-green-500 text-white" : "bg-blue-600 text-white"
                      )}>
                        {stop.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                      </div>
                      
                      {/* Stop Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={cn(
                            "font-medium truncate",
                            stop.status === "completed" ? "text-green-800 line-through" : "text-slate-900"
                          )}>{stop.propertyName}</h4>
                          {stop.waterBodyType && (
                            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-medium rounded-full">
                              {stop.waterBodyType}
                            </span>
                          )}
                          {stop.isCoverage && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Coverage
                            </span>
                          )}
                        </div>
                        
                        {stop.notes && (
                          <p className="text-sm text-slate-600 mt-2 italic bg-slate-100 p-2 rounded-lg">
                            "{stop.notes}"
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3">
                          {stop.scheduledDate && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(stop.scheduledDate), "MMM d, yyyy")}
                            </span>
                          )}
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full",
                            stop.status === "completed" ? "bg-green-100 text-green-700" :
                            stop.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {stop.status === "not_started" ? "Pending" : 
                             stop.status === "in_progress" ? "In Progress" : 
                             stop.status === "completed" ? "Completed" : stop.status}
                          </span>
                        </div>
                      </div>

                      {/* Close Out Button */}
                      {stop.status !== "completed" ? (
                        <Button
                          size="sm"
                          onClick={() => updateStopMutation.mutate({ stopId: stop.id, status: "completed" })}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1 h-8"
                          data-testid={`button-close-out-${stop.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Close Out
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStopMutation.mutate({ stopId: stop.id, status: "not_started" })}
                          className="border-slate-300 text-slate-600 hover:bg-slate-100 text-xs gap-1 h-8"
                          data-testid={`button-reopen-${stop.id}`}
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Add Property Modal
function AddPropertyModal({
  open,
  onClose,
  technician,
  onAddProperty,
}: {
  open: boolean;
  onClose: () => void;
  technician: Technician | null;
  onAddProperty: (customerId: string, visitDays: string[], season: string) => void;
}) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [season, setSeason] = useState<"summer" | "winter">("summer");

  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) return { customers: [] };
      return res.json();
    },
    enabled: open,
  });

  const { data: assignedProperties } = useQuery<TechnicianPropertyWithSchedule[]>({
    queryKey: ["/api/technician-properties", technician?.id],
    queryFn: async () => {
      const res = await fetch(`/api/technician-properties/${technician?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!technician && open,
  });

  const customers = customersData?.customers || [];
  const assignedPropertyIds = new Set((assignedProperties || []).map(p => p.propertyId));
  
  const filteredCustomers = customers.filter(c => 
    !assignedPropertyIds.has(c.id) &&
    c.name.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const handleSubmit = () => {
    if (!selectedPropertyId) return;
    onAddProperty(selectedPropertyId, selectedDays, season);
    setSelectedPropertyId("");
    setPropertySearch("");
    setSelectedDays([]);
    setSeason("summer");
    onClose();
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const selectedCustomer = customers.find(c => c.id === selectedPropertyId);

  if (!technician) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-slate-900 border-slate-700">
        <DialogHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Add Property to {technician.firstName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          {/* Property Search */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Search Properties</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by property name..."
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                data-testid="input-search-property-add"
              />
            </div>
            
            {propertySearch && !selectedPropertyId && (
              <div className="mt-2 max-h-40 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg">
                {filteredCustomers.length === 0 ? (
                  <p className="p-3 text-sm text-slate-400 text-center">No properties found</p>
                ) : (
                  filteredCustomers.slice(0, 8).map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setSelectedPropertyId(customer.id);
                        setPropertySearch(customer.name);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700 last:border-b-0 transition-colors"
                      data-testid={`select-property-${customer.id}`}
                    >
                      <p className="font-medium text-sm text-white">{customer.name}</p>
                      {customer.address && (
                        <p className="text-xs text-slate-400">{customer.address}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Property */}
          {selectedCustomer && (
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{selectedCustomer.name}</p>
                  {selectedCustomer.address && (
                    <p className="text-sm text-slate-400">{selectedCustomer.address}</p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedPropertyId("");
                    setPropertySearch("");
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Season Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Season</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSeason("summer")}
                className={cn(
                  "flex-1 gap-2",
                  season === "summer" 
                    ? "bg-amber-500/20 border-amber-500 text-amber-400" 
                    : "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                )}
              >
                <Sun className="w-4 h-4" />
                Summer
              </Button>
              <Button
                variant="outline"
                onClick={() => setSeason("winter")}
                className={cn(
                  "flex-1 gap-2",
                  season === "winter" 
                    ? "bg-blue-500/20 border-blue-500 text-blue-400" 
                    : "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                )}
              >
                <Snowflake className="w-4 h-4" />
                Winter
              </Button>
            </div>
          </div>

          {/* Visit Days */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Visit Days</label>
            <div className="flex gap-2">
              {ALL_DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border transition-all",
                    selectedDays.includes(day)
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700"
                  )}
                  data-testid={`toggle-day-${day.toLowerCase()}`}
                >
                  {day.charAt(0)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="text-slate-300 hover:text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedPropertyId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-confirm-add-property"
            >
              Add Property
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Extended Cover Modal Component - Single Property Version
function ExtendedCoverModal({
  open,
  onClose,
  property,
  originalTechnician,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  property: TechnicianPropertyWithSchedule;
  originalTechnician: Technician;
  onConfirm: (data: {
    startDate: string;
    endDate: string;
    coveringTechnicianId: string;
    notes: string;
  }) => void;
}) {
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [coveringTechId, setCoveringTechId] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch technicians for covering tech selection
  const { data: techniciansData } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians/stored"],
  });

  const allTechnicians = techniciansData?.technicians || [];

  useEffect(() => {
    if (open) {
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setEndDate(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
      setCoveringTechId("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!startDate || !endDate || !coveringTechId) return;
    onConfirm({
      startDate,
      endDate,
      coveringTechnicianId: coveringTechId,
      notes,
    });
    onClose();
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Shield className="w-5 h-5 text-blue-600" />
            Extended Cover
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Assign another technician to cover this property during the specified dates.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Property Info */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-slate-700">Property</p>
            <p className="text-base font-semibold text-slate-900">{property.propertyName || "Unknown Property"}</p>
            <p className="text-xs text-slate-500 mt-1">
              Original Tech: {originalTechnician.firstName} {originalTechnician.lastName}
            </p>
          </div>

          {/* Info Message */}
          <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              The covering technician will handle this property during the selected date range. Coverage automatically ends after the end date.
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-700">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label className="text-slate-700">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
                data-testid="input-end-date"
              />
            </div>
          </div>

          {/* Covering Technician */}
          <div>
            <Label className="text-slate-700">Covering Technician</Label>
            <Select value={coveringTechId} onValueChange={setCoveringTechId}>
              <SelectTrigger className="mt-1" data-testid="select-covering-tech">
                <SelectValue placeholder="Select technician..." />
              </SelectTrigger>
              <SelectContent>
                {allTechnicians
                  .filter(t => t.id !== originalTechnician.id && t.active)
                  .map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.firstName} {tech.lastName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-slate-700">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              className="mt-1"
              rows={2}
              data-testid="input-notes"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!startDate || !endDate || !coveringTechId}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-confirm-override"
            >
              Confirm Coverage
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Split Route Modal Component - Single Property Version
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function SplitRouteModal({
  open,
  onClose,
  property,
  originalTechnician,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  property: TechnicianPropertyWithSchedule;
  originalTechnician: Technician;
  onConfirm: (data: {
    startDate: string;
    endDate: string;
    splitTechnicianId: string;
    daysForSplitTechnician: string[];
    notes: string;
  }) => void;
}) {
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [splitTechId, setSplitTechId] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Fetch technicians for split tech selection
  const { data: techniciansData } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians/stored"],
  });

  const allTechnicians = techniciansData?.technicians || [];

  useEffect(() => {
    if (open) {
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setEndDate(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
      setSplitTechId("");
      setSelectedDays([]);
      setNotes("");
    }
  }, [open]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = () => {
    if (!startDate || !endDate || !splitTechId || selectedDays.length === 0) return;
    onConfirm({
      startDate,
      endDate,
      splitTechnicianId: splitTechId,
      daysForSplitTechnician: selectedDays,
      notes,
    });
    onClose();
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Split className="w-5 h-5 text-purple-600" />
            Split Route
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Split this property's visits between the original technician and a second technician by day of week.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Property Info */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-slate-700">Property</p>
            <p className="text-base font-semibold text-slate-900">{property.propertyName || "Unknown Property"}</p>
            <p className="text-xs text-slate-500 mt-1">
              Original Tech: {originalTechnician.firstName} {originalTechnician.lastName}
            </p>
          </div>

          {/* Info Message */}
          <div className="flex gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-purple-700">
              Select which days of the week the split technician will handle. The original technician will handle the remaining days.
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-700">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
                data-testid="input-split-start-date"
              />
            </div>
            <div>
              <Label className="text-slate-700">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
                data-testid="input-split-end-date"
              />
            </div>
          </div>

          {/* Split Technician */}
          <div>
            <Label className="text-slate-700">Split Technician</Label>
            <Select value={splitTechId} onValueChange={setSplitTechId}>
              <SelectTrigger className="mt-1" data-testid="select-split-tech">
                <SelectValue placeholder="Select technician..." />
              </SelectTrigger>
              <SelectContent>
                {allTechnicians
                  .filter(t => t.id !== originalTechnician.id && t.active)
                  .map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.firstName} {tech.lastName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Days Selection */}
          <div>
            <Label className="text-slate-700 mb-2 block">Days for Split Technician</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors",
                    selectedDays.includes(day)
                      ? "bg-purple-100 text-purple-700 border-purple-300"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                  data-testid={`button-day-${day.toLowerCase()}`}
                >
                  {day}
                </button>
              ))}
            </div>
            {selectedDays.length > 0 && (
              <p className="text-sm text-slate-600 mt-2">
                Split tech handles: {selectedDays.join(", ")}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-slate-700">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              className="mt-1"
              rows={2}
              data-testid="input-split-notes"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!startDate || !endDate || !splitTechId || selectedDays.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-confirm-split"
            >
              Confirm Split
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Remove Property Confirmation
function RemovePropertyDialog({
  open,
  onClose,
  property,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  property: TechnicianPropertyWithSchedule | null;
  onConfirm: () => void;
}) {
  if (!property) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="bg-slate-900 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            Remove Property
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Are you sure you want to remove <span className="font-medium text-white">{property.propertyName || "this property"}</span> from this technician? This will unassign the property and remove all scheduled stops.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            Remove Property
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const WATER_BODY_TYPES = ["Pool", "Spa", "Fountain", "Splash Pad", "Wader"] as const;
type WaterBodyType = typeof WATER_BODY_TYPES[number];

interface AddStopData {
  propertyId: string;
  propertyName: string;
  customerName?: string;
  address?: string;
  notes: string;
  technicianId: string;
  technicianName: string;
  waterBodyType: WaterBodyType;
  scheduledDate: string;
  isCoverage?: boolean;
}

function AddStopModal({
  open,
  onClose,
  property,
  technicianId,
  technicianName,
  onAddStop,
}: {
  open: boolean;
  onClose: () => void;
  property: TechnicianPropertyWithSchedule | null;
  technicianId: string;
  technicianName: string;
  onAddStop: (data: AddStopData) => void;
}) {
  const [notes, setNotes] = useState("");
  const [waterBodyType, setWaterBodyType] = useState<WaterBodyType>("Pool");
  const [scheduledDate, setScheduledDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isCoverage, setIsCoverage] = useState(false);

  const handleSubmit = () => {
    if (!property || !scheduledDate) return;
    onAddStop({
      propertyId: property.propertyId,
      propertyName: property.propertyName || "Unknown Property",
      customerName: property.customerName || undefined,
      address: property.address || undefined,
      notes: notes.trim(),
      technicianId,
      technicianName,
      waterBodyType,
      scheduledDate,
      isCoverage,
    });
    setNotes("");
    setWaterBodyType("Pool");
    setScheduledDate(new Date().toISOString().split("T")[0]);
    setIsCoverage(false);
    onClose();
  };

  const handleClose = () => {
    setNotes("");
    setWaterBodyType("Pool");
    setScheduledDate(new Date().toISOString().split("T")[0]);
    setIsCoverage(false);
    onClose();
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 bg-slate-900 border-slate-700">
        <DialogHeader className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Route className="w-5 h-5" />
            Add Stop
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
            <p className="text-sm text-slate-400">Property</p>
            <p className="font-medium text-white">{property.propertyName || "Unknown Property"}</p>
            {property.address && (
              <p className="text-sm text-slate-400">{property.address}</p>
            )}
          </div>
          
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-2">
              Body of Water
            </label>
            <Select value={waterBodyType} onValueChange={(val) => setWaterBodyType(val as WaterBodyType)}>
              <SelectTrigger className="w-full bg-slate-800 border-slate-600 text-white" data-testid="select-water-body-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {WATER_BODY_TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="text-white hover:bg-slate-700" data-testid={`option-water-${type.toLowerCase().replace(" ", "-")}`}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-2">
              Scheduled Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              data-testid="input-scheduled-date"
            />
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
            <input
              type="checkbox"
              id="coverage-toggle"
              checked={isCoverage}
              onChange={(e) => setIsCoverage(e.target.checked)}
              className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-orange-500 focus:ring-orange-500"
              data-testid="checkbox-coverage"
            />
            <label htmlFor="coverage-toggle" className="text-sm font-medium text-slate-300 flex-1">
              Coverage Stop
            </label>
            {isCoverage && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-full">
                Coverage
              </span>
            )}
          </div>
          
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any notes for this stop..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              rows={3}
              data-testid="input-stop-notes"
            />
          </div>
        </div>
        
        <div className="px-6 pb-6 flex justify-end gap-3">
          <Button 
            variant="ghost" 
            onClick={handleClose} 
            className="text-slate-300 hover:text-white hover:bg-slate-700"
            data-testid="button-cancel-add-stop"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
            disabled={!scheduledDate}
            data-testid="button-confirm-add-stop"
          >
            Add Stop
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDayCircles({ 
  days, 
  activeDays, 
  onToggleDay,
}: { 
  days: string[]; 
  activeDays: string[];
  onToggleDay?: (day: string, isCurrentlyActive: boolean) => void;
}) {
  const normalizedActiveDays = activeDays.map(d => DAY_MAPPING[d.toLowerCase()] || DAY_MAPPING[d] || d);
  
  return (
    <div className="flex gap-1">
      {days.map((day) => {
        const isActive = normalizedActiveDays.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onToggleDay?.(day, isActive)}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all cursor-pointer",
              isActive 
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600" 
                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            )}
            title={`${isActive ? "Remove" : "Add"} ${day}`}
            data-testid={`button-day-${day.toLowerCase()}`}
          >
            {day.charAt(0)}
          </button>
        );
      })}
    </div>
  );
}

// Pool interface for body of water data
interface Pool {
  id: string;
  customerId: string;
  name: string;
  poolType: string | null;
  waterType: string | null;
  gallons: number | null;
}

// Equipment interface
interface EquipmentItem {
  id: string;
  customerId: string;
  category: string;
  equipmentType: string;
  brand: string | null;
  model: string | null;
}

// Property Card with pools and equipment
function PropertyCard({
  property,
  globalSeason,
  onToggleVisitDay,
  onUpdateSeason,
  onRemoveProperty,
  onExtendedCover,
  onSplitRoute,
  activeCoverage,
}: {
  property: TechnicianPropertyWithSchedule;
  globalSeason: "summer" | "winter";
  onToggleVisitDay: (propertyId: string, day: string, isCurrentlyActive: boolean, season: "summer" | "winter") => void;
  onUpdateSeason: (propertyId: string, activeSeason: "summer" | "winter") => void;
  onRemoveProperty: (property: TechnicianPropertyWithSchedule) => void;
  onExtendedCover: () => void;
  onSplitRoute: () => void;
  activeCoverage?: RouteOverride | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Fetch pools for this property/customer (always fetch for count display)
  const { data: poolsData } = useQuery<{ pools: Pool[] }>({
    queryKey: [`/api/customers/${property.propertyId}/pools`],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${property.propertyId}/pools`);
      if (!res.ok) return { pools: [] };
      return res.json();
    },
  });

  // Fetch addresses for this property/customer (service and primary only)
  const { data: addressesData } = useQuery<{ addresses: CustomerAddress[] }>({
    queryKey: [`/api/customers/${property.propertyId}/addresses`, "primary,service"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${property.propertyId}/addresses?type=primary,service`);
      if (!res.ok) return { addresses: [] };
      return res.json();
    },
  });

  // Fetch equipment for this property/customer
  const { data: equipmentData } = useQuery<{ equipment: EquipmentItem[] }>({
    queryKey: [`/api/customers/${property.propertyId}/equipment`],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${property.propertyId}/equipment`);
      if (!res.ok) return { equipment: [] };
      return res.json();
    },
    enabled: expanded,
  });

  const pools = poolsData?.pools || [];
  const addresses = addressesData?.addresses || [];
  const equipment = equipmentData?.equipment || [];

  // Get the selected address or first available
  const selectedAddress = addresses.find(a => a.id === selectedAddressId) || addresses[0];
  
  // Format address for display
  const formatAddress = (addr: CustomerAddress | undefined) => {
    if (!addr) return null;
    const parts = [addr.addressLine1, addr.city, addr.state, addr.zip].filter(Boolean);
    return parts.join(", ");
  };

  // Generate bodies of water summary
  const getPoolsSummary = () => {
    if (pools.length === 0) return null;
    
    const counts: Record<string, number> = {};
    pools.forEach(pool => {
      const type = (pool.poolType || "Pool").toLowerCase();
      counts[type] = (counts[type] || 0) + 1;
    });
    
    const parts: string[] = [];
    if (counts.pool) parts.push(`${counts.pool} pool${counts.pool > 1 ? "s" : ""}`);
    if (counts.spa) parts.push(`${counts.spa} spa${counts.spa > 1 ? "s" : ""}`);
    if (counts.fountain) parts.push(`${counts.fountain} fountain${counts.fountain > 1 ? "s" : ""}`);
    if (counts.pond) parts.push(`${counts.pond} pond${counts.pond > 1 ? "s" : ""}`);
    
    // Handle any other types
    Object.keys(counts).forEach(type => {
      if (!["pool", "spa", "fountain", "pond"].includes(type)) {
        parts.push(`${counts[type]} ${type}${counts[type] > 1 ? "s" : ""}`);
      }
    });
    
    return parts.join(", ");
  };

  const visitDays = globalSeason === "summer" 
    ? property.summerVisitDays 
    : property.winterVisitDays;

  // Pool type color mapping
  const getPoolTypeColor = (poolType: string | null) => {
    switch (poolType?.toLowerCase()) {
      case "pool": return "bg-blue-100 text-blue-700 border-blue-200";
      case "spa": return "bg-purple-100 text-purple-700 border-purple-200";
      case "fountain": return "bg-cyan-100 text-cyan-700 border-cyan-200";
      case "pond": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const poolsSummary = getPoolsSummary();

  return (
    <div 
      className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
      data-testid={`card-property-${property.id}`}
    >
      {/* Property Header */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setExpanded(!expanded)}
                className="text-slate-500 hover:text-slate-700"
              >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <h4 className="font-semibold text-slate-900">{property.propertyName || "Unknown Property"}</h4>
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded",
                property.activeSeason === "summer" 
                  ? "bg-amber-50 text-amber-700" 
                  : "bg-blue-50 text-blue-700"
              )}>
                {property.activeSeason === "summer" ? "Summer" : "Winter"}
              </span>
              {activeCoverage && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {activeCoverage.coverageType === "extended_cover" ? "Covering" : "Split"}
                  {activeCoverage.startDate && activeCoverage.endDate && (
                    <span className="text-green-600">
                      ({format(new Date(activeCoverage.startDate), "M/d")} - {format(new Date(activeCoverage.endDate), "M/d")})
                    </span>
                  )}
                </span>
              )}
            </div>
            
            {/* Address Display */}
            <div className="ml-6 mt-2">
              {addresses.length === 0 ? (
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  No service address
                </p>
              ) : addresses.length === 1 ? (
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {formatAddress(addresses[0])}
                  {addresses[0].addressType && (
                    <span className="text-xs text-slate-400 capitalize">({addresses[0].addressType})</span>
                  )}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <Select 
                    value={selectedAddressId || addresses[0]?.id} 
                    onValueChange={setSelectedAddressId}
                  >
                    <SelectTrigger className="h-7 text-sm w-auto min-w-[200px] bg-slate-50">
                      <SelectValue placeholder="Select address" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {formatAddress(addr)} ({addr.addressType || "primary"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {/* Bodies of Water Summary */}
            {poolsSummary && (
              <div className="ml-6 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                  <Droplets className="w-3.5 h-3.5" />
                  {poolsSummary}
                </span>
              </div>
            )}
            
            {/* Schedule Days */}
            <div className="flex items-center gap-1 mt-3 ml-6">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                const isActive = visitDays?.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => onToggleVisitDay(
                      property.propertyId,
                      day,
                      isActive || false,
                      globalSeason
                    )}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                      isActive 
                        ? "bg-orange-500 text-white hover:bg-orange-600" 
                        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    )}
                  >
                    {day.charAt(0)}
                  </button>
                );
              })}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                onUpdateSeason(
                  property.propertyId,
                  property.activeSeason === "summer" ? "winter" : "summer"
                );
              }}>
                Switch to {property.activeSeason === "summer" ? "Winter" : "Summer"}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onExtendedCover}
                className="text-blue-600 focus:text-blue-600"
              >
                <Shield className="w-4 h-4 mr-2" />
                Extended Cover
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onSplitRoute}
                className="text-purple-600 focus:text-purple-600"
              >
                <Split className="w-4 h-4 mr-2" />
                Split Route
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onRemoveProperty(property)}
                className="text-red-600 focus:text-red-600"
              >
                Remove Property
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded Content - Pools & Equipment */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-4">
          {/* Bodies of Water Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-slate-700">Bodies of Water</span>
            </div>
            {pools.length === 0 ? (
              <p className="text-sm text-slate-400 ml-6">No pools found</p>
            ) : (
              <div className="flex flex-wrap gap-2 ml-6">
                {pools.map((pool) => (
                  <button
                    key={pool.id}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-full border transition-colors hover:opacity-80",
                      getPoolTypeColor(pool.poolType)
                    )}
                    data-testid={`tag-pool-${pool.id}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Droplets className="w-3 h-3" />
                      {pool.name} {pool.poolType && `(${pool.poolType})`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Equipment Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-slate-700">Equipment</span>
            </div>
            {equipment.length === 0 ? (
              <p className="text-sm text-slate-400 ml-6">No equipment found</p>
            ) : (
              <div className="ml-6 space-y-1">
                {equipment.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-2 text-sm text-slate-600"
                    data-testid={`equipment-${item.id}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="font-medium">{item.category}:</span>
                    <span>{item.equipmentType}</span>
                    {item.brand && <span className="text-slate-400">({item.brand})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Properties Tab Content Component
function PropertiesTabContent({
  technician,
  globalSeason,
  onAddProperty,
  onRemoveProperty,
}: {
  technician: Technician;
  globalSeason: "summer" | "winter";
  onAddProperty: () => void;
  onRemoveProperty: (property: TechnicianPropertyWithSchedule) => void;
}) {
  const queryClient = useQueryClient();
  
  const { data: propertiesData, isLoading } = useQuery<{ properties: TechnicianPropertyWithSchedule[] }>({
    queryKey: [`/api/technician-properties/${technician.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/technician-properties/${technician.id}`);
      if (!res.ok) throw new Error("Failed to fetch properties");
      return res.json();
    },
  });

  const properties = propertiesData?.properties || [];

  const updatePropertySeasonMutation = useMutation({
    mutationFn: async ({ propertyId, activeSeason }: { propertyId: string; activeSeason: "summer" | "winter" }) => {
      const res = await fetch(`/api/scheduling/property/${propertyId}/season`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeSeason }),
      });
      if (!res.ok) throw new Error("Failed to update season");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technician-properties/${technician.id}`] });
    },
  });

  const toggleVisitDayMutation = useMutation({
    mutationFn: async ({ propertyId, day, isCurrentlyActive, season }: { 
      propertyId: string; 
      day: string; 
      isCurrentlyActive: boolean; 
      season: "summer" | "winter";
    }) => {
      const res = await fetch(`/api/scheduling/property/${propertyId}/visit-day`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, isCurrentlyActive, season }),
      });
      if (!res.ok) throw new Error("Failed to toggle visit day");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technician-properties/${technician.id}`] });
    },
  });

  // State for Extended Cover and Split Route modals
  const [extendedCoverProperty, setExtendedCoverProperty] = useState<TechnicianPropertyWithSchedule | null>(null);
  const [splitRouteProperty, setSplitRouteProperty] = useState<TechnicianPropertyWithSchedule | null>(null);

  // Fetch route overrides for this technician's properties
  const { data: routeOverridesData } = useQuery<{ routeOverrides: RouteOverride[] }>({
    queryKey: [`/api/route-overrides/technician/${technician.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/route-overrides/technician/${technician.id}`);
      if (!res.ok) return { routeOverrides: [] };
      return res.json();
    },
  });

  const routeOverrides = routeOverridesData?.routeOverrides || [];

  // Get active coverage for a specific property
  const getActiveCoverage = (propertyId: string): RouteOverride | null => {
    const today = new Date();
    return routeOverrides.find(override => 
      override.propertyId === propertyId &&
      override.startDate && override.endDate &&
      new Date(override.startDate) <= today &&
      new Date(override.endDate) >= today
    ) || null;
  };

  // Mutation to create route override (coverage)
  const createRouteOverrideMutation = useMutation({
    mutationFn: async (data: {
      originalTechnicianId: string;
      coveringTechnicianId: string;
      originalPropertyId: string;
      coverageType: "extended_cover" | "split_route";
      startDate: string;
      endDate: string;
      splitDays?: string[];
      notes?: string;
    }) => {
      const res = await fetch('/api/route-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create coverage');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/route-overrides/technician/${technician.id}`] });
      setExtendedCoverProperty(null);
      setSplitRouteProperty(null);
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-slate-500 mt-2">Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{properties.length} assigned properties</span>
        <Button 
          size="sm" 
          onClick={onAddProperty}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          data-testid="button-add-property"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No properties assigned</p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              globalSeason={globalSeason}
              onToggleVisitDay={(propertyId, day, isCurrentlyActive, season) => {
                toggleVisitDayMutation.mutate({ propertyId, day, isCurrentlyActive, season });
              }}
              onUpdateSeason={(propertyId, activeSeason) => {
                updatePropertySeasonMutation.mutate({ propertyId, activeSeason });
              }}
              onRemoveProperty={onRemoveProperty}
              onExtendedCover={() => setExtendedCoverProperty(property)}
              onSplitRoute={() => setSplitRouteProperty(property)}
              activeCoverage={getActiveCoverage(property.propertyId)}
            />
          ))}
        </div>
      )}

      {/* Extended Cover Modal */}
      {extendedCoverProperty && (
        <ExtendedCoverModal
          open={!!extendedCoverProperty}
          onClose={() => setExtendedCoverProperty(null)}
          property={extendedCoverProperty}
          originalTechnician={technician}
          onConfirm={(data) => {
            createRouteOverrideMutation.mutate({
              originalTechnicianId: technician.id,
              coveringTechnicianId: data.coveringTechnicianId,
              originalPropertyId: extendedCoverProperty.propertyId,
              coverageType: "extended_cover",
              startDate: data.startDate,
              endDate: data.endDate,
              notes: data.notes,
            });
          }}
        />
      )}

      {/* Split Route Modal */}
      {splitRouteProperty && (
        <SplitRouteModal
          open={!!splitRouteProperty}
          onClose={() => setSplitRouteProperty(null)}
          property={splitRouteProperty}
          originalTechnician={technician}
          onConfirm={(data) => {
            createRouteOverrideMutation.mutate({
              originalTechnicianId: technician.id,
              coveringTechnicianId: data.splitTechnicianId,
              originalPropertyId: splitRouteProperty.propertyId,
              coverageType: "split_route",
              startDate: data.startDate,
              endDate: data.endDate,
              splitDays: data.daysForSplitTechnician,
              notes: data.notes,
            });
          }}
        />
      )}
    </div>
  );
}

// Notes Tab Content Component
interface TechnicianNote {
  id: string;
  technicianId: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

function NotesTabContent({ technician }: { technician: Technician }) {
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const { data: notesData, isLoading } = useQuery<{ notes: TechnicianNote[] }>({
    queryKey: [`/api/technicians/${technician.id}/notes`],
    queryFn: async () => {
      const res = await fetch(`/api/technicians/${technician.id}/notes`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
  });

  const notes = notesData?.notes || [];

  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/technicians/${technician.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to create note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technicians/${technician.id}/notes`] });
      setNewNote("");
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      const res = await fetch(`/api/technician-notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technicians/${technician.id}/notes`] });
      setEditingNoteId(null);
      setEditingContent("");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/technician-notes/${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/technicians/${technician.id}/notes`] });
    },
  });

  const handleAddNote = () => {
    if (newNote.trim()) {
      createNoteMutation.mutate(newNote.trim());
    }
  };

  const handleStartEdit = (note: TechnicianNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleSaveEdit = () => {
    if (editingNoteId && editingContent.trim()) {
      updateNoteMutation.mutate({ noteId: editingNoteId, content: editingContent.trim() });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-slate-500 mt-2">Loading notes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Add a note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
          className="flex-1"
          data-testid="input-new-note"
        />
        <Button 
          size="sm" 
          disabled={!newNote.trim() || createNoteMutation.isPending}
          onClick={handleAddNote}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-add-note"
        >
          Add
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No notes yet</p>
          <p className="text-sm text-slate-400 mt-1">Add internal notes about this technician</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div 
              key={note.id} 
              className="bg-white border border-slate-200 rounded-lg p-3"
              data-testid={`card-note-${note.id}`}
            >
              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  <Input
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setEditingNoteId(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateNoteMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-slate-700">{note.content}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(note)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                      data-testid={`button-edit-note-${note.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNoteToDelete(note.id)}
                      disabled={deleteNoteMutation.isPending}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                      data-testid={`button-delete-note-${note.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Delete Note</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (noteToDelete) {
                  deleteNoteMutation.mutate(noteToDelete);
                  setNoteToDelete(null);
                }
              }} 
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-delete-note"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const ITEMS_PER_PAGE = 10;

export default function ServiceTechs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTechs, setExpandedTechs] = useState<Set<string>>(new Set());
  const [globalSeason, setGlobalSeason] = useState<"summer" | "winter">("summer");
  
  // Selected technician for detail panel
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [activeTab, setActiveTab] = useState<"properties" | "notes">("properties");
  
  // Stop modal state
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [addStopProperty, setAddStopProperty] = useState<TechnicianPropertyWithSchedule | null>(null);
  const [addStopTechnicianId, setAddStopTechnicianId] = useState<string>("");
  const [addStopTechnicianName, setAddStopTechnicianName] = useState<string>("");
  
  // Stops panel state (legacy - keeping for compatibility)
  const [stopsPanelTech, setStopsPanelTech] = useState<Technician | null>(null);
  
  // Add property modal state
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [addPropertyTech, setAddPropertyTech] = useState<Technician | null>(null);
  
  // Remove property state
  const [showRemovePropertyDialog, setShowRemovePropertyDialog] = useState(false);
  const [propertyToRemove, setPropertyToRemove] = useState<TechnicianPropertyWithSchedule | null>(null);
  
  const queryClient = useQueryClient();

  const { data: techniciansData, isLoading } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians/stored"],
    queryFn: async () => {
      const res = await fetch("/api/technicians/stored");
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
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored"] });
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update technician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored"] });
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
      queryClient.refetchQueries({ queryKey: ["/api/technicians/stored"] });
    },
  });

  const removePropertyMutation = useMutation({
    mutationFn: async (propertyAssignmentId: string) => {
      const res = await fetch(`/api/technician-properties/${propertyAssignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove property");
      return res.json();
    },
    onSuccess: () => {
      if (selectedTech) {
        queryClient.invalidateQueries({ queryKey: [`/api/technician-properties/${selectedTech.id}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/technician-properties/counts"] });
      setShowRemovePropertyDialog(false);
      setPropertyToRemove(null);
    },
  });

  const addPropertyMutation = useMutation({
    mutationFn: async ({ technicianId, customerId, visitDays, season }: { technicianId: string; customerId: string; visitDays: string[]; season: string }) => {
      const customersRes = await fetch("/api/customers");
      const customersData = await customersRes.json();
      const customer = customersData.customers?.find((c: Customer) => c.id === customerId);
      
      // Step 1: Assign property to technician
      const res = await fetch("/api/technician-properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId,
          propertyId: customerId,
          propertyName: customer?.name,
          customerName: customer?.name,
          address: customer?.address,
          assignedByName: "Office Staff",
        }),
      });
      if (!res.ok) throw new Error("Failed to assign property");
      
      // Step 2: Set up schedule if visit days selected
      if (visitDays.length > 0) {
        const scheduleData = season === "summer" 
          ? { summerVisitDays: visitDays, activeSeason: "summer" }
          : { winterVisitDays: visitDays, activeSeason: "winter" };
          
        await fetch(`/api/property-schedule/by-property/${customerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scheduleData),
        });
      }
      
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/technician-properties/${variables.technicianId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/technician-properties/counts"] });
      setShowAddPropertyModal(false);
      setAddPropertyTech(null);
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

  const toggleVisitDayMutation = useMutation({
    mutationFn: async ({ propertyId, day, isCurrentlyActive, season }: { propertyId: string; day: string; isCurrentlyActive: boolean; season: string }) => {
      const res = await fetch(`/api/property-schedule/by-property/${propertyId}/toggle-day`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, isCurrentlyActive, season }),
      });
      if (!res.ok) throw new Error("Failed to toggle visit day");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-properties"] });
    },
  });

  const createRouteStopMutation = useMutation({
    mutationFn: async (data: AddStopData) => {
      const res = await fetch("/api/route-stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create route stop");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/route-stops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/technician-stops"] });
    },
  });

  const handleOpenAddStopModal = (tech: Technician, property: TechnicianPropertyWithSchedule) => {
    setAddStopProperty(property);
    setAddStopTechnicianId(tech.id);
    setAddStopTechnicianName(`${tech.firstName || ""} ${tech.lastName || ""}`.trim());
    setShowAddStopModal(true);
  };

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  // Handle technician selection
  const handleSelectTech = (tech: Technician) => {
    setSelectedTech(tech);
    setActiveTab("properties");
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Service Technicians</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your service team and property assignments</p>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-500/20" 
            onClick={() => setShowAddModal(true)}
            data-testid="button-add-technician"
          >
            <Plus className="w-4 h-4" />
            Add Technician
          </Button>
        </div>

        {/* Split Pane Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Technician List */}
          <div className={cn(
            "flex flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300",
            selectedTech ? "w-1/2 lg:w-2/5" : "w-full"
          )}>
            {/* Filters Bar */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-200 bg-white">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200"
                  data-testid="input-search-techs"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-slate-200" data-testid="dropdown-filter-status">
                    {filterStatus === "all" ? "All" : filterStatus === "active" ? "Active" : "Inactive"}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterStatus("all")}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("active")}>Active Only</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("inactive")}>Inactive Only</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1 transition-colors",
                  globalSeason === "summer" 
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100" 
                    : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                )}
                onClick={() => setGlobalSeason(globalSeason === "summer" ? "winter" : "summer")}
                data-testid="button-toggle-season"
              >
                {globalSeason === "summer" ? <Sun className="w-3 h-3" /> : <Snowflake className="w-3 h-3" />}
                {globalSeason === "summer" ? "Summer" : "Winter"}
              </Button>
            </div>

            {/* Technician List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                    <p className="text-slate-500 mt-3">Loading technicians...</p>
                  </div>
                ) : filteredTechnicians.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">
                      {searchQuery ? "No technicians match your search" : "No technicians found"}
                    </p>
                  </div>
                ) : (
                  filteredTechnicians.map((tech) => {
                    const fullName = `${tech.firstName} ${tech.lastName}`.trim();
                    const initials = getInitials(tech.firstName, tech.lastName);
                    const avatarColor = getAvatarColor(fullName);
                    const isSelected = selectedTech?.id === tech.id;
                    
                    return (
                      <div
                        key={tech.id}
                        onClick={() => handleSelectTech(tech)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                          isSelected 
                            ? "bg-blue-50 border border-blue-200 shadow-sm" 
                            : "bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm"
                        )}
                        data-testid={`row-technician-${tech.id}`}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0",
                          avatarColor
                        )}>
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 truncate">{fullName || "Unknown"}</span>
                            {tech.truckNumber && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                #{tech.truckNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                            {tech.phone && <span>{tech.phone}</span>}
                            {tech.email && <span className="truncate">{tech.email}</span>}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-2 text-xs flex-shrink-0">
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-medium">
                            {tech.commissionPercent || 0}%
                          </span>
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-medium">
                            {propertyCounts[tech.id] || 0}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStopsPanelTech(tech)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                            data-testid={`button-view-stops-${tech.id}`}
                          >
                            <Route className="w-4 h-4" />
                          </Button>
                          <Switch 
                            checked={tech.active} 
                            onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: tech.id, active: checked })}
                            className="data-[state=checked]:bg-emerald-500"
                            data-testid={`switch-status-${tech.id}`}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                            onClick={() => setEditingTech(tech)}
                            data-testid={`button-edit-${tech.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Technician Details */}
          {selectedTech && (
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {/* Detail Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold",
                    getAvatarColor(`${selectedTech.firstName} ${selectedTech.lastName}`)
                  )}>
                    {getInitials(selectedTech.firstName, selectedTech.lastName)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {selectedTech.firstName} {selectedTech.lastName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full",
                        selectedTech.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {selectedTech.active ? "Active" : "Inactive"}
                      </span>
                      <span className="text-sm text-slate-500">
                        {propertyCounts[selectedTech.id] || 0} properties
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingTech(selectedTech)}
                    className="gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedTech(null)}
                    className="h-8 w-8 p-0"
                    data-testid="button-close-detail-panel"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 px-6">
                <button
                  onClick={() => setActiveTab("properties")}
                  className={cn(
                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === "properties" 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                  data-testid="tab-properties"
                >
                  Properties
                </button>
                <button
                  onClick={() => setActiveTab("notes")}
                  className={cn(
                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === "notes" 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                  data-testid="tab-notes"
                >
                  Notes
                </button>
              </div>

              {/* Tab Content */}
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {activeTab === "properties" && (
                    <PropertiesTabContent
                      technician={selectedTech}
                      globalSeason={globalSeason}
                      onAddProperty={() => {
                        setAddPropertyTech(selectedTech);
                        setShowAddPropertyModal(true);
                      }}
                      onRemoveProperty={(property) => {
                        setPropertyToRemove(property);
                        setShowRemovePropertyDialog(true);
                      }}
                    />
                  )}
                  {activeTab === "notes" && (
                    <NotesTabContent technician={selectedTech} />
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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

      <ScheduledStopsPanel
        technician={stopsPanelTech}
        open={!!stopsPanelTech}
        onClose={() => setStopsPanelTech(null)}
      />

      <AddPropertyModal
        open={showAddPropertyModal}
        onClose={() => {
          setShowAddPropertyModal(false);
          setAddPropertyTech(null);
        }}
        technician={addPropertyTech}
        onAddProperty={(customerId, visitDays, season) => {
          if (addPropertyTech) {
            addPropertyMutation.mutate({
              technicianId: addPropertyTech.id,
              customerId,
              visitDays,
              season,
            });
          }
        }}
      />

      <RemovePropertyDialog
        open={showRemovePropertyDialog}
        onClose={() => {
          setShowRemovePropertyDialog(false);
          setPropertyToRemove(null);
        }}
        property={propertyToRemove}
        onConfirm={() => {
          if (propertyToRemove) {
            removePropertyMutation.mutate(propertyToRemove.id);
          }
        }}
      />

      <AddStopModal
        open={showAddStopModal}
        onClose={() => {
          setShowAddStopModal(false);
          setAddStopProperty(null);
        }}
        property={addStopProperty}
        technicianId={addStopTechnicianId}
        technicianName={addStopTechnicianName}
        onAddStop={(data) => createRouteStopMutation.mutate(data)}
      />
    </AppLayout>
  );
}
