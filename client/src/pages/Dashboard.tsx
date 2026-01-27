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
  ChevronRight
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

        {/* Open Emergencies Section */}
        {(metrics?.emergencies?.open ?? 0) > 0 && (
          <Card className="shadow-sm border-l-4 border-l-red-500 bg-white" data-testid="card-emergencies">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-slate-900">Open Emergencies</span>
                  <Badge className="bg-red-100 text-red-700 ml-2">{metrics?.emergencies?.open ?? 0}</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/emergencies")} className="text-red-600 hover:text-red-700">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {metrics?.emergencies?.recentOpen?.map((emergency, index) => {
                  const daysOpen = emergency.createdAt 
                    ? Math.floor((new Date().getTime() - new Date(emergency.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  
                  return (
                    <div 
                      key={emergency.id}
                      className="p-3 rounded-lg border border-slate-200 bg-white hover:border-red-400 hover:shadow-sm cursor-pointer transition-all"
                      onClick={() => navigate("/emergencies")}
                      data-testid={`emergency-card-${index}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-semibold text-slate-900 truncate flex-1">{emergency.propertyName}</span>
                        {emergency.priority === "critical" && (
                          <Badge className="bg-red-600 text-white text-[10px] shrink-0">Critical</Badge>
                        )}
                        {emergency.priority === "high" && (
                          <Badge className="bg-orange-500 text-white text-[10px] shrink-0">High</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">{emergency.description}</p>
                      <div className="flex items-center justify-between text-xs border-t border-red-100 pt-2 mt-2">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Users className="w-3 h-3" />
                          <span className="font-medium">{emergency.submittedByName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 capitalize">{emergency.submitterRole?.replace(/_/g, " ")}</span>
                          <Badge className="bg-red-100 text-red-700 text-[10px]">
                            {daysOpen === 0 ? "Today" : daysOpen === 1 ? "1 day" : `${daysOpen} days`}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Two-Column Middle Section: Estimate Pipeline + Financial Summary */}
        <div className="grid grid-cols-2 gap-6">
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
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-500"></div>
                    <span className="text-sm font-medium text-slate-800">Draft</span>
                  </div>
                  <Badge className="bg-slate-200 text-slate-700 font-semibold">{metrics?.estimates.draft || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 hover:bg-orange-100 cursor-pointer transition-colors" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-medium text-slate-800">Pending Approval</span>
                  </div>
                  <Badge className="bg-orange-200 text-orange-800 font-semibold">{metrics?.estimates.pendingApproval || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition-colors" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-medium text-slate-800">Approved</span>
                  </div>
                  <Badge className="bg-emerald-200 text-emerald-800 font-semibold">{metrics?.estimates.approved || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 hover:bg-sky-100 cursor-pointer transition-colors" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div>
                    <span className="text-sm font-medium text-slate-800">Scheduled</span>
                  </div>
                  <Badge className="bg-sky-200 text-sky-800 font-semibold">{metrics?.estimates.scheduled || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-teal-50 hover:bg-teal-100 cursor-pointer transition-colors" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
                    <span className="text-sm font-medium text-slate-800">Ready to Invoice</span>
                  </div>
                  <Badge className="bg-teal-200 text-teal-800 font-semibold">{metrics?.estimates.readyToInvoice || 0}</Badge>
                </div>
                {/* Unpaid Row */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 cursor-pointer transition-colors" onClick={() => navigate("/invoices")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-slate-800">Unpaid</span>
                  </div>
                  <Badge className="bg-red-200 text-red-800 font-semibold">{metrics?.invoices?.unpaid || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
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
