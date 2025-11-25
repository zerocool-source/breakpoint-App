import { Activity, DollarSign, Droplet, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PoolHealthChart } from "@/components/dashboard/PoolHealthChart";
import { AICommand } from "@/components/dashboard/AICommand";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">COMMAND CENTER</h2>
        <p className="text-muted-foreground font-ui tracking-wide">System Standby • Waiting for Data Stream • API Connected</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Active Pools" 
          value="--" 
          change="Syncing..." 
          trend="neutral" 
          icon={Droplet} 
          color="primary"
          delay={0}
        />
        <StatCard 
          title="Monthly Revenue" 
          value="$--" 
          change="Syncing..." 
          trend="neutral" 
          icon={DollarSign} 
          color="secondary"
          delay={100}
        />
        <StatCard 
          title="Critical Alerts" 
          value="--" 
          change="No Data" 
          trend="neutral" 
          icon={Activity} 
          color="destructive"
          delay={200}
        />
        <StatCard 
          title="Auto-Dosing" 
          value="Standby" 
          change="Waiting" 
          trend="neutral" 
          icon={Zap} 
          color="accent"
          delay={300}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <PoolHealthChart />
        <AICommand />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-8">
        <AlertsFeed />
      </div>
    </AppLayout>
  );
}