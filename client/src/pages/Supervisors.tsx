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
import { Search, ChevronDown, Plus, Trash2 } from "lucide-react";
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

export default function Supervisors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: supervisorsData, isLoading } = useQuery<{ technicians: Supervisor[] }>({
    queryKey: ["/api/technicians/stored", "supervisor"],
    queryFn: async () => {
      const res = await fetch("/api/technicians/stored?role=supervisor");
      if (!res.ok) throw new Error("Failed to fetch supervisors");
      return res.json();
    },
  });

  const supervisors = supervisorsData?.technicians || [];

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

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "supervisor"] });
    },
  });

  const filteredSupervisors = supervisors
    .filter((sup) => {
      const fullName = `${sup.firstName || ""} ${sup.lastName || ""}`.toLowerCase();
      const phone = (sup.phone || "").toLowerCase();
      const email = (sup.email || "").toLowerCase();
      const matchesSearch = 
        fullName.includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery.toLowerCase()) ||
        email.includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" ? true :
        statusFilter === "active" ? sup.active :
        !sup.active;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  const itemsPerPage = 11;
  const totalPages = Math.ceil(filteredSupervisors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSupervisors = filteredSupervisors.slice(startIndex, endIndex);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Supervisors</h1>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-[#0078D4] text-white border-[#0078D4] hover:bg-[#0078D4]/90 hover:text-white gap-2"
                  data-testid="dropdown-filter"
                >
                  Filter: {statusFilter === "all" ? "All" : statusFilter === "active" ? "Active" : "Inactive"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Inactive</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name, phone #, email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-[300px] bg-white"
                data-testid="input-search"
              />
            </div>
          </div>

          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#0078D4] hover:bg-[#0078D4]/90 text-white gap-2"
            data-testid="button-add-supervisor"
          >
            <Plus className="h-4 w-4" />
            Add Supervisor
          </Button>
        </div>

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
                  Truck #
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
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Loading supervisors...
                  </td>
                </tr>
              ) : filteredSupervisors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {searchQuery ? "No supervisors match your search" : "No supervisors found. Click 'Add Supervisor' to add one."}
                  </td>
                </tr>
              ) : (
                paginatedSupervisors.map((sup) => {
                  const fullName = `${sup.firstName || ""} ${sup.lastName || ""}`.trim();
                  const initials = getInitials(sup.firstName, sup.lastName);
                  const avatarColor = getAvatarColor(fullName);
                  
                  return (
                    <tr key={sup.id} className="hover:bg-slate-50" data-testid={`row-supervisor-${sup.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold",
                            avatarColor
                          )}>
                            {initials}
                          </div>
                          <span className="font-medium text-[#0078D4]">{fullName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {sup.phone || "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {sup.email || "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {sup.truckNumber ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium text-sm">
                            #{sup.truckNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <Switch 
                            checked={sup.active} 
                            onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: sup.id, active: checked })}
                            className="data-[state=checked]:bg-[#0078D4]"
                            data-testid={`switch-status-${sup.id}`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="link" 
                          className="text-[#0078D4] hover:text-blue-800 p-0 h-auto"
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

        <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border border-slate-200 rounded-lg">
          <div className="text-sm text-slate-600">
            Showing {filteredSupervisors.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredSupervisors.length)} of {filteredSupervisors.length} supervisors
          </div>
          
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
                Prev
              </Button>
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(currentPage - 1, totalPages - 2)) + i;
                if (page > totalPages) return null;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? "bg-[#0078D4]" : ""}
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
              >
                Next
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

      <AddSupervisorModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(supervisor) => addSupervisorMutation.mutate(supervisor)}
      />

      <EditSupervisorModal
        open={!!editingSupervisor}
        onClose={() => setEditingSupervisor(null)}
        supervisor={editingSupervisor}
        onSave={(id, data) => updateSupervisorMutation.mutate({ id, data })}
        onDelete={(id) => deleteSupervisorMutation.mutate(id)}
      />
    </AppLayout>
  );
}
