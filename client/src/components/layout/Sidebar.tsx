import { useState } from "react";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Calendar, 
  Briefcase, 
  FileBarChart, 
  FileText, 
  MessageSquare, 
  Truck, 
  Zap,
  ChevronRight,
  Settings,
  Wrench,
  Package,
  Hammer,
  Search,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import BreakpointLogo from "@assets/ChatGPT_Image_Jan_17,_2026,_10_07_41_AM_1768673283450.png";

interface NavSubSubItem {
  label: string;
  href: string;
  badge?: number;
}

interface NavSubItem {
  label: string;
  href?: string;
  icon?: any;
  badge?: number;
  section?: string;
  children?: NavSubSubItem[];
}

interface NavItem {
  icon: any;
  label: string;
  href?: string;
  children?: NavSubItem[];
  badge?: string;
  disabled?: boolean;
}

function NavItemComponent({ 
  item, 
  isExpanded, 
  onToggle, 
  location,
  expandedSubItems,
  onToggleSubExpand
}: { 
  item: NavItem; 
  isExpanded: boolean; 
  onToggle: () => void;
  location: string;
  expandedSubItems: Set<string>;
  onToggleSubExpand: (key: string) => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href ? location === item.href : false;
  const hasActiveChild = item.children?.some(child => location === child.href);

  if (item.disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 text-white/40 cursor-not-allowed text-sm rounded-lg">
        <item.icon className="w-4 h-4" />
        <span>{item.label}</span>
        {item.badge && (
          <span className="ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-white/60">
            {item.badge}
          </span>
        )}
      </div>
    );
  }

  if (!hasChildren && item.href) {
    return (
      <Link 
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          isActive 
            ? "bg-white text-[#0078D4] shadow-sm" 
            : "text-white/90 hover:bg-white/15"
        )}
      >
        <item.icon className={cn("w-4 h-4", isActive ? "text-[#0078D4]" : "text-white/90")} />
        <span>{item.label}</span>
        {item.badge && (
          <span className={cn(
            "ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full",
            isActive ? "bg-[#FF8000] text-white" : "bg-[#FF8000] text-white"
          )}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left",
          hasActiveChild 
            ? "bg-white/15 text-white" 
            : "text-white/90 hover:bg-white/10"
        )}
      >
        <item.icon className="w-4 h-4 text-white/90" />
        <span className="flex-1">{item.label}</span>
        <ChevronRight className={cn(
          "w-4 h-4 transition-transform duration-200 text-white/60",
          isExpanded && "rotate-90 text-white"
        )} />
      </button>
      
      {isExpanded && item.children && (
        <div className="ml-4 mt-1 space-y-0.5 pl-4 border-l-2 border-white/20">
          {(() => {
            let lastSection: string | undefined = undefined;
            return item.children.map((child) => {
              const isChildActive = child.href ? location === child.href : false;
              const hasSubChildren = child.children && child.children.length > 0;
              const hasActiveSubChild = child.children?.some(sub => location === sub.href);
              const showSectionHeader = child.section && child.section !== lastSection;
              if (child.section) lastSection = child.section;
              
              if (hasSubChildren) {
                const isSubExpanded = expandedSubItems.has(child.label);
                return (
                  <div key={child.label}>
                    <button
                      onClick={() => onToggleSubExpand(child.label)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium w-full text-left transition-colors",
                        hasActiveSubChild ? "text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <ChevronRight className={cn(
                        "w-3 h-3 transition-transform duration-200",
                        isSubExpanded && "rotate-90"
                      )} />
                      <span className="flex-1">{child.label}</span>
                    </button>
                    {isSubExpanded && (
                      <div className="ml-3 mt-0.5 space-y-0.5 pl-3 border-l border-white/20">
                        {child.children!.map((subChild) => {
                          const isSubActive = location === subChild.href;
                          return (
                            <Link
                              key={subChild.href}
                              href={subChild.href}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                                isSubActive 
                                  ? "bg-white text-[#0078D4] shadow-sm" 
                                  : "text-white/70 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <span className="flex-1">{subChild.label}</span>
                              {subChild.badge !== undefined && subChild.badge > 0 && (
                                <span className={cn(
                                  "px-1.5 py-0.5 text-[10px] font-semibold rounded-full min-w-[18px] text-center",
                                  isSubActive ? "bg-[#FF8000] text-white" : "bg-[#FF8000] text-white"
                                )}>
                                  {subChild.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <div key={child.href || child.label}>
                  {showSectionHeader && (
                    <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium px-3 pt-2 pb-1">
                      {child.section}
                    </div>
                  )}
                  <Link
                    href={child.href || "#"}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                      isChildActive 
                        ? "bg-white text-[#0078D4] shadow-sm" 
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {child.section && <Users className="w-3.5 h-3.5" />}
                    <span className="flex-1">{child.label}</span>
                    {child.section && <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
                    {child.badge !== undefined && child.badge > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 text-[10px] font-semibold rounded-full min-w-[18px] text-center bg-[#FF8000] text-white"
                      )}>
                        {child.badge}
                      </span>
                    )}
                  </Link>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["properties", "chats", "operationsHub"]));
  const [expandedSubItems, setExpandedSubItems] = useState<Set<string>>(new Set(["Repairs", "Chemicals", "Service"]));

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSubExpand = (key: string) => {
    setExpandedSubItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const navItems: (NavItem & { key: string })[] = [
    { 
      key: "overview",
      icon: LayoutDashboard, 
      label: "Overview", 
      href: "/"
    },
    { 
      key: "properties",
      icon: Building2, 
      label: "Properties", 
      children: [
        { label: "Customers", href: "/customers" },
        { label: "Visits", href: "/visits" },
      ]
    },
    { 
      key: "operationsHub",
      icon: Hammer, 
      label: "Operations Hub", 
      children: [
        { label: "Supervisor Management", href: "/supervisor-management", section: "Supervisor Management" },
        { label: "Tech Ops", href: "/tech-ops", section: "Tech Ops" },
        { 
          label: "Repairs", 
          section: "Tech Ops",
          children: [
            { label: "Repairs Needed", href: "/tech-ops/repairs-needed" },
            { label: "Service Repairs", href: "/service-repairs" },
          ]
        },
        { 
          label: "Chemicals", 
          section: "Tech Ops",
          children: [
            { label: "Chemical Orders", href: "/tech-ops/chemical-order" },
            { label: "Chemicals Dropped-Off", href: "/tech-ops/chemicals-dropoff" },
          ]
        },
        { 
          label: "Service", 
          section: "Tech Ops",
          children: [
            { label: "Windy Day Clean Up", href: "/tech-ops/windy-day-cleanup" },
            { label: "Report Issues", href: "/tech-ops/report-issue" },
            { label: "Emergencies", href: "/emergencies" },
          ]
        },
      ]
    },
    { 
      key: "repairQueue",
      icon: Wrench, 
      label: "Repair Queue", 
      href: "/repair-queue"
    },
    { 
      key: "technicians",
      icon: Users, 
      label: "Technicians", 
      children: [
        { label: "Repair Tech", href: "/tech-repairs" },
        { label: "Service Techs", href: "/tech-services" },
        { label: "Supervisors", href: "/supervisors" },
      ]
    },
    { 
      key: "scheduling",
      icon: Calendar, 
      label: "Scheduling", 
      children: [
        { label: "Calendar", href: "/scheduling" },
        { label: "Route History", href: "/route-history" },
      ]
    },
    { 
      key: "jobs",
      icon: Briefcase, 
      label: "Jobs", 
      children: [
        { label: "Repairs", href: "/jobs" },
        { label: "Chemicals", href: "/job-chemicals" },
      ]
    },
    { 
      key: "reports",
      icon: FileBarChart, 
      label: "Reports", 
      href: "/reports"
    },
    { 
      key: "estimates",
      icon: FileText, 
      label: "Estimates", 
      children: [
        { label: "All Estimates", href: "/estimates" },
        { label: "History Log", href: "/estimate-history" },
      ]
    },
    { 
      key: "chats",
      icon: MessageSquare, 
      label: "Chats Hub", 
      children: [
        { label: "Channels", href: "/channels" },
      ]
    },
    { 
      key: "fleet",
      icon: Truck, 
      label: "Fleet", 
      children: [
        { label: "Fleet Dashboard", href: "/fleet" },
        { label: "Truck Inventory", href: "/fleet/inventory" },
      ]
    },
    { 
      key: "automations",
      icon: Zap, 
      label: "Automations", 
      href: "/automations",
      badge: "Beta"
    },
  ];

  return (
    <aside className="w-60 h-screen bg-[#0078D4] flex flex-col fixed left-0 top-0 z-50 shadow-lg">
      <div className="p-4 border-b border-white/10 text-[#ede4e4] bg-[#f0e6e6]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-20 w-20 bg-white rounded-xl p-2 shadow-sm">
            <img 
              src={BreakpointLogo} 
              alt="Breakpoint Intelligence" 
              className="h-full w-full object-contain"
            />
          </div>
          <span className="px-3 py-1 text-[10px] font-semibold bg-[#FF8000] text-white rounded-full uppercase tracking-wide">
            Beta
          </span>
        </div>
      </div>
      <div className="px-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input 
            type="text" 
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#FF8000] focus:border-transparent transition-all"
          />
        </div>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.key}
            item={item}
            isExpanded={expandedItems.has(item.key)}
            onToggle={() => toggleExpand(item.key)}
            location={location}
            expandedSubItems={expandedSubItems}
            onToggleSubExpand={toggleSubExpand}
          />
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <Link 
          href="/customers"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 mb-1",
            location === "/customers" 
              ? "bg-white text-[#0078D4] shadow-sm" 
              : "text-white/90 hover:bg-white/15"
          )}
        >
          <Users className={cn("w-4 h-4", location === "/customers" ? "text-[#0078D4]" : "text-white/90")} />
          <span>Customers</span>
        </Link>
        <Link 
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            location === "/settings" 
              ? "bg-white text-[#0078D4] shadow-sm" 
              : "text-white/90 hover:bg-white/15"
          )}
        >
          <Settings className={cn("w-4 h-4", location === "/settings" ? "text-[#0078D4]" : "text-white/90")} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
