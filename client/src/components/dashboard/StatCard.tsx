import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  color?: "primary" | "secondary" | "accent" | "destructive";
  delay?: number;
}

export function StatCard({ title, value, change, trend, icon: Icon, color = "primary", delay = 0 }: StatCardProps) {
  const colorStyles = {
    primary: "text-primary bg-primary/15",
    secondary: "text-secondary bg-secondary/15",
    accent: "text-accent bg-accent/15",
    destructive: "text-destructive bg-destructive/15",
  };

  const borderStyles = {
    primary: "hover:border-primary/50",
    secondary: "hover:border-secondary/50",
    accent: "hover:border-accent/50",
    destructive: "hover:border-destructive/50",
  };

  return (
    <Card 
      className={cn(
        "bg-card border-border shadow-sm hover:shadow-lg group animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards transition-all duration-300",
        borderStyles[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6 relative overflow-hidden">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">{title}</p>
            <h3 className="text-4xl font-bold mt-2 font-display tracking-tight text-foreground">{value}</h3>
            {change && (
              <p className={cn(
                "text-sm mt-2 font-medium flex items-center gap-1",
                trend === "up" ? "text-green-600" : trend === "down" ? "text-destructive" : "text-muted-foreground"
              )}>
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "•"} {change}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110 duration-300", colorStyles[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}