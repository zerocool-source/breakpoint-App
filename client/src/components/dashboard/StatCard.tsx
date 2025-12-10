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
    primary: "text-white bg-[#0891b2] shadow-[#0891b2]/30",
    secondary: "text-white bg-[#f5a962] shadow-[#f5a962]/30",
    accent: "text-white bg-slate-500 shadow-slate-500/30",
    destructive: "text-white bg-red-500 shadow-red-500/30",
  };

  const cardAccents = {
    primary: "border-l-4 border-l-[#0891b2]",
    secondary: "border-l-4 border-l-[#f5a962]",
    accent: "border-l-4 border-l-slate-500",
    destructive: "border-l-4 border-l-red-500",
  };

  return (
    <Card 
      className={cn(
        "bg-white backdrop-blur-sm border-[#0891b2]/20 shadow-md hover:shadow-xl group animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards transition-all duration-300 hover:-translate-y-1",
        cardAccents[color]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-gradient-to-br from-[#0891b2]/10 to-[#f5a962]/10 blur-2xl" />
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">{title}</p>
            <h3 className="text-4xl font-bold mt-2 font-display tracking-tight text-slate-800">{value}</h3>
            {change && (
              <p className={cn(
                "text-sm mt-2 font-semibold flex items-center gap-1",
                trend === "up" ? "text-[#f5a962]" : trend === "down" ? "text-red-500" : "text-slate-500"
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