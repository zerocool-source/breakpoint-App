import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Database, Key, Lock, Server, Cpu } from "lucide-react";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [defaultModel, setDefaultModel] = useState("goss-20b");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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
                        <SelectTrigger className="bg-white/5 border-white/10 font-ui">
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
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Access Key (V2)</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="apiKey" 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="ac959f..." 
                  className="pl-10 bg-white/5 border-white/10 font-mono text-sm" 
                />
              </div>
              <p className="text-xs text-muted-foreground">From your Pool Brain account (see screenshots).</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyId">Company ID (Optional)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="companyId" 
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="Enter Company ID if using Master Key" 
                  className="pl-10 bg-white/5 border-white/10 font-mono text-sm" 
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-primary text-black hover:bg-primary/80 font-bold"
              >
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5 opacity-75">
          <CardHeader>
            <CardTitle className="text-muted-foreground">Endpoints Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {[
                { name: "Alerts API", url: "/v2/alerts", status: "Ready" },
                { name: "Quotes Detail", url: "/v2/customer_quotes_detail", status: "Ready" },
                { name: "Invoices", url: "/v2/invoice_list", status: "Ready" },
                { name: "Jobs", url: "/v2/one_time_job_list", status: "Ready" },
             ].map((ep, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                        <p className="font-bold text-sm">{ep.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{ep.url}</p>
                    </div>
                    <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
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
