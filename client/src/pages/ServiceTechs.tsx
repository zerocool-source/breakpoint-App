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
import { Search, ChevronDown, Plus, Image, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  role: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-600",
    "bg-green-600", 
    "bg-purple-600",
    "bg-orange-600",
    "bg-pink-600",
    "bg-cyan-600",
    "bg-indigo-600",
    "bg-teal-600",
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
        <DialogHeader className="bg-blue-600 text-white px-4 py-3 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold">Add Technician</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 bg-slate-100">
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                <Image className="w-8 h-8 text-slate-400" />
              </div>
              <button className="text-blue-600 text-sm font-medium hover:underline">
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
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
  onSave: (id: string, data: { firstName: string; lastName: string; phone: string; email: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (technician) {
      setFirstName(technician.firstName || "");
      setLastName(technician.lastName || "");
      setPhone(technician.phone || "");
      setEmail(technician.email || "");
    }
  }, [technician]);

  const handleSubmit = () => {
    if (!technician || !firstName.trim() || !lastName.trim()) return;
    onSave(technician.id, { firstName: firstName.trim(), lastName: lastName.trim(), phone, email });
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
          <DialogHeader className="bg-blue-600 text-white px-4 py-3 rounded-t-lg">
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
                <button className="text-blue-600 text-sm font-medium hover:underline">
                  Change Photo
                </button>
              </div>
              
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div className="space-y-3">
                  <Input
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-white"
                    data-testid="input-edit-first-name"
                  />
                  <Input
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-white"
                    data-testid="input-edit-last-name"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white"
                    data-testid="input-edit-phone"
                  />
                </div>
                <div>
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
                data-testid="button-delete-tech"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!firstName.trim() || !lastName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
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

export default function ServiceTechs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
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
    mutationFn: async ({ id, data }: { id: string; data: { firstName: string; lastName: string; phone: string; email: string } }) => {
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

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Service Technicians</h1>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700" data-testid="dropdown-filter-status">
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
            className="bg-blue-600 hover:bg-blue-700 ml-auto" 
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
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Loading technicians...
                  </td>
                </tr>
              ) : filteredTechnicians.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    {searchQuery ? "No technicians match your search" : "No service technicians found. Click 'Add Tech' to add one."}
                  </td>
                </tr>
              ) : (
                filteredTechnicians.map((tech) => {
                  const fullName = `${tech.firstName || ""} ${tech.lastName || ""}`.trim();
                  const initials = getInitials(tech.firstName, tech.lastName);
                  const avatarColor = getAvatarColor(fullName);
                  
                  return (
                    <tr 
                      key={tech.id} 
                      className="hover:bg-slate-50 transition-colors"
                      data-testid={`row-technician-${tech.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                            avatarColor
                          )}>
                            {initials}
                          </div>
                          <span className="font-medium text-blue-600 hover:underline cursor-pointer">
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
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <Switch 
                            checked={tech.active} 
                            onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: tech.id, active: checked })}
                            className="data-[state=checked]:bg-blue-600"
                            data-testid={`switch-status-${tech.id}`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="link" 
                          className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                          onClick={() => setEditingTech(tech)}
                          data-testid={`button-edit-${tech.id}`}
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

        <div className="text-sm text-slate-500">
          Showing {filteredTechnicians.length} of {technicians.length} technicians
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
    </AppLayout>
  );
}
