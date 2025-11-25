import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Zap, Plus, ArrowRight, CheckCircle2, AlertTriangle, Droplet, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: "active" | "paused";
  executions: number;
}

export default function Automations() {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    { id: "1", name: "Bulk Chemical Outreach", trigger: "Algae or Repair Alert", action: "Draft Outlook Email for Chemical Sales", status: "active", executions: 87 },
    { id: "2", name: "Weekly Report", trigger: "Every Monday 8:00 AM", action: "Email Summary PDF to Clients", status: "paused", executions: 0 },
  ]);

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
          <CardHeader>
            <CardTitle className="font-display text-sm tracking-widest text-muted-foreground">BULK CHEMICAL EMAIL TEMPLATE</CardTitle>
            <CardDescription>Subject: 💧 Bulk Chemical Solution for {`{{customer_name}}`} - Special Pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white text-black p-8 rounded-lg font-sans max-w-2xl mx-auto shadow-2xl">
              <div className="border-b pb-4 mb-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-[#0078D4]">Breakpoint Commercial Pools</h1>
                <span className="text-xs text-gray-500">Bulk Chemical Sales</span>
              </div>
              <p className="mb-4">Hello {`{{customer_name}}`},</p>
              <p className="mb-4">We noticed your recent alerts for <strong>{`{{pool_name}}`}</strong> and wanted to reach out with a solution that could help prevent future issues.</p>
              
              <div className="bg-blue-50 p-4 rounded border-l-4 border-[#0078D4] mb-4">
                <p className="font-bold mb-2">Recommended Bulk Chemical Package:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>55G Chlorine Drum - Special Rate</li>
                  <li>15G Acid Carboys (2x) - Discounted</li>
                  <li>50lb Bag Sodium Bicarbonate</li>
                </ul>
                <p className="mt-2 text-green-600 font-bold">Save 15% on bulk orders this month!</p>
              </div>

              <p className="mb-6">Let us know if you'd like a detailed quote or want to discuss your specific chemical needs.</p>
              
              <a href="#" className="inline-block bg-[#0078D4] text-white px-6 py-2 rounded font-bold text-sm">
                Request Quote
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
