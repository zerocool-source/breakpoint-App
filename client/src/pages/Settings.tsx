import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Database, Key, Lock, Server, Cpu, AlertCircle, ArrowLeft, Link2, Loader2, XCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  // Check if environment variables are being used
  const usingEnvVars = import.meta.env.POOLBRAIN_ACCESS_KEY !== undefined;

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
                  {!qbStatus.accessTokenValid && (
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
                  )}
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
      </div>
    </AppLayout>
  );
}
