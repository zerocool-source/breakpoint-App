import { useState, useRef, useEffect } from "react";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Calendar, 
  BarChart3, 
  Receipt, 
  MessageSquare, 
  Truck, 
  Zap,
  Settings,
  LocateFixed,
  Network,
  Wrench,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import BLogo from "@/assets/b-logo.png";

interface NavSubItem {
  label: string;
  href: string;
}

interface NavItem {
  icon: any;
  label: string;
  href?: string;
  children?: NavSubItem[];
}

const navItems: NavItem[] = [
  { 
    icon: LayoutDashboard, 
    label: "Overview", 
    href: "/"
  },
  { 
    icon: Building2, 
    label: "Customers", 
    children: [
      { label: "All Customers", href: "/customers" },
      { label: "Visits", href: "/visits" },
    ]
  },
  { 
    icon: LocateFixed, 
    label: "Operations Hub", 
    children: [
      { label: "Tech Ops Alerts", href: "/tech-ops" },
      { label: "Repairs", href: "/repairs" },
      { label: "Chemicals", href: "/chemicals" },
      { label: "Service", href: "/service" },
    ]
  },
  { 
    icon: Wrench, 
    label: "Repair Queue", 
    href: "/repair-queue"
  },
  { 
    icon: Users, 
    label: "Technicians", 
    children: [
      { label: "Repair Tech", href: "/tech-repairs" },
      { label: "Service Techs", href: "/tech-services" },
      { label: "Supervisors", href: "/supervisors" },
    ]
  },
  { 
    icon: Network, 
    label: "Supervisor Teams", 
    href: "/supervisor-management"
  },
  { 
    icon: Calendar, 
    label: "Scheduling", 
    children: [
      { label: "Calendar", href: "/calendar" },
      { label: "Route History", href: "/route-history" },
    ]
  },
  { 
    icon: BarChart3, 
    label: "Reports", 
    href: "/reports"
  },
  { 
    icon: Receipt, 
    label: "Billing", 
    children: [
      { label: "All Estimates", href: "/estimates" },
      { label: "History Log", href: "/estimate-history" },
      { label: "Invoices", href: "/invoices" },
    ]
  },
  { 
    icon: MessageSquare, 
    label: "Chats Hub", 
    children: [
      { label: "Channels", href: "/channels" },
    ]
  },
  { 
    icon: Truck, 
    label: "Fleet", 
    children: [
      { label: "Fleet Dashboard", href: "/fleet" },
      { label: "Truck Inventory", href: "/fleet/inventory" },
    ]
  },
  { 
    icon: Zap, 
    label: "Automations", 
    href: "/automations"
  },
];

function NavIconItem({ 
  item, 
  location,
  onMouseEnter,
  onMouseLeave,
  isHovered,
}: { 
  item: NavItem; 
  location: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  isHovered: boolean;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href ? location === item.href : false;
  const hasActiveChild = item.children?.some(child => location === child.href);
  const isHighlighted = isActive || hasActiveChild;

  const content = (
    <div 
      className={cn(
        "relative w-full flex items-center justify-center py-3 cursor-pointer transition-all duration-200 border-l-[3px]",
        isHighlighted 
          ? "bg-white/15 border-l-orange-500" 
          : "hover:bg-white/10 border-l-transparent"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <item.icon className={cn(
        "w-5 h-5 transition-colors",
        isHighlighted ? "text-white" : "text-white/80"
      )} />
    </div>
  );

  if (!hasChildren && item.href) {
    return (
      <Link href={item.href}>
        {content}
      </Link>
    );
  }

  return content;
}

function FlyoutPanel({
  item,
  location,
  isVisible,
  onMouseEnter,
  onMouseLeave,
  position,
}: {
  item: NavItem;
  location: string;
  isVisible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  position: number;
}) {
  if (!isVisible) return null;

  const hasChildren = item.children && item.children.length > 0;

  return (
    <div 
      className="fixed z-[100] bg-white rounded-lg shadow-xl border border-slate-200 min-w-[200px] py-2 animate-in fade-in slide-in-from-left-2 duration-150"
      style={{ 
        left: "68px",
        top: `${position}px`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="px-4 py-2 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm">{item.label}</h3>
      </div>
      
      {hasChildren ? (
        <div className="py-1">
          {item.children!.map((child) => {
            const isChildActive = location === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block px-4 py-2 text-sm transition-colors",
                  isChildActive 
                    ? "bg-blue-50 text-blue-700 font-medium" 
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-2">
          <Link 
            href={item.href || "/"}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Go to {item.label}
          </Link>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleMouseEnter = (label: string, element: HTMLDivElement | null) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (element) {
      const rect = element.getBoundingClientRect();
      setFlyoutPosition(rect.top);
    }
    setHoveredItem(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 150);
  };

  const handleFlyoutMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleFlyoutMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <aside className="w-[68px] h-screen bg-[#1e3a5f] flex flex-col fixed left-0 top-0 z-50 shadow-lg">
        <div className="py-3 border-b border-white/10 flex items-center justify-center">
          <img 
            src={BLogo} 
            alt="Breakpoint" 
            className="w-11 h-11 object-contain"
          />
        </div>
        
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <div 
              key={item.label}
              ref={(el) => {
                if (el) itemRefs.current.set(item.label, el);
              }}
            >
              <NavIconItem
                item={item}
                location={location}
                isHovered={hoveredItem === item.label}
                onMouseEnter={() => handleMouseEnter(item.label, itemRefs.current.get(item.label) || null)}
                onMouseLeave={handleMouseLeave}
              />
            </div>
          ))}
        </nav>
        
        <div className="border-t border-white/10 py-2">
          <Link href="/settings">
            <div 
              className={cn(
                "w-full flex items-center justify-center py-3 cursor-pointer transition-all duration-200 border-l-[3px]",
                location === "/settings" 
                  ? "bg-white/15 border-l-orange-500" 
                  : "hover:bg-white/10 border-l-transparent"
              )}
            >
              <Settings className={cn(
                "w-5 h-5 transition-colors",
                location === "/settings" ? "text-white" : "text-white/80"
              )} />
            </div>
          </Link>
        </div>
      </aside>

      {navItems.map((item) => (
        <FlyoutPanel
          key={item.label}
          item={item}
          location={location}
          isVisible={hoveredItem === item.label}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
          position={flyoutPosition}
        />
      ))}
    </>
  );
}
