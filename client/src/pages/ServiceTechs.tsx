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
  CheckCircle2, Calendar, GripVertical, Eye, Pencil, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-slate-900 border-slate-700">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
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
                    <label className="block text-xs font-medium text-slate-400 mb-1">First Name</label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white"
                      data-testid="input-edit-first-name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white"
                      data-testid="input-edit-last-name"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                  data-testid="input-edit-phone"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                  data-testid="input-edit-email"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Truck #</label>
                <Input
                  value={truckNumber}
                  onChange={(e) => setTruckNumber(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                  data-testid="input-edit-truck-number"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Commission %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(parseInt(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-600 text-white"
                  data-testid="input-edit-commission"
                />
              </div>
            </div>
            
            <div className="flex justify-between pt-4 border-t border-slate-700">
              <Button 
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/30 gap-2"
                data-testid="button-delete-tech"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
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
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Technician</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete {fullName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
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
        className="w-[420px] sm:w-[480px] p-0 bg-slate-900 border-slate-700"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg",
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
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-700 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Route className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Stops</p>
                <p className="text-sm font-semibold text-white">{sortedStops.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Completed</p>
                <p className="text-sm font-semibold text-white">
                  {sortedStops.filter(s => s.status === "completed").length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Coverage</p>
                <p className="text-sm font-semibold text-white">
                  {sortedStops.filter(s => s.isCoverage).length}
                </p>
              </div>
            </div>
          </div>

          {/* Stops List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : sortedStops.length === 0 ? (
                <div className="text-center py-12">
                  <Route className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">No scheduled stops</p>
                  <p className="text-slate-500 text-sm mt-1">Stops will appear here when scheduled</p>
                </div>
              ) : (
                sortedStops.map((stop, index) => (
                  <div 
                    key={stop.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:bg-slate-800 transition-all group"
                    data-testid={`panel-stop-${stop.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Drag Handle */}
                      <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                        <GripVertical className="w-4 h-4 text-slate-500" />
                      </div>
                      
                      {/* Stop Number */}
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {index + 1}
                      </div>
                      
                      {/* Stop Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-white truncate">{stop.propertyName}</h4>
                          {stop.waterBodyType && (
                            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded-full">
                              {stop.waterBodyType}
                            </span>
                          )}
                          {stop.isCoverage && (
                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-full flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Coverage
                            </span>
                          )}
                        </div>
                        
                        {stop.address && (
                          <p className="text-sm text-slate-400 mt-1 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {stop.address}
                          </p>
                        )}
                        
                        {stop.notes && (
                          <p className="text-sm text-slate-300 mt-2 italic bg-slate-700/50 p-2 rounded-lg">
                            "{stop.notes}"
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3">
                          {stop.scheduledDate && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(stop.scheduledDate), "MMM d, yyyy")}
                            </span>
                          )}
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full",
                            stop.status === "completed" ? "bg-green-500/20 text-green-400" :
                            stop.status === "in_progress" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-slate-600/50 text-slate-300"
                          )}>
                            {stop.status === "not_started" ? "Pending" : 
                             stop.status === "in_progress" ? "In Progress" : 
                             stop.status === "completed" ? "Completed" : stop.status}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-lg hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem 
                            onClick={() => updateStopMutation.mutate({ stopId: stop.id, status: "completed" })}
                            className="text-green-400 focus:bg-green-500/20 focus:text-green-400"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark Complete
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-slate-300 focus:bg-slate-700">
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Notes
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-slate-300 focus:bg-slate-700">
                            <Calendar className="w-4 h-4 mr-2" />
                            Reschedule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

const ITEMS_PER_PAGE = 10;

export default function ServiceTechs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTechs, setExpandedTechs] = useState<Set<string>>(new Set());
  const [globalSeason, setGlobalSeason] = useState<"summer" | "winter">("summer");
  
  // Stop modal state
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [addStopProperty, setAddStopProperty] = useState<TechnicianPropertyWithSchedule | null>(null);
  const [addStopTechnicianId, setAddStopTechnicianId] = useState<string>("");
  const [addStopTechnicianName, setAddStopTechnicianName] = useState<string>("");
  
  // Stops panel state
  const [stopsPanelTech, setStopsPanelTech] = useState<Technician | null>(null);
  
  // Add property modal state
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [addPropertyTech, setAddPropertyTech] = useState<Technician | null>(null);
  
  // Remove property state
  const [showRemovePropertyDialog, setShowRemovePropertyDialog] = useState(false);
  const [propertyToRemove, setPropertyToRemove] = useState<TechnicianPropertyWithSchedule | null>(null);
  
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
      const res = await fetch(`/api/technician-properties/${propertyAssignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove property");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-properties"] });
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

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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

        {/* Filters Bar */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 max-w-md">
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
              <Button variant="outline" className="gap-2 border-slate-200" data-testid="dropdown-filter-status">
                {filterStatus === "all" ? "All Status" : filterStatus === "active" ? "Active Only" : "Inactive Only"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>All Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("active")}>Active Only</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("inactive")}>Inactive Only</DropdownMenuItem>
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
                      Summer
                    </>
                  ) : (
                    <>
                      <Snowflake className="w-4 h-4" />
                      Winter
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle between summer and winter schedule</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Technicians List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-slate-500 mt-3">Loading technicians...</p>
            </div>
          ) : filteredTechnicians.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                {searchQuery ? "No technicians match your search" : "No service technicians found"}
              </p>
              {!searchQuery && (
                <Button 
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowAddModal(true)}
                >
                  Add Your First Technician
                </Button>
              )}
            </div>
          ) : (
            paginatedTechnicians.map((tech) => (
              <TechnicianCard
                key={tech.id}
                tech={tech}
                isExpanded={expandedTechs.has(tech.id)}
                propertyCount={propertyCounts[tech.id] || 0}
                globalSeason={globalSeason}
                onToggleExpand={() => toggleTechExpanded(tech.id)}
                onEdit={() => setEditingTech(tech)}
                onToggleStatus={(checked) => toggleStatusMutation.mutate({ id: tech.id, active: checked })}
                onViewStops={() => setStopsPanelTech(tech)}
                onAddProperty={() => {
                  setAddPropertyTech(tech);
                  setShowAddPropertyModal(true);
                }}
                onRemoveProperty={(property) => {
                  setPropertyToRemove(property);
                  setShowRemovePropertyDialog(true);
                }}
                onUpdateSeason={(propertyId, season) => updatePropertySeasonMutation.mutate({ propertyId, activeSeason: season })}
                onAddStop={(property) => handleOpenAddStopModal(tech, property)}
                onToggleVisitDay={(propertyId, day, isActive, season) => 
                  toggleVisitDayMutation.mutate({ propertyId, day, isCurrentlyActive: isActive, season })
                }
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-xl">
            <div className="text-sm text-slate-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTechnicians.length)} of {filteredTechnicians.length}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8"
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={cn("h-8 w-8", currentPage === page && "bg-blue-600 hover:bg-blue-700")}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
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

// Technician Card Component
function TechnicianCard({
  tech,
  isExpanded,
  propertyCount,
  globalSeason,
  onToggleExpand,
  onEdit,
  onToggleStatus,
  onViewStops,
  onAddProperty,
  onRemoveProperty,
  onUpdateSeason,
  onAddStop,
  onToggleVisitDay,
}: {
  tech: Technician;
  isExpanded: boolean;
  propertyCount: number;
  globalSeason: "summer" | "winter";
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleStatus: (checked: boolean) => void;
  onViewStops: () => void;
  onAddProperty: () => void;
  onRemoveProperty: (property: TechnicianPropertyWithSchedule) => void;
  onUpdateSeason: (propertyId: string, season: string) => void;
  onAddStop: (property: TechnicianPropertyWithSchedule) => void;
  onToggleVisitDay: (propertyId: string, day: string, isActive: boolean, season: string) => void;
}) {
  const fullName = `${tech.firstName || ""} ${tech.lastName || ""}`.trim();
  const initials = getInitials(tech.firstName, tech.lastName);
  const avatarColor = getAvatarColor(fullName);

  const { data: properties, isLoading: propertiesLoading } = useQuery<TechnicianPropertyWithSchedule[]>({
    queryKey: ["/api/technician-properties", tech.id],
    queryFn: async () => {
      const res = await fetch(`/api/technician-properties/${tech.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isExpanded,
  });

  // Check if tech has coverage stops
  const { data: stops } = useQuery<RouteStop[]>({
    queryKey: ["/api/technician-stops", tech.id],
    queryFn: async () => {
      const res = await fetch(`/api/technician-stops/${tech.id}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const hasCoverage = stops?.some(s => s.isCoverage) || false;

  return (
    <div 
      className={cn(
        "bg-white rounded-xl border transition-all",
        isExpanded ? "border-blue-300 shadow-lg shadow-blue-500/10" : "border-slate-200 hover:border-slate-300"
      )}
      data-testid={`card-technician-${tech.id}`}
    >
      {/* Main Row */}
      <div 
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Expand Arrow */}
        <button 
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            isExpanded ? "bg-blue-100 text-blue-600" : "hover:bg-slate-100 text-slate-400"
          )}
          data-testid={`button-expand-${tech.id}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Avatar */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg",
          avatarColor
        )}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900" data-testid={`text-tech-name-${tech.id}`}>
              {fullName || "Unknown"}
            </span>
            {hasCoverage && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full flex items-center gap-1">
                <Users className="w-3 h-3" />
                Coverage
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            {tech.phone && <span>{tech.phone}</span>}
            {tech.email && <span className="truncate max-w-[200px]">{tech.email}</span>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          {tech.truckNumber && (
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase">Truck</p>
              <span className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold text-sm">
                #{tech.truckNumber}
              </span>
            </div>
          )}
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase">Commission</p>
            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold text-sm">
              {tech.commissionPercent || 0}%
            </span>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase">Properties</p>
            <span 
              className="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-sm cursor-pointer hover:bg-emerald-100"
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              data-testid={`badge-property-count-${tech.id}`}
            >
              {propertyCount}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewStops}
                  className="gap-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                  data-testid={`button-view-stops-${tech.id}`}
                >
                  <Route className="w-4 h-4" />
                  <span className="hidden lg:inline">Stops</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Scheduled Stops</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Switch 
            checked={tech.active} 
            onCheckedChange={onToggleStatus}
            className="data-[state=checked]:bg-emerald-500"
            data-testid={`switch-status-${tech.id}`}
          />

          <Button 
            variant="ghost" 
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={onEdit}
            data-testid={`button-edit-${tech.id}`}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Assigned Properties ({properties?.length || 0})
            </h4>
            <Button
              size="sm"
              onClick={onAddProperty}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid={`button-add-property-${tech.id}`}
            >
              <Plus className="w-4 h-4" />
              Add Property
            </Button>
          </div>

          {propertiesLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : !properties || properties.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No properties assigned</p>
            </div>
          ) : (
            <div className="space-y-2">
              {properties.map((property) => {
                const activeSeason = property.activeSeason || globalSeason;
                const visitDays = activeSeason === "summer" 
                  ? (property.summerVisitDays || []) 
                  : (property.winterVisitDays || []);
                
                return (
                  <div 
                    key={property.id}
                    className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                    data-testid={`row-property-${property.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {property.propertyName || "Unnamed Property"}
                        </p>
                        {property.address && (
                          <p className="text-sm text-slate-500 truncate">{property.address}</p>
                        )}
                      </div>

                      <ScheduleDayCircles 
                        days={ALL_DAYS} 
                        activeDays={visitDays} 
                        onToggleDay={(day, isActive) => onToggleVisitDay(property.propertyId, day, isActive, activeSeason)}
                      />

                      <button
                        onClick={() => onUpdateSeason(property.propertyId, activeSeason === "summer" ? "winter" : "summer")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                          activeSeason === "summer" 
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        )}
                        data-testid={`button-toggle-season-${property.id}`}
                      >
                        {activeSeason === "summer" ? (
                          <>
                            <Sun className="w-3.5 h-3.5" />
                            Summer
                          </>
                        ) : (
                          <>
                            <Snowflake className="w-3.5 h-3.5" />
                            Winter
                          </>
                        )}
                      </button>

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
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => onAddStop(property)}
                            className="gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Stop
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onRemoveProperty(property)}
                            className="gap-2 text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove Property
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
