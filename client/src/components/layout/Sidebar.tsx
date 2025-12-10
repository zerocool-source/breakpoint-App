import { Droplets, LayoutDashboard, MessageSquare, Settings, Sparkles, Wrench, Zap, CalendarClock, DollarSign, Building2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

import BreakpointLogo from "@assets/ChatGPT_Image_Dec_9,_2025,_07_48_50_PM_1765338556188.png";

interface NavItem {
  icon: any;
  label: string;
  href: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
}

export function Sidebar() {
  const [location] = useLocation();

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Wrench, label: "Repairs", href: "/repairs", badge: "Coming Soon", badgeColor: "bg-secondary/10 text-secondary border-secondary/30", disabled: true },
    { icon: Droplets, label: "Chemicals", href: "/chemicals", badge: "Coming Soon", badgeColor: "bg-secondary/10 text-secondary border-secondary/30", disabled: true },
    { icon: CalendarClock, label: "Jobs", href: "/jobs" },
    { icon: DollarSign, label: "Payroll", href: "/payroll" },
    { icon: Building2, label: "Property Repairs", href: "/property-repairs" },
    { icon: Sparkles, label: "Ace Prime", href: "/intelligence", badge: "Coming Soon", badgeColor: "bg-primary/10 text-primary border-primary/30", disabled: true },
    { icon: MessageSquare, label: "Chat with Ace", href: "/chat", badge: "Coming Soon", badgeColor: "bg-primary/10 text-primary border-primary/30", disabled: true },
    { icon: Zap, label: "Automations", href: "/automations", badge: "Beta", badgeColor: "bg-primary/10 text-primary border-primary/30" },
  ];

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-50 shadow-sm">
      <div className="p-5 border-b border-border">
        <div className="relative">
          <img 
            src={BreakpointLogo} 
            alt="Breakpoint Logo" 
            className="w-full h-auto object-contain"
          />
          <span className="absolute top-1 right-1 px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/30 rounded-full uppercase tracking-wider">Beta</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground/60 cursor-not-allowed"
              >
                <item.icon className="w-5 h-5 text-muted-foreground/40" />
                <span className="font-medium text-sm">{item.label}</span>
                {item.badge && (
                  <span className={cn("ml-auto px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase", item.badgeColor)}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }
          
          return (
            <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden font-medium",
                isActive 
                  ? "text-primary bg-primary/10 border border-primary/30 shadow-sm" 
                  : "text-foreground hover:text-primary hover:bg-muted"
              )}>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                )}
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-secondary group-hover:text-primary")} />
                <span className="text-sm">{item.label}</span>
                {item.badge && (
                  <span className={cn("ml-auto px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase", item.badgeColor)}>
                    {item.badge}
                  </span>
                )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <Link href="/settings" className={cn(
            "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-foreground hover:text-primary hover:bg-muted transition-colors font-medium",
            location === "/settings" && "text-primary bg-primary/10 border border-primary/30"
        )}>
          <Settings className={cn("w-5 h-5", location === "/settings" ? "text-primary" : "text-secondary")} />
          <span className="text-sm">Settings</span>
        </Link>
      </div>
    </aside>
  );
}