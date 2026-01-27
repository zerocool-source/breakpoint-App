import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Edit, Trash2, UserCheck, UserX } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

interface UserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

const defaultFormData: UserFormData = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "admin",
  isActive: true,
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>(defaultFormData);

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin-users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-users"] });
      toast({ title: "Success", description: "User created successfully" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      const res = await fetch(`/api/admin-users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-users"] });
      toast({ title: "Success", description: "User updated successfully" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin-users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-users"] });
      toast({ title: "Success", description: "User deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        role: user.role || "admin",
        isActive: user.isActive ?? true,
      });
    } else {
      setEditingUser(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = () => {
    if (!formData.email) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return;
    }
    if (!editingUser && !formData.password) {
      toast({ title: "Error", description: "Password is required for new users", variant: "destructive" });
      return;
    }

    if (editingUser) {
      const updatePayload: Partial<UserFormData> = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        isActive: formData.isActive,
      };
      if (formData.password) {
        updatePayload.password = formData.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updatePayload });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (user: AdminUser) => {
    if (confirm(`Are you sure you want to delete ${user.email}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "supervisor":
        return "bg-purple-100 text-purple-800";
      case "service":
        return "bg-green-100 text-green-800";
      case "repair":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Users</h1>
              <p className="text-slate-600">Manage admin user accounts and permissions</p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} data-testid="button-add-user">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Accounts ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No users found</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between py-4 px-2 hover:bg-slate-50 rounded-lg"
                    data-testid={`row-user-${user.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user.isActive ? "bg-blue-100" : "bg-gray-100"
                      }`}>
                        {user.isActive ? (
                          <UserCheck className="w-5 h-5 text-blue-600" />
                        ) : (
                          <UserX className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900" data-testid={`text-email-${user.id}`}>
                            {user.email}
                          </span>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role || "admin"}
                          </Badge>
                          {!user.isActive && (
                            <Badge variant="outline" className="text-gray-500">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {user.firstName || user.lastName
                            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                            : "No name set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(user)}
                        data-testid={`button-edit-${user.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${user.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">First Name</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First name"
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Last Name</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last name"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  data-testid="input-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Password {editingUser ? "(leave blank to keep current)" : "*"}
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "Enter new password" : "Password"}
                  data-testid="input-password"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Role</label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <Select
                    value={formData.isActive ? "active" : "inactive"}
                    onValueChange={(value) => setFormData({ ...formData, isActive: value === "active" })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {editingUser ? "Update" : "Create"} User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
