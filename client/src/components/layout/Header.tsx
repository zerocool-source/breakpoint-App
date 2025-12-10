import { useState, useEffect } from "react";
import { Bell, Mic, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function DateTicker() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const month = currentDate.toLocaleDateString('en-US', { month: 'long' });
  const day = currentDate.getDate();
  const year = currentDate.getFullYear();
  const time = currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-card border border-border rounded-full shadow-sm">
      <Calendar className="w-4 h-4 text-primary" />
      <div className="flex items-center gap-2 font-ui text-sm tracking-wide">
        <span className="text-primary font-bold">{dayOfWeek}</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-foreground font-semibold">{month} {day}, {year}</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-secondary font-medium">{time}</span>
      </div>
    </div>
  );
}

export function Header() {
  return (
    <header className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="h-10 bg-gradient-to-r from-primary/5 via-card to-primary/5 border-b border-border flex items-center justify-center overflow-hidden">
        <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
          <DateTicker />
          <span className="text-xs text-primary font-ui tracking-widest uppercase font-semibold">Breakpoint Intelligence</span>
          <DateTicker />
          <span className="text-xs text-secondary font-ui tracking-widest uppercase font-semibold">Pool Brain Connected</span>
          <DateTicker />
        </div>
      </div>
      <div className="h-16 flex items-center justify-between px-8">
        <div className="flex items-center gap-4 w-1/3">
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Ask Ace Prime anything about your pools..." 
              className="pl-10 bg-card border-border focus:border-primary focus:ring-primary/20 transition-all rounded-full font-ui shadow-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors rounded-full w-10 h-10"
        >
          <div className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <Bell className="w-5 h-5" />
        </Button>
        
        <div className="h-8 w-[1px] bg-border mx-2" />
        
        <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-full shadow-md border-0 gap-2 font-ui tracking-wide">
          <Mic className="w-4 h-4" />
          VOICE COMMAND
        </Button>
        </div>
      </div>
    </header>
  );
}