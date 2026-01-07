import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import BreakpointLogo from "@assets/ChatGPT_Image_Dec_9,_2025,_11_02_17_PM_1765350238464.png";

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}

interface NavSubItem {
  label: string;
  href: string;
  icon?: any;
}

interface NavItem {
  icon: any;
  label: string;
  href?: string;
  children?: NavSubItem[];
  badge?: string;
  disabled?: boolean;
}

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-600",
    "bg-green-600", 
    "bg-purple-600",
    "bg-orange-600",
    "bg-pink-600",
    "bg-cyan-600",
    "bg-indigo-600",
    "bg-teal-600",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
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
      <div className="flex items-center gap-2 px-2 py-1.5 text-slate-400 cursor-not-allowed text-sm">
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="w-3 h-3 border border-slate-300 rounded-sm bg-slate-50" />
        </div>
        <item.icon className="w-4 h-4 text-slate-300" />
        <span>{item.label}</span>
        {item.badge && (
          <span className="ml-auto px-1.5 py-0.5 text-[8px] font-medium rounded bg-slate-100 text-slate-500 uppercase">
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
          "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
          isActive 
            ? "bg-blue-600 text-white" 
            : "text-slate-700 hover:bg-slate-100"
        )}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          <div className={cn(
            "w-3 h-3 border rounded-sm",
            isActive ? "border-white/50 bg-white/20" : "border-slate-400 bg-white"
          )} />
        </div>
        <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-blue-600")} />
        <span>{item.label}</span>
        {item.badge && (
          <span className={cn(
            "ml-auto px-1.5 py-0.5 text-[8px] font-medium rounded uppercase",
            isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"
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
          "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors w-full text-left",
          hasActiveChild 
            ? "bg-blue-50 text-blue-700" 
            : "text-slate-700 hover:bg-slate-100"
        )}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          <div className={cn(
            "w-3 h-3 border rounded-sm",
            hasActiveChild ? "border-blue-400 bg-blue-100" : "border-slate-400 bg-white"
          )} />
        </div>
        <item.icon className={cn("w-4 h-4", hasActiveChild ? "text-blue-600" : "text-blue-600")} />
        <span className="flex-1">{item.label}</span>
        <ChevronRight className={cn(
          "w-3 h-3 transition-transform text-slate-400",
          isExpanded && "rotate-90"
        )} />
      </button>
      
      {isExpanded && item.children && (
        <div className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
          {item.children.map((child) => {
            const isChildActive = location === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors",
                  isChildActive 
                    ? "bg-blue-600 text-white" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <ChevronRight className={cn("w-3 h-3", isChildActive ? "text-white/70" : "text-slate-400")} />
                <span>{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TechniciansList({ technicians }: { technicians: Technician[] }) {
  const activeTechs = technicians.filter(t => t.active);
  
  if (activeTechs.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-slate-400 italic">
        No technicians synced
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        Technicians
      </div>
      {activeTechs.map((tech) => {
        const fullName = `${tech.firstName} ${tech.lastName}`.trim();
        const initials = getInitials(tech.firstName, tech.lastName);
        const avatarColor = getAvatarColor(fullName);
        
        return (
          <div
            key={tech.id}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded mx-1 cursor-pointer"
          >
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold",
              avatarColor
            )}>
              {initials}
            </div>
            <span className="font-medium text-blue-600">{fullName}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["properties", "chats"]));

  const { data: techniciansData } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians/stored"],
  });

  const technicians = techniciansData?.technicians || [];

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
        { label: "Repairs", href: "/property-repairs" },
        { label: "Visits", href: "/visits" },
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
      ]
    },
    { 
      key: "estimates",
      icon: FileText, 
      label: "Estimates", 
      href: "/estimates"
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
      key: "vendors",
      icon: Truck, 
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
    <aside className="w-56 h-screen bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-1">
          <img 
            src={BreakpointLogo} 
            alt="Breakpoint Intelligence" 
            className="h-32 w-auto object-contain"
          />
          <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded-full uppercase tracking-wider">
            Beta
          </span>
        </div>
      </div>
      
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.key}
            item={item}
            isExpanded={expandedItems.has(item.key)}
            onToggle={() => toggleExpand(item.key)}
            location={location}
          />
        ))}
        
        {technicians.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <TechniciansList technicians={technicians} />
          </div>
        )}
      </nav>

      <div className="p-2 border-t border-slate-200 bg-white">
        <Link 
          href="/customers"
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors mb-1",
            location === "/customers" 
              ? "bg-blue-600 text-white" 
              : "text-slate-700 hover:bg-slate-100"
          )}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <div className={cn(
              "w-3 h-3 border rounded-sm",
              location === "/customers" ? "border-white/50 bg-white/20" : "border-slate-400 bg-white"
            )} />
          </div>
          <Users className={cn("w-4 h-4", location === "/customers" ? "text-white" : "text-blue-600")} />
          <span>Customers</span>
        </Link>
        <Link 
          href="/settings"
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
            location === "/settings" 
              ? "bg-blue-600 text-white" 
              : "text-slate-700 hover:bg-slate-100"
          )}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <div className={cn(
              "w-3 h-3 border rounded-sm",
              location === "/settings" ? "border-white/50 bg-white/20" : "border-slate-400 bg-white"
            )} />
          </div>
          <Settings className={cn("w-4 h-4", location === "/settings" ? "text-white" : "text-blue-600")} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
