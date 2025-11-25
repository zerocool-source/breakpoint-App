import { Bell, Mic, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="h-16 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8">
      <div className="flex items-center gap-4 w-1/3">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Ask Gemini anything about your pools..." 
            className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-full font-ui"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors rounded-full w-10 h-10"
        >
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]" />
          <Bell className="w-5 h-5" />
        </Button>
        
        <div className="h-8 w-[1px] bg-white/10 mx-2" />
        
        <Button className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-white rounded-full shadow-[0_0_15px_rgba(0,255,255,0.3)] border-0 gap-2 font-ui tracking-wide">
          <Mic className="w-4 h-4" />
          VOICE COMMAND
        </Button>
      </div>
    </header>
  );
}