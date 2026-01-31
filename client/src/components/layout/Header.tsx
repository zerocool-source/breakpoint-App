import { useState, useEffect } from "react";
import { Bell, Search, Calendar, User, LogOut, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useAiWidgets } from "@/contexts/AiWidgetsContext";

function DateDisplay() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
  const month = currentDate.toLocaleDateString('en-US', { month: 'short' });
  const day = currentDate.getDate();
  const time = currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div className="flex items-center gap-2 text-sm text-[#64748B]">
      <Calendar className="w-4 h-4 text-[#60A5FA]" />
      <span className="font-medium text-[#1E293B]">{dayOfWeek}, {month} {day}</span>
      <span className="text-[#E2E8F0]">|</span>
      <span className="text-[#64748B]">{time}</span>
    </div>
  );
}

export function Header() {
  const { user, logout, isLoggingOut } = useAuth();
  const [, setLocation] = useLocation();
  const { showMonitor, showHelper, showAll } = useAiWidgets();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const widgetsHidden = !showMonitor && !showHelper;

  return (
    <header className="h-16 border-b border-[#E2E8F0] bg-white sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input 
            type="text"
            placeholder="Search properties, alerts, customers..." 
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent transition-all"
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DateDisplay />
        
        <div className="h-6 w-px bg-[#E2E8F0]" />

        {widgetsHidden && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={showAll}
            className="relative text-[#0078D4] hover:text-[#0078D4] hover:bg-[#EFF6FF] rounded-lg w-9 h-9"
            title="Show Ace AI Widgets"
            data-testid="button-show-ace"
          >
            <Brain className="w-5 h-5" />
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-[#64748B] hover:text-[#0078D4] hover:bg-[#EFF6FF] rounded-lg w-9 h-9"
          data-testid="button-notifications"
        >
          <div className="absolute top-1 right-1 w-2 h-2 bg-[#FF8000] rounded-full" />
          <Bell className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-3 pl-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0078D4] flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            {user && (
              <span className="text-sm font-medium text-[#1E293B]" data-testid="text-username">
                {user.firstName || user.email}
              </span>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg w-9 h-9"
            title="Logout"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
