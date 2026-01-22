import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { 
  Search, ChevronDown, Plus, Trash2, Users, UserCheck, ClipboardCheck, 
  CalendarIcon, AlertTriangle, FileText, ChevronRight, ChevronLeft, RefreshCw,
  Filter, Building2, X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Supervisor {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  truckNumber: string | null;
  active: boolean;
  role: string;
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  supervisorId: string | null;
  active: boolean;
  role: string;
}

interface QcInspection {
  id: string;
  supervisorId: string;
  supervisorName: string | null;
  propertyId: string | null;
  propertyName: string;
  propertyAddress: string | null;
  title: string | null;
  notes: string | null;
  photos: string[] | null;
  status: string;
  assignedById: string | null;
  assignedByName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-red-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function AddSupervisorModal({ 
  open, 
  onClose, 
  onAdd 
}: { 
  open: boolean; 
  onClose: () => void;
  onAdd: (supervisor: { firstName: string; lastName: string; phone: string; email: string; truckNumber: string }) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [truckNumber, setTruckNumber] = useState("");

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    onAdd({ firstName: firstName.trim(), lastName: lastName.trim(), phone, email, truckNumber });
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setTruckNumber("");
    onClose();
  };

  const handleClose = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setTruckNumber("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <DialogHeader className="bg-[#0078D4] text-white px-4 py-3 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold">Add Supervisor</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 bg-slate-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <Input
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-white"
                data-testid="input-first-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <Input
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-white"
                data-testid="input-last-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <Input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-white"
                data-testid="input-phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white"
                data-testid="input-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Truck #</label>
              <Input
                placeholder="Truck Number"
                value={truckNumber}
                onChange={(e) => setTruckNumber(e.target.value)}
                className="bg-white"
                data-testid="input-truck-number"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button 
              onClick={handleSubmit}
              disabled={!firstName.trim() || !lastName.trim()}
              className="bg-[#0078D4] hover:bg-[#0078D4] text-white px-8"
              data-testid="button-add-supervisor-submit"
            >
              ADD SUPERVISOR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditSupervisorModal({ 
  open, 
  onClose, 
  supervisor,
  onSave,
  onDelete
}: { 
  open: boolean; 
  onClose: () => void;
  supervisor: Supervisor | null;
  onSave: (id: string, data: { firstName: string; lastName: string; phone: string; email: string; truckNumber: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [truckNumber, setTruckNumber] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (supervisor) {
      setFirstName(supervisor.firstName || "");
      setLastName(supervisor.lastName || "");
      setPhone(supervisor.phone || "");
      setEmail(supervisor.email || "");
      setTruckNumber(supervisor.truckNumber || "");
    }
  }, [supervisor]);

  const handleSubmit = () => {
    if (!supervisor || !firstName.trim() || !lastName.trim()) return;
    onSave(supervisor.id, { firstName: firstName.trim(), lastName: lastName.trim(), phone, email, truckNumber });
    onClose();
  };

  const handleDelete = () => {
    if (!supervisor) return;
    onDelete(supervisor.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleClose = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setTruckNumber("");
    onClose();
  };

  if (!supervisor) return null;

  const fullName = `${supervisor.firstName} ${supervisor.lastName}`.trim();
  const initials = getInitials(supervisor.firstName, supervisor.lastName);
  const avatarColor = getAvatarColor(fullName);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] p-0 gap-0">
          <DialogHeader className="bg-[#0078D4] text-white px-4 py-3 rounded-t-lg">
            <DialogTitle className="text-lg font-semibold">Edit Supervisor</DialogTitle>
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
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2"
                data-testid="button-delete-supervisor"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!firstName.trim() || !lastName.trim()}
                className="bg-[#0078D4] hover:bg-[#0078D4] text-white px-8"
                data-testid="button-save-supervisor"
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
            <AlertDialogTitle>Delete Supervisor</AlertDialogTitle>
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

function SupervisorTeamModal({
  open,
  onClose,
  supervisor,
  technicians,
  onAssign,
  onUnassign,
}: {
  open: boolean;
  onClose: () => void;
  supervisor: Supervisor | null;
  technicians: Technician[];
  onAssign: (techId: string, supervisorId: string) => void;
  onUnassign: (techId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  
  if (!supervisor) return null;
  
  const fullName = `${supervisor.firstName} ${supervisor.lastName}`.trim();
  const initials = getInitials(supervisor.firstName, supervisor.lastName);
  const avatarColor = getAvatarColor(fullName);
  
  const assignedTechs = technicians.filter(t => t.supervisorId === supervisor.id && t.active);
  const unassignedTechs = technicians.filter(t => !t.supervisorId && t.active);
  const filteredUnassigned = unassignedTechs.filter(t => {
    const name = `${t.firstName} ${t.lastName}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="bg-[#0078D4] text-white px-4 py-3 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold",
              avatarColor
            )}>
              {initials}
            </div>
            {fullName}'s Team
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-6">
            {/* Assigned Technicians */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Assigned Technicians
                </h3>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {assignedTechs.length}
                </Badge>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg p-2">
                {assignedTechs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No technicians assigned yet
                  </div>
                ) : (
                  assignedTechs.map((tech) => {
                    const techName = `${tech.firstName} ${tech.lastName}`.trim();
                    const techInitials = getInitials(tech.firstName, tech.lastName);
                    const techColor = getAvatarColor(techName);
                    
                    return (
                      <div 
                        key={tech.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200"
                        data-testid={`assigned-tech-${tech.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold",
                            techColor
                          )}>
                            {techInitials}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{techName}</div>
                            <div className="text-xs text-slate-500">{tech.phone || "No phone"}</div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onUnassign(tech.id)}
                          data-testid={`button-remove-tech-${tech.id}`}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Available Technicians */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Available Technicians
                </h3>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  {unassignedTechs.length}
                </Badge>
              </div>
              <div className="mb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search technicians..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 bg-slate-50 border-slate-200"
                    data-testid="input-search-available-techs"
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-[260px] overflow-y-auto border border-slate-200 rounded-lg p-2">
                {filteredUnassigned.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    {searchQuery ? "No matching technicians" : "All technicians are assigned"}
                  </div>
                ) : (
                  filteredUnassigned.map((tech) => {
                    const techName = `${tech.firstName} ${tech.lastName}`.trim();
                    const techInitials = getInitials(tech.firstName, tech.lastName);
                    const techColor = getAvatarColor(techName);
                    
                    return (
                      <div 
                        key={tech.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100"
                        data-testid={`available-tech-${tech.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold",
                            techColor
                          )}>
                            {techInitials}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{techName}</div>
                            <div className="text-xs text-slate-500">{tech.phone || "No phone"}</div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                          onClick={() => onAssign(tech.id, supervisor.id)}
                          data-testid={`button-add-tech-${tech.id}`}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <Button onClick={onClose} className="bg-[#0078D4] hover:bg-[#0078D4]/90">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Supervisors() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [managingTeamSupervisor, setManagingTeamSupervisor] = useState<Supervisor | null>(null);
  const [activeTab, setActiveTab] = useState("concerns");
  const [assignSupervisor, setAssignSupervisor] = useState("");
  const [assignProperty, setAssignProperty] = useState("");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [inspectionTitle, setInspectionTitle] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterSupervisor, setFilterSupervisor] = useState("all");
  const [filterTechnician, setFilterTechnician] = useState("all");
  const [expandedSupervisors, setExpandedSupervisors] = useState<Set<string>>(new Set());
  const [photoGallery, setPhotoGallery] = useState<{ open: boolean; photos: string[]; index: number }>({ open: false, photos: [], index: 0 });
  const [inspectionPropertyFilter, setInspectionPropertyFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: supervisorsData, isLoading: loadingSupervisors } = useQuery<{ technicians: Supervisor[] }>({
    queryKey: ["/api/technicians/stored", "supervisor"],
    queryFn: async () => {
      const res = await fetch("/api/technicians/stored?role=supervisor");
      if (!res.ok) throw new Error("Failed to fetch supervisors");
      return res.json();
    },
  });

  const { data: techniciansData, isLoading: loadingTechnicians } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians/stored", "service"],
    queryFn: async () => {
      const res = await fetch("/api/technicians/stored?role=service");
      if (!res.ok) throw new Error("Failed to fetch technicians");
      return res.json();
    },
  });

  const { data: qcInspectionsData, isLoading: loadingInspections } = useQuery<{ inspections: QcInspection[] }>({
    queryKey: ["qc-inspections"],
    queryFn: async () => {
      const res = await fetch("/api/qc-inspections");
      if (!res.ok) throw new Error("Failed to fetch QC inspections");
      return res.json();
    },
  });

  const supervisors = supervisorsData?.technicians || [];
  const technicians = techniciansData?.technicians || [];
  const qcInspections = qcInspectionsData?.inspections || [];

  // Get unique properties from inspections for filter
  const inspectionProperties = Array.from(new Set(qcInspections.map(i => i.propertyName))).sort();

  // Filter inspections by property
  const filteredInspections = inspectionPropertyFilter === "all" 
    ? qcInspections 
    : qcInspections.filter(i => i.propertyName === inspectionPropertyFilter);

  // Group inspections by supervisor
  const inspectionsBySupervisor = filteredInspections.reduce((acc, inspection) => {
    const key = inspection.supervisorId;
    if (!acc[key]) {
      acc[key] = {
        supervisorId: inspection.supervisorId,
        supervisorName: inspection.supervisorName || "Unknown Supervisor",
        inspections: []
      };
    }
    acc[key].inspections.push(inspection);
    return acc;
  }, {} as Record<string, { supervisorId: string; supervisorName: string; inspections: QcInspection[] }>);

  const toggleSupervisorExpanded = (supervisorId: string) => {
    setExpandedSupervisors(prev => {
      const next = new Set(prev);
      if (next.has(supervisorId)) {
        next.delete(supervisorId);
      } else {
        next.add(supervisorId);
      }
      return next;
    });
  };

  const openPhotoGallery = (photos: string[], index: number) => {
    setPhotoGallery({ open: true, photos, index });
  };
  const unassignedTechnicians = technicians.filter(t => !t.supervisorId && t.active);
  const totalTechnicians = technicians.filter(t => t.active).length;

  const addSupervisorMutation = useMutation({
    mutationFn: async (supervisor: { firstName: string; lastName: string; phone: string; email: string; truckNumber: string }) => {
      const res = await fetch("/api/technicians/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...supervisor, role: "supervisor" }),
      });
      if (!res.ok) throw new Error("Failed to add supervisor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "supervisor"] });
    },
  });

  const updateSupervisorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { firstName: string; lastName: string; phone: string; email: string; truckNumber: string } }) => {
      const res = await fetch(`/api/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update supervisor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "supervisor"] });
    },
  });

  const deleteSupervisorMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/technicians/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete supervisor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "supervisor"] });
    },
  });

  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ techId, supervisorId }: { techId: string; supervisorId: string | null }) => {
      const res = await fetch(`/api/technicians/${techId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supervisorId }),
      });
      if (!res.ok) throw new Error("Failed to update technician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "service"] });
    },
  });

  const activeSupervisors = supervisors.filter(s => s.active);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Supervisor Team Management</h1>
            <p className="text-sm text-slate-500">Manage supervisor teams and technician assignments</p>
          </div>
        </div>

        {/* Top Grid - Supervisors & Teams + Unassigned Technicians + Team Summary */}
        <div className="grid grid-cols-12 gap-6">
          {/* Supervisors & Teams */}
          <div className="col-span-5 bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <h2 className="font-semibold text-slate-900">Supervisors & Teams</h2>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  {activeSupervisors.length} Supervisors
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setShowAddModal(true)}
                data-testid="button-add-supervisor"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {loadingSupervisors ? (
                <div className="text-center py-4 text-slate-500">Loading...</div>
              ) : activeSupervisors.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No supervisors found</div>
              ) : (
                activeSupervisors.map((sup) => {
                  const fullName = `${sup.firstName} ${sup.lastName}`.trim();
                  const initials = getInitials(sup.firstName, sup.lastName);
                  const avatarColor = getAvatarColor(fullName);
                  const techCount = technicians.filter(t => t.supervisorId === sup.id).length;
                  
                  return (
                    <div 
                      key={sup.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                      data-testid={`supervisor-card-${sup.id}`}
                    >
                      <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => setEditingSupervisor(sup)}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold",
                          avatarColor
                        )}>
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{fullName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="text-blue-600">{sup.truckNumber ? `#${sup.truckNumber}` : "No truck"}</span>
                            <span>•</span>
                            <span>{sup.email || "No email"}</span>
                          </div>
                        </div>
                      </div>
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                        onClick={() => setManagingTeamSupervisor(sup)}
                        data-testid={`button-manage-team-${sup.id}`}
                      >
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                          {techCount} Technicians
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Unassigned Technicians */}
          <div className="col-span-4 bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-slate-600" />
                <h2 className="font-semibold text-slate-900">Unassigned Technicians</h2>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search technicians..."
                  className="pl-10 h-9 bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {loadingTechnicians ? (
                <div className="text-center py-4 text-slate-500">Loading...</div>
              ) : unassignedTechnicians.length === 0 ? (
                <div className="text-center py-4 text-slate-500">All technicians assigned</div>
              ) : (
                unassignedTechnicians.map((tech) => {
                  const fullName = `${tech.firstName} ${tech.lastName}`.trim();
                  const initials = getInitials(tech.firstName, tech.lastName);
                  const avatarColor = getAvatarColor(fullName);
                  
                  return (
                    <div 
                      key={tech.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      data-testid={`unassigned-tech-${tech.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold",
                          avatarColor
                        )}>
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 text-sm">{fullName}</div>
                          <div className="text-xs text-slate-500">{tech.phone || "No phone"}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Assign
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Team Summary */}
          <div className="col-span-3 bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-center mb-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-slate-500" />
                </div>
                <h2 className="font-semibold text-slate-900">Team Summary</h2>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Total Supervisors:</span>
                <span className="font-semibold text-slate-900">{activeSupervisors.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Total Technicians:</span>
                <span className="font-semibold text-slate-900">{totalTechnicians}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-blue-600">Unassigned:</span>
                <span className="font-semibold text-blue-600">{unassignedTechnicians.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assign QC Inspection */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Assign QC Inspection</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assign To Supervisor <span className="text-red-500">*</span>
              </label>
              <Select value={assignSupervisor} onValueChange={setAssignSupervisor}>
                <SelectTrigger data-testid="select-assign-supervisor">
                  <SelectValue placeholder="Select supervisor..." />
                </SelectTrigger>
                <SelectContent>
                  {activeSupervisors.map(sup => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.firstName} {sup.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Property <span className="text-red-500">*</span>
              </label>
              <Input 
                placeholder="Search property..."
                value={assignProperty}
                onChange={(e) => setAssignProperty(e.target.value)}
                data-testid="input-assign-property"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduleDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleDate ? format(scheduleDate, "PPP") : "Select date..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduleDate}
                    onSelect={setScheduleDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <Input 
                placeholder="Inspection title..."
                value={inspectionTitle}
                onChange={(e) => setInspectionTitle(e.target.value)}
                data-testid="input-inspection-title"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea 
                placeholder="Add notes for the supervisor..."
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                className="min-h-[80px]"
                data-testid="textarea-inspection-notes"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline">Cancel</Button>
            <Button className="bg-[#0078D4] hover:bg-[#0078D4]/90">
              <Plus className="w-4 h-4 mr-2" />
              Assign Inspection
            </Button>
          </div>
        </div>

        {/* Filter Results */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Filter className="w-4 h-4" />
              <span>Filter Results:</span>
            </div>
            <Select value={filterProperty} onValueChange={setFilterProperty}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSupervisor} onValueChange={setFilterSupervisor}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="All Supervisors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Supervisors</SelectItem>
                {activeSupervisors.map(sup => (
                  <SelectItem key={sup.id} value={sup.id}>
                    {sup.firstName} {sup.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTechnician} onValueChange={setFilterTechnician}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="All Technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Date Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white rounded-lg border border-slate-200">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="concerns"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0078D4] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Supervisor Concerns
            </TabsTrigger>
            <TabsTrigger 
              value="inspections"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0078D4] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              QC Inspection Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="concerns" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-slate-900">Supervisor Concerns</h3>
                <Badge variant="outline" className="text-orange-600 border-orange-300">0 Issues</Badge>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No supervisor concerns reported</p>
              <p className="text-sm text-slate-500 mt-1">Concerns from supervisors will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="inspections" className="p-6">
            {/* Property Filter */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Filter by Property:</span>
              </div>
              <Select value={inspectionPropertyFilter} onValueChange={setInspectionPropertyFilter}>
                <SelectTrigger className="w-[280px]" data-testid="filter-inspection-property">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {inspectionProperties.map(prop => (
                    <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="ml-auto">
                {filteredInspections.length} inspection{filteredInspections.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Inspections grouped by supervisor */}
            {loadingInspections ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : Object.keys(inspectionsBySupervisor).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <ClipboardCheck className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">No QC inspections found</p>
                <p className="text-sm text-slate-500 mt-1">
                  {inspectionPropertyFilter !== "all" 
                    ? "No inspections for this property. Try a different filter." 
                    : "Assign inspections using the form above"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.values(inspectionsBySupervisor).map(group => {
                  const isExpanded = expandedSupervisors.has(group.supervisorId);
                  const initials = getInitials(group.supervisorName.split(' ')[0] || '', group.supervisorName.split(' ')[1] || '');
                  const avatarColor = getAvatarColor(group.supervisorName);
                  
                  return (
                    <div key={group.supervisorId} className="border rounded-lg overflow-hidden">
                      {/* Collapsible Supervisor Header */}
                      <button
                        onClick={() => toggleSupervisorExpanded(group.supervisorId)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                        data-testid={`supervisor-header-${group.supervisorId}`}
                      >
                        <ChevronRight className={cn(
                          "w-5 h-5 text-slate-500 transition-transform",
                          isExpanded && "rotate-90"
                        )} />
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold",
                          avatarColor
                        )}>
                          {initials}
                        </div>
                        <span className="font-semibold text-slate-900">{group.supervisorName}</span>
                        <Badge variant="outline" className="ml-2">
                          {group.inspections.length} inspection{group.inspections.length !== 1 ? 's' : ''}
                        </Badge>
                        <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
                          <span>{group.inspections.filter(i => i.status === 'completed').length} completed</span>
                          <span>•</span>
                          <span>{group.inspections.filter(i => i.status !== 'completed').length} pending</span>
                        </div>
                      </button>

                      {/* Inspection Entries */}
                      {isExpanded && (
                        <div className="divide-y">
                          {group.inspections.map(inspection => (
                            <div key={inspection.id} className="p-4 bg-white" data-testid={`inspection-${inspection.id}`}>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-slate-400" />
                                  <span className="font-medium text-slate-900">{inspection.propertyName}</span>
                                  {inspection.title && (
                                    <span className="text-slate-500">- {inspection.title}</span>
                                  )}
                                </div>
                                <Badge 
                                  variant={inspection.status === 'completed' ? 'default' : 'outline'}
                                  className={cn(
                                    inspection.status === 'completed' && "bg-green-100 text-green-800 border-green-200",
                                    inspection.status === 'assigned' && "bg-blue-100 text-blue-800 border-blue-200",
                                    inspection.status === 'in_progress' && "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  )}
                                >
                                  {inspection.status === 'completed' ? 'Completed' : 
                                   inspection.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                                </Badge>
                              </div>
                              
                              {/* Date info */}
                              <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                                {inspection.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    Due: {format(new Date(inspection.dueDate), "MMM d, yyyy")}
                                  </span>
                                )}
                                {inspection.completedAt && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <UserCheck className="w-3.5 h-3.5" />
                                    Completed: {format(new Date(inspection.completedAt), "MMM d, yyyy 'at' h:mm a")}
                                  </span>
                                )}
                              </div>

                              {/* Notes */}
                              {(inspection.notes || inspection.completionNotes) && (
                                <div className="bg-slate-50 rounded-md p-3 mb-3 text-sm text-slate-700">
                                  {inspection.notes && <p className="mb-1"><strong>Notes:</strong> {inspection.notes}</p>}
                                  {inspection.completionNotes && <p><strong>Completion Notes:</strong> {inspection.completionNotes}</p>}
                                </div>
                              )}

                              {/* Photo Thumbnails */}
                              {inspection.photos && inspection.photos.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {inspection.photos.map((photo, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => openPhotoGallery(inspection.photos!, idx)}
                                      className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                                      data-testid={`photo-thumb-${inspection.id}-${idx}`}
                                    >
                                      <img 
                                        src={photo} 
                                        alt={`Inspection photo ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <AddSupervisorModal 
          open={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          onAdd={(data) => addSupervisorMutation.mutate(data)}
        />
        <EditSupervisorModal 
          open={!!editingSupervisor}
          onClose={() => setEditingSupervisor(null)}
          supervisor={editingSupervisor}
          onSave={(id, data) => updateSupervisorMutation.mutate({ id, data })}
          onDelete={(id) => deleteSupervisorMutation.mutate(id)}
        />
        <SupervisorTeamModal
          open={!!managingTeamSupervisor}
          onClose={() => setManagingTeamSupervisor(null)}
          supervisor={managingTeamSupervisor}
          technicians={technicians}
          onAssign={(techId, supervisorId) => assignTechnicianMutation.mutate({ techId, supervisorId })}
          onUnassign={(techId) => assignTechnicianMutation.mutate({ techId, supervisorId: null })}
        />

        {/* Photo Gallery Modal */}
        <Dialog open={photoGallery.open} onOpenChange={(open) => !open && setPhotoGallery({ ...photoGallery, open: false })}>
          <DialogContent className="max-w-4xl p-0 bg-black/95">
            <div className="relative">
              <button
                onClick={() => setPhotoGallery({ ...photoGallery, open: false })}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {photoGallery.photos.length > 0 && (
                <>
                  <img 
                    src={photoGallery.photos[photoGallery.index]}
                    alt={`Photo ${photoGallery.index + 1}`}
                    className="w-full max-h-[80vh] object-contain"
                  />
                  
                  {/* Navigation arrows */}
                  {photoGallery.photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setPhotoGallery(prev => ({ 
                          ...prev, 
                          index: prev.index === 0 ? prev.photos.length - 1 : prev.index - 1 
                        }))}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setPhotoGallery(prev => ({ 
                          ...prev, 
                          index: prev.index === prev.photos.length - 1 ? 0 : prev.index + 1 
                        }))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                  
                  {/* Photo counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/10 rounded-full text-white text-sm">
                    {photoGallery.index + 1} / {photoGallery.photos.length}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
