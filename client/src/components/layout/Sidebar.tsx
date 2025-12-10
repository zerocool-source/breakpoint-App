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
    { icon: Wrench, label: "Repairs", href: "/repairs", badge: "Coming Soon", badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30", disabled: true },
    { icon: Droplets, label: "Chemicals", href: "/chemicals", badge: "Coming Soon", badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30", disabled: true },
    { icon: CalendarClock, label: "Jobs", href: "/jobs" },
    { icon: DollarSign, label: "Payroll", href: "/payroll" },
    { icon: Building2, label: "Property Repairs", href: "/property-repairs" },
    { icon: Sparkles, label: "Ace Prime", href: "/intelligence", badge: "Coming Soon", badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30", disabled: true },
    { icon: MessageSquare, label: "Chat with Ace", href: "/chat", badge: "Coming Soon", badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30", disabled: true },
    { icon: Zap, label: "Automations", href: "/automations", badge: "Beta", badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-50">
      <div className="p-4">
        <div className="relative">
          <img 
            src={BreakpointLogo} 
            alt="Breakpoint Logo" 
            className="w-full h-auto object-contain"
          />
          <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded uppercase tracking-wider">Beta</span>
        </div>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/40 cursor-not-allowed"
              >
                <item.icon className="w-5 h-5 text-sidebar-foreground/30" />
                <span className="font-ui tracking-wide text-sm">{item.label}</span>
                {item.badge && (
                  <span className={cn("ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase", item.badgeColor)}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }
          
          return (
            <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "text-white bg-primary/20 border border-primary/30" 
                  : "text-sidebar-foreground/70 hover:text-white hover:bg-white/5"
              )}>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                )}
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary")} />
                <span className="font-ui tracking-wide text-sm">{item.label}</span>
                {item.badge && (
                  <span className={cn("ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase", item.badgeColor)}>
                    {item.badge}
                  </span>
                )}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <Link href="/settings" className={cn(
            "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-white hover:bg-white/5 transition-colors",
            location === "/settings" && "text-white bg-primary/20 border border-primary/30"
        )}>
          <Settings className={cn("w-5 h-5", location === "/settings" ? "text-primary" : "text-sidebar-foreground/60")} />
          <span className="font-ui text-sm">Settings</span>
        </Link>
      </div>
    </aside>
  );
}