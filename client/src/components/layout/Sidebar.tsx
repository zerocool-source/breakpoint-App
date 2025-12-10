import { Droplets, LayoutDashboard, MessageSquare, Settings, Sparkles, Wrench, Zap, CalendarClock, DollarSign, Building2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import BreakpointLogo from "@assets/ChatGPT_Image_Dec_9,_2025,_11_02_17_PM_1765350238464.png";



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
    <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50 shadow-sm">
      <div className="p-5 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between gap-2">
          <img 
            src={BreakpointLogo} 
            alt="Breakpoint Intelligence" 
            className="h-10 w-auto object-contain"
          />
          <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0891b2] text-white border border-[#067997] rounded-full uppercase tracking-wider shadow-sm">Beta</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 bg-white">
        {navItems.map((item) => {
          const isActive = location === item.href;
          
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 cursor-not-allowed"
              >
                <item.icon className="w-5 h-5 text-slate-300" />
                <span className="font-medium text-sm">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase bg-slate-100 text-slate-500 border-slate-300">
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
                  ? "text-white bg-[#0891b2] shadow-md" 
                  : "text-slate-700 hover:text-[#0891b2] hover:bg-slate-100"
              )}>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/30 rounded-r" />
                )}
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-white" : "text-[#0891b2]")} />
                <span className="text-sm">{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    "ml-auto px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase",
                    isActive ? "bg-white/20 text-white border-white/30" : "bg-[#0891b2]/10 text-[#0891b2] border-[#0891b2]/30"
                  )}>
                    {item.badge}
                  </span>
                )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-200 bg-white">
        <Link href="/settings" className={cn(
            "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-700 hover:text-[#0891b2] hover:bg-slate-100 transition-colors font-medium",
            location === "/settings" && "text-white bg-[#0891b2] shadow-md"
        )}>
          <Settings className={cn("w-5 h-5", location === "/settings" ? "text-white" : "text-[#0891b2]")} />
          <span className="text-sm">Settings</span>
        </Link>
      </div>
    </aside>
  );
}