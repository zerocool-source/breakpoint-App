import { useState, useEffect, useMemo } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronDown, Plus, Image, Trash2, ChevronLeft, ChevronRight, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Technician } from "@shared/schema";

const ITEMS_PER_PAGE = 12;

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-[#0077b6]", // Ocean Blue
    "bg-[#f97316]", // Orange
    "bg-[#14b8a6]", // Teal
    "bg-[#22c55e]", // Green
    "bg-[#6b7280]", // Gray
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getRegionLabel(region: string | null | undefined): string {
  switch (region) {
    case "south": return "South County";
    case "mid": return "Mid County";
    case "north": return "North County";
    default: return "Unassigned";
  }
}

function getRegionBadgeStyle(region: string | null | undefined): string {
  switch (region) {
    case "south": return "bg-orange-100 text-[#f97316] border-orange-200";
    case "mid": return "bg-teal-100 text-[#14b8a6] border-teal-200";
    case "north": return "bg-[#0077b6]/10 text-[#0077b6] border-[#0077b6]/20";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function AddSupervisorModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { firstName: string; lastName: string; phone: string; email: string; region: string | null }) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState<string>("unassigned");

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    onAdd({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone,
      email,
      region: region === "unassigned" ? null : region,
    });
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setRegion("unassigned");
    onClose();
  };

  const handleClose = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setRegion("unassigned");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0">
        <DialogHeader className="bg-[#0078D4] text-white px-4 py-3 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold">Add Supervisor</DialogTitle>
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
              <div className="space-y-3">
                <Input
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white"
                  data-testid="input-phone"
                />
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="bg-white" data-testid="select-region">
                    <SelectValue placeholder="Select County" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="south">South County</SelectItem>
                    <SelectItem value="mid">Mid County</SelectItem>
                    <SelectItem value="north">North County</SelectItem>
                    <SelectItem value="unassigned">No County</SelectItem>
                  </SelectContent>
                </Select>
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
              className="bg-[#0078D4] hover:bg-[#0078D4]/90 text-white px-8"
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
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  supervisor: Technician | null;
  onSave: (id: string, data: { firstName: string; lastName: string; phone: string; email: string; region: string | null }) => void;
  onDelete: (id: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState<string>("unassigned");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (supervisor) {
      setFirstName(supervisor.firstName || "");
      setLastName(supervisor.lastName || "");
      setPhone(supervisor.phone || "");
      setEmail(supervisor.email || "");
      setRegion(supervisor.region || "unassigned");
    }
  }, [supervisor]);

  const handleSubmit = () => {
    if (!supervisor || !firstName.trim() || !lastName.trim()) return;
    onSave(supervisor.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone,
      email,
      region: region === "unassigned" ? null : region,
    });
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
    setRegion("unassigned");
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
                <div
                  className={cn(
                    "w-16 h-16 rounded-lg flex items-center justify-center text-white text-xl font-semibold",
                    avatarColor
                  )}
                >
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">County</label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger className="bg-white" data-testid="select-edit-region">
                        <SelectValue placeholder="Select County" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="south">South County</SelectItem>
                        <SelectItem value="mid">Mid County</SelectItem>
                        <SelectItem value="north">North County</SelectItem>
                        <SelectItem value="unassigned">No County</SelectItem>
                      </SelectContent>
                    </Select>
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
                className="bg-[#0078D4] hover:bg-[#0078D4]/90 text-white px-8"
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

function TeamMembersSidebar({
  supervisor,
  allTechnicians,
  onClose,
}: {
  supervisor: Technician | null;
  allTechnicians: Technician[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const teamMembers = useMemo(() => {
    if (!supervisor) return [];
    return allTechnicians.filter(t => t.supervisorId === supervisor.id && t.active);
  }, [supervisor, allTechnicians]);

  const unassignedTechs = useMemo(() => {
    return allTechnicians.filter(t => t.role === "service" && t.active && !t.supervisorId);
  }, [allTechnicians]);

  const removeMutation = useMutation({
    mutationFn: async (technicianId: string) => {
      const res = await fetch(`/api/technicians/${technicianId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supervisorId: null }),
      });
      if (!res.ok) throw new Error("Failed to remove technician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians-stored"] });
      toast({ title: "Technician Removed", description: "Technician has been unassigned from this supervisor" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (technicianId: string) => {
      const res = await fetch(`/api/technicians/${technicianId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supervisorId: supervisor?.id }),
      });
      if (!res.ok) throw new Error("Failed to assign technician");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians-stored"] });
      toast({ title: "Technician Assigned", description: "Technician has been assigned to this supervisor" });
    },
  });

  const fullName = supervisor ? `${supervisor.firstName} ${supervisor.lastName}`.trim() : "";
  const initials = supervisor ? getInitials(supervisor.firstName, supervisor.lastName) : "";
  const avatarColor = getAvatarColor(fullName);

  return (
    <Sheet open={!!supervisor} onOpenChange={() => onClose()}>
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
              <p className="text-blue-200 text-sm">Supervisor - {teamMembers.length} technicians</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Team Members</h3>
              {teamMembers.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No technicians assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((tech) => (
                    <div
                      key={tech.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
                      data-testid={`team-member-${tech.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium",
                            getAvatarColor(`${tech.firstName} ${tech.lastName}`)
                          )}
                        >
                          {getInitials(tech.firstName, tech.lastName)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-700">
                            {tech.firstName} {tech.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{tech.role}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeMutation.mutate(tech.id)}
                        data-testid={`remove-member-${tech.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {unassignedTechs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Unassigned Technicians</h3>
                <div className="space-y-2">
                  {unassignedTechs.map((tech) => (
                    <div
                      key={tech.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white"
                      data-testid={`unassigned-tech-${tech.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium",
                            getAvatarColor(`${tech.firstName} ${tech.lastName}`)
                          )}
                        >
                          {getInitials(tech.firstName, tech.lastName)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-700">
                            {tech.firstName} {tech.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{tech.role}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => assignMutation.mutate(tech.id)}
                        data-testid={`assign-tech-${tech.id}`}
                      >
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default function SupervisorTeams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Technician | null>(null);
  const [viewingTeam, setViewingTeam] = useState<Technician | null>(null);

  const { data: allTechnicians = [], isLoading } = useQuery<Technician[]>({
    queryKey: ["technicians-stored"],
    queryFn: async () => {
      const response = await fetch("/api/technicians/stored");
      if (!response.ok) throw new Error("Failed to fetch technicians");
      const data = await response.json();
      return data.technicians || [];
    },
  });

  const supervisors = useMemo(() => {
    return allTechnicians.filter((t) => t.role === "supervisor" && t.active);
  }, [allTechnicians]);

  const filteredSupervisors = useMemo(() => {
    return supervisors.filter((s) => {
      const matchesSearch =
        search === "" ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
        (s.phone && s.phone.includes(search));

      const matchesCounty =
        countyFilter === "all" ||
        (countyFilter === "unassigned" && !s.region) ||
        s.region === countyFilter;

      return matchesSearch && matchesCounty;
    });
  }, [supervisors, search, countyFilter]);

  const totalPages = Math.ceil(filteredSupervisors.length / ITEMS_PER_PAGE);
  const paginatedSupervisors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSupervisors.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSupervisors, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, countyFilter]);

  const getTeamMemberCount = (supervisorId: string) => {
    return allTechnicians.filter((t) => t.supervisorId === supervisorId && t.active).length;
  };

  const addMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; phone: string; email: string; region: string | null }) => {
      const response = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          role: "supervisor",
          active: true,
        }),
      });
      if (!response.ok) throw new Error("Failed to add supervisor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians-stored"] });
      toast({ title: "Supervisor Added", description: "New supervisor has been added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add supervisor", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { firstName: string; lastName: string; phone: string; email: string; region: string | null } }) => {
      const response = await fetch(`/api/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update supervisor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians-stored"] });
      toast({ title: "Supervisor Updated", description: "Supervisor has been updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update supervisor", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
      if (!response.ok) throw new Error("Failed to delete supervisor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians-stored"] });
      toast({ title: "Supervisor Deleted", description: "Supervisor has been removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete supervisor", variant: "destructive" });
    },
  });

  const handleAdd = (data: { firstName: string; lastName: string; phone: string; email: string; region: string | null }) => {
    addMutation.mutate(data);
  };

  const handleSave = (id: string, data: { firstName: string; lastName: string; phone: string; email: string; region: string | null }) => {
    updateMutation.mutate({ id, data });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6" data-testid="supervisor-teams-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Supervisor Team Management</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search supervisors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
              data-testid="input-search-supervisors"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-county-filter">
                {countyFilter === "all"
                  ? "All Counties"
                  : countyFilter === "unassigned"
                  ? "Unassigned"
                  : getRegionLabel(countyFilter)}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCountyFilter("all")}>All Counties</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCountyFilter("south")}>South County</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCountyFilter("mid")}>Mid County</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCountyFilter("north")}>North County</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCountyFilter("unassigned")}>Unassigned</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="bg-[#0078D4] hover:bg-[#0078D4]/90 text-white gap-2"
            onClick={() => setShowAddModal(true)}
            data-testid="button-add-supervisor"
          >
            <Plus className="h-4 w-4" />
            Add Supervisor
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>County</TableHead>
                <TableHead className="text-center">Technicians</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    Loading supervisors...
                  </TableCell>
                </TableRow>
              ) : paginatedSupervisors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    No supervisors found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSupervisors.map((supervisor) => {
                  const fullName = `${supervisor.firstName} ${supervisor.lastName}`.trim();
                  const initials = getInitials(supervisor.firstName, supervisor.lastName);
                  const avatarColor = getAvatarColor(fullName);
                  const teamCount = getTeamMemberCount(supervisor.id);

                  return (
                    <TableRow
                      key={supervisor.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => setEditingSupervisor(supervisor)}
                      data-testid={`supervisor-row-${supervisor.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0",
                              avatarColor
                            )}
                          >
                            {initials}
                          </div>
                          <span className="font-medium text-slate-700">{fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {supervisor.phone || "-"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {supervisor.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("font-medium", getRegionBadgeStyle(supervisor.region))}
                        >
                          {getRegionLabel(supervisor.region)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#0078D4] hover:text-[#0078D4]/80 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingTeam(supervisor);
                          }}
                          data-testid={`button-view-team-${supervisor.id}`}
                        >
                          <Users className="h-4 w-4" />
                          {teamCount}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-700 border-green-200"
                        >
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <div className="text-sm text-slate-500">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredSupervisors.length)} of{" "}
                {filteredSupervisors.length} supervisors
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddSupervisorModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />

      <EditSupervisorModal
        open={!!editingSupervisor}
        onClose={() => setEditingSupervisor(null)}
        supervisor={editingSupervisor}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <TeamMembersSidebar
        supervisor={viewingTeam}
        allTechnicians={allTechnicians}
        onClose={() => setViewingTeam(null)}
      />
    </AppLayout>
  );
}
