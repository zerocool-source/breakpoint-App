import { useState, useEffect, createContext, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Sparkles, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContextInfo {
  title: string;
  description: string;
  tips?: string[];
  category?: string;
}

interface AiContextHelperContextType {
  setContext: (context: ContextInfo | null) => void;
  isVisible: boolean;
  toggleVisibility: () => void;
}

const AiContextHelperContext = createContext<AiContextHelperContextType | null>(null);

export function useAiContextHelper() {
  const context = useContext(AiContextHelperContext);
  if (!context) {
    return {
      setContext: () => {},
      isVisible: false,
      toggleVisibility: () => {},
    };
  }
  return context;
}

const defaultContexts: Record<string, ContextInfo> = {
  "pending-approvals": {
    title: "Pending Approvals",
    description: "These are estimates waiting for customer or manager approval. The total value shows potential revenue once approved.",
    tips: [
      "Follow up within 48 hours for better conversion",
      "High-value estimates may need manager review",
      "Consider bundling multiple small repairs"
    ],
    category: "Estimates"
  },
  "needs-scheduling": {
    title: "Needs Scheduling",
    description: "Approved jobs that need to be assigned to a technician and scheduled for completion.",
    tips: [
      "Prioritize by customer urgency and job value",
      "Group jobs by location for efficiency",
      "Check technician availability before scheduling"
    ],
    category: "Operations"
  },
  "ready-to-invoice": {
    title: "Ready to Invoice",
    description: "Completed work that's ready to be billed to the customer. These represent earned revenue awaiting collection.",
    tips: [
      "Invoice promptly to improve cash flow",
      "Verify all work is documented with photos",
      "Include detailed line items for transparency"
    ],
    category: "Billing"
  },
  "active-repairs": {
    title: "Active Repairs",
    description: "Service repairs currently in progress by technicians in the field.",
    tips: [
      "Monitor for parts delays or issues",
      "Check technician notes for updates",
      "Follow up on jobs taking longer than expected"
    ],
    category: "Operations"
  },
  "emergencies": {
    title: "Open Emergencies",
    description: "Urgent issues requiring immediate attention. These should be addressed before regular scheduled work.",
    tips: [
      "Critical emergencies need same-day response",
      "Document the emergency thoroughly",
      "Communicate timeline to customer"
    ],
    category: "Priority"
  },
  "estimate-pipeline": {
    title: "Estimate Pipeline",
    description: "Visual breakdown of all estimates by status, showing the flow from draft to invoiced.",
    tips: [
      "Healthy pipeline has balance across stages",
      "Watch for bottlenecks in any stage",
      "Review stuck estimates weekly"
    ],
    category: "Analytics"
  },
  "financial-summary": {
    title: "Financial Summary",
    description: "Overview of revenue at each pipeline stage. Helps track potential and realized income.",
    tips: [
      "Total value = potential if all jobs complete",
      "Focus on moving scheduled work to completion",
      "Track invoiced amounts for cash flow planning"
    ],
    category: "Finance"
  },
  "recent-activity": {
    title: "Recent Activity",
    description: "Latest actions taken on estimates and service repairs. Shows real-time workflow updates.",
    tips: [
      "Review daily for operational awareness",
      "Click items to see full details",
      "Watch for patterns in activity types"
    ],
    category: "Activity"
  },
  "urgent-items": {
    title: "Urgent Items",
    description: "High-priority items that need immediate attention to prevent delays or customer issues.",
    tips: [
      "Address these before regular tasks",
      "Delegate if you're overloaded",
      "Set reminders for follow-ups"
    ],
    category: "Priority"
  },
  "default": {
    title: "Ace AI Assistant",
    description: "I'm here to help you understand your pool service operations. Hover over or click any dashboard element to get detailed explanations and helpful tips.",
    tips: [
      "Hover over cards for context",
      "Click elements for detailed info",
      "I update insights every minute"
    ],
    category: "Help"
  }
};

export function AiContextHelperProvider({ children }: { children: React.ReactNode }) {
  const [currentContext, setCurrentContext] = useState<ContextInfo | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  return (
    <AiContextHelperContext.Provider 
      value={{ 
        setContext: setCurrentContext, 
        isVisible,
        toggleVisibility: () => setIsVisible(!isVisible)
      }}
    >
      {children}
    </AiContextHelperContext.Provider>
  );
}

export function AiContextHelper() {
  const [currentContext, setCurrentContext] = useState<ContextInfo>(defaultContexts.default);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastHoveredId, setLastHoveredId] = useState<string | null>(null);

  const getContextForTestId = (testId: string): ContextInfo | null => {
    if (testId.includes('pending-approval')) return defaultContexts["pending-approvals"];
    if (testId.includes('needs-scheduling')) return defaultContexts["needs-scheduling"];
    if (testId.includes('ready-to-invoice')) return defaultContexts["ready-to-invoice"];
    if (testId.includes('active-repairs')) return defaultContexts["active-repairs"];
    if (testId.includes('emergency')) return defaultContexts["emergencies"];
    if (testId.includes('activity')) return defaultContexts["recent-activity"];
    if (testId.includes('urgent')) return defaultContexts["urgent-items"];
    if (testId.includes('tech-ops')) return {
      title: "Tech Operations",
      description: "Field technician activity including service repairs, inspections, and maintenance work.",
      tips: ["Monitor daily for workload distribution", "Review completion rates", "Check for priority items"],
      category: "Operations"
    };
    if (testId.includes('estimate')) return defaultContexts["estimate-pipeline"];
    if (testId.includes('financial') || testId.includes('value')) return defaultContexts["financial-summary"];
    if (testId.includes('alert')) return {
      title: "Alerts",
      description: "System and customer alerts requiring attention. May include chemical imbalances, equipment issues, or customer requests.",
      tips: ["Address critical alerts first", "Document resolution steps", "Follow up with customers"],
      category: "Alerts"
    };
    if (testId.includes('customer')) return {
      title: "Customer Information",
      description: "Customer details including properties, contacts, and service history.",
      tips: ["Keep contact info updated", "Review service preferences", "Note communication preferences"],
      category: "Customers"
    };
    if (testId.includes('technician')) return {
      title: "Technician",
      description: "Field technician information including assignments, skills, and performance.",
      tips: ["Match skills to job requirements", "Balance workloads fairly", "Track certifications"],
      category: "Staff"
    };
    if (testId.includes('invoice')) return {
      title: "Invoicing",
      description: "Billing and payment tracking for completed work.",
      tips: ["Invoice within 24 hours of completion", "Include detailed line items", "Track payment status"],
      category: "Billing"
    };
    if (testId.includes('schedule') || testId.includes('calendar')) return {
      title: "Scheduling",
      description: "Job scheduling and route planning for technicians.",
      tips: ["Optimize routes for efficiency", "Consider travel time", "Leave buffer for emergencies"],
      category: "Operations"
    };
    return null;
  };

  useEffect(() => {
    const handleInteraction = (e: MouseEvent, isClick: boolean) => {
      const target = e.target as HTMLElement;
      const card = target.closest('[data-testid]');
      
      if (card) {
        const testId = card.getAttribute('data-testid');
        if (testId && (testId !== lastHoveredId || isClick)) {
          setLastHoveredId(testId);
          const context = getContextForTestId(testId);
          if (context) {
            setCurrentContext(context);
          }
        }
      }
    };

    const handleMouseOver = (e: MouseEvent) => handleInteraction(e, false);
    const handleClick = (e: MouseEvent) => handleInteraction(e, true);

    const handleMouseOut = (e: MouseEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!relatedTarget?.closest('[data-testid]')) {
        setLastHoveredId(null);
        setCurrentContext(defaultContexts.default);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick);
    };
  }, [lastHoveredId]);

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-4 z-40 rounded-full w-12 h-12 bg-gradient-to-r from-[#0078D4] to-[#60A5FA] shadow-lg hover:shadow-xl transition-all"
        data-testid="ai-context-helper-toggle"
      >
        <HelpCircle className="w-6 h-6 text-white" />
      </Button>
    );
  }

  return (
    <Card 
      className="fixed bottom-24 right-4 w-80 z-40 shadow-xl border-[#0078D4]/20 bg-white/95 backdrop-blur-sm"
      data-testid="ai-context-helper"
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-[#0078D4] to-[#60A5FA]">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-sm font-semibold text-[#1E293B]">
              {currentContext.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {currentContext.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0078D4]/10 text-[#0078D4]">
                {currentContext.category}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => setIsMinimized(true)}
            >
              <X className="w-3 h-3 text-[#64748B]" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-xs text-[#64748B] leading-relaxed mb-3">
          {currentContext.description}
        </p>
        
        {currentContext.tips && currentContext.tips.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#0078D4] uppercase tracking-wide">
              <Sparkles className="w-3 h-3" />
              Quick Tips
            </div>
            <ul className="space-y-1">
              {currentContext.tips.map((tip, index) => (
                <li 
                  key={index}
                  className="text-[11px] text-[#475569] flex items-start gap-2"
                >
                  <span className="text-[#60A5FA] mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
