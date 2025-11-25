import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Database, Key, Lock, Server } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    // In a real app, this would validate and save to secure storage
    localStorage.setItem("poolBrain_apiKey", apiKey);
    localStorage.setItem("poolBrain_companyId", companyId);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

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
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Pool Brain API Connection
            </CardTitle>
            <CardDescription>
              Configure your connection to the Pool Brain V2 API. Keys are stored locally for this session.
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
              <p className="text-xs text-muted-foreground">Found in your Pool Brain Integration settings.</p>
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
              {isSaved && (
                <span className="text-green-400 text-sm flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" /> Settings Saved
                </span>
              )}
              <Button onClick={handleSave} className="bg-primary text-black hover:bg-primary/80 font-bold">
                Save Connection
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
