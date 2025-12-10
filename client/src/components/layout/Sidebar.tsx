import { Droplets, LayoutDashboard, MessageSquare, Settings, Sparkles, Wrench, Zap, CalendarClock, DollarSign, Building2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

import BreakpointLogo from "@assets/ChatGPT_Image_Dec_9,_2025,_07_48_50_PM_1765338556188.png";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Wrench, label: "Repairs", href: "/repairs" },
    { icon: Droplets, label: "Chemicals", href: "/chemicals" },
    { icon: CalendarClock, label: "Jobs", href: "/jobs" },
    { icon: DollarSign, label: "Payroll", href: "/payroll" },
    { icon: Building2, label: "Property Repairs", href: "/property-repairs" },
    { icon: Sparkles, label: "Ace Prime", href: "/intelligence" },
    { icon: MessageSquare, label: "Chat with Ace", href: "/chat" },
    { icon: Zap, label: "Automations", href: "/automations" },
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-50 backdrop-blur-xl bg-opacity-80">
      <div className="p-4">
        <div className="relative">
          <img 
            src={BreakpointLogo} 
            alt="Breakpoint Logo" 
            className="w-full h-auto object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" 
               style={{ backgroundSize: '200% 100%' }} />
          <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded uppercase tracking-wider animate-pulse">Beta</span>
        </div>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "text-white bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(0,255,255,0.1)]" 
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_cyan]" />
                )}
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary drop-shadow-[0_0_5px_cyan]" : "group-hover:text-white")} />
                <span className="font-ui tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <Link href="/settings" className={cn(
            "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors",
            location === "/settings" && "text-white bg-white/5"
        )}>
          <Settings className="w-5 h-5" />
          <span className="font-ui">Settings</span>
        </Link>
      </div>
    </aside>
  );
}