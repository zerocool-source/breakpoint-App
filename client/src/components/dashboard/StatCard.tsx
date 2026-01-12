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
  const iconColors = {
    primary: "bg-[#1E3A8A] text-white",
    secondary: "bg-[#F97316] text-white",
    accent: "bg-[#60A5FA] text-white",
    destructive: "bg-red-500 text-white",
  };

  const cardAccents = {
    primary: "border-l-4 border-l-[#1E3A8A]",
    secondary: "border-l-4 border-l-[#F97316]",
    accent: "border-l-4 border-l-[#60A5FA]",
    destructive: "border-l-4 border-l-red-500",
  };

  const trendColors = {
    up: "text-emerald-600",
    down: "text-red-500",
    neutral: "text-[#64748B]",
  };

  return (
    <Card 
      className={cn(
        "bg-white border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5",
        cardAccents[color]
      )}
    >
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-[#64748B] text-xs font-medium uppercase tracking-wide">{title}</p>
            <h3 className="text-3xl font-bold text-[#1E293B]">{value}</h3>
            {change && (
              <p className={cn(
                "text-sm font-medium flex items-center gap-1",
                trendColors[trend || "neutral"]
              )}>
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "•"} {change}
              </p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl transition-transform duration-200 hover:scale-105",
            iconColors[color]
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
