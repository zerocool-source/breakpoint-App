import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Mic, Sparkles } from "lucide-react";

export function AICommand() {
  const [isListening, setIsListening] = useState(false);
  const [waveHeight, setWaveHeight] = useState<number[]>(Array(20).fill(10));

  // Simulate audio visualizer
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveHeight(prev => prev.map(() => Math.random() * (isListening ? 40 : 15) + 5));
    }, 100);
    return () => clearInterval(interval);
  }, [isListening]);

  return (
    <Card className="glass-card border-primary/20 bg-black/40 overflow-hidden relative group h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-600/5 pointer-events-none" />
      
      <CardContent className="p-6 flex flex-col items-center justify-center min-h-[250px] h-full relative z-10">
        {/* Animated Brain/Core */}
        <div className="relative w-32 h-32 mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border border-purple-500/30 animate-[spin_15s_linear_infinite_reverse]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              "w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 blur-md transition-all duration-500 flex items-center justify-center",
              isListening ? "scale-110 shadow-[0_0_50px_cyan]" : "scale-100 shadow-[0_0_20px_cyan]"
            )}>
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>
        </div>

        <h3 className="font-display text-xl font-bold text-center mb-2 text-glow">
          ACE PRIME
        </h3>
        <p className="text-center text-muted-foreground text-sm font-ui mb-6 max-w-[80%]">
          "Hello, I'm Ace Prime. All systems are currently optimal. How can I help you manage your pools today?"
        </p>

        {/* Audio Visualizer */}
        <div className="flex items-end justify-center gap-1 h-12 mb-4 w-full max-w-[200px]">
          {waveHeight.map((h, i) => (
            <div 
              key={i} 
              className="w-1 bg-primary/60 rounded-full transition-all duration-100"
              style={{ height: `${h}px`, opacity: Math.max(0.3, h/50) }}
            />
          ))}
        </div>

        <button 
          onClick={() => setIsListening(!isListening)}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-full font-ui text-sm tracking-widest uppercase transition-all duration-300 border border-white/10",
            isListening 
              ? "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(255,0,0,0.3)]" 
              : "bg-white/5 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          )}
        >
          <Mic className="w-4 h-4" />
          {isListening ? "Listening..." : "Talk to Ace Prime"}
        </button>
      </CardContent>
    </Card>
  );
}