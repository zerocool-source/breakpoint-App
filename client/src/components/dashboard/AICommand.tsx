import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Mic, Sparkles, TrendingUp, AlertCircle, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";

interface EnrichedAlert {
  alertId: string;
  poolId: string;
  poolName: string;
  customerId: string | null;
  customerName: string;
  address: string;
  notes: string;
  message: string;
  type: string;
  severity: string;
  status: string;
  createdAt: string;
}

export function AICommand() {
  const [isListening, setIsListening] = useState(false);
  const [waveHeight, setWaveHeight] = useState<number[]>(Array(20).fill(10));
  const [aiInsight, setAiInsight] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch live alerts
  const { data: alertsData = { alerts: [] } } = useQuery({
    queryKey: ["enrichedAlerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/enriched");
      if (!res.ok) return { alerts: [] };
      return res.json();
    },
  });

  const alerts: EnrichedAlert[] = alertsData.alerts || [];
  const urgentCount = alerts.filter(a => a.severity.toUpperCase() === "URGENT" && a.status === "Active").length;
  const activeCount = alerts.filter(a => a.status === "Active").length;

  // AI Analysis mutation
  const analyzeAlertsMutation = useMutation({
    mutationFn: async () => {
      const alertSummary = alerts.slice(0, 3).map(a => `${a.poolName} (${a.customerName}): ${a.message}`).join("; ");
      const prompt = `Analyze these ${activeCount} active pool alerts and give a brief recommendation: ${alertSummary}`;
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, model: "ace-breakpoint", saveHistory: false }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to connect" }));
        throw new Error(error.error || "AI service unavailable");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      if (data.message) {
        setAiInsight(data.message);
      } else if (data.error) {
        setAiInsight("AI service temporarily unavailable.");
      } else {
        setAiInsight("Analysis complete.");
      }
      setIsAnalyzing(false);
    },
    onError: (error: Error) => {
      setIsAnalyzing(false);
      if (error.message.includes("connect")) {
        setAiInsight("Connect Ollama to enable AI analysis.");
      } else {
        setAiInsight("Unable to analyze alerts at this time.");
      }
    },
  });

  // Simulate audio visualizer
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveHeight(prev => prev.map(() => Math.random() * (isListening ? 40 : 15) + 5));
    }, 100);
    return () => clearInterval(interval);
  }, [isListening]);

  const handleAnalyzeAlerts = async () => {
    if (activeCount === 0) {
      setAiInsight("No active alerts to analyze.");
      return;
    }
    setIsAnalyzing(true);
    setIsListening(true);
    await analyzeAlertsMutation.mutateAsync();
    setTimeout(() => setIsListening(false), 1500);
  };

  return (
    <Card className="glass-card border-primary/20 bg-black/40 overflow-hidden relative group h-full flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-600/5 pointer-events-none" />
      
      <CardContent className="p-4 flex flex-col items-center justify-center flex-1 relative z-10">
        {/* Animated Brain/Core */}
        <div className="relative w-20 h-20 mb-3">
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border border-purple-500/30 animate-[spin_15s_linear_infinite_reverse]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              "w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 blur-md transition-all duration-500 flex items-center justify-center",
              isListening ? "scale-110 shadow-[0_0_50px_cyan]" : "scale-100 shadow-[0_0_20px_cyan]"
            )}>
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>
        </div>

        <h3 className="font-display text-lg font-bold text-center mb-2 text-glow" data-testid="text-ace-prime">
          ACE PRIME
        </h3>

        {/* Alert Status */}
        {activeCount > 0 && (
          <div className="mb-3 flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/30 rounded px-2 py-1 w-full justify-center">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span className="text-red-300 font-bold">{urgentCount} URGENT • {activeCount} Active</span>
          </div>
        )}

        {aiInsight ? (
          <p className="text-center text-xs font-ui mb-3 text-gray-200 line-clamp-2">
            {aiInsight}
          </p>
        ) : (
          <p className="text-center text-muted-foreground text-xs font-ui mb-3">
            "Analyzing your pool systems..."
          </p>
        )}

        {/* Audio Visualizer */}
        <div className="flex items-end justify-center gap-1 h-8 mb-3 w-full max-w-[150px]">
          {waveHeight.map((h, i) => (
            <div 
              key={`wave-${i}`}
              className="w-1 bg-primary/60 rounded-full transition-all duration-100"
              style={{ height: `${h * 0.6}px`, opacity: Math.max(0.3, h/50) }}
            />
          ))}
        </div>

        <button 
          onClick={handleAnalyzeAlerts}
          disabled={isAnalyzing}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full font-ui text-xs tracking-widest uppercase transition-all duration-300 border border-white/10",
            isListening 
              ? "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(255,0,0,0.3)]" 
              : "bg-white/5 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          )}
          data-testid="button-analyze-alerts"
        >
          <Mic className="w-3 h-3" />
          {isAnalyzing ? "Analyzing..." : "Analyze Alerts"}
        </button>

        {/* Link to Full Chat */}
        <Link href="/chat">
          <button 
            className="mt-2 flex items-center gap-2 px-3 py-1 rounded font-ui text-xs transition-all duration-300 text-cyan-400/70 hover:text-cyan-400 hover:bg-cyan-500/10"
            data-testid="button-open-chat"
          >
            <MessageSquare className="w-3 h-3" />
            Open Full Chat
          </button>
        </Link>
      </CardContent>
    </Card>
  );
}
