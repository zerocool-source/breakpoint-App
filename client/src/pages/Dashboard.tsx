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
  Droplets,
  UserPlus,
  Building2,
  HardHat,
  Hammer,
  Download,
  Megaphone,
  TrendingDown,
  User,
  ClipboardList,
  AlertCircle,
  Cog,
  Truck
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
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

  // Add Employee Modal State
  const [showEmployeeTypeModal, setShowEmployeeTypeModal] = useState(false);
  const [showEmployeeFormModal, setShowEmployeeFormModal] = useState(false);
  const [selectedEmployeeType, setSelectedEmployeeType] = useState<"service" | "repair" | "supervisor" | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    truckNumber: "",
    active: true,
  });

  // Add Property Modal State
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propertyForm, setPropertyForm] = useState({
    name: "",
    customerName: "",
    status: "active",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    serviceLevel: "weekly",
    assignedTechnicianId: "",
    tags: "",
    notes: "",
  });

  // Financial Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({
    from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  const [reportFilters, setReportFilters] = useState({
    pendingApproval: true,
    scheduled: true,
    readyToInvoice: true,
    invoiced: true,
    paid: true,
  });

  // Emergency Report Modal State
  const [showEmergencyReportModal, setShowEmergencyReportModal] = useState(false);
  const [emergencyReportLoading, setEmergencyReportLoading] = useState(false);
  const [emergencyReportDateRange, setEmergencyReportDateRange] = useState({
    from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  const [emergencyReportFilters, setEmergencyReportFilters] = useState({
    emergencies: true,
    reportedIssues: true,
    systemAlerts: false,
  });

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

  // Fetch service technicians for property assignment dropdown
  const { data: serviceTechnicians = [] } = useQuery<Array<{ id: string; firstName: string; lastName: string }>>({
    queryKey: ["/api/technicians", "service"],
    queryFn: async () => {
      const res = await fetch("/api/technicians?role=service");
      if (!res.ok) return [];
      const data = await res.json();
      return data.technicians || [];
    },
  });

  // Create Employee Mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: { 
      firstName: string; 
      lastName: string; 
      phone: string; 
      email: string; 
      truckNumber?: string; 
      role: string;
      active: boolean;
    }) => {
      const res = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create employee");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      setShowEmployeeFormModal(false);
      setSelectedEmployeeType(null);
      setEmployeeForm({ firstName: "", lastName: "", phone: "", email: "", truckNumber: "", active: true });
      toast({ title: "Employee added successfully", description: "The new employee has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create Property Mutation
  const createPropertyMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      customerName: string;
      status: string;
      email?: string;
      phone?: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      serviceLevel: string;
      assignedTechnicianId?: string;
      tags?: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create property");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setShowPropertyModal(false);
      setPropertyForm({
        name: "", customerName: "", status: "active", email: "", phone: "",
        address: "", city: "", state: "", zip: "", serviceLevel: "weekly",
        assignedTechnicianId: "", tags: "", notes: "",
      });
      toast({ title: "Property added successfully", description: "The new property has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEmployeeTypeSelect = (type: "service" | "repair" | "supervisor") => {
    setSelectedEmployeeType(type);
    setShowEmployeeTypeModal(false);
    setShowEmployeeFormModal(true);
  };

  const handleEmployeeSubmit = () => {
    if (!selectedEmployeeType) return;
    createEmployeeMutation.mutate({
      ...employeeForm,
      role: selectedEmployeeType,
    });
  };

  const handlePropertySubmit = () => {
    createPropertyMutation.mutate({
      ...propertyForm,
      email: propertyForm.email || undefined,
      phone: propertyForm.phone || undefined,
      assignedTechnicianId: propertyForm.assignedTechnicianId || undefined,
      tags: propertyForm.tags || undefined,
      notes: propertyForm.notes || undefined,
    });
  };

  // Report Quick Select Handlers
  const setQuickDateRange = (period: "week" | "month" | "quarter" | "year") => {
    const now = new Date();
    let from: Date;
    
    switch (period) {
      case "week":
        const dayOfWeek = now.getDay();
        from = new Date(now);
        from.setDate(now.getDate() - dayOfWeek);
        break;
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case "year":
        from = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    setReportDateRange({
      from: format(from, "yyyy-MM-dd"),
      to: format(now, "yyyy-MM-dd"),
    });
  };

  const handleDownloadReport = async () => {
    setReportLoading(true);
    try {
      // Fetch estimates data
      const res = await fetch(`/api/estimates?startDate=${reportDateRange.from}&endDate=${reportDateRange.to}`);
      if (!res.ok) throw new Error("Failed to fetch estimates");
      const data = await res.json();
      const estimates = data.estimates || [];

      // Filter by selected statuses
      const statusMap: Record<string, string[]> = {
        pendingApproval: ["pending_approval"],
        scheduled: ["scheduled"],
        readyToInvoice: ["ready_to_invoice"],
        invoiced: ["invoiced"],
        paid: ["paid"],
      };
      
      const selectedStatuses = Object.entries(reportFilters)
        .filter(([_, checked]) => checked)
        .flatMap(([key]) => statusMap[key] || []);

      const filteredEstimates = estimates.filter((est: any) => 
        selectedStatuses.includes(est.status)
      );

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data rows
      const rows = filteredEstimates.map((est: any) => ({
        "Date": est.createdAt ? format(new Date(est.createdAt), "MM/dd/yyyy") : "",
        "Property": est.propertyName || "",
        "Customer": est.customerName || "",
        "Estimate #": est.estimateNumber || est.id,
        "Status": (est.status || "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        "Amount": est.totalAmount || 0,
      }));

      // Calculate totals
      const totalAmount = rows.reduce((sum: number, row: any) => sum + (row.Amount || 0), 0);
      
      // Add summary row
      rows.push({
        "Date": "",
        "Property": "",
        "Customer": "",
        "Estimate #": "",
        "Status": "TOTAL",
        "Amount": totalAmount,
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      
      // Set column widths
      ws["!cols"] = [
        { wch: 12 }, // Date
        { wch: 25 }, // Property
        { wch: 25 }, // Customer
        { wch: 12 }, // Estimate #
        { wch: 18 }, // Status
        { wch: 12 }, // Amount
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Financial Report");

      // Generate filename
      const fromDate = reportDateRange.from.replace(/-/g, "");
      const toDate = reportDateRange.to.replace(/-/g, "");
      const fileName = `Breakpoint_Financial_Report_${fromDate}_to_${toDate}.xlsx`;

      // Download
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: "Report downloaded successfully",
        description: `${filteredEstimates.length} records exported to Excel`,
      });
      setShowReportModal(false);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not generate the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReportLoading(false);
    }
  };

  const setEmergencyQuickDateRange = (range: "week" | "month" | "quarter") => {
    const now = new Date();
    let from: Date;
    
    switch (range) {
      case "week":
        from = new Date(now);
        from.setDate(now.getDate() - 7);
        break;
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        from = new Date(now.getFullYear(), quarterStart, 1);
        break;
    }
    
    setEmergencyReportDateRange({
      from: format(from, "yyyy-MM-dd"),
      to: format(now, "yyyy-MM-dd"),
    });
  };

  const handleDownloadEmergencyReport = async () => {
    setEmergencyReportLoading(true);
    try {
      // Generate sample data for the report (in production, this would come from API)
      const allItems: any[] = [];
      
      // Sample emergencies
      if (emergencyReportFilters.emergencies) {
        allItems.push(
          { date: '2026-01-14', type: 'Emergency', property: 'Sunset Hills HOA', description: 'Major pump motor failure', reportedBy: 'Mike Johnson (Service Tech)', status: 'Critical', daysOpen: 14 },
          { date: '2026-01-15', type: 'Emergency', property: 'Desert Springs Resort', description: 'Heater exchanger leaking', reportedBy: 'Sarah Williams (Repair Tech)', status: 'High', daysOpen: 13 },
          { date: '2026-01-16', type: 'Emergency', property: 'Palm Gardens Community', description: 'Control panel error codes', reportedBy: 'James Wilson (Supervisor)', status: 'High', daysOpen: 12 },
          { date: '2026-01-25', type: 'Emergency', property: 'Lakewood Country Club', description: 'Filter system completely failed', reportedBy: 'Jorge Martinez (Repair Tech)', status: 'Critical', daysOpen: 3 },
        );
      }
      
      // Sample reported issues
      if (emergencyReportFilters.reportedIssues) {
        allItems.push(
          { date: '2026-01-06', type: 'Reported Issue', property: 'Pool', description: 'Alert', reportedBy: 'Unassigned', status: 'Pending review', daysOpen: 22 },
          { date: '2026-01-27', type: 'Reported Issue', property: 'Marina Bay Club', description: 'Customer reported cloudy water', reportedBy: 'John Smith (Customer)', status: 'Pending review', daysOpen: 1 },
          { date: '2026-01-25', type: 'Reported Issue', property: 'Sunset Marina', description: 'Tile damage reported', reportedBy: 'Jane Doe (Customer)', status: 'Pending review', daysOpen: 3 },
          { date: '2026-01-23', type: 'Reported Issue', property: 'Desert Springs Resort', description: 'Heater malfunction', reportedBy: 'Mike Johnson (Tech)', status: 'Critical', daysOpen: 5 },
          { date: '2026-01-26', type: 'Reported Issue', property: 'Palm Gardens Community', description: 'Control panel error', reportedBy: 'Sarah Williams (Tech)', status: 'High', daysOpen: 2 },
          { date: '2026-01-24', type: 'Reported Issue', property: 'Lakewood Country Club', description: 'Pump noise issue', reportedBy: 'Customer', status: 'Pending review', daysOpen: 4 },
        );
      }
      
      // Sample system alerts
      if (emergencyReportFilters.systemAlerts) {
        allItems.push(
          { date: '2026-01-28', type: 'System Alert', property: 'Ocean View Resort', description: 'Chemical levels out of range', reportedBy: 'System Auto-Alert', status: 'Active', daysOpen: 0 },
          { date: '2026-01-28', type: 'System Alert', property: 'Vista Grande HOA', description: 'Pump pressure high', reportedBy: 'System Auto-Alert', status: 'Active', daysOpen: 0 },
          { date: '2026-01-27', type: 'System Alert', property: 'Cypress Creek HOA', description: 'Scheduled maintenance due', reportedBy: 'System Auto-Alert', status: 'Active', daysOpen: 1 },
        );
      }
      
      // Filter by date range
      const fromDate = new Date(emergencyReportDateRange.from);
      const toDate = new Date(emergencyReportDateRange.to);
      toDate.setHours(23, 59, 59, 999);
      
      const filteredItems = allItems.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= fromDate && itemDate <= toDate;
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data rows
      const rows = filteredItems.map((item: any) => ({
        "Date": item.date ? format(new Date(item.date), "MM/dd/yyyy") : "",
        "Type": item.type,
        "Property": item.property,
        "Description": item.description,
        "Reported By": item.reportedBy,
        "Status": item.status,
        "Days Open": item.daysOpen,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      
      // Set column widths
      ws["!cols"] = [
        { wch: 12 }, // Date
        { wch: 15 }, // Type
        { wch: 25 }, // Property
        { wch: 35 }, // Description
        { wch: 25 }, // Reported By
        { wch: 15 }, // Status
        { wch: 10 }, // Days Open
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Emergency Report");

      // Generate filename
      const fromDateStr = emergencyReportDateRange.from.replace(/-/g, "");
      const toDateStr = emergencyReportDateRange.to.replace(/-/g, "");
      const fileName = `Breakpoint_Emergency_Report_${fromDateStr}_to_${toDateStr}.xlsx`;

      // Download
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: "Report downloaded successfully",
        description: `${filteredItems.length} records exported to Excel`,
      });
      setShowEmergencyReportModal(false);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not generate the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEmergencyReportLoading(false);
    }
  };

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
      <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1E293B]">Overview</h1>
            <p className="text-[#64748B] text-sm">Real-time business intelligence dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowEmployeeTypeModal(true)}
              className="gap-2 bg-[#0077b6] hover:bg-[#006299] text-white rounded-lg"
              data-testid="button-add-employee"
            >
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Button>
            <Button
              onClick={() => setShowPropertyModal(true)}
              variant="outline"
              className="gap-2 border-[#0077b6] text-[#0077b6] hover:bg-[#0077b6]/10 rounded-lg"
              data-testid="button-add-property"
            >
              <Building2 className="w-4 h-4" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Pending Approvals Metrics + Recent Announcements Row */}
        <div className="grid grid-cols-10 gap-6">
          {/* Pending Approvals Metrics - 70% width */}
          <div className="col-span-7">
            <Card className="bg-white h-full rounded-2xl" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
              <CardHeader className="pb-3 px-6 pt-6">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#0077b6]" />
                  Pipeline Status
                </CardTitle>
                <CardDescription>Work items by status with monthly trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  {/* Pending Estimates - Light orange gradient with left border */}
                  <div className="flex flex-col items-center p-5 rounded-xl border-l-4 border-l-[#f97316] transition-transform hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' }}>
                    <div className="w-14 h-14 rounded-full bg-[#f97316] flex items-center justify-center mb-3" style={{ boxShadow: '0 8px 16px -4px rgba(249, 115, 22, 0.4)' }}>
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-4xl font-bold text-slate-900">{metrics?.estimates.pendingApproval || 0}</span>
                    <span className="text-sm font-medium text-slate-600 mt-1">Pending Estimates</span>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">+12%</span>
                      <span className="text-xs text-slate-400">Last Month</span>
                    </div>
                  </div>

                  {/* Awaiting Scheduling - Light ocean blue gradient with left border */}
                  <div className="flex flex-col items-center p-5 rounded-xl border-l-4 border-l-[#0077b6] transition-transform hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)' }}>
                    <div className="w-14 h-14 rounded-full bg-[#0077b6] flex items-center justify-center mb-3" style={{ boxShadow: '0 8px 16px -4px rgba(0, 119, 182, 0.4)' }}>
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-4xl font-bold text-slate-900">{summary?.needsScheduling || 0}</span>
                    <span className="text-sm font-medium text-slate-600 mt-1">Awaiting Scheduling</span>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingDown className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600">-8%</span>
                      <span className="text-xs text-slate-400">Last Month</span>
                    </div>
                  </div>

                  {/* Ready to Invoice - Light teal gradient with left border */}
                  <div className="flex flex-col items-center p-5 rounded-xl border-l-4 border-l-[#14b8a6] transition-transform hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)' }}>
                    <div className="w-14 h-14 rounded-full bg-[#14b8a6] flex items-center justify-center mb-3" style={{ boxShadow: '0 8px 16px -4px rgba(20, 184, 166, 0.4)' }}>
                      <Receipt className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-4xl font-bold text-slate-900">{metrics?.estimates.readyToInvoice || 0}</span>
                    <span className="text-sm font-medium text-slate-600 mt-1">Ready to Invoice</span>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">+5%</span>
                      <span className="text-xs text-slate-400">Last Month</span>
                    </div>
                  </div>

                  {/* Invoiced Unpaid - Light green gradient with left border */}
                  <div className="flex flex-col items-center p-5 rounded-xl border-l-4 border-l-[#22c55e] transition-transform hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' }}>
                    <div className="w-14 h-14 rounded-full bg-[#22c55e] flex items-center justify-center mb-3" style={{ boxShadow: '0 8px 16px -4px rgba(34, 197, 94, 0.4)' }}>
                      <DollarSign className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-4xl font-bold text-slate-900">{metrics?.invoices?.unpaid || 0}</span>
                    <span className="text-sm font-medium text-slate-600 mt-1">Invoiced Unpaid</span>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">+3%</span>
                      <span className="text-xs text-slate-400">Last Month</span>
                    </div>
                  </div>

                  {/* Overdue - Light red gradient with left border */}
                  <div className="flex flex-col items-center p-5 rounded-xl border-l-4 border-l-[#ef4444] transition-transform hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)' }}>
                    <div className="w-14 h-14 rounded-full bg-[#ef4444] flex items-center justify-center mb-3" style={{ boxShadow: '0 8px 16px -4px rgba(239, 68, 68, 0.4)' }}>
                      <AlertCircle className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-4xl font-bold text-slate-900">{metrics?.estimates.declined || 0}</span>
                    <span className="text-sm font-medium text-slate-600 mt-1">Overdue</span>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingDown className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">-15%</span>
                      <span className="text-xs text-slate-400">Last Month</span>
                    </div>
                  </div>
                </div>

                {/* Summary Row */}
                <div className="border-t border-slate-200 mt-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Total Estimates */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#0077b6]" />
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-slate-900">{metrics?.estimates.total || 0}</span>
                        <p className="text-sm text-slate-500">Total Estimates</p>
                      </div>
                    </div>

                    {/* Declined */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-red-600">{metrics?.estimates.declined || 0}</span>
                        <p className="text-sm text-slate-500">{metrics?.estimates.declined || 0} declined</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Announcements - 30% width */}
          <div className="col-span-3">
            <Card className="bg-white h-full rounded-2xl" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
              <CardHeader className="pb-3 px-6 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-[#0077b6]" />
                      Recent Announcements
                    </CardTitle>
                    <CardDescription>Updates from team chat</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                  <Megaphone className="w-full h-full text-[#0077b6]" />
                </div>
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-3">
                    {/* Sample announcements - these would pull from chat/announcements */}
                    {[
                      { id: 1, title: "New safety protocol for pool chemicals", author: "Sarah Johnson", role: "Operations Manager", time: "2 hours ago" },
                      { id: 2, title: "Holiday schedule reminder - Memorial Day", author: "Mike Chen", role: "HR", time: "Yesterday" },
                      { id: 3, title: "Equipment maintenance training next week", author: "Tom Wilson", role: "Training Lead", time: "2 days ago" },
                      { id: 4, title: "Customer feedback improvements Q1", author: "Lisa Davis", role: "Customer Success", time: "3 days ago" },
                      { id: 5, title: "New truck assignments for south region", author: "James Brown", role: "Fleet Manager", time: "1 week ago" },
                    ].map((announcement) => (
                      <div 
                        key={announcement.id}
                        className="p-3 rounded-lg bg-slate-50 hover:bg-sky-50 transition-colors cursor-pointer border border-slate-100"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-[#0077b6]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{announcement.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500">{announcement.author}</span>
                              <span className="text-xs text-slate-300">•</span>
                              <span className="text-xs text-slate-400">{announcement.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-[#0077b6] hover:text-[#006299] hover:bg-sky-50"
                    onClick={() => navigate("/chat")}
                  >
                    View All Announcements
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* TOP ROW: Emergency & Alerts Status (left) | Estimate Pipeline + Financial Summary (right) */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column: Emergency & Alerts Status */}
          <Card className="bg-white rounded-2xl" data-testid="card-emergency-alerts-status" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Emergency & Alerts Status
                </CardTitle>
                <CardDescription>Active issues requiring attention</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/emergencies")} className="text-red-600 hover:text-red-700 group">
                View All <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              // Use sample counts for demonstration (fallback to real data when available)
              const realEmergencyCount = metrics?.emergencies?.open ?? 0;
              const realAlertCount = metrics?.alerts?.active ?? 0;
              const realIssueCount = metrics?.reportedIssues?.count ?? 0;
              
              const emergencyCount = realEmergencyCount > 0 ? realEmergencyCount : 30;
              const alertCount = realAlertCount > 0 ? realAlertCount : 5228;
              const issueCount = realIssueCount > 0 ? realIssueCount : 40;
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
                { id: 'si1', propertyName: 'Pool', description: 'Alert', reportedBy: 'Unassigned', reporterRole: '', status: 'Pending review', timeAgo: '22 days', type: 'issue' },
                { id: 'si2', propertyName: 'Marina Bay Club', description: 'Customer reported cloudy water', reportedBy: 'John Smith', reporterRole: 'Customer', status: 'Pending review', timeAgo: '1 day ago', type: 'issue' },
                { id: 'si3', propertyName: 'Sunset Marina', description: 'Tile damage reported', reportedBy: 'Jane Doe', reporterRole: 'Customer', status: 'Pending review', timeAgo: '3 days ago', type: 'issue' },
                { id: 'si4', propertyName: 'Desert Springs Resort', description: 'Heater malfunction', reportedBy: 'Mike Johnson', reporterRole: 'Tech', status: 'Critical', timeAgo: '5 days ago', type: 'issue' },
                { id: 'si5', propertyName: 'Palm Gardens Community', description: 'Control panel error', reportedBy: 'Sarah Williams', reporterRole: 'Tech', status: 'High', timeAgo: '2 days ago', type: 'issue' },
                { id: 'si6', propertyName: 'Lakewood Country Club', description: 'Pump noise issue', reportedBy: 'Customer', reporterRole: '', status: 'Pending review', timeAgo: '4 days ago', type: 'issue' },
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
                // Show more items when "all" is selected - mix of all types
                return [
                  ...emergencyItems.slice(0, 2),
                  ...issueItems.slice(0, 3),
                  ...alertItems.slice(0, 2),
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
                            {/* Issues segment (ocean blue) */}
                            {issueLength > 0 && (
                              <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={selectedStatusCategory === 'issues' ? '#006299' : '#0077b6'}
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
                            ? 'bg-sky-50 border border-sky-200' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#0077b6]"></div>
                          <span className="text-sm font-medium text-slate-700">Reported Issues</span>
                        </div>
                        <span className="text-sm font-bold text-[#0077b6]">{issueCount}</span>
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
                  <div className="w-1/2 border-l border-slate-100 pl-6 flex flex-col">
                    <p className="text-xs font-medium text-slate-500 mb-3">
                      {selectedStatusCategory === 'all' ? 'Recent Items' : 
                       selectedStatusCategory === 'emergencies' ? 'Emergencies' :
                       selectedStatusCategory === 'alerts' ? 'Alerts' : 'Reported Issues'}
                    </p>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>
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
                                  <Badge className="bg-sky-100 text-[#0077b6] text-[9px] shrink-0">{item.status}</Badge>
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
                    
                    {/* Download Report Button */}
                    <Button
                      onClick={() => setShowEmergencyReportModal(true)}
                      className="w-full mt-4 gap-2 bg-[#0077b6] hover:bg-[#006299] text-white rounded-lg shadow-sm hover:shadow-md transition-all"
                      data-testid="button-download-emergency-report"
                    >
                      <Download className="w-4 h-4" />
                      Download Report
                    </Button>
                  </div>
                </div>
              );
            })()}
          </CardContent>
          </Card>

          {/* Right Column: Stacked Estimate Pipeline + Financial Summary */}
          <div className="flex flex-col gap-6">
            <Card className="bg-white rounded-2xl" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
              <CardHeader className="pb-3 px-6 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#0077b6]" />
                      Estimate Pipeline
                    </CardTitle>
                    <CardDescription>Job estimates by status</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/estimates")} className="text-[#0077b6] hover:text-[#006299] group">
                    View All <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const pipelineData = [
                    { label: "Draft", value: metrics?.values?.draft || 0, color: "#64748b" },
                    { label: "Pending Approval", value: metrics?.values?.pendingApproval || 0, color: "#f97316" },
                    { label: "Approved", value: metrics?.values?.approved || 0, color: "#22c55e" },
                    { label: "Scheduled", value: metrics?.values?.scheduled || 0, color: "#0077b6" },
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

            <Card className="bg-white rounded-2xl flex-1" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
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
                  <Button
                    onClick={() => setShowReportModal(true)}
                    className="w-full gap-2 bg-[#0077b6] hover:bg-[#006299] text-white rounded-lg shadow-sm hover:shadow-md transition-all"
                    data-testid="button-download-report"
                  >
                    <Download className="w-4 h-4" />
                    Download Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* BOTTOM ROW: Equipment Tracker (left) | Coverage Calendar (right) */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column: Equipment Tracker */}
          <Card className="bg-white rounded-2xl" data-testid="card-equipment-tracker" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Cog className="w-5 h-5 text-amber-600" />
                    Equipment Tracker
                  </CardTitle>
                  <CardDescription>Equipment needing repair soon</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/equipment")} className="text-amber-600 hover:text-amber-700 group">
                  View All <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const equipmentItems = [
                  { id: 'eq1', name: 'Variable Speed Pump', property: 'Sunset Hills HOA', status: 'due_soon', daysUntil: 5 },
                  { id: 'eq2', name: 'Sand Filter', property: 'Marina Bay Club', status: 'overdue', daysOverdue: 3 },
                  { id: 'eq3', name: 'Heat Pump', property: 'Desert Springs Resort', status: 'due_soon', daysUntil: 12 },
                  { id: 'eq4', name: 'Chlorinator', property: 'Palm Gardens Community', status: 'scheduled', scheduledDate: 'Jan 30' },
                  { id: 'eq5', name: 'Pool Motor', property: 'Lakewood Country Club', status: 'overdue', daysOverdue: 7 },
                  { id: 'eq6', name: 'Automation System', property: 'Vista Grande HOA', status: 'due_soon', daysUntil: 3 },
                ];
                
                const getStatusBadge = (item: any) => {
                  if (item.status === 'overdue') {
                    return (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                        Overdue by {item.daysOverdue} days
                      </Badge>
                    );
                  } else if (item.status === 'scheduled') {
                    return (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        Scheduled {item.scheduledDate}
                      </Badge>
                    );
                  } else {
                    return (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                        Due in {item.daysUntil} days
                      </Badge>
                    );
                  }
                };
                
                const getConditionIndicator = (item: any) => {
                  if (item.status === 'overdue') return 'bg-red-500';
                  if (item.status === 'scheduled') return 'bg-green-500';
                  return 'bg-amber-500';
                };
                
                return (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {equipmentItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getConditionIndicator(item)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                          <p className="text-xs text-slate-500 truncate">{item.property}</p>
                        </div>
                        {getStatusBadge(item)}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Right Column: Coverage Calendar */}
          <Card className="bg-white rounded-2xl" data-testid="card-coverage-calendar-main" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#0077b6]" />
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
                
                // Sample coverage activities with specific dates (2026)
                const sampleCoverages = [
                  { id: 'sample1', startDate: '2026-01-27', endDate: '2026-01-27', coveringTechName: 'Mike Johnson', originalTechName: 'Jorge Martinez', propertyName: 'Sunset Hills HOA', reason: null },
                  { id: 'sample2', startDate: '2026-01-29', endDate: '2026-01-29', coveringTechName: 'Sarah Chen', originalTechName: 'David Wilson', propertyName: 'Palm Gardens Community', reason: null },
                  { id: 'sample3', startDate: '2026-02-02', endDate: '2026-02-02', coveringTechName: 'Jorge Martinez', originalTechName: 'Mike Johnson', propertyName: 'Desert Springs Resort', reason: null },
                  { id: 'sample4', startDate: '2026-02-04', endDate: '2026-02-04', coveringTechName: 'All techs', originalTechName: '', propertyName: 'main office', reason: 'Training day' },
                  { id: 'sample5', startDate: '2026-01-29', endDate: '2026-01-29', coveringTechName: 'Kevin Enriquez', originalTechName: 'Sarah Chen', propertyName: 'Vista Grande HOA', reason: null },
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
                          
                          // Generate tooltip text for coverage preview
                          const tooltipText = hasCoverage 
                            ? dayCoverages.map((c: any) => 
                                c.reason === 'Training day' 
                                  ? `Training day at ${c.propertyName}`
                                  : `${c.coveringTechName} covering for ${c.originalTechName}`
                              ).join('\n')
                            : '';
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedDate(new Date(year, month, day))}
                              title={hasCoverage ? tooltipText : undefined}
                              className={`h-9 w-full rounded-md text-xs font-medium flex flex-col items-center justify-center transition-colors relative group
                                ${isSelected ? 'bg-[#0077b6] text-white' : isToday ? 'bg-sky-100 text-[#0077b6]' : 'hover:bg-slate-100 text-slate-700'}
                              `}
                            >
                              <span>{day}</span>
                              {hasCoverage && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  {dayCoverages.length === 1 ? (
                                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#0077b6]'}`} />
                                  ) : dayCoverages.length === 2 ? (
                                    <>
                                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#0077b6]'}`} />
                                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#48cae4]'}`} />
                                    </>
                                  ) : (
                                    <div className={`w-2.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#0077b6]'}`} />
                                  )}
                                </div>
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
                              <div key={c.id || idx} className="p-2.5 rounded-lg bg-sky-50 border border-sky-100">
                                <p className="text-xs text-[#0077b6] font-medium">{dateStr} - {dayOfWeek}</p>
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

        {/* Three-Column Lower Section: Truck Maintenance + Chemical Orders + Top Chemicals */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-white rounded-2xl" data-testid="card-truck-maintenance" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="w-5 h-5 text-slate-700" />
                    Truck Maintenance
                  </CardTitle>
                  <CardDescription>Vehicles needing service soon</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/fleet")} className="text-slate-600 hover:text-slate-700 group">
                  View All <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const truckMaintenanceItems = [
                  { id: 'tm1', truckNumber: '07', technicianName: 'Mike Johnson', maintenanceType: 'Oil Change', status: 'due_soon', daysUntil: 3 },
                  { id: 'tm2', truckNumber: '12', technicianName: 'Jorge Martinez', maintenanceType: 'Tire Rotation', status: 'overdue', daysOverdue: 5 },
                  { id: 'tm3', truckNumber: '03', technicianName: 'Sarah Chen', maintenanceType: 'Brake Inspection', status: 'due_soon', daysUntil: 10 },
                  { id: 'tm4', truckNumber: '15', technicianName: 'David Wilson', maintenanceType: 'Full Service', status: 'scheduled', scheduledDate: 'Jan 30' },
                  { id: 'tm5', truckNumber: '09', technicianName: 'Kevin Enriquez', maintenanceType: 'Oil Change', status: 'overdue', daysOverdue: 2 },
                ];
                
                const getStatusBadge = (item: any) => {
                  if (item.status === 'overdue') {
                    return (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">
                        Overdue {item.daysOverdue}d
                      </Badge>
                    );
                  } else if (item.status === 'scheduled') {
                    return (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">
                        Scheduled
                      </Badge>
                    );
                  } else {
                    return (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">
                        Due in {item.daysUntil}d
                      </Badge>
                    );
                  }
                };
                
                const getConditionIndicator = (item: any) => {
                  if (item.status === 'overdue') return 'bg-red-500';
                  if (item.status === 'scheduled') return 'bg-green-500';
                  return 'bg-amber-500';
                };
                
                return (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>
                    {truckMaintenanceItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => navigate("/fleet")}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getConditionIndicator(item)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">Truck #{item.truckNumber}</span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-600 truncate">{item.technicianName}</span>
                          </div>
                          <p className="text-xs text-slate-500">{item.maintenanceType}</p>
                        </div>
                        {getStatusBadge(item)}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Chemical Orders by Property */}
          <Card className="bg-white rounded-2xl" data-testid="card-chemical-orders-by-property" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-[#0077b6]" />
                    Chemical Orders by Property
                  </CardTitle>
                  <CardDescription>Pending orders that need to be sent</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/chemicals")} className="text-[#0077b6] hover:text-[#006299] group">
                  View All <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                {(() => {
                  // Use sample data for demonstration if no real data
                  const sampleChemicalOrders = [
                    { propertyName: 'Sunset Hills HOA', count: 8 },
                    { propertyName: 'Marina Bay Club', count: 6 },
                    { propertyName: 'Ocean View Resort', count: 5 },
                    { propertyName: 'Palm Gardens Community', count: 4 },
                    { propertyName: 'Desert Springs Resort', count: 3 },
                    { propertyName: 'Vista Grande HOA', count: 2 },
                  ];
                  
                  const ordersData = chemicalOrdersByProperty.length > 0 ? chemicalOrdersByProperty : sampleChemicalOrders;
                  const maxCount = Math.max(...ordersData.map((p: any) => p.count), 1);
                  const totalOrders = ordersData.reduce((sum: number, p: any) => sum + p.count, 0);
                  
                  return (
                    <div className="space-y-3">
                      {ordersData.map((property: any, idx: number) => {
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
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Top Chemicals Ordered Card */}
          <Card className="bg-white rounded-2xl" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-[#0077b6]" />
                    Top Chemicals Ordered
                  </CardTitle>
                  <CardDescription>Most frequently ordered chemicals</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-[#0077b6] hover:text-[#006299] group"
                  onClick={() => navigate("/chemicals")}
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const topChemicals = [
                  { name: 'Liquid Chlorine', percentage: 70, color: '#0077b6', textColor: '#ffffff' },
                  { name: 'Muriatic Acid', percentage: 20, color: '#14b8a6', textColor: '#ffffff' },
                  { name: 'pH Increaser', percentage: 10, color: '#f97316', textColor: '#ffffff' },
                ];
                
                return (
                  <div className="flex flex-col items-center">
                    {/* Overlapping Bubble Chart */}
                    <div className="relative h-[180px] w-full flex items-center justify-center">
                      <svg viewBox="0 0 300 180" className="w-full h-full max-w-[280px]">
                        {/* Largest circle - Liquid Chlorine (70%) */}
                        <circle 
                          cx="100" 
                          cy="95" 
                          r="70" 
                          fill={topChemicals[0].color}
                          opacity="0.85"
                          className="drop-shadow-sm"
                        />
                        <text 
                          x="100" 
                          y="95" 
                          textAnchor="middle" 
                          dominantBaseline="middle"
                          className="text-2xl font-bold"
                          fill={topChemicals[0].textColor}
                        >
                          {topChemicals[0].percentage}%
                        </text>
                        
                        {/* Medium circle - Muriatic Acid (20%) */}
                        <circle 
                          cx="190" 
                          cy="75" 
                          r="50" 
                          fill={topChemicals[1].color}
                          opacity="0.85"
                          className="drop-shadow-sm"
                        />
                        <text 
                          x="190" 
                          y="75" 
                          textAnchor="middle" 
                          dominantBaseline="middle"
                          className="text-xl font-bold"
                          fill={topChemicals[1].textColor}
                        >
                          {topChemicals[1].percentage}%
                        </text>
                        
                        {/* Smallest circle - pH Increaser (10%) */}
                        <circle 
                          cx="230" 
                          cy="130" 
                          r="35" 
                          fill={topChemicals[2].color}
                          opacity="0.85"
                          className="drop-shadow-sm"
                        />
                        <text 
                          x="230" 
                          y="130" 
                          textAnchor="middle" 
                          dominantBaseline="middle"
                          className="text-base font-bold"
                          fill={topChemicals[2].textColor}
                        >
                          {topChemicals[2].percentage}%
                        </text>
                      </svg>
                    </div>
                    
                    {/* Legend */}
                    <div className="w-full pt-4 border-t border-slate-100 mt-2 space-y-2">
                      {topChemicals.map((chemical, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: chemical.color }}
                          />
                          <span className="text-sm text-slate-700 flex-1">{chemical.name}</span>
                          <span className="text-sm font-medium text-slate-900">{chemical.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Inactive Technicians Section */}
        {(metrics?.technicians?.inactive?.length || 0) > 0 && (
          <Card className="bg-white rounded-2xl border-l-4 border-l-amber-500" data-testid="card-inactive-technicians" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }}>
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
            className="bg-white rounded-2xl cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-[#0077b6]" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)' }} 
            onClick={() => navigate("/repair-queue")}
            data-testid="card-repair-tech-workload"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#0077b6]" />
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
                            : "bg-sky-100 text-[#0077b6]"
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

      {/* Employee Type Selection Modal */}
      <Dialog open={showEmployeeTypeModal} onOpenChange={setShowEmployeeTypeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0077b6]" />
              Select Employee Type
            </DialogTitle>
            <DialogDescription>
              Choose the type of employee you want to add
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <button
              onClick={() => handleEmployeeTypeSelect("service")}
              className="w-full p-4 flex items-center gap-4 rounded-lg border border-slate-200 hover:border-[#0077b6] hover:bg-[#0077b6]/5 transition-all text-left"
              data-testid="button-employee-type-service"
            >
              <div className="p-3 rounded-lg bg-sky-100">
                <Wrench className="w-6 h-6 text-[#0077b6]" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Service Technician</p>
                <p className="text-sm text-slate-500">Regular pool maintenance and service</p>
              </div>
            </button>
            <button
              onClick={() => handleEmployeeTypeSelect("repair")}
              className="w-full p-4 flex items-center gap-4 rounded-lg border border-slate-200 hover:border-[#0077b6] hover:bg-[#0077b6]/5 transition-all text-left"
              data-testid="button-employee-type-repair"
            >
              <div className="p-3 rounded-lg bg-amber-100">
                <Hammer className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Repair Technician</p>
                <p className="text-sm text-slate-500">Equipment repairs and installations</p>
              </div>
            </button>
            <button
              onClick={() => handleEmployeeTypeSelect("supervisor")}
              className="w-full p-4 flex items-center gap-4 rounded-lg border border-slate-200 hover:border-[#0077b6] hover:bg-[#0077b6]/5 transition-all text-left"
              data-testid="button-employee-type-supervisor"
            >
              <div className="p-3 rounded-lg bg-slate-100">
                <HardHat className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Supervisor</p>
                <p className="text-sm text-slate-500">Team lead and operations oversight</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Form Modal */}
      <Dialog open={showEmployeeFormModal} onOpenChange={(open) => {
        setShowEmployeeFormModal(open);
        if (!open) setSelectedEmployeeType(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEmployeeType === "service" && <Wrench className="w-5 h-5 text-[#0077b6]" />}
              {selectedEmployeeType === "repair" && <Hammer className="w-5 h-5 text-amber-600" />}
              {selectedEmployeeType === "supervisor" && <HardHat className="w-5 h-5 text-slate-600" />}
              Add {selectedEmployeeType === "service" ? "Service Technician" : selectedEmployeeType === "repair" ? "Repair Technician" : "Supervisor"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-first-name">First Name *</Label>
                <Input
                  id="emp-first-name"
                  value={employeeForm.firstName}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, firstName: e.target.value })}
                  placeholder="John"
                  data-testid="input-employee-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-last-name">Last Name *</Label>
                <Input
                  id="emp-last-name"
                  value={employeeForm.lastName}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, lastName: e.target.value })}
                  placeholder="Doe"
                  data-testid="input-employee-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-phone">Phone Number *</Label>
              <Input
                id="emp-phone"
                type="tel"
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                placeholder="(555) 123-4567"
                data-testid="input-employee-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-email">Email *</Label>
              <Input
                id="emp-email"
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                placeholder="john.doe@example.com"
                data-testid="input-employee-email"
              />
            </div>
            {selectedEmployeeType !== "supervisor" && (
              <div className="space-y-2">
                <Label htmlFor="emp-truck">Truck #</Label>
                <Input
                  id="emp-truck"
                  value={employeeForm.truckNumber}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, truckNumber: e.target.value })}
                  placeholder="T-001"
                  data-testid="input-employee-truck"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="emp-status">Status</Label>
              <Select value={employeeForm.active ? "active" : "inactive"} onValueChange={(v) => setEmployeeForm({ ...employeeForm, active: v === "active" })}>
                <SelectTrigger data-testid="select-employee-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEmployeeFormModal(false);
              setSelectedEmployeeType(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleEmployeeSubmit}
              disabled={!employeeForm.firstName || !employeeForm.lastName || !employeeForm.phone || !employeeForm.email || createEmployeeMutation.isPending}
              className="bg-[#0077b6] hover:bg-[#006299]"
              data-testid="button-save-employee"
            >
              {createEmployeeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Employee"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Property Modal */}
      <Dialog open={showPropertyModal} onOpenChange={setShowPropertyModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0077b6]" />
              Add New Property
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prop-name">Property Name *</Label>
                <Input
                  id="prop-name"
                  value={propertyForm.name}
                  onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                  placeholder="Sunset Plaza Pool"
                  data-testid="input-property-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-customer">Customer/Company Name *</Label>
                <Input
                  id="prop-customer"
                  value={propertyForm.customerName}
                  onChange={(e) => setPropertyForm({ ...propertyForm, customerName: e.target.value })}
                  placeholder="Sunset HOA"
                  data-testid="input-property-customer"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prop-status">Status</Label>
                <Select value={propertyForm.status} onValueChange={(v) => setPropertyForm({ ...propertyForm, status: v })}>
                  <SelectTrigger data-testid="select-property-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-service">Service Type</Label>
                <Select value={propertyForm.serviceLevel} onValueChange={(v) => setPropertyForm({ ...propertyForm, serviceLevel: v })}>
                  <SelectTrigger data-testid="select-property-service">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="oncall">On-Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prop-email">Email</Label>
                <Input
                  id="prop-email"
                  type="email"
                  value={propertyForm.email}
                  onChange={(e) => setPropertyForm({ ...propertyForm, email: e.target.value })}
                  placeholder="contact@sunset-hoa.com"
                  data-testid="input-property-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-phone">Phone</Label>
                <Input
                  id="prop-phone"
                  type="tel"
                  value={propertyForm.phone}
                  onChange={(e) => setPropertyForm({ ...propertyForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  data-testid="input-property-phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-address">Address *</Label>
              <Input
                id="prop-address"
                value={propertyForm.address}
                onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                placeholder="123 Main Street"
                data-testid="input-property-address"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prop-city">City *</Label>
                <Input
                  id="prop-city"
                  value={propertyForm.city}
                  onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                  placeholder="Miami"
                  data-testid="input-property-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-state">State *</Label>
                <Input
                  id="prop-state"
                  value={propertyForm.state}
                  onChange={(e) => setPropertyForm({ ...propertyForm, state: e.target.value })}
                  placeholder="FL"
                  data-testid="input-property-state"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-zip">ZIP Code *</Label>
                <Input
                  id="prop-zip"
                  value={propertyForm.zip}
                  onChange={(e) => setPropertyForm({ ...propertyForm, zip: e.target.value })}
                  placeholder="33101"
                  data-testid="input-property-zip"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-tech">Assigned Technician</Label>
              <Select value={propertyForm.assignedTechnicianId} onValueChange={(v) => setPropertyForm({ ...propertyForm, assignedTechnicianId: v })}>
                <SelectTrigger data-testid="select-property-technician">
                  <SelectValue placeholder="Select a technician..." />
                </SelectTrigger>
                <SelectContent>
                  {serviceTechnicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.firstName} {tech.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-tags">Tags (comma-separated)</Label>
              <Input
                id="prop-tags"
                value={propertyForm.tags}
                onChange={(e) => setPropertyForm({ ...propertyForm, tags: e.target.value })}
                placeholder="HOA, commercial, heated pool"
                data-testid="input-property-tags"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-notes">Notes</Label>
              <Textarea
                id="prop-notes"
                value={propertyForm.notes}
                onChange={(e) => setPropertyForm({ ...propertyForm, notes: e.target.value })}
                placeholder="Any additional notes about this property..."
                rows={3}
                data-testid="input-property-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPropertyModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePropertySubmit}
              disabled={
                !propertyForm.name || !propertyForm.customerName || !propertyForm.address ||
                !propertyForm.city || !propertyForm.state || !propertyForm.zip ||
                createPropertyMutation.isPending
              }
              className="bg-[#0077b6] hover:bg-[#006299]"
              data-testid="button-save-property"
            >
              {createPropertyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Property"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Financial Report Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-[#0077b6]" />
              Download Financial Report
            </DialogTitle>
            <DialogDescription>
              Select date range and filters for your report
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-from">From Date</Label>
                <Input
                  id="report-from"
                  type="date"
                  value={reportDateRange.from}
                  onChange={(e) => setReportDateRange({ ...reportDateRange, from: e.target.value })}
                  data-testid="input-report-from-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-to">To Date</Label>
                <Input
                  id="report-to"
                  type="date"
                  value={reportDateRange.to}
                  onChange={(e) => setReportDateRange({ ...reportDateRange, to: e.target.value })}
                  data-testid="input-report-to-date"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange("week")}
                className="text-xs"
                data-testid="button-quick-week"
              >
                This Week
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange("month")}
                className="text-xs"
                data-testid="button-quick-month"
              >
                This Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange("quarter")}
                className="text-xs"
                data-testid="button-quick-quarter"
              >
                This Quarter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange("year")}
                className="text-xs"
                data-testid="button-quick-year"
              >
                This Year
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Include in Report:</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-pending"
                    checked={reportFilters.pendingApproval}
                    onCheckedChange={(checked) => setReportFilters({ ...reportFilters, pendingApproval: !!checked })}
                    data-testid="checkbox-pending-approval"
                  />
                  <Label htmlFor="filter-pending" className="text-sm text-slate-600 cursor-pointer">
                    Pending Approval
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-scheduled"
                    checked={reportFilters.scheduled}
                    onCheckedChange={(checked) => setReportFilters({ ...reportFilters, scheduled: !!checked })}
                    data-testid="checkbox-scheduled"
                  />
                  <Label htmlFor="filter-scheduled" className="text-sm text-slate-600 cursor-pointer">
                    Scheduled
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-ready"
                    checked={reportFilters.readyToInvoice}
                    onCheckedChange={(checked) => setReportFilters({ ...reportFilters, readyToInvoice: !!checked })}
                    data-testid="checkbox-ready-to-invoice"
                  />
                  <Label htmlFor="filter-ready" className="text-sm text-slate-600 cursor-pointer">
                    Ready to Invoice
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-invoiced"
                    checked={reportFilters.invoiced}
                    onCheckedChange={(checked) => setReportFilters({ ...reportFilters, invoiced: !!checked })}
                    data-testid="checkbox-invoiced"
                  />
                  <Label htmlFor="filter-invoiced" className="text-sm text-slate-600 cursor-pointer">
                    Invoiced
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-paid"
                    checked={reportFilters.paid}
                    onCheckedChange={(checked) => setReportFilters({ ...reportFilters, paid: !!checked })}
                    data-testid="checkbox-paid"
                  />
                  <Label htmlFor="filter-paid" className="text-sm text-slate-600 cursor-pointer">
                    Paid
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDownloadReport}
              disabled={reportLoading}
              className="gap-2 bg-[#0077b6] hover:bg-[#006299]"
              data-testid="button-download-excel"
            >
              {reportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Excel
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Emergency & Issues Report Modal */}
      <Dialog open={showEmergencyReportModal} onOpenChange={setShowEmergencyReportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Download Emergency & Issues Report
            </DialogTitle>
            <DialogDescription>
              Select date range and filters for your report
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency-report-from">From Date</Label>
                <Input
                  id="emergency-report-from"
                  type="date"
                  value={emergencyReportDateRange.from}
                  onChange={(e) => setEmergencyReportDateRange({ ...emergencyReportDateRange, from: e.target.value })}
                  data-testid="input-emergency-report-from-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency-report-to">To Date</Label>
                <Input
                  id="emergency-report-to"
                  type="date"
                  value={emergencyReportDateRange.to}
                  onChange={(e) => setEmergencyReportDateRange({ ...emergencyReportDateRange, to: e.target.value })}
                  data-testid="input-emergency-report-to-date"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEmergencyQuickDateRange("week")}
                className="text-xs"
                data-testid="button-emergency-quick-week"
              >
                This Week
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEmergencyQuickDateRange("month")}
                className="text-xs"
                data-testid="button-emergency-quick-month"
              >
                This Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEmergencyQuickDateRange("quarter")}
                className="text-xs"
                data-testid="button-emergency-quick-quarter"
              >
                This Quarter
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Include in Report:</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-emergencies"
                    checked={emergencyReportFilters.emergencies}
                    onCheckedChange={(checked) => setEmergencyReportFilters({ ...emergencyReportFilters, emergencies: !!checked })}
                    data-testid="checkbox-emergencies"
                  />
                  <Label htmlFor="filter-emergencies" className="text-sm text-slate-600 cursor-pointer">
                    Emergencies
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-reported-issues"
                    checked={emergencyReportFilters.reportedIssues}
                    onCheckedChange={(checked) => setEmergencyReportFilters({ ...emergencyReportFilters, reportedIssues: !!checked })}
                    data-testid="checkbox-reported-issues"
                  />
                  <Label htmlFor="filter-reported-issues" className="text-sm text-slate-600 cursor-pointer">
                    Reported Issues
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-system-alerts"
                    checked={emergencyReportFilters.systemAlerts}
                    onCheckedChange={(checked) => setEmergencyReportFilters({ ...emergencyReportFilters, systemAlerts: !!checked })}
                    data-testid="checkbox-system-alerts"
                  />
                  <Label htmlFor="filter-system-alerts" className="text-sm text-slate-600 cursor-pointer">
                    System Alerts (optional)
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmergencyReportModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDownloadEmergencyReport}
              disabled={emergencyReportLoading}
              className="gap-2 bg-[#0077b6] hover:bg-[#006299]"
              data-testid="button-download-emergency-excel"
            >
              {emergencyReportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Excel
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
