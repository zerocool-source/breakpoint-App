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
            className="cursor-pointer hover:shadow-md hover:border-blue-400 transition-all"
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
              <Progress value={100} className="h-1.5 mt-2 bg-blue-100" />
            </CardContent>
          </Card>

          {/* Sent for Approval */}
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-orange-400 transition-all"
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
              <Progress 
                value={metrics?.estimates.total ? ((metrics?.estimates.pendingApproval || 0) / metrics?.estimates.total) * 100 : 0} 
                className="h-1.5 mt-2 bg-orange-100" 
              />
            </CardContent>
          </Card>

          {/* Needs Scheduling */}
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-sky-400 transition-all"
            onClick={() => navigate("/estimates")}
            data-testid="card-needs-scheduling"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-sky-100">
                  <Calendar className="w-5 h-5 text-sky-700" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{summary?.needsScheduling || 0}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Needs Scheduling</p>
              <Progress 
                value={metrics?.estimates.total ? ((summary?.needsScheduling || 0) / metrics?.estimates.total) * 100 : 0} 
                className="h-1.5 mt-2 bg-sky-100" 
              />
            </CardContent>
          </Card>

          {/* Ready to Invoice */}
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-teal-400 transition-all"
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
              <Progress 
                value={metrics?.estimates.total ? ((metrics?.estimates.readyToInvoice || 0) / metrics?.estimates.total) * 100 : 0} 
                className="h-1.5 mt-2 bg-teal-100" 
              />
            </CardContent>
          </Card>

          {/* Invoices Unpaid */}
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-red-400 transition-all"
            onClick={() => navigate("/invoices")}
            data-testid="card-invoices-unpaid"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-red-100">
                  <DollarSign className="w-5 h-5 text-red-700" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{metrics?.invoices?.unpaid || 0}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Invoices Unpaid</p>
              <Progress 
                value={metrics?.invoices?.total ? ((metrics?.invoices?.unpaid || 0) / metrics?.invoices?.total) * 100 : 0} 
                className="h-1.5 mt-2 bg-red-100" 
              />
            </CardContent>
          </Card>

          {/* Declined */}
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-rose-400 transition-all"
            onClick={() => navigate("/estimates")}
            data-testid="card-declined"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-rose-100">
                  <XCircle className="w-5 h-5 text-rose-700" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{metrics?.estimates.declined || 0}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Declined</p>
              <Progress 
                value={metrics?.estimates.total ? ((metrics?.estimates.declined || 0) / metrics?.estimates.total) * 100 : 0} 
                className="h-1.5 mt-2 bg-rose-100" 
              />
            </CardContent>
          </Card>
        </div>

        {(metrics?.emergencies?.open ?? 0) > 0 && (
          <Card className="border-l-4 border-l-red-500" data-testid="card-emergencies">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Open Emergencies
                  <Badge className="bg-red-100 text-red-700 ml-2">{metrics?.emergencies?.open ?? 0}</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/emergencies")} className="text-red-600">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {metrics?.emergencies?.recentOpen?.map((emergency, index) => (
                  <div 
                    key={emergency.id}
                    className="p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => navigate("/emergencies")}
                    data-testid={`emergency-card-${index}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-[#1E293B] truncate flex-1">{emergency.propertyName}</span>
                      {emergency.priority === "critical" && (
                        <Badge className="bg-red-600 text-white text-[10px] shrink-0">Critical</Badge>
                      )}
                      {emergency.priority === "high" && (
                        <Badge className="bg-[#FF8000]1A text-[#D35400] text-[10px] shrink-0">High</Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] line-clamp-2 mb-2">{emergency.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Users className="w-3 h-3" />
                        <span>{emergency.submittedByName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="capitalize">{emergency.submitterRole?.replace(/_/g, " ")}</span>
                      </div>
                      {emergency.createdAt && (
                        <span className="text-red-500 font-medium">
                          {formatDistanceToNow(new Date(emergency.createdAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#0078D4]" />
                    Estimate Pipeline
                  </CardTitle>
                  <CardDescription>Job estimates by status</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/estimates")} className="text-[#60A5FA]">
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

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#22D69A]" />
                    Financial Summary
                  </CardTitle>
                  <CardDescription>Values across pipeline stages</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Total Pipeline Value</span>
                    <span className="text-2xl font-bold text-blue-700">{formatCurrency(metrics?.values.total || 0)}</span>
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

        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#60A5FA]" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest estimates and service repairs</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {recentActivity.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[#64748B]">
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((item, index) => (
                      <div 
                        key={`${item.type}-${item.id}-${index}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] hover:border-[#60A5FA]/50 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => navigate(item.type === "estimate" ? "/estimates" : "/service-repairs")}
                        data-testid={`activity-item-${item.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${item.type === "estimate" ? "bg-[#0078D4]/10" : "bg-[#FF8000]/10"}`}>
                            {item.type === "estimate" ? (
                              <FileText className="w-4 h-4 text-[#0078D4]" />
                            ) : (
                              <Wrench className="w-4 h-4 text-[#D35400]" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1E293B]">{item.title}</p>
                            <p className="text-xs text-[#64748B]">{item.property}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(item.status)}>{item.status?.replace(/_/g, " ")}</Badge>
                          {item.amount > 0 && (
                            <span className="text-sm font-medium text-[#1E293B]">{formatCurrency(item.amount)}</span>
                          )}
                          {item.timestamp && (
                            <span className="text-xs text-[#94A3B8]">
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#D35400]" />
                Urgent Items
              </CardTitle>
              <CardDescription>Requires immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {urgentItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#64748B]">
                    <CheckCircle2 className="w-12 h-12 mb-2 text-[#22D69A]" />
                    <p>All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {urgentItems.map((item, index) => (
                      <div 
                        key={`${item.type}-${item.id}-${index}`}
                        className="p-3 rounded-lg border border-[#E2E8F0] hover:border-[#FF8000]/50 transition-all cursor-pointer"
                        onClick={() => {
                          if (item.type === "ready_to_invoice" || item.type === "needs_scheduling") {
                            navigate("/estimates");
                          }
                        }}
                        data-testid={`urgent-item-${item.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-full ${
                            item.severity === "warning" ? "bg-[#FF8000]1A" : 
                            item.severity === "info" ? "bg-[#17BEBB]1A" : "bg-red-100"
                          }`}>
                            {item.type === "alert" ? (
                              <Bell className={`w-3 h-3 ${
                                item.severity === "warning" ? "text-[#D35400]" : "text-red-600"
                              }`} />
                            ) : item.type === "ready_to_invoice" ? (
                              <Receipt className="w-3 h-3 text-[#0D9488]" />
                            ) : (
                              <Calendar className="w-3 h-3 text-[#D35400]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1E293B] truncate">{item.title}</p>
                            <p className="text-xs text-[#64748B] truncate">{item.description}</p>
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
          <Card className="border-l-4 border-l-amber-500" data-testid="card-inactive-technicians">
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
            className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-500" 
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

        {/* Quick Links */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/tech-ops")} data-testid="card-tech-ops">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Tech Ops</p>
                  <p className="text-xs text-slate-600">{metrics?.technicians.total || 0} technicians</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/service-repairs")} data-testid="card-repair-queue">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Wrench className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Repair Queue</p>
                  <p className="text-xs text-slate-600">{metrics?.serviceRepairs.pending || 0} pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/estimates")} data-testid="card-estimates">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <FileText className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Estimates</p>
                  <p className="text-xs text-slate-600">{metrics?.estimates.total || 0} total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all" data-testid="card-alerts">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Bell className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Alerts</p>
                  <p className="text-xs text-slate-600">{metrics?.alerts.urgent || 0} urgent, {metrics?.alerts.active || 0} active</p>
                </div>
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
