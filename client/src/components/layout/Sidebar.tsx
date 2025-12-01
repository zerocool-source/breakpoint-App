import { Activity, AlertCircle, Droplet, FileText, Home, LayoutDashboard, MessageSquare, Settings, Sparkles, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Droplet, label: "Pools", href: "/pools" },
    { icon: Sparkles, label: "Ace Prime", href: "/intelligence" },
    { icon: MessageSquare, label: "Chat with Ace", href: "/chat" },
    { icon: Zap, label: "Automations", href: "/automations" },
    { icon: FileText, label: "Reports", href: "/reports" },
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-50 backdrop-blur-xl bg-opacity-80">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
          <Activity className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg tracking-wider text-foreground">BREAKPOINT</h1>
          <p className="text-xs text-muted-foreground font-ui tracking-widest">INTELLIGENCE</p>
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