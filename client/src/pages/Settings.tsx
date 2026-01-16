import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Database, Key, Lock, Server, Cpu, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [defaultModel, setDefaultModel] = useState("goss-20b");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Check if environment variables are being used
  const usingEnvVars = import.meta.env.POOLBRAIN_ACCESS_KEY !== undefined;

  useEffect(() => {
    fetchSettings();
  }, []);

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
          <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground hover:text-[#17BEBB]" data-testid="btn-back">
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
            <Alert className="bg-[#2374AB]/10 border-[#2374AB]/30">
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
