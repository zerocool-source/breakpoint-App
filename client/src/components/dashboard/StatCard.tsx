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
    primary: "text-primary bg-primary/20 shadow-primary/20",
    secondary: "text-secondary bg-secondary/20 shadow-secondary/20",
    accent: "text-accent bg-accent/20 shadow-accent/20",
    destructive: "text-destructive bg-destructive/20 shadow-destructive/20",
  };

  const cardAccents = {
    primary: "border-l-4 border-l-primary",
    secondary: "border-l-4 border-l-secondary",
    accent: "border-l-4 border-l-accent",
    destructive: "border-l-4 border-l-destructive",
  };

  return (
    <Card 
      className={cn(
        "bg-card/90 backdrop-blur-sm border-border shadow-md hover:shadow-xl group animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards transition-all duration-300 hover:-translate-y-1",
        cardAccents[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 blur-2xl" />
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">{title}</p>
            <h3 className="text-4xl font-bold mt-2 font-display tracking-tight text-foreground">{value}</h3>
            {change && (
              <p className={cn(
                "text-sm mt-2 font-semibold flex items-center gap-1",
                trend === "up" ? "text-green-600" : trend === "down" ? "text-destructive" : "text-muted-foreground"
              )}>
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "•"} {change}
              </p>
            )}
          </div>
          <div className={cn("p-4 rounded-2xl transition-all group-hover:scale-110 group-hover:shadow-lg duration-300", colorStyles[color])}>
            <Icon className="w-7 h-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}