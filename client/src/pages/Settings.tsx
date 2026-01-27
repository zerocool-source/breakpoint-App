import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Database, Key, Lock, Server, Cpu, AlertCircle, ArrowLeft, Link2, Loader2, XCircle, Users, UserPlus, Search, Edit2, Trash2, Shield, UserCog } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { SystemUser } from "@shared/schema";

interface QuickBooksStatus {
  connected: boolean;
  realmId?: string;
  accessTokenValid?: boolean;
  refreshTokenValid?: boolean;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [defaultModel, setDefaultModel] = useState("goss-20b");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [qbStatus, setQbStatus] = useState<QuickBooksStatus | null>(null);
  const [qbLoading, setQbLoading] = useState(true);
  const [qbConnecting, setQbConnecting] = useState(false);
  const [qbDisconnecting, setQbDisconnecting] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  
  // User Management State
  const [userTab, setUserTab] = useState<"admin" | "office_staff">("admin");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    role: "office_staff" as "admin" | "office_staff",
    sendInvite: true,
  });

  // Check if environment variables are being used
  const usingEnvVars = import.meta.env.POOLBRAIN_ACCESS_KEY !== undefined;

  // Fetch system users
  const { data: systemUsers = [], isLoading: usersLoading } = useQuery<SystemUser[]>({
    queryKey: ["system-users"],
    queryFn: async () => {
      const res = await fetch("/api/system-users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const filteredUsers = useMemo(() => {
    let filtered = systemUsers.filter(u => u.role === userTab);
    if (userSearchQuery) {
      const query = userSearchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [systemUsers, userTab, userSearchQuery]);

  const createUserMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; role: string; inviteSent: boolean }) => {
      const res = await fetch("/api/system-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      setShowAddUserModal(false);
      setNewUserForm({ name: "", email: "", role: "office_staff", sendInvite: true });
      toast({ title: "User created", description: "The user has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; email?: string; role?: string; active?: boolean }) => {
      const res = await fetch(`/api/system-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      setEditingUser(null);
      toast({ title: "User updated", description: "Changes have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/system-users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      setDeletingUser(null);
      toast({ title: "User removed", description: "Access has been revoked." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove user.", variant: "destructive" });
    },
  });

  useEffect(() => {
    fetchSettings();
    fetchQbStatus();
    
    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search);
    const qbSuccess = urlParams.get('qb_success');
    const qbError = urlParams.get('qb_error');
    
    if (qbSuccess === 'true') {
      toast({
        title: "Connected to QuickBooks",
        description: "Your QuickBooks account has been successfully connected.",
      });
      // Clear the URL params
      window.history.replaceState({}, '', '/settings');
      fetchQbStatus();
    } else if (qbError) {
      const errorMessages: Record<string, string> = {
        'missing_params': 'Missing parameters from QuickBooks callback',
        'missing_credentials': 'QuickBooks credentials not configured',
        'token_exchange_failed': 'Failed to exchange authorization code',
        'unknown': 'An unknown error occurred',
      };
      toast({
        title: "QuickBooks Connection Failed",
        description: errorMessages[qbError] || qbError,
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  const fetchQbStatus = async () => {
    try {
      const res = await fetch("/api/quickbooks/status");
      const data = await res.json();
      setQbStatus(data);
    } catch (error) {
      console.error("Failed to fetch QuickBooks status:", error);
      setQbStatus({ connected: false });
    } finally {
      setQbLoading(false);
    }
  };

  const handleConnectQuickBooks = async () => {
    setQbConnecting(true);
    try {
      const res = await fetch("/api/quickbooks/auth");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (error) {
      console.error("Failed to start QuickBooks auth:", error);
      toast({
        title: "Error",
        description: "Failed to start QuickBooks connection. Please try again.",
        variant: "destructive",
      });
      setQbConnecting(false);
    }
  };

  const handleDisconnectQuickBooks = async () => {
    setQbDisconnecting(true);
    try {
      const res = await fetch("/api/quickbooks/disconnect", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setQbStatus({ connected: false });
      toast({
        title: "Disconnected",
        description: "Your QuickBooks account has been disconnected.",
      });
    } catch (error) {
      console.error("Failed to disconnect QuickBooks:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect QuickBooks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setQbDisconnecting(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.poolBrainApiKey) setApiKey(data.poolBrainApiKey);
      if (data.poolBrainCompanyId) setCompanyId(data.poolBrainCompanyId);
      if (data.defaultAiModel) setDefaultModel(data.defaultAiModel);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolBrainApiKey: apiKey,
          poolBrainCompanyId: companyId,
          defaultAiModel: defaultModel,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast({
        title: "Settings saved",
        description: "Your configuration has been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground hover:text-[#0D9488]" data-testid="btn-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight flex items-center gap-3">
          <Server className="text-primary w-8 h-8" />
          SYSTEM CONFIGURATION
        </h2>
        <p className="text-muted-foreground font-ui tracking-wide">API Connection • Security • Data Sources</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* AI Model Configuration */}
        <Card className="glass-card border-white/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-secondary" />
                    Neural Engine Configuration
                </CardTitle>
                <CardDescription>Select the base Large Language Model (LLM) for Ace Prime.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Default Model</Label>
                    <Select value={defaultModel} onValueChange={setDefaultModel}>
                        <SelectTrigger className="bg-white/5 border-white/10 font-ui" data-testid="select-ai-model">
                            <SelectValue placeholder="Select Model" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-foreground">
                            <SelectItem value="goss-20b">Goss 20B (Recommended)</SelectItem>
                            <SelectItem value="llama-3">Llama 3 (70B)</SelectItem>
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        "Goss 20B" is fine-tuned specifically for commercial pool management and chemistry.
                    </p>
                </div>
            </CardContent>
        </Card>

        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Pool Brain API Connection
            </CardTitle>
            <CardDescription>
              Configure your connection to the Pool Brain V2 API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-[#0078D4]/10 border-[#0078D4]/30">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300 text-sm">
                <strong>Pro Tip:</strong> For better security, add <code className="bg-black/30 px-1 rounded">POOLBRAIN_ACCESS_KEY</code> and <code className="bg-black/30 px-1 rounded">POOLBRAIN_COMPANY_ID</code> to your Replit Secrets instead. They'll override these settings.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Access Key (V2)</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="apiKey" 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="ac959f2477fa..." 
                  className="pl-10 bg-white/5 border-white/10 font-mono text-sm"
                  data-testid="input-api-key"
                />
              </div>
              <p className="text-xs text-muted-foreground">From your Pool Brain account settings.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyId">Company ID</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="companyId" 
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="Breakpoint" 
                  className="pl-10 bg-white/5 border-white/10 font-mono text-sm"
                  data-testid="input-company-id"
                />
              </div>
              <p className="text-xs text-muted-foreground">Usually your company name (e.g., "Breakpoint").</p>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-primary text-black hover:bg-primary/80 font-bold"
                data-testid="button-save-settings"
              >
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QuickBooks Integration */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-green-500" />
              QuickBooks Integration
            </CardTitle>
            <CardDescription>
              Connect your QuickBooks Online account to sync invoices and customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {qbLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking connection status...
              </div>
            ) : qbStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-400">Connected to QuickBooks</p>
                    <p className="text-sm text-muted-foreground">
                      Company ID: {qbStatus.realmId}
                    </p>
                    {qbStatus.accessTokenExpiresAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Token expires: {new Date(qbStatus.accessTokenExpiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
                    {qbStatus.accessTokenValid ? "Active" : "Needs Refresh"}
                  </Badge>
                </div>
                
                {!qbStatus.accessTokenValid && (
                  <Alert className="bg-orange-500/10 border-orange-500/30">
                    <AlertCircle className="h-4 w-4 text-orange-400" />
                    <AlertDescription className="text-orange-300 text-sm">
                      Your QuickBooks authorization has expired. Please reconnect to continue sending invoices.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleConnectQuickBooks}
                    disabled={qbConnecting}
                    className="bg-[#2CA01C] hover:bg-[#2CA01C]/80 text-white font-bold"
                    data-testid="button-reconnect-quickbooks"
                  >
                    {qbConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reconnecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4 mr-2" />
                        Reconnect to QuickBooks
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisconnectQuickBooks}
                    disabled={qbDisconnecting}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    data-testid="button-disconnect-quickbooks"
                  >
                    {qbDisconnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Disconnect QuickBooks
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                  <XCircle className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-foreground">Not Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your QuickBooks account to create invoices directly.
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={handleConnectQuickBooks}
                  disabled={qbConnecting}
                  className="bg-[#2CA01C] hover:bg-[#2CA01C]/80 text-white font-bold"
                  data-testid="button-connect-quickbooks"
                >
                  {qbConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect to QuickBooks
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  You'll be redirected to Intuit to authorize access to your QuickBooks account.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5 opacity-75">
          <CardHeader>
            <CardTitle className="text-muted-foreground">API Endpoints Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {[
                { name: "Alerts List", url: "/v2/alerts_list", status: "Ready" },
                { name: "Customer Quotes", url: "/v2/customer_quotes_detail", status: "Ready" },
                { name: "Invoices", url: "/v2/invoice_list", status: "Ready" },
                { name: "Jobs", url: "/v2/one_time_job_list", status: "Ready" },
             ].map((ep, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                        <p className="font-bold text-sm">{ep.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{ep.url}</p>
                    </div>
                    <Badge variant="outline" className="border-[#22D69A]/30 text-green-400 bg-[#22D69A]/10">
                        {ep.status}
                    </Badge>
                </div>
             ))}
          </CardContent>
        </Card>

        {/* User Management Section */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>Manage admin and office staff access</CardDescription>
              </div>
              <Button 
                onClick={() => setShowAddUserModal(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                data-testid="button-add-user"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-3">
              <button
                onClick={() => setUserTab("admin")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                  userTab === "admin" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
                data-testid="tab-admins"
              >
                <Shield className="w-4 h-4" />
                Admins
                <Badge variant="secondary" className={cn("ml-1", userTab === "admin" ? "bg-white/20 text-white" : "")}>
                  {systemUsers.filter(u => u.role === "admin").length}
                </Badge>
              </button>
              <button
                onClick={() => setUserTab("office_staff")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                  userTab === "office_staff" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
                data-testid="tab-office-staff"
              >
                <UserCog className="w-4 h-4" />
                Office Staff
                <Badge variant="secondary" className={cn("ml-1", userTab === "office_staff" ? "bg-white/20 text-white" : "")}>
                  {systemUsers.filter(u => u.role === "office_staff").length}
                </Badge>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
                data-testid="input-user-search"
              />
            </div>

            {/* Users Table */}
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date Added</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        {userSearchQuery ? "No users match your search" : `No ${userTab === "admin" ? "admins" : "office staff"} found`}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{user.email}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={cn(
                            user.role === "admin" 
                              ? "border-purple-500/30 text-purple-400 bg-purple-500/10" 
                              : "border-blue-500/30 text-blue-400 bg-blue-500/10"
                          )}>
                            {user.role === "admin" ? "Admin" : "Office Staff"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.active}
                              onCheckedChange={(checked) => updateUserMutation.mutate({ id: user.id, active: checked })}
                              data-testid={`toggle-user-active-${user.id}`}
                            />
                            <span className={cn("text-sm", user.active ? "text-green-400" : "text-muted-foreground")}>
                              {user.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground text-sm">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                              className="text-muted-foreground hover:text-foreground"
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingUser(user)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add User Modal */}
      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              Add New User
            </DialogTitle>
            <DialogDescription>Add a new admin or office staff member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                placeholder="Enter name"
                data-testid="input-new-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="Enter email"
                data-testid="input-new-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <Select value={newUserForm.role} onValueChange={(v: "admin" | "office_staff") => setNewUserForm({ ...newUserForm, role: v })}>
                <SelectTrigger data-testid="select-new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full system access</SelectItem>
                  <SelectItem value="office_staff">Office Staff - Limited access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="send-invite"
                checked={newUserForm.sendInvite}
                onCheckedChange={(checked) => setNewUserForm({ ...newUserForm, sendInvite: checked })}
                data-testid="toggle-send-invite"
              />
              <Label htmlFor="send-invite" className="text-sm text-muted-foreground">
                Send invite email to set up password
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createUserMutation.mutate({
                name: newUserForm.name,
                email: newUserForm.email,
                role: newUserForm.role,
                inviteSent: newUserForm.sendInvite,
              })}
              disabled={!newUserForm.name || !newUserForm.email || createUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-save-new-user"
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-500" />
              Edit User
            </DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  data-testid="input-edit-user-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  data-testid="input-edit-user-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editingUser.role} onValueChange={(v) => setEditingUser({ ...editingUser, role: v })}>
                  <SelectTrigger data-testid="select-edit-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Full system access</SelectItem>
                    <SelectItem value="office_staff">Office Staff - Limited access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingUser && updateUserMutation.mutate({
                id: editingUser.id,
                name: editingUser.name,
                email: editingUser.email,
                role: editingUser.role,
              })}
              disabled={updateUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-save-edit-user"
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Remove User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deletingUser?.name}</strong>? This will revoke their access to the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingUser && deleteUserMutation.mutate(deletingUser.id)}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
