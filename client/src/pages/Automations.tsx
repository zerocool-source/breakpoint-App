import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Zap, Plus, ArrowRight, CheckCircle2, AlertTriangle, Droplet, FileText, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: "active" | "paused";
  executions: number;
}

export default function Automations() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([
    { id: "1", name: "Bulk Chemical Outreach", trigger: "Algae or Repair Alert", action: "Draft Outlook Email for Chemical Sales", status: "active", executions: 87 },
    { id: "2", name: "Weekly Report", trigger: "Every Monday 8:00 AM", action: "Email Summary PDF to Clients", status: "paused", executions: 0 },
  ]);

  const { data: emailData, isLoading, refetch } = useQuery({
    queryKey: ["chemicalOrderEmail"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/chemical-order-email");
      if (!res.ok) throw new Error("Failed to generate email");
      return res.json();
    },
    enabled: false, // Only fetch when manually triggered
  });

  const handleCopyEmail = () => {
    if (emailData?.emailText) {
      navigator.clipboard.writeText(emailData.emailText);
      toast({
        title: "Copied to Clipboard",
        description: `Chemical order email copied (${emailData.orderCount} properties)`,
      });
    }
  };

  const handleOpenInOutlook = () => {
    if (!emailData?.emailText) return;

    // Copy email to clipboard first
    navigator.clipboard.writeText(emailData.emailText);

    // Try desktop Outlook app first (works better with long emails)
    const to = 'pmtorder@awspoolsupply.com';
    const cc = 'Jesus@awspoolsupply.com';
    const subject = 'Alpha Chemical Order';
    
    // Try ms-outlook protocol for desktop app
    const desktopUrl = `ms-outlook://compose?to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}`;
    
    // Create a hidden iframe to try opening desktop Outlook
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = desktopUrl;
    document.body.appendChild(iframe);
    
    // Clean up iframe after a short delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
    
    toast({
      title: "Email Copied & Outlook Opening",
      description: `Email copied to clipboard. Paste into Outlook (${emailData.orderCount} properties)`,
      duration: 5000,
    });
  };

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight flex items-center gap-3">
            <Zap className="text-primary w-8 h-8" />
            AUTOMATION FLOWS
          </h2>
          <p className="text-muted-foreground font-ui tracking-wide">Outlook Integration • Trigger Management • Auto-Response</p>
        </div>
        <Button className="bg-primary text-black hover:bg-primary/80 font-bold gap-2">
          <Plus className="w-4 h-4" />
          NEW WORKFLOW
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Integration Status */}
        <Card className="lg:col-span-1 glass-card border-white/5">
          <CardHeader>
            <CardTitle className="font-display text-sm tracking-widest text-muted-foreground">CONNECTED SERVICES</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0078D4]/20 flex items-center justify-center border border-[#0078D4]/30">
                  <Mail className="w-5 h-5 text-[#0078D4]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Outlook 365</h4>
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">Config</Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Droplet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Pool Brain API</h4>
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Synced
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">Config</Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Workflows */}
        <Card className="lg:col-span-2 glass-card border-white/5">
          <CardHeader>
            <CardTitle className="font-display text-sm tracking-widest text-muted-foreground">ACTIVE AUTOMATIONS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="group p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn(
                      "uppercase text-[10px] tracking-wider",
                      workflow.status === "active" ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
                    )}>
                      {workflow.status}
                    </Badge>
                    <h3 className="font-bold text-lg font-ui">{workflow.name}</h3>
                  </div>
                  <Switch checked={workflow.status === "active"} />
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono bg-black/20 p-3 rounded border border-white/5">
                  <div className="flex items-center gap-2 text-primary">
                    <AlertTriangle className="w-4 h-4" />
                    IF: {workflow.trigger}
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-50" />
                  <div className="flex items-center gap-2 text-[#0078D4]">
                    <Mail className="w-4 h-4" />
                    THEN: {workflow.action}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>Last run: 2 mins ago</span>
                  <span>Total executions: {workflow.executions}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Builder Preview */}
      <div className="mt-8">
        <Card className="glass-card border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-sm tracking-widest text-muted-foreground">ALPHA CHEMICAL ORDER TEMPLATE</CardTitle>
              <CardDescription>Auto-generated bulk chemical orders in Breakpoint style</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => refetch()} 
                disabled={isLoading}
                variant="outline"
                className="gap-2"
                data-testid="button-generate-email"
              >
                <Mail className="w-4 h-4" />
                {isLoading ? "Generating..." : "Generate from Alerts"}
              </Button>
              {emailData && (
                <>
                  <Button 
                    onClick={handleOpenInOutlook}
                    className="bg-[#0078D4] text-white hover:bg-[#0078D4]/80 gap-2"
                    data-testid="button-open-outlook"
                  >
                    <Mail className="w-4 h-4" />
                    Open in Outlook
                  </Button>
                  <Button 
                    onClick={handleCopyEmail}
                    variant="outline"
                    className="gap-2"
                    data-testid="button-copy-email"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Email
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {emailData ? (
              <div className="bg-white text-black p-6 rounded-lg font-mono text-xs max-w-3xl mx-auto shadow-2xl overflow-x-auto">
                <div className="mb-4 flex justify-between items-center border-b pb-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    {emailData.orderCount} Properties
                  </Badge>
                  <span className="text-[10px] text-gray-500">Live from Pool Brain Alerts</span>
                </div>
                <div className="whitespace-pre-wrap" data-testid="email-preview">
                  {emailData.emailText}
                </div>
              </div>
            ) : (
              <div className="bg-white text-black p-6 rounded-lg font-mono text-xs max-w-3xl mx-auto shadow-2xl overflow-x-auto">
                <div className="whitespace-pre-wrap">
                  <p><strong>From:</strong> COO &lt;COO@breakpointpools.com&gt;</p>
                  <p><strong>Sent:</strong> Tuesday, November 25, 2025 8:03 AM</p>
                  <p><strong>To:</strong> Paramount Orders &lt;pmtorder@awspoolsupply.com&gt;</p>
                  <p><strong>Cc:</strong> Jesus Diaz &lt;Jesus@awspoolsupply.com&gt;</p>
                  <p><strong>Subject:</strong> Alpha Chemical Order</p>
                  <p className="mt-4"></p>
                  
                  <p className="font-bold">PRESERVE At Chino <span className="text-red-600">Rush!</span></p>
                  <p>C/O: First Service Residential, LL CPO</p>
                  <p>BOX 62499, IRVINE, CA 92602</p>
                  <p className="text-gray-600 text-[10px]">Main entry code: #7139 | Lockbox: 5090</p>
                  <p className="mt-2"></p>
                  <p>Bulk bleach – refill 150-gallon chlorine tank (currently below half)</p>
                  <p>Bulk muriatic acid – refill 50-gallon acid tank (currently below half)</p>
                  <p className="mt-4"></p>

                  <p className="font-bold">Amelia Square <span className="text-red-600">Rush!</span></p>
                  <p>3332 Wind Chime Lane</p>
                  <p>Perris, CA 92571</p>
                  <p className="text-gray-600 text-[10px]">Main entry code: #7139 | Lockbox: 5090</p>
                  <p className="mt-2"></p>
                  <p>2 – 15gal Bleach</p>
                  <p>2 – 15gal Acid</p>
                  <p className="mt-4"></p>

                  <p className="font-bold">Bear Creek MA</p>
                  <p>31608 Railroad Canyon Road</p>
                  <p>Canyon Lake, CA 92587</p>
                  <p className="mt-2"></p>
                  <p>1 – 55G Chlorine Drum</p>
                  <p>3 – 15gal Acid Carboys</p>
                  <p className="mt-6 border-t pt-4"></p>

                  <p>Warm Regards,</p>
                  <p className="mt-2"></p>
                  <p className="font-bold">David Harding Sr</p>
                  <p>Chief Operating Officer</p>
                  <p>Direct: 951-312-5060</p>
                  <p>Office: 951-653-3333 Press 6</p>
                  <p className="text-blue-600">https://www.breakpointpools.com</p>
                  
                  <p className="mt-6 text-center text-gray-500 text-[10px]">
                    Click "Generate from Alerts" to create email from live Pool Brain data
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
