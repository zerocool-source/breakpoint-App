import { Activity, DollarSign, Droplet, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Expanded Alerts Feed takes up 2 columns */}
        <div className="lg:col-span-2 h-full">
            <AlertsFeed className="h-full min-h-[400px]" />
        </div>
        {/* Ace Prime Command takes up 1 column */}
        <div className="lg:col-span-1">
            <AICommand />
        </div>
      </div>
    </AppLayout>
  );
}