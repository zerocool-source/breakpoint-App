import { Activity } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { EnrichedAlertsFeed } from "@/components/dashboard/EnrichedAlertsFeed";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";
interface EnrichedAlert {
  alertId: string;
  poolName: string;
  customerName: string;
  severity: string;
  status: string;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alertsData = { alerts: [] } } = useQuery({
    queryKey: ["enrichedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/enriched");
      if (!res.ok) throw new Error("Failed to fetch enriched alerts");
      return res.json();
    },
  });

  const alerts: EnrichedAlert[] = alertsData.alerts || [];

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/alerts/sync", { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync alerts");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["enrichedAlerts"] });
      toast({
        title: "Sync Complete",
        description: data.message || `Synced ${data.syncedCount} alerts from Pool Brain`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync alerts from Pool Brain. Check your API settings.",
        variant: "destructive",
      });
    },
  });

  const activeAlerts = alerts.filter((a: EnrichedAlert) => a.status === "Active");
  const criticalAlerts = alerts.filter((a: EnrichedAlert) => a.severity.toUpperCase().includes("URGENT") && a.status === "Active");
  const resolvedToday = alerts.filter((a: EnrichedAlert) => a.status === "Resolved");

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2 tracking-tight">COMMAND CENTER</h2>
          <p className="text-muted-foreground font-ui tracking-wide text-lg">
            {alerts.length > 0 ? `${alerts.length} Total Alerts • ${activeAlerts.length} Active` : "System Standby • API Connected"}
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="bg-primary text-white hover:bg-primary/90 font-bold gap-2 shadow-md"
          data-testid="button-sync-poolbrain"
        >
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? "Syncing..." : "Sync Pool Brain"}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Alerts" 
          value={alerts.length.toString()}
          change={`${activeAlerts.length} active`}
          trend="neutral" 
          icon={Activity} 
          color="primary"
          delay={0}
        />
        <StatCard 
          title="URGENT Alerts" 
          value={criticalAlerts.length.toString()}
          change={criticalAlerts.length > 0 ? "Requires attention" : "All clear"} 
          trend={criticalAlerts.length > 0 ? "up" : "neutral"}
          icon={Activity} 
          color="destructive"
          delay={100}
        />
        <StatCard 
          title="Resolved Today" 
          value={resolvedToday.length.toString()}
          change={resolvedToday.length > 0 ? "Good progress" : "No activity"}
          trend={resolvedToday.length > 0 ? "down" : "neutral"}
          icon={Activity} 
          color="secondary"
          delay={200}
        />
      </div>

      {/* Main Content */}
      <div className="mb-8">
        <EnrichedAlertsFeed className="min-h-[500px]" />
      </div>
    </AppLayout>
  );
}