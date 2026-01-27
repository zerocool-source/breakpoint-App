import { 
  Activity, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  Receipt,
  Users,
  Wrench,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Bell,
  DollarSign,
  Loader2,
  Settings,
  XCircle,
  Send,
  UserX,
  ChevronRight,
  ChevronLeft,
  Droplets
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface OpenEmergency {
  id: string;
  propertyName: string;
  submittedByName: string;
  submitterRole: string;
  priority: string;
  description: string;
  createdAt: string;
}

interface InactiveTechnician {
  id: string;
  name: string;
  role: string;
  expectedStartTime: string;
  minutesLate: number;
}

interface DashboardData {
  metrics: {
    estimates: {
      draft: number;
      pendingApproval: number;
      approved: number;
      scheduled: number;
      completed: number;
      readyToInvoice: number;
      invoiced: number;
      declined: number;
      total: number;
    };
    invoices: {
      unpaid: number;
      unpaidValue: number;
      paid: number;
      total: number;
    };
    values: {
      total: number;
      pendingApproval: number;
      readyToInvoice: number;
      scheduled: number;
    };
    serviceRepairs: {
      pending: number;
      inProgress: number;
      total: number;
    };
    technicians: {
      repairTechs: number;
      repairForemen: number;
      supervisors: number;
      total: number;
      inactive: InactiveTechnician[];
      repairTechWorkload: Array<{
        id: string;
        name: string;
        jobCount: number;
      }>;
    };
    alerts: {
      urgent: number;
      active: number;
      total: number;
    };
    emergencies: {
      open: number;
      pendingReview: number;
      inProgress: number;
      total: number;
      recentOpen: OpenEmergency[];
    };
  };
  recentActivity: Array<{
    type: string;
    id: string;
    title: string;
    property: string;
    status: string;
    amount: number;
    timestamp: string;
  }>;
  urgentItems: Array<{
    type: string;
    id: string;
    title: string;
    description: string;
    severity: string;
    property: string;
  }>;
  summary: {
    needsScheduling: number;
    needsInvoicing: number;
    pendingApprovals: number;
    activeRepairs: number;
  };
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  
  // Persist threshold time in localStorage
  const [thresholdTime, setThresholdTime] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('inactive_tech_threshold') || "08:00";
    }
    return "08:00";
  });
  
  const saveThresholdTime = (time: string) => {
    setThresholdTime(time);
    localStorage.setItem('inactive_tech_threshold', time);
  };

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard/overview"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/overview");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/alerts/sync", { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync alerts");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/overview"] });
      toast({
        title: "Sync Complete",
        description: data.message || `Synced ${data.syncedCount} alerts from Pool Brain`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync alerts",
        variant: "destructive",
      });
    },
  });

  const metrics = dashboardData?.metrics;
  const summary = dashboardData?.summary;
  const recentActivity = dashboardData?.recentActivity || [];
  const urgentItems = dashboardData?.urgentItems || [];
  const chemicalOrdersByProperty = dashboardData?.chemicalOrdersByProperty || [];
  const coverages = dashboardData?.coverages || [];
  
  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Emergency & Alerts Status filter state
  const [selectedStatusCategory, setSelectedStatusCategory] = useState<'all' | 'emergencies' | 'alerts' | 'issues'>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      pending_approval: "bg-[#FF8000]1A text-[#D35400]",
      approved: "bg-[#22D69A]1A text-[#22D69A]",
      scheduled: "bg-[#0078D4]1A text-[#0078D4]",
      completed: "bg-[#0078D41A] text-sky-700",
      ready_to_invoice: "bg-[#17BEBB]1A text-[#0D9488]",
      invoiced: "bg-[#22D69A]1A text-[#22D69A]",
      pending: "bg-[#FF8000]1A text-[#D35400]",
      open: "bg-[#0078D4]1A text-[#0078D4]",
      in_progress: "bg-[#0078D41A] text-sky-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-[#0078D4]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1E293B]">Overview</h1>
            <p className="text-[#64748B] text-sm">Real-time business intelligence dashboard</p>
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2 bg-[#0078D4] hover:bg-[#0078D4]/90"
            data-testid="button-sync-poolbrain"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? "Syncing..." : "Sync Pool Brain"}
          </Button>
        </div>

        {/* Top Metrics Cards - 6 cards in a row */}
        <div className="grid grid-cols-6 gap-4">
          {/* Estimates Total */}
          <Card 
            className="shadow-sm cursor-pointer hover:shadow-md hover:border-blue-400 transition-all bg-white"
            onClick={() => navigate("/estimates")}
            data-testid="card-estimates-total"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-100">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{metrics?.estimates.total || 0}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Estimates</p>
              <div className="h-1.5 mt-2 rounded-full bg-blue-100 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </CardContent>
          </Card>

          {/* Sent for Approval */}
          <Card 
            className="shadow-sm cursor-pointer hover:shadow-md hover:border-orange-400 transition-all bg-white"
            onClick={() => navigate("/estimates")}
            data-testid="card-pending-approvals"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Send className="w-5 h-5 text-orange-700" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{metrics?.estimates.pendingApproval || 0}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Sent for Approval</p>
              <div className="h-1.5 mt-2 rounded-full bg-orange-100 overflow-hidden">
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all" 
                  style={{ width: `${metrics?.estimates.total ? ((metrics?.estimates.pendingApproval || 0) / metrics?.estimates.total) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          {/* Needs Scheduling */}
          <Card 
            className="shadow-sm cursor-pointer hover:shadow-md hover:border-green-400 transition-all bg-white"
            onClick={() => navigate("/estimates")}
            data-testid="card-needs-scheduling"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-100">
                  <Calendar className="w-5 h-5 text-green-700" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{summary?.needsScheduling || 0}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Needs Scheduling</p>
              <div className="h-1.5 mt-2 rounded-full bg-green-100 overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all" 
                  style={{ width: `${metrics?.estimates.total ? ((summary?.needsScheduling || 0) / metrics?.estimates.total) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          {/* Ready to Invoice */}
          <Card 
            className="shadow-sm cursor-pointer hover:shadow-md hover:border-teal-400 transition-all bg-white"
            onClick={() => navigate("/estimates")}
            data-testid="card-ready-to-invoice"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-teal-100">
                  <Receipt className="w-5 h-5 text-teal-700" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{metrics?.estimates.readyToInvoice || 0}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Ready to Invoice</p>
              <div className="h-1.5 mt-2 rounded-full bg-teal-100 overflow-hidden">
                <div 
                  className="h-full bg-teal-500 rounded-full transition-all" 
                  style={{ width: `${metrics?.estimates.total ? ((metrics?.estimates.readyToInvoice || 0) / metrics?.estimates.total) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Unpaid */}
          <Card 
            className="shadow-sm cursor-pointer hover:shadow-md hover:border-amber-400 transition-all bg-white"
            onClick={() => navigate("/invoices")}
            data-testid="card-invoices-unpaid"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-amber-100">
                  <DollarSign className="w-5 h-5 text-amber-700" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{metrics?.invoices?.unpaid || 0}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Invoices Unpaid</p>
              <div className="h-1.5 mt-2 rounded-full bg-amber-100 overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all" 
                  style={{ width: `${metrics?.invoices?.total ? ((metrics?.invoices?.unpaid || 0) / metrics?.invoices?.total) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          {/* Declined */}
          <Card 
            className="shadow-sm cursor-pointer hover:shadow-md hover:border-red-400 transition-all bg-white"
            onClick={() => navigate("/estimates")}
            data-testid="card-declined"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-red-100">
                  <XCircle className="w-5 h-5 text-red-700" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{metrics?.estimates.declined || 0}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Declined</p>
              <div className="h-1.5 mt-2 rounded-full bg-red-100 overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all" 
                  style={{ width: `${metrics?.estimates.total ? ((metrics?.estimates.declined || 0) / metrics?.estimates.total) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency & Alerts Status */}
        <Card className="shadow-sm bg-white" data-testid="card-emergency-alerts-status">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Emergency & Alerts Status
                </CardTitle>
                <CardDescription>Active issues requiring attention</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/emergencies")} className="text-red-600 hover:text-red-700">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const emergencyCount = metrics?.emergencies?.open ?? 0;
              const alertCount = metrics?.alerts?.active ?? 0;
              const issueCount = metrics?.reportedIssues?.count ?? 0;
              const total = emergencyCount + alertCount + issueCount;
              
              const emergencyPct = total > 0 ? (emergencyCount / total) * 100 : 0;
              const alertPct = total > 0 ? (alertCount / total) * 100 : 0;
              const issuePct = total > 0 ? (issueCount / total) * 100 : 0;
              
              // Sample data for demonstration with reportedBy info
              const sampleEmergencies = [
                { id: 'se1', propertyName: 'Sunset Hills HOA', description: 'Major pump motor failure', reportedBy: 'Mike Johnson', reporterRole: 'Service Tech', priority: 'critical', timeAgo: '14 days', type: 'emergency' },
                { id: 'se2', propertyName: 'Desert Springs Resort', description: 'Heater exchanger leaking', reportedBy: 'Sarah Williams', reporterRole: 'Repair Tech', priority: 'high', timeAgo: '13 days', type: 'emergency' },
                { id: 'se3', propertyName: 'Palm Gardens Community', description: 'Control panel error codes', reportedBy: 'James Wilson', reporterRole: 'Supervisor', priority: 'high', timeAgo: '12 days', type: 'emergency' },
                { id: 'se4', propertyName: 'Lakewood Country Club', description: 'Filter system completely failed', reportedBy: 'Jorge Martinez', reporterRole: 'Repair Tech', priority: 'critical', timeAgo: '3 days', type: 'emergency' },
              ];
              
              const sampleAlerts = [
                { id: 'sa1', propertyName: 'Ocean View Resort', description: 'Chemical levels out of range', reportedBy: 'System Auto-Alert', reporterRole: '', timeAgo: '2 hours ago', type: 'alert' },
                { id: 'sa2', propertyName: 'Vista Grande HOA', description: 'Pump pressure high', reportedBy: 'System Auto-Alert', reporterRole: '', timeAgo: '5 hours ago', type: 'alert' },
                { id: 'sa3', propertyName: 'Cypress Creek HOA', description: 'Scheduled maintenance due', reportedBy: 'System Auto-Alert', reporterRole: '', timeAgo: '1 day ago', type: 'alert' },
              ];
              
              const sampleIssues = [
                { id: 'si1', propertyName: 'Marina Bay Club', description: 'Customer reported cloudy water', reportedBy: 'John Smith', reporterRole: 'Customer', status: 'Pending review', timeAgo: '1 day ago', type: 'issue' },
                { id: 'si2', propertyName: 'Sunset Marina', description: 'Tile damage reported', reportedBy: 'Jane Doe', reporterRole: 'Customer', status: 'Pending review', timeAgo: '3 days ago', type: 'issue' },
              ];
              
              // Use real data if available, otherwise show sample data
              const realEmergencyItems = metrics?.emergencies?.recentOpen || [];
              const realAlertItems = metrics?.alerts?.recentActive || [];
              const realIssueItems = metrics?.reportedIssues?.items || [];
              
              const emergencyItems = realEmergencyItems.length > 0 
                ? realEmergencyItems.map((e: any) => ({ ...e, type: 'emergency', timeAgo: null }))
                : sampleEmergencies;
              const alertItems = realAlertItems.length > 0 
                ? realAlertItems.map((a: any) => ({ ...a, type: 'alert', timeAgo: null }))
                : sampleAlerts;
              const issueItems = realIssueItems.length > 0 
                ? realIssueItems.map((i: any) => ({ ...i, type: 'issue', timeAgo: null }))
                : sampleIssues;
              
              const getFilteredItems = () => {
                if (selectedStatusCategory === 'emergencies') return emergencyItems;
                if (selectedStatusCategory === 'alerts') return alertItems;
                if (selectedStatusCategory === 'issues') return issueItems;
                return [
                  ...emergencyItems.slice(0, 2),
                  ...alertItems.slice(0, 2),
                  ...issueItems.slice(0, 2),
                ];
              };
              
              const filteredItems = getFilteredItems();
              
              return (
                <div className="flex gap-6">
                  {/* Left side: Donut chart and legend */}
                  <div className="w-1/2 flex flex-col items-center">
                    {/* Donut Chart - Only Emergencies + Reported Issues */}
                    {(() => {
                      const size = 160;
                      const strokeWidth = 24;
                      const radius = (size - strokeWidth) / 2;
                      const circumference = 2 * Math.PI * radius;
                      
                      // Total for donut is only Emergencies + Issues (not Alerts)
                      const donutTotal = emergencyCount + issueCount;
                      
                      // Calculate segment lengths based on donut total
                      const emergencyLength = donutTotal > 0 ? (emergencyCount / donutTotal) * circumference : 0;
                      const issueLength = donutTotal > 0 ? (issueCount / donutTotal) * circumference : 0;
                      
                      // Calculate offsets (cumulative)
                      const emergencyOffset = 0;
                      const issueOffset = emergencyLength;
                      
                      // Center text based on selection (only emergencies/issues, not alerts)
                      const centerLabel = selectedStatusCategory === 'emergencies' ? 'Emergencies' :
                                         selectedStatusCategory === 'issues' ? 'Reported Issues' : 'Total';
                      const centerCount = selectedStatusCategory === 'emergencies' ? emergencyCount :
                                         selectedStatusCategory === 'issues' ? issueCount : donutTotal;
                      
                      return (
                        <div className="relative mb-4">
                          <svg width={size} height={size} className="transform -rotate-90">
                            {/* Background circle */}
                            <circle
                              cx={size / 2}
                              cy={size / 2}
                              r={radius}
                              fill="none"
                              stroke="#e2e8f0"
                              strokeWidth={strokeWidth}
                            />
                            {/* Issues segment (blue) */}
                            {issueLength > 0 && (
                              <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={selectedStatusCategory === 'issues' ? '#2563eb' : '#3b82f6'}
                                strokeWidth={selectedStatusCategory === 'issues' ? strokeWidth + 4 : strokeWidth}
                                strokeDasharray={`${issueLength} ${circumference - issueLength}`}
                                strokeDashoffset={-issueOffset}
                                className="cursor-pointer transition-all duration-200"
                                onClick={() => setSelectedStatusCategory(selectedStatusCategory === 'issues' ? 'all' : 'issues')}
                              />
                            )}
                            {/* Emergencies segment (red) */}
                            {emergencyLength > 0 && (
                              <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={selectedStatusCategory === 'emergencies' ? '#dc2626' : '#ef4444'}
                                strokeWidth={selectedStatusCategory === 'emergencies' ? strokeWidth + 4 : strokeWidth}
                                strokeDasharray={`${emergencyLength} ${circumference - emergencyLength}`}
                                strokeDashoffset={-emergencyOffset}
                                className="cursor-pointer transition-all duration-200"
                                onClick={() => setSelectedStatusCategory(selectedStatusCategory === 'emergencies' ? 'all' : 'emergencies')}
                              />
                            )}
                          </svg>
                          {/* Center text */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-slate-800">{centerCount.toLocaleString()}</span>
                            <span className="text-[10px] font-medium text-slate-500">{centerLabel}</span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Legend - Only Emergencies + Issues */}
                    <div className="space-y-2 w-full">
                      <button
                        onClick={() => setSelectedStatusCategory(selectedStatusCategory === 'emergencies' ? 'all' : 'emergencies')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                          selectedStatusCategory === 'emergencies' 
                            ? 'bg-red-50 border border-red-200' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-sm font-medium text-slate-700">Emergencies</span>
                        </div>
                        <span className="text-sm font-bold text-red-600">{emergencyCount}</span>
                      </button>
                      
                      <button
                        onClick={() => setSelectedStatusCategory(selectedStatusCategory === 'issues' ? 'all' : 'issues')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                          selectedStatusCategory === 'issues' 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-sm font-medium text-slate-700">Reported Issues</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600">{issueCount}</span>
                      </button>
                    </div>
                    
                    {/* Separate System Alerts metric */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedStatusCategory(selectedStatusCategory === 'alerts' ? 'all' : 'alerts')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                          selectedStatusCategory === 'alerts' 
                            ? 'bg-orange-50 border border-orange-200' 
                            : 'bg-slate-50 hover:bg-orange-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span className="text-sm font-medium text-slate-600">System Alerts</span>
                        </div>
                        <span className="text-sm font-bold text-orange-600">{alertCount.toLocaleString()}</span>
                      </button>
                      <p className="text-[10px] text-slate-400 mt-1 text-center">Auto-generated system alerts</p>
                    </div>
                  </div>
                  
                  {/* Right side: Items panel */}
                  <div className="w-1/2 border-l border-slate-100 pl-6">
                    <p className="text-xs font-medium text-slate-500 mb-3">
                      {selectedStatusCategory === 'all' ? 'Recent Items' : 
                       selectedStatusCategory === 'emergencies' ? 'Emergencies' :
                       selectedStatusCategory === 'alerts' ? 'Alerts' : 'Reported Issues'}
                    </p>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {filteredItems.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No items</p>
                      ) : (
                        filteredItems.map((item: any, idx: number) => {
                          // Use timeAgo if provided (sample data), otherwise calculate from createdAt
                          let timeDisplay = item.timeAgo;
                          if (!timeDisplay && item.createdAt) {
                            const daysOpen = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                            timeDisplay = daysOpen === 0 ? "Today" : daysOpen === 1 ? "1 day" : `${daysOpen} days`;
                          }
                          
                          const bgColor = item.type === 'emergency' ? 'bg-red-50 border-red-100' :
                                          item.type === 'alert' ? 'bg-orange-50 border-orange-100' :
                                          'bg-blue-50 border-blue-100';
                          
                          // Get reporter info
                          const reporterName = item.reportedBy || item.submittedByName || item.technicianName || 'Unknown';
                          const reporterRole = item.reporterRole || item.submitterRole || '';
                          const reporterDisplay = reporterRole ? `${reporterName} (${reporterRole})` : reporterName;
                          
                          return (
                            <div 
                              key={item.id || idx} 
                              className={`p-2.5 rounded-lg border ${bgColor} cursor-pointer hover:shadow-sm transition-all`}
                              onClick={() => navigate(item.type === 'emergency' ? '/emergencies' : item.type === 'alert' ? '/alerts' : '/tech-ops')}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-sm font-medium text-slate-800 truncate flex-1">{item.propertyName}</span>
                                {item.type === 'emergency' && item.priority === 'critical' && (
                                  <Badge className="bg-red-600 text-white text-[9px] shrink-0">Critical</Badge>
                                )}
                                {item.type === 'emergency' && item.priority === 'high' && (
                                  <Badge className="bg-orange-500 text-white text-[9px] shrink-0">High</Badge>
                                )}
                                {item.type === 'emergency' && item.priority === 'medium' && (
                                  <Badge className="bg-amber-500 text-white text-[9px] shrink-0">Medium</Badge>
                                )}
                                {item.type === 'issue' && item.status && (
                                  <Badge className="bg-blue-100 text-blue-700 text-[9px] shrink-0">{item.status}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-1 mb-1">{item.description}</p>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                <span className="font-medium text-slate-600">Reported by: {reporterDisplay}</span>
                              </div>
                              <div className="flex items-center justify-end text-[10px] text-slate-400">
                                <span>{timeDisplay}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Two-Column Section: Estimate Pipeline + Financial Summary (Left) | Coverage Calendar (Right) */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column: Stacked Estimate Pipeline + Financial Summary */}
          <div className="flex flex-col gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Estimate Pipeline
                    </CardTitle>
                    <CardDescription>Job estimates by status</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/estimates")} className="text-blue-600 hover:text-blue-700">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const pipelineData = [
                    { label: "Draft", value: metrics?.values?.draft || 0, color: "#64748b" },
                    { label: "Pending Approval", value: metrics?.values?.pendingApproval || 0, color: "#f97316" },
                    { label: "Approved", value: metrics?.values?.approved || 0, color: "#10b981" },
                    { label: "Scheduled", value: metrics?.values?.scheduled || 0, color: "#0ea5e9" },
                    { label: "Ready to Invoice", value: metrics?.values?.readyToInvoice || 0, color: "#14b8a6" },
                    { label: "Unpaid", value: metrics?.invoices?.unpaidValue || 0, color: "#ef4444" },
                  ];
                  
                  const totalValue = pipelineData.reduce((sum, item) => sum + item.value, 0);
                  const radius = 80;
                  const strokeWidth = 20;
                  const centerX = 100;
                  const centerY = 90;
                  
                  let cumulativeAngle = 180;
                  const segments = pipelineData.map((item) => {
                    const percentage = totalValue > 0 ? item.value / totalValue : 0;
                    const angle = percentage * 180;
                    const startAngle = cumulativeAngle;
                    cumulativeAngle += angle;
                    
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = ((startAngle + angle) * Math.PI) / 180;
                    
                    const x1 = centerX + radius * Math.cos(startRad);
                    const y1 = centerY + radius * Math.sin(startRad);
                    const x2 = centerX + radius * Math.cos(endRad);
                    const y2 = centerY + radius * Math.sin(endRad);
                    
                    const largeArc = angle > 180 ? 1 : 0;
                    
                    return {
                      ...item,
                      path: angle > 0.5 ? `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}` : null,
                    };
                  });
                  
                  return (
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <svg width="200" height="110" viewBox="0 0 200 110">
                          <path
                            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                          />
                          {segments.map((seg, idx) => seg.path && (
                            <path
                              key={idx}
                              d={seg.path}
                              fill="none"
                              stroke={seg.color}
                              strokeWidth={strokeWidth}
                              strokeLinecap="butt"
                            />
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                          <span className="text-xl font-bold text-slate-900">{formatCurrency(totalValue)}</span>
                          <span className="text-[10px] text-slate-500">Total Pipeline Value</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {pipelineData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-slate-700">{item.label}</span>
                            </div>
                            <span className="text-slate-600 font-medium tabular-nums">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card className="shadow-sm flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      Financial Summary
                    </CardTitle>
                    <CardDescription>Values across pipeline stages</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Total Pipeline Value</span>
                      <span className="text-2xl font-bold text-emerald-700">{formatCurrency(metrics?.values.total || 0)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-100 text-center">
                      <p className="text-xs font-medium text-slate-600">Pending Approval</p>
                      <p className="text-lg font-bold text-orange-700">{formatCurrency(metrics?.values.pendingApproval || 0)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-sky-50 border border-sky-100 text-center">
                      <p className="text-xs font-medium text-slate-600">Scheduled</p>
                      <p className="text-lg font-bold text-sky-700">{formatCurrency(metrics?.values.scheduled || 0)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-teal-50 border border-teal-100 text-center">
                      <p className="text-xs font-medium text-slate-600">Ready to Invoice</p>
                      <p className="text-lg font-bold text-teal-700">{formatCurrency(metrics?.values.readyToInvoice || 0)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Coverage Calendar */}
          <Card className="shadow-sm" data-testid="card-coverage-calendar-main">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Coverage Calendar
                  </CardTitle>
                  <CardDescription>Technician coverage schedule</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const year = calendarDate.getFullYear();
                const month = calendarDate.getMonth();
                const firstDayOfMonth = new Date(year, month, 1);
                const lastDayOfMonth = new Date(year, month + 1, 0);
                const daysInMonth = lastDayOfMonth.getDate();
                const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
                
                const days: (number | null)[] = [];
                for (let i = 0; i < startDayOfWeek; i++) days.push(null);
                for (let i = 1; i <= daysInMonth; i++) days.push(i);
                
                // Sample coverage activities with specific dates
                const sampleCoverages = [
                  { id: 'sample1', startDate: '2025-01-28', endDate: '2025-01-28', coveringTechName: 'Mike Johnson', originalTechName: 'Jorge Martinez', propertyName: 'Sunset Hills HOA', reason: null },
                  { id: 'sample2', startDate: '2025-01-30', endDate: '2025-01-30', coveringTechName: 'Sarah Chen', originalTechName: 'David Wilson', propertyName: 'Palm Gardens Community', reason: null },
                  { id: 'sample3', startDate: '2025-02-03', endDate: '2025-02-03', coveringTechName: 'Jorge Martinez', originalTechName: 'Mike Johnson', propertyName: 'Desert Springs Resort', reason: null },
                  { id: 'sample4', startDate: '2025-02-05', endDate: '2025-02-05', coveringTechName: 'All techs', originalTechName: '', propertyName: 'main office', reason: 'Training day' },
                ];
                
                // Combine real coverages with sample coverages
                const allCoverages = [...coverages, ...sampleCoverages];
                
                const getCoveragesForDate = (day: number) => {
                  const date = new Date(year, month, day);
                  return allCoverages.filter((c: any) => {
                    const start = new Date(c.startDate);
                    const end = new Date(c.endDate);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    date.setHours(12, 0, 0, 0);
                    return date >= start && date <= end;
                  });
                };
                
                const selectedCoverages = selectedDate 
                  ? getCoveragesForDate(selectedDate.getDate())
                  : allCoverages.slice(0, 4);
                
                const monthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                
                return (
                  <div className="space-y-4">
                    {/* Mini Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-semibold text-slate-800">{monthName}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500 mb-1">
                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                          <div key={d}>{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {days.map((day, idx) => {
                          if (day === null) return <div key={idx} className="h-9" />;
                          const dayCoverages = getCoveragesForDate(day);
                          const hasCoverage = dayCoverages.length > 0;
                          const isSelected = selectedDate?.getDate() === day && 
                            selectedDate?.getMonth() === month && 
                            selectedDate?.getFullYear() === year;
                          const isToday = new Date().getDate() === day && 
                            new Date().getMonth() === month && 
                            new Date().getFullYear() === year;
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedDate(new Date(year, month, day))}
                              className={`h-9 w-full rounded-md text-xs font-medium flex flex-col items-center justify-center transition-colors
                                ${isSelected ? 'bg-purple-600 text-white' : isToday ? 'bg-purple-100 text-purple-700' : 'hover:bg-slate-100 text-slate-700'}
                              `}
                            >
                              <span>{day}</span>
                              {hasCoverage && !isSelected && (
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Coverage Activities List */}
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs font-medium text-slate-500 mb-3">
                        {selectedDate 
                          ? `Coverage on ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                          : 'Upcoming Coverage'
                        }
                      </p>
                      <div className="space-y-2 max-h-[180px] overflow-y-auto">
                        {selectedCoverages.length === 0 ? (
                          <p className="text-sm text-slate-400 italic">No coverage scheduled</p>
                        ) : (
                          selectedCoverages.map((c: any, idx: number) => {
                            const startDate = new Date(c.startDate);
                            const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });
                            const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            
                            return (
                              <div key={c.id || idx} className="p-2.5 rounded-lg bg-purple-50 border border-purple-100">
                                <p className="text-xs text-purple-600 font-medium">{dateStr} - {dayOfWeek}</p>
                                <p className="text-sm text-slate-700 mt-0.5">
                                  {c.reason === 'Training day' 
                                    ? `${c.reason} - ${c.coveringTechName} at ${c.propertyName}`
                                    : `${c.coveringTechName} covering for ${c.originalTechName} at ${c.propertyName}`
                                  }
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Two-Column Lower Section: Recent Activity + Urgent Items */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#60A5FA]" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest estimates and service repairs</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                {recentActivity.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[#64748B]">
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.map((item, index) => (
                      <div 
                        key={`${item.type}-${item.id}-${index}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => navigate(item.type === "estimate" ? "/estimates" : "/service-repairs")}
                        data-testid={`activity-item-${item.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${item.type === "estimate" ? "bg-blue-100" : "bg-orange-100"}`}>
                            {item.type === "estimate" ? (
                              <FileText className="w-4 h-4 text-blue-700" />
                            ) : (
                              <Wrench className="w-4 h-4 text-orange-700" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">{item.property}</p>
                            <p className="text-xs text-slate-500 truncate">{item.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={getStatusColor(item.status)}>{item.status?.replace(/_/g, " ")}</Badge>
                          {item.amount > 0 && (
                            <span className="text-sm font-semibold text-slate-800">{formatCurrency(item.amount)}</span>
                          )}
                          {item.timestamp && (
                            <span className="text-xs text-slate-400">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Urgent Items
                  </CardTitle>
                  <CardDescription>Requires immediate attention</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                {urgentItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-500" />
                    <p>All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {urgentItems.map((item, index) => (
                      <div 
                        key={`${item.type}-${item.id}-${index}`}
                        className="p-3 rounded-lg bg-white border border-slate-200 hover:border-red-300 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => {
                          if (item.type === "ready_to_invoice" || item.type === "needs_scheduling") {
                            navigate("/estimates");
                          } else if (item.type === "emergency") {
                            navigate("/emergencies");
                          }
                        }}
                        data-testid={`urgent-item-${item.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full shrink-0 ${
                            item.severity === "critical" ? "bg-red-100" : 
                            item.severity === "warning" ? "bg-orange-100" : 
                            item.severity === "info" ? "bg-teal-100" : "bg-red-100"
                          }`}>
                            <AlertTriangle className={`w-4 h-4 ${
                              item.severity === "critical" ? "text-red-600" :
                              item.severity === "warning" ? "text-orange-600" : 
                              item.severity === "info" ? "text-teal-600" : "text-red-600"
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                            <p className="text-xs text-slate-400 mt-1">{item.property}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Inactive Technicians Section */}
        {(metrics?.technicians?.inactive?.length || 0) > 0 && (
          <Card className="shadow-sm border-l-4 border-l-amber-500 bg-white" data-testid="card-inactive-technicians">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserX className="w-5 h-5 text-amber-600" />
                  <span className="text-slate-900">Inactive Technicians</span>
                  <Badge className="bg-amber-100 text-amber-800 ml-2">{metrics?.technicians?.inactive?.length || 0}</Badge>
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowThresholdSettings(true)}
                  className="text-slate-600 hover:text-slate-800"
                  data-testid="btn-threshold-settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-slate-600">
                Technicians who haven't clocked in after {thresholdTime}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {metrics?.technicians?.inactive?.map((tech) => {
                  const hours = Math.floor(tech.minutesLate / 60);
                  const mins = tech.minutesLate % 60;
                  const lateText = hours > 0 ? `${hours}h ${mins}m late` : `${mins}m late`;
                  
                  return (
                    <div 
                      key={tech.id}
                      className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors"
                      data-testid={`inactive-tech-${tech.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-900">{tech.name}</span>
                        <Badge className="bg-amber-200 text-amber-800 text-[10px] shrink-0">{lateText}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-3 h-3" />
                          <span>Expected: {tech.expectedStartTime}</span>
                        </div>
                        <span className="text-slate-500 capitalize">{tech.role?.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Repair Tech Workload */}
        {(metrics?.technicians?.repairTechWorkload?.length || 0) > 0 && (
          <Card 
            className="shadow-sm cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-500 bg-white" 
            onClick={() => navigate("/repair-queue")}
            data-testid="card-repair-tech-workload"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  <span className="text-slate-900">Repair Tech Workload</span>
                </CardTitle>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
              <CardDescription className="text-slate-600">
                Jobs scheduled for today by repair technician
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {metrics?.technicians?.repairTechWorkload?.map((tech) => (
                  <div 
                    key={tech.id}
                    className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 transition-colors flex items-center justify-between"
                    data-testid={`workload-tech-${tech.id}`}
                  >
                    <span className="text-sm font-medium text-slate-800 truncate mr-2">{tech.name}</span>
                    <Badge className={`shrink-0 ${
                      tech.jobCount === 0 
                        ? "bg-slate-100 text-slate-600" 
                        : tech.jobCount >= 5 
                          ? "bg-red-100 text-red-700" 
                          : tech.jobCount >= 3 
                            ? "bg-amber-100 text-amber-700" 
                            : "bg-blue-100 text-blue-700"
                    }`}>
                      {tech.jobCount}
                    </Badge>
                  </div>
                ))}
              </div>
              {metrics?.technicians?.repairTechWorkload?.every(t => t.jobCount === 0) && (
                <p className="text-sm text-slate-500 mt-2 text-center">No jobs scheduled for today</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chemical Orders by Property */}
        {chemicalOrdersByProperty.length > 0 && (
          <Card className="shadow-sm" data-testid="card-chemical-orders-by-property">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-cyan-600" />
                    Chemical Orders by Property
                  </CardTitle>
                  <CardDescription>Pending orders that need to be sent</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/chemicals")} className="text-cyan-600 hover:text-cyan-700">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const maxCount = Math.max(...chemicalOrdersByProperty.map((p: any) => p.count), 1);
                const totalOrders = chemicalOrdersByProperty.reduce((sum: number, p: any) => sum + p.count, 0);
                
                return (
                  <div className="space-y-3">
                    {chemicalOrdersByProperty.map((property: any, idx: number) => {
                      const percentage = (property.count / maxCount) * 100;
                      const percentOfTotal = totalOrders > 0 ? Math.round((property.count / totalOrders) * 100) : 0;
                      
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-700 font-medium truncate flex-1 mr-4">{property.propertyName}</span>
                            <span className="text-slate-600 tabular-nums shrink-0">{property.count} ({percentOfTotal}%)</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-cyan-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                      <span className="text-slate-600">Total Pending Orders</span>
                      <span className="font-semibold text-slate-900">{totalOrders}</span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Bottom Summary Boxes */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all" onClick={() => navigate("/tech-ops")} data-testid="card-tech-ops">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100">
                  <Users className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Tech Ops</p>
                  <p className="text-xs text-slate-600">{metrics?.technicians.total || 0} technicians</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm cursor-pointer hover:shadow-md hover:border-orange-300 transition-all" onClick={() => navigate("/service-repairs")} data-testid="card-repair-queue">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-orange-100">
                  <Wrench className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Repair Queue</p>
                  <p className="text-xs text-slate-600">{metrics?.serviceRepairs.pending || 0} pending</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all" onClick={() => navigate("/estimates")} data-testid="card-estimates">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-100">
                  <FileText className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Estimates</p>
                  <p className="text-xs text-slate-600">{metrics?.estimates.total || 0} total</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm cursor-pointer hover:shadow-md hover:border-red-300 transition-all" onClick={() => navigate("/alerts")} data-testid="card-alerts">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-red-100">
                  <Bell className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Alerts</p>
                  <p className="text-xs text-slate-600">{metrics?.alerts.urgent || 0} urgent, {metrics?.alerts.active || 0} active</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Threshold Settings Modal */}
      <Dialog open={showThresholdSettings} onOpenChange={setShowThresholdSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-700" />
              Clock-in Threshold Settings
            </DialogTitle>
            <DialogDescription>
              Set the time after which technicians are considered inactive if they haven't clocked in.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="thresholdTime" className="text-sm font-medium text-slate-700">
              Expected Start Time
            </Label>
            <Input
              id="thresholdTime"
              type="time"
              value={thresholdTime}
              onChange={(e) => setThresholdTime(e.target.value)}
              className="mt-2"
              data-testid="input-threshold-time"
            />
            <p className="text-xs text-slate-500 mt-2">
              Technicians who haven't clocked in by this time will appear in the Inactive list.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowThresholdSettings(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                saveThresholdTime(thresholdTime);
                toast({ title: "Settings Saved", description: `Threshold time updated to ${thresholdTime}` });
                setShowThresholdSettings(false);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
