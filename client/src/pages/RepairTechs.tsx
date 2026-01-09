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
import { Search, ChevronDown, Plus, Image, Trash2, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
          <DialogTitle className="text-lg font-semibold">Add Repair Technician</DialogTitle>
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
            <DialogTitle className="text-lg font-semibold">Edit Repair Technician</DialogTitle>
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

interface FieldEntry {
  id: string;
  technicianId: string | null;
  technicianName: string | null;
  entryType: string;
  payload: string | null;
  submittedAt: string;
}

function ServiceLogSidebar({
  technician,
  onClose,
}: {
  technician: Technician | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<{ entries: FieldEntry[] }>({
    queryKey: ["/api/technicians", technician?.id, "entries"],
    queryFn: async () => {
      const res = await fetch(`/api/technicians/${technician?.id}/entries`);
      if (!res.ok) throw new Error("Failed to fetch entries");
      return res.json();
    },
    enabled: !!technician,
  });

  const entries = data?.entries || [];

  const parsePayload = (payload: string | null) => {
    if (!payload) return {};
    try {
      return JSON.parse(payload);
    } catch {
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
        <SheetHeader className="bg-blue-600 text-white px-6 py-4">
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
              <p className="text-blue-100 text-sm">Service Log</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

const ITEMS_PER_PAGE = 11;

export default function RepairTechs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [viewingTech, setViewingTech] = useState<Technician | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: techniciansData, isLoading } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians/stored", "repair"],
    queryFn: async () => {
      const res = await fetch("/api/technicians/stored?role=repair");
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
        body: JSON.stringify({ ...tech, role: "repair", active: true }),
      });
      if (!res.ok) throw new Error("Failed to add technician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "repair"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "repair"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "repair"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/technicians/stored", "repair"] });
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
          <h1 className="text-2xl font-bold text-slate-900">Repair Technicians</h1>
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
            Add Repair Tech
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
                    {searchQuery ? "No technicians match your search" : "No repair technicians found. Click 'Add Repair Tech' to add one."}
                  </td>
                </tr>
              ) : (
                paginatedTechnicians.map((tech) => {
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
                          <span 
                            className="font-medium text-blue-600 hover:underline cursor-pointer"
                            onClick={() => setViewingTech(tech)}
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
                      currentPage === page && "bg-blue-600 hover:bg-blue-700"
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
