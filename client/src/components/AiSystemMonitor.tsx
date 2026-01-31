import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, AlertTriangle, CheckCircle, Info, Zap, ChevronDown, ChevronUp, RefreshCw, X } from "lucide-react";

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
  info: { icon: Info, color: "text-[#0078D4]", bg: "bg-[#0078D4]/10", border: "border-[#0078D4]/30" },
  warning: { icon: AlertTriangle, color: "text-[#F97316]", bg: "bg-[#F97316]/10", border: "border-[#F97316]/30" },
  success: { icon: CheckCircle, color: "text-[#22C55E]", bg: "bg-[#22C55E]/10", border: "border-[#22C55E]/30" },
  action: { icon: Zap, color: "text-[#F97316]", bg: "bg-[#F97316]/10", border: "border-[#F97316]/30" },
};

export function AiSystemMonitor() {
  const [isVisible, setIsVisible] = useState(true);
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

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-20 right-4 z-50 w-10 h-10 rounded-full bg-[#0078D4] shadow-lg hover:bg-[#0078D4]/90 transition-all flex items-center justify-center"
        data-testid="ai-monitor-show"
      >
        <Brain className="w-5 h-5 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed top-20 right-4 z-50 w-72 max-w-[calc(100vw-2rem)]">
      <div className="bg-white border border-[#0078D4]/20 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#0078D4] to-[#60A5FA]">
          <div 
            className="flex items-center gap-2 cursor-pointer flex-1"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="ai-monitor-toggle"
          >
            <div className="relative">
              <Brain className="w-4 h-4 text-white" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#F97316] rounded-full animate-pulse" />
            </div>
            <span className="font-semibold text-white text-xs">
              ACE SYSTEM MONITOR
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
              className="w-6 h-6 text-white/80 hover:text-white hover:bg-white/10 rounded flex items-center justify-center"
              disabled={isFetching}
              data-testid="ai-monitor-refresh"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-6 h-6 text-white/80 hover:text-white hover:bg-white/10 rounded flex items-center justify-center"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="w-6 h-6 text-white/80 hover:text-white hover:bg-white/10 rounded flex items-center justify-center"
              data-testid="ai-monitor-close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#F8FAFC] rounded-lg p-2 border border-[#E2E8F0]">
                <div className="text-[#0078D4] font-bold text-base">{stats.todayTechOps}</div>
                <div className="text-[#64748B] text-[10px]">Today's Ops</div>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-2 border border-[#E2E8F0]">
                <div className={`font-bold text-base ${stats.activeAlerts > 0 ? 'text-[#F97316]' : 'text-[#22C55E]'}`}>
                  {stats.activeAlerts}
                </div>
                <div className="text-[#64748B] text-[10px]">Alerts</div>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-2 border border-[#E2E8F0]">
                <div className={`font-bold text-base ${stats.pendingEstimates > 0 ? 'text-[#F97316]' : 'text-[#64748B]'}`}>
                  {stats.pendingEstimates}
                </div>
                <div className="text-[#64748B] text-[10px]">Pending</div>
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] pt-3">
              <div className="text-[10px] text-[#0078D4] mb-2 flex items-center gap-1 font-medium uppercase tracking-wide">
                <Brain className="w-3 h-3" />
                Ace Thoughts
                {thoughts.length > 1 && (
                  <span className="ml-auto text-[#64748B] font-normal">
                    {currentThoughtIndex + 1}/{thoughts.length}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center gap-2 text-[#64748B] text-xs py-2">
                  <div className="w-3 h-3 border-2 border-[#0078D4]/30 border-t-[#0078D4] rounded-full animate-spin" />
                  Analyzing systems...
                </div>
              ) : currentThought ? (
                <div
                  className={`${config.bg} ${config.border} border rounded-lg p-2.5 transition-all duration-500`}
                  data-testid="ai-thought-card"
                >
                  <div className="flex items-start gap-2">
                    <IconComponent className={`w-3.5 h-3.5 ${config.color} flex-shrink-0 mt-0.5`} />
                    <p className="text-xs text-[#1E293B] leading-relaxed">
                      {currentThought.thought}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#64748B] py-2">
                  All systems operational.
                </div>
              )}

              {thoughts.length > 1 && (
                <div className="flex justify-center gap-1 mt-2">
                  {thoughts.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentThoughtIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentThoughtIndex 
                          ? 'bg-[#0078D4] w-3' 
                          : 'bg-[#E2E8F0] w-1.5 hover:bg-[#CBD5E1]'
                      }`}
                      data-testid={`thought-indicator-${idx}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="text-[9px] text-[#94A3B8] text-right">
              Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : 'just now'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
