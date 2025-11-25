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
    primary: "text-primary shadow-primary/20 bg-primary/10",
    secondary: "text-secondary shadow-secondary/20 bg-secondary/10",
    accent: "text-accent shadow-accent/20 bg-accent/10",
    destructive: "text-destructive shadow-destructive/20 bg-destructive/10",
  };

  const borderStyles = {
    primary: "group-hover:border-primary/50",
    secondary: "group-hover:border-secondary/50",
    accent: "group-hover:border-accent/50",
    destructive: "group-hover:border-destructive/50",
  };

  return (
    <Card 
      className={cn(
        "glass-card border-white/5 bg-card/40 group animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards",
        borderStyles[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className={cn(
          "absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40",
          color === "primary" && "bg-primary",
          color === "secondary" && "bg-secondary",
          color === "accent" && "bg-accent",
          color === "destructive" && "bg-destructive",
        )} />

        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-muted-foreground text-sm font-ui tracking-wide uppercase">{title}</p>
            <h3 className="text-3xl font-bold mt-2 font-display tracking-tight text-foreground">{value}</h3>
            {change && (
              <p className={cn(
                "text-xs mt-2 font-mono flex items-center gap-1",
                trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground"
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