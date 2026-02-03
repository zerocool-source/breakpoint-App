import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, X, HelpCircle } from "lucide-react";
import { useAiWidgets } from "@/contexts/AiWidgetsContext";

interface ContextInfo {
  title: string;
  description: string;
  tips?: string[];
  category?: string;
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
    title: "Ace Context Helper",
    description: "Hover over or click any dashboard card to get detailed explanations and helpful tips about that section.",
    tips: [
      "Hover over cards for context",
      "Click elements for detailed info",
      "Tips help you work more efficiently"
    ],
    category: "Help"
  }
};

export function AiContextHelper() {
  const { showHelper, toggleHelper } = useAiWidgets();
  const [currentContext, setCurrentContext] = useState<ContextInfo>(defaultContexts.default);
  const [isExpanded, setIsExpanded] = useState(true);

  const getContextForTestId = useCallback((testId: string): ContextInfo | null => {
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
    if (testId.includes('card-')) return {
      title: "Dashboard Card",
      description: "This card shows key metrics for your pool service operations. Click to see more details.",
      tips: ["Cards update in real-time", "Click for detailed view", "Watch trends over time"],
      category: "Dashboard"
    };
    return null;
  }, []);

  useEffect(() => {
    let lastTestId: string | null = null;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('[data-testid]');
      
      if (card) {
        const testId = card.getAttribute('data-testid');
        if (testId && testId !== lastTestId) {
          lastTestId = testId;
          const context = getContextForTestId(testId);
          if (context) {
            setCurrentContext(context);
          }
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!relatedTarget || !relatedTarget.closest('[data-testid]')) {
        lastTestId = null;
        setCurrentContext(defaultContexts.default);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('[data-testid]');
      
      if (card) {
        const testId = card.getAttribute('data-testid');
        if (testId) {
          const context = getContextForTestId(testId);
          if (context) {
            setCurrentContext(context);
          }
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [getContextForTestId]);

  if (!showHelper) {
    return null;
  }

  return (
    <Card 
      className="fixed top-[200px] right-4 w-72 z-40 shadow-lg border-[#F97316]/20 bg-white overflow-hidden"
      data-testid="ai-context-helper"
    >
      <CardHeader className="pb-0 pt-0 px-0">
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#F97316] to-[#FB923C]">
          <div 
            className="flex items-center gap-2 cursor-pointer flex-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <HelpCircle className="w-4 h-4 text-white" />
            <CardTitle className="text-xs font-semibold text-white">
              {currentContext.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {currentContext.category && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                {currentContext.category}
              </span>
            )}
            <button 
              className="w-6 h-6 text-white/80 hover:text-white hover:bg-white/10 rounded flex items-center justify-center"
              onClick={toggleHelper}
              data-testid="ai-helper-close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="px-3 pb-3 pt-2">
          <p className="text-xs text-[#64748B] leading-relaxed mb-2">
            {currentContext.description}
          </p>
          
          {currentContext.tips && currentContext.tips.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[9px] font-medium text-[#F97316] uppercase tracking-wide">
                <Sparkles className="w-2.5 h-2.5" />
                Quick Tips
              </div>
              <ul className="space-y-0.5">
                {currentContext.tips.map((tip, index) => (
                  <li 
                    key={index}
                    className="text-[10px] text-[#475569] flex items-start gap-1.5"
                  >
                    <span className="text-[#F97316] mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
