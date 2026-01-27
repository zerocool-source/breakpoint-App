import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Search, ChevronDown, Plus, Trash2, ChevronRight, ChevronLeft, Users, UserCheck } from "lucide-react";
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
  region: string | null;
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

const ITEMS_PER_PAGE = 12;

export default function Supervisors() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [managingTeamSupervisor, setManagingTeamSupervisor] = useState<Supervisor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [countyFilter, setCountyFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
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

  const supervisors = supervisorsData?.technicians || [];
  const technicians = techniciansData?.technicians || [];

  // Filter supervisors by search and county
  const filteredSupervisors = supervisors
    .filter((sup) => {
      const fullName = `${sup.firstName || ""} ${sup.lastName || ""}`.toLowerCase();
      const phone = (sup.phone || "").toLowerCase();
      const email = (sup.email || "").toLowerCase();
      const matchesSearch = 
        fullName.includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery.toLowerCase()) ||
        email.includes(searchQuery.toLowerCase());
      
      if (countyFilter === "all") return matchesSearch;
      if (countyFilter === "none") return matchesSearch && !sup.region;
      return matchesSearch && sup.region === countyFilter;
    })
    .sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  // Pagination
  const totalPages = Math.ceil(filteredSupervisors.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSupervisors = filteredSupervisors.slice(startIndex, endIndex);

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
  }, [searchQuery, countyFilter]);

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

  const updateRegionMutation = useMutation({
    mutationFn: async ({ supervisorId, region }: { supervisorId: string; region: string | null }) => {
      const res = await fetch(`/api/technicians/${supervisorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region }),
      });
      if (!res.ok) throw new Error("Failed to update county");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "supervisor"] });
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
      if (!res.ok) throw new Error("Failed to update supervisor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "supervisor"] });
    },
  });

  const getRegionLabel = (region: string | null): string => {
    switch (region) {
      case "south": return "South County";
      case "mid": return "Mid County";
      case "north": return "North County";
      default: return "-";
    }
  };

  const getRegionBadgeStyle = (region: string | null): string => {
    switch (region) {
      case "south": return "bg-blue-500 text-white";
      case "mid": return "bg-green-500 text-white";
      case "north": return "bg-purple-500 text-white";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Supervisor Team Management</h1>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="bg-[#0078D4] hover:bg-[#0078D4]" data-testid="dropdown-filter-county">
                County: {countyFilter === "all" ? "All" : countyFilter === "none" ? "No County" : getRegionLabel(countyFilter)}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCountyFilter("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCountyFilter("south")}>South County</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCountyFilter("mid")}>Mid County</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCountyFilter("north")}>North County</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCountyFilter("none")}>No County</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-supervisors"
            />
          </div>

          <Button 
            className="bg-[#0078D4] hover:bg-[#0078D4] ml-auto" 
            onClick={() => setShowAddModal(true)}
            data-testid="button-add-supervisor"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supervisor
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Supervisor
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Phone
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  County
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Technicians
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingSupervisors ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Loading supervisors...
                  </td>
                </tr>
              ) : filteredSupervisors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    {searchQuery || countyFilter !== "all" ? "No supervisors match your filters" : "No supervisors found. Click 'Add Supervisor' to add one."}
                  </td>
                </tr>
              ) : (
                paginatedSupervisors.map((sup) => {
                  const fullName = `${sup.firstName || ""} ${sup.lastName || ""}`.trim();
                  const initials = getInitials(sup.firstName, sup.lastName);
                  const avatarColor = getAvatarColor(fullName);
                  const techCount = technicians.filter(t => t.supervisorId === sup.id).length;
                  
                  return (
                    <tr 
                      key={sup.id} 
                      className="hover:bg-slate-50 transition-colors"
                      data-testid={`row-supervisor-${sup.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                            avatarColor
                          )}>
                            {initials}
                          </div>
                          <span 
                            className="font-medium text-[#0078D4] hover:underline cursor-pointer"
                            onClick={() => setEditingSupervisor(sup)}
                            data-testid={`link-supervisor-name-${sup.id}`}
                          >
                            {fullName || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {sup.phone || "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {sup.email || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={sup.region || "none"}
                          onValueChange={(value) => {
                            updateRegionMutation.mutate({
                              supervisorId: sup.id,
                              region: value === "none" ? null : value,
                            });
                          }}
                        >
                          <SelectTrigger 
                            className="w-[130px] h-8 text-xs"
                            data-testid={`select-county-${sup.id}`}
                          >
                            <SelectValue placeholder="Select County" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="south">South County</SelectItem>
                            <SelectItem value="mid">Mid County</SelectItem>
                            <SelectItem value="north">North County</SelectItem>
                            <SelectItem value="none">No County</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge 
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                          onClick={() => setManagingTeamSupervisor(sup)}
                          data-testid={`button-manage-team-${sup.id}`}
                        >
                          {techCount} Technicians
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <Switch 
                            checked={sup.active} 
                            onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: sup.id, active: checked })}
                            data-testid={`switch-status-${sup.id}`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSupervisor(sup)}
                          data-testid={`button-edit-${sup.id}`}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredSupervisors.length)} of {filteredSupervisors.length} supervisors
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {getPageNumbers().map((page, idx) => (
                typeof page === 'number' ? (
                  <Button
                    key={idx}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? "bg-[#0078D4]" : ""}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

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

      </div>
    </AppLayout>
  );
}
