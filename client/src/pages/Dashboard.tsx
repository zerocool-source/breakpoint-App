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
  Loader2
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";

interface OpenEmergency {
  id: string;
  propertyName: string;
  submittedByName: string;
  submitterRole: string;
  priority: string;
  description: string;
  createdAt: string;
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
      pending_approval: "bg-amber-100 text-amber-700",
      approved: "bg-emerald-100 text-emerald-700",
      scheduled: "bg-blue-100 text-blue-700",
      completed: "bg-sky-100 text-sky-700",
      ready_to_invoice: "bg-purple-100 text-purple-700",
      invoiced: "bg-green-100 text-green-700",
      pending: "bg-amber-100 text-amber-700",
      open: "bg-blue-100 text-blue-700",
      in_progress: "bg-sky-100 text-sky-700",
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

        <div className="grid grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-[#F97316]/50 transition-all border-l-4 border-l-[#F97316]"
            onClick={() => navigate("/estimates")}
            data-testid="card-pending-approvals"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Pending Approvals</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{summary?.pendingApprovals || 0}</p>
                  <p className="text-sm text-[#F97316]">{formatCurrency(metrics?.values.pendingApproval || 0)}</p>
                </div>
                <div className="p-3 rounded-full bg-[#F97316]/10">
                  <Clock className="w-6 h-6 text-[#F97316]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md hover:border-[#0078D4]/50 transition-all border-l-4 border-l-[#0078D4]"
            onClick={() => navigate("/estimates")}
            data-testid="card-needs-scheduling"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Needs Scheduling</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{summary?.needsScheduling || 0}</p>
                  <p className="text-sm text-[#0078D4]">Approved jobs awaiting</p>
                </div>
                <div className="p-3 rounded-full bg-[#0078D4]/10">
                  <Calendar className="w-6 h-6 text-[#0078D4]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md hover:border-purple-500/50 transition-all border-l-4 border-l-purple-500"
            onClick={() => navigate("/estimates")}
            data-testid="card-ready-to-invoice"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Ready to Invoice</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{summary?.needsInvoicing || 0}</p>
                  <p className="text-sm text-purple-600">{formatCurrency(metrics?.values.readyToInvoice || 0)}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <Receipt className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md hover:border-[#60A5FA]/50 transition-all border-l-4 border-l-[#60A5FA]"
            onClick={() => navigate("/tech-ops")}
            data-testid="card-active-repairs"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#64748B] uppercase tracking-wide">Active Repairs</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{summary?.activeRepairs || 0}</p>
                  <p className="text-sm text-[#60A5FA]">Service repairs in progress</p>
                </div>
                <div className="p-3 rounded-full bg-[#60A5FA]/10">
                  <Wrench className="w-6 h-6 text-[#60A5FA]" />
                </div>
              </div>
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
                        <Badge className="bg-orange-100 text-orange-700 text-[10px] shrink-0">High</Badge>
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
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="text-sm text-[#1E293B]">Draft</span>
                  </div>
                  <Badge variant="secondary">{metrics?.estimates.draft || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 hover:bg-amber-100 cursor-pointer" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-sm text-[#1E293B]">Pending Approval</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">{metrics?.estimates.pendingApproval || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 cursor-pointer" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-[#1E293B]">Approved</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">{metrics?.estimates.approved || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-[#1E293B]">Scheduled</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">{metrics?.estimates.scheduled || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 hover:bg-purple-100 cursor-pointer" onClick={() => navigate("/estimates")}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-sm text-[#1E293B]">Ready to Invoice</span>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700">{metrics?.estimates.readyToInvoice || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Financial Summary
                  </CardTitle>
                  <CardDescription>Values across pipeline stages</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-r from-[#0078D4]/5 to-[#60A5FA]/5 border border-[#0078D4]/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#64748B]">Total Pipeline Value</span>
                    <span className="text-2xl font-bold text-[#0078D4]">{formatCurrency(metrics?.values.total || 0)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-amber-50 text-center">
                    <p className="text-xs text-[#64748B]">Pending Approval</p>
                    <p className="text-lg font-semibold text-amber-700">{formatCurrency(metrics?.values.pendingApproval || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 text-center">
                    <p className="text-xs text-[#64748B]">Scheduled</p>
                    <p className="text-lg font-semibold text-blue-700">{formatCurrency(metrics?.values.scheduled || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 text-center">
                    <p className="text-xs text-[#64748B]">Ready to Invoice</p>
                    <p className="text-lg font-semibold text-purple-700">{formatCurrency(metrics?.values.readyToInvoice || 0)}</p>
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
                          <div className={`p-2 rounded-lg ${item.type === "estimate" ? "bg-[#0078D4]/10" : "bg-[#F97316]/10"}`}>
                            {item.type === "estimate" ? (
                              <FileText className="w-4 h-4 text-[#0078D4]" />
                            ) : (
                              <Wrench className="w-4 h-4 text-[#F97316]" />
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
                <AlertTriangle className="w-5 h-5 text-[#F97316]" />
                Urgent Items
              </CardTitle>
              <CardDescription>Requires immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {urgentItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#64748B]">
                    <CheckCircle2 className="w-12 h-12 mb-2 text-green-500" />
                    <p>All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {urgentItems.map((item, index) => (
                      <div 
                        key={`${item.type}-${item.id}-${index}`}
                        className="p-3 rounded-lg border border-[#E2E8F0] hover:border-[#F97316]/50 transition-all cursor-pointer"
                        onClick={() => {
                          if (item.type === "ready_to_invoice" || item.type === "needs_scheduling") {
                            navigate("/estimates");
                          }
                        }}
                        data-testid={`urgent-item-${item.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-full ${
                            item.severity === "warning" ? "bg-amber-100" : 
                            item.severity === "info" ? "bg-purple-100" : "bg-red-100"
                          }`}>
                            {item.type === "alert" ? (
                              <Bell className={`w-3 h-3 ${
                                item.severity === "warning" ? "text-amber-600" : "text-red-600"
                              }`} />
                            ) : item.type === "ready_to_invoice" ? (
                              <Receipt className="w-3 h-3 text-purple-600" />
                            ) : (
                              <Calendar className="w-3 h-3 text-amber-600" />
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

        <div className="grid grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/tech-ops")} data-testid="card-tech-ops">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#0078D4]/10">
                  <Users className="w-5 h-5 text-[#0078D4]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">Tech Ops</p>
                  <p className="text-xs text-[#64748B]">{metrics?.technicians.total || 0} technicians</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/service-repairs")} data-testid="card-repair-queue">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F97316]/10">
                  <Wrench className="w-5 h-5 text-[#F97316]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">Repair Queue</p>
                  <p className="text-xs text-[#64748B]">{metrics?.serviceRepairs.pending || 0} pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/estimates")} data-testid="card-estimates">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">Estimates</p>
                  <p className="text-xs text-[#64748B]">{metrics?.estimates.total || 0} total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all" data-testid="card-alerts">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Bell className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">Alerts</p>
                  <p className="text-xs text-[#64748B]">{metrics?.alerts.urgent || 0} urgent, {metrics?.alerts.active || 0} active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
