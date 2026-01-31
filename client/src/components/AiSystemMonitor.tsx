import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, AlertTriangle, CheckCircle, Info, Zap, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AiThought {
  thought: string;
  type: "info" | "warning" | "success" | "action";
  priority: number;
}

interface AiInsightsResponse {
  thoughts: AiThought[];
  stats: {
    pendingEstimates: number;
    activeAlerts: number;
    todayTechOps: number;
  };
  generatedAt: string;
}

const typeConfig = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  success: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  action: { icon: Zap, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
};

export function AiSystemMonitor() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentThoughtIndex, setCurrentThoughtIndex] = useState(0);

  const { data, isLoading, refetch, isFetching } = useQuery<AiInsightsResponse>({
    queryKey: ["/api/ai/insights"],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const thoughts = data?.thoughts || [];
  const stats = data?.stats || { pendingEstimates: 0, activeAlerts: 0, todayTechOps: 0 };

  useEffect(() => {
    if (thoughts.length > 1) {
      const interval = setInterval(() => {
        setCurrentThoughtIndex((prev) => (prev + 1) % thoughts.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [thoughts.length]);

  const currentThought = thoughts[currentThoughtIndex];
  const config = currentThought ? typeConfig[currentThought.type] || typeConfig.info : typeConfig.info;
  const IconComponent = config.icon;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
      <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-xl shadow-cyan-500/10 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-cyan-500/20 hover:from-slate-700 hover:to-slate-800 transition-colors"
          data-testid="ai-monitor-toggle"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="w-5 h-5 text-cyan-400" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            </div>
            <span className="font-semibold text-cyan-400 text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>
              ACE SYSTEM MONITOR
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
              className="h-6 w-6 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              disabled={isFetching}
              data-testid="ai-monitor-refresh"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-cyan-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-cyan-400" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-800/50 rounded p-2">
                <div className="text-cyan-400 font-bold text-lg">{stats.todayTechOps}</div>
                <div className="text-slate-400">Today's Ops</div>
              </div>
              <div className="bg-slate-800/50 rounded p-2">
                <div className={`font-bold text-lg ${stats.activeAlerts > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {stats.activeAlerts}
                </div>
                <div className="text-slate-400">Alerts</div>
              </div>
              <div className="bg-slate-800/50 rounded p-2">
                <div className={`font-bold text-lg ${stats.pendingEstimates > 0 ? 'text-purple-400' : 'text-slate-400'}`}>
                  {stats.pendingEstimates}
                </div>
                <div className="text-slate-400">Pending</div>
              </div>
            </div>

            <div className="border-t border-cyan-500/20 pt-3">
              <div className="text-xs text-cyan-400/60 mb-2 flex items-center gap-1">
                <Brain className="w-3 h-3" />
                ACE THOUGHTS
                {thoughts.length > 1 && (
                  <span className="ml-auto text-slate-500">
                    {currentThoughtIndex + 1}/{thoughts.length}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center gap-2 text-cyan-400/60 text-sm py-2">
                  <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                  Analyzing systems...
                </div>
              ) : currentThought ? (
                <div
                  className={`${config.bg} ${config.border} border rounded-lg p-3 transition-all duration-500`}
                  data-testid="ai-thought-card"
                >
                  <div className="flex items-start gap-2">
                    <IconComponent className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {currentThought.thought}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400 py-2">
                  All systems operational.
                </div>
              )}

              {thoughts.length > 1 && (
                <div className="flex justify-center gap-1 mt-2">
                  {thoughts.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentThoughtIndex(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === currentThoughtIndex 
                          ? 'bg-cyan-400 w-3' 
                          : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                      data-testid={`thought-indicator-${idx}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 text-right">
              Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : 'just now'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
