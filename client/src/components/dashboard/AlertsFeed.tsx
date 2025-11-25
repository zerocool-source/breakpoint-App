import { Alert, mockAlerts } from "@/lib/poolbrain-mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertsFeedProps {
    className?: string;
}

export function AlertsFeed({ className }: AlertsFeedProps) {
  const getSeverityColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "Critical": return "bg-destructive/20 text-destructive border-destructive/50";
      case "High": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "Medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "Low": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    }
  };

  return (
    <Card className={cn("glass-card border-white/5 flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
        <CardTitle className="font-display text-lg tracking-wide flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          SYSTEM ALERTS
        </CardTitle>
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 animate-pulse">
          {mockAlerts.filter(a => a.status === "Active").length} Active
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 overflow-y-auto custom-scrollbar flex-1">
        {mockAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                <p>No active alerts</p>
            </div>
        ) : (
            mockAlerts.map((alert) => (
            <div 
                key={alert.id} 
                className="group relative p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all"
            >
                {alert.status === "Active" && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-destructive to-transparent rounded-l-lg opacity-50 group-hover:opacity-100" />
                )}
                
                <div className="flex justify-between items-start mb-2">
                <div className="space-y-1">
                    <h4 className="font-semibold font-ui text-lg leading-none group-hover:text-primary transition-colors">{alert.poolName}</h4>
                    <p className="text-xs text-muted-foreground font-mono">{alert.timestamp.split('T')[0]} • ID: {alert.id}</p>
                </div>
                <Badge className={cn("font-mono text-[10px] uppercase tracking-wider", getSeverityColor(alert.severity))}>
                    {alert.severity}
                </Badge>
                </div>
                
                <p className="text-sm text-gray-300 mb-3 leading-relaxed">{alert.message}</p>
                
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex gap-2 text-xs text-muted-foreground font-ui">
                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                    <Clock className="w-3 h-3" /> {alert.type}
                    </span>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs hover:text-green-400 hover:bg-green-400/10 gap-1 font-ui uppercase tracking-wide">
                    <CheckCircle2 className="w-3 h-3" /> Resolve
                </Button>
                </div>
            </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}