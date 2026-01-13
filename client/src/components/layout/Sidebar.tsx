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
import BreakpointLogo from "@assets/ChatGPT_Image_Dec_9,_2025,_11_02_17_PM_1765350238464.png";

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
  location 
}: { 
  item: NavItem; 
  isExpanded: boolean; 
  onToggle: () => void;
  location: string;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href ? location === item.href : false;
  const hasActiveChild = item.children?.some(child => location === child.href);

  if (item.disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 text-slate-400 cursor-not-allowed text-sm rounded-lg">
        <item.icon className="w-4 h-4" />
        <span>{item.label}</span>
        {item.badge && (
          <span className="ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-500">
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
            ? "bg-[#1E3A8A] text-white shadow-sm" 
            : "text-slate-700 hover:bg-[#EFF6FF] hover:text-[#1E3A8A]"
        )}
      >
        <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-[#1E3A8A]")} />
        <span>{item.label}</span>
        {item.badge && (
          <span className={cn(
            "ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full",
            isActive ? "bg-white/20 text-white" : "bg-[#F97316] text-white"
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
            ? "bg-[#EFF6FF] text-[#1E3A8A]" 
            : "text-slate-700 hover:bg-[#EFF6FF] hover:text-[#1E3A8A]"
        )}
      >
        <item.icon className={cn("w-4 h-4", hasActiveChild ? "text-[#1E3A8A]" : "text-[#1E3A8A]")} />
        <span className="flex-1">{item.label}</span>
        <ChevronRight className={cn(
          "w-4 h-4 transition-transform duration-200",
          isExpanded ? "rotate-90 text-[#1E3A8A]" : "text-slate-400"
        )} />
      </button>
      
      {isExpanded && item.children && (
        <div className="ml-4 mt-1 space-y-0.5 pl-4 border-l-2 border-slate-200">
          {item.children.map((child) => {
            const isChildActive = child.href ? location === child.href : false;
            const hasSubChildren = child.children && child.children.length > 0;
            const hasActiveSubChild = child.children?.some(sub => location === sub.href);
            
            if (hasSubChildren) {
              return (
                <div key={child.label}>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
                    hasActiveSubChild ? "text-[#1E3A8A]" : "text-slate-600"
                  )}>
                    <span>{child.label}</span>
                  </div>
                  <div className="ml-3 mt-0.5 space-y-0.5 pl-3 border-l border-slate-200">
                    {child.children!.map((subChild) => {
                      const isSubActive = location === subChild.href;
                      return (
                        <Link
                          key={subChild.href}
                          href={subChild.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                            isSubActive 
                              ? "bg-[#1E3A8A] text-white shadow-sm" 
                              : "text-slate-500 hover:bg-[#EFF6FF] hover:text-[#1E3A8A]"
                          )}
                        >
                          <span className="flex-1">{subChild.label}</span>
                          {subChild.badge !== undefined && subChild.badge > 0 && (
                            <span className={cn(
                              "px-1.5 py-0.5 text-[10px] font-semibold rounded-full min-w-[18px] text-center",
                              isSubActive ? "bg-white/20 text-white" : "bg-[#F97316] text-white"
                            )}>
                              {subChild.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }
            
            return (
              <Link
                key={child.href || child.label}
                href={child.href || "#"}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                  isChildActive 
                    ? "bg-[#1E3A8A] text-white shadow-sm" 
                    : "text-slate-600 hover:bg-[#EFF6FF] hover:text-[#1E3A8A]"
                )}
              >
                <span className="flex-1">{child.label}</span>
                {child.badge !== undefined && child.badge > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 text-[10px] font-semibold rounded-full min-w-[18px] text-center",
                    isChildActive ? "bg-white/20 text-white" : "bg-[#F97316] text-white"
                  )}>
                    {child.badge}
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

export function Sidebar() {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["properties", "chats", "operationsHub"]));

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

  const navItems: (NavItem & { key: string })[] = [
    { 
      key: "overview",
      icon: LayoutDashboard, 
      label: "Overview", 
      href: "/",
      badge: "Alpha",
      disabled: true
    },
    { 
      key: "properties",
      icon: Building2, 
      label: "Properties", 
      children: [
        { label: "Profiles", href: "/property-profiles" },
        { label: "Visits", href: "/visits" },
      ]
    },
    { 
      key: "operationsHub",
      icon: Hammer, 
      label: "Operations Hub", 
      children: [
        { label: "Tech Ops", href: "/tech-ops" },
        { label: "Repair Queue", href: "/repair-queue" },
        { label: "Supervisor", href: "/tech-supervisor" },
        { label: "Repair Foreman", href: "/tech-foreman" },
      ]
    },
    { 
      key: "technicians",
      icon: Users, 
      label: "Technicians", 
      children: [
        { label: "Repair Tech", href: "/tech-repairs" },
        { label: "Service Techs", href: "/tech-services" },
      ]
    },
    { 
      key: "scheduling",
      icon: Calendar, 
      label: "Scheduling", 
      href: "/scheduling"
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
      children: [
        { label: "Repairs", href: "/report-repairs" },
        { label: "Chemicals", href: "/report-chemicals" },
        { label: "Commissions", href: "/commissions" },
        { label: "Equipment Tracker", href: "/equipment" },
      ]
    },
    { 
      key: "estimates",
      icon: FileText, 
      label: "Estimates", 
      children: [
        { label: "All Estimates", href: "/estimates" },
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
      key: "vendors",
      icon: Package, 
      label: "Vendors", 
      children: [
        { label: "Invoice Vendors", href: "/invoice-vendors" },
        { label: "Email Hub", href: "/email-hub" },
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
    <aside className="w-60 h-screen bg-white border-r border-[#E2E8F0] flex flex-col fixed left-0 top-0 z-50 shadow-sm">
      <div className="p-4 border-b border-[#E2E8F0]">
        <div className="flex flex-col items-center gap-2">
          <img 
            src={BreakpointLogo} 
            alt="Breakpoint Intelligence" 
            className="h-24 w-auto object-contain"
          />
          <span className="px-3 py-1 text-[10px] font-semibold bg-[#F97316] text-white rounded-full uppercase tracking-wide">
            Beta
          </span>
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent transition-all"
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
          />
        ))}
      </nav>

      <div className="p-3 border-t border-[#E2E8F0]">
        <Link 
          href="/customers"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 mb-1",
            location === "/customers" 
              ? "bg-[#1E3A8A] text-white shadow-sm" 
              : "text-slate-700 hover:bg-[#EFF6FF] hover:text-[#1E3A8A]"
          )}
        >
          <Users className={cn("w-4 h-4", location === "/customers" ? "text-white" : "text-[#1E3A8A]")} />
          <span>Customers</span>
        </Link>
        <Link 
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            location === "/settings" 
              ? "bg-[#1E3A8A] text-white shadow-sm" 
              : "text-slate-700 hover:bg-[#EFF6FF] hover:text-[#1E3A8A]"
          )}
        >
          <Settings className={cn("w-4 h-4", location === "/settings" ? "text-white" : "text-[#1E3A8A]")} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
