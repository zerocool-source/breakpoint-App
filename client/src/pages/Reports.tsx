import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay, startOfMonth, subMonths } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FileBarChart, CalendarIcon, Download, FileText, DollarSign,
  TrendingUp, Wrench, Droplets, Wind, Users, Search, Loader2,
  CheckCircle, Clock, Package, ArrowUpDown, MapPin, User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportsData {
  metrics: {
    totalRevenue: number;
    estimatesSent: { count: number; value: number };
    estimatesApproved: { count: number; value: number };
    invoicesSent: { count: number; value: number };
    invoicesPaid: { count: number; value: number };
    outstandingBalance: number;
    serviceRepairs: { count: number; value: number };
    windyDayCleanups: { count: number; value: number };
    chemicalOrders: { count: number; value: number };
    commissionsOwed: number;
    commissionsPaid: number;
  };
  charts: {
    revenueBySource: Array<{ name: string; value: number }>;
    estimatesStatusBreakdown: Array<{ name: string; value: number }>;
    repairsByType: Array<{ name: string; value: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number }>;
    estimatesVsInvoices: Array<{ month: string; estimates: number; invoices: number }>;
    repairsByTechnician: Array<{ name: string; count: number }>;
    commissionsByTechnician: Array<{ name: string; amount: number }>;
  };
  logs: {
    repairs: Array<any>;
    chemicals: Array<any>;
    commissions: Array<any>;
    equipment: Array<any>;
    invoices: Array<any>;
  };
}

interface CommissionData {
  technicians: Array<{
    technicianId: string;
    technicianName: string;
    commissionPercent: number;
    serviceRepairsCount: number;
    serviceRepairsPartsCost: number;
    serviceRepairsCommission: number;
    windyDayCount: number;
    windyDayPartsCost: number;
    windyDayCommission: number;
    totalPartsCost: number;
    totalCommission: number;
    propertyNames?: string[];
  }>;
  totals: {
    serviceRepairsCount: number;
    serviceRepairsPartsCost: number;
    serviceRepairsCommission: number;
    windyDayCount: number;
    windyDayPartsCost: number;
    windyDayCommission: number;
    totalPartsCost: number;
    totalCommission: number;
  };
}

export default function Reports() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Commissions Report filters
  const [commSelectedProperty, setCommSelectedProperty] = useState<string>("all");
  const [commSelectedTech, setCommSelectedTech] = useState<string>("all");
  const [includeWindyDay, setIncludeWindyDay] = useState(true);
  const [includeServiceRepairs, setIncludeServiceRepairs] = useState(true);

  const { data: reportsData, isLoading } = useQuery<ReportsData>({
    queryKey: ["reports", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", startOfDay(dateRange.from).toISOString());
      params.set("endDate", endOfDay(dateRange.to).toISOString());
      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
  });

  // Commissions data fetch
  const { data: commissions, isLoading: commissionsLoading } = useQuery<CommissionData>({
    queryKey: ["tech-ops-commissions", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", startOfDay(dateRange.from).toISOString());
      params.set("endDate", endOfDay(dateRange.to).toISOString());
      const response = await fetch(`/api/tech-ops/commissions?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch commissions");
      return response.json();
    },
  });

  // Derive unique properties and technicians from commissions data for filters
  const uniqueCommProperties = useMemo(() => {
    const properties = new Set<string>();
    commissions?.technicians?.forEach(tech => {
      tech.propertyNames?.forEach(p => properties.add(p));
    });
    return Array.from(properties).sort();
  }, [commissions]);

  const uniqueCommTechs = useMemo(() => {
    return commissions?.technicians?.map(t => t.technicianName) || [];
  }, [commissions]);

  // Filter commissions data based on filters
  const filteredCommissions = useMemo(() => {
    if (!commissions?.technicians) return null;
    
    let filtered = commissions.technicians;
    
    // Filter by technician
    if (commSelectedTech !== "all") {
      filtered = filtered.filter(t => t.technicianName === commSelectedTech);
    }
    
    // Recalculate totals based on filtered data
    const totals = {
      serviceRepairsCount: includeServiceRepairs ? filtered.reduce((sum, t) => sum + t.serviceRepairsCount, 0) : 0,
      serviceRepairsPartsCost: includeServiceRepairs ? filtered.reduce((sum, t) => sum + t.serviceRepairsPartsCost, 0) : 0,
      serviceRepairsCommission: includeServiceRepairs ? filtered.reduce((sum, t) => sum + t.serviceRepairsCommission, 0) : 0,
      windyDayCount: includeWindyDay ? filtered.reduce((sum, t) => sum + t.windyDayCount, 0) : 0,
      windyDayPartsCost: includeWindyDay ? filtered.reduce((sum, t) => sum + t.windyDayPartsCost, 0) : 0,
      windyDayCommission: includeWindyDay ? filtered.reduce((sum, t) => sum + t.windyDayCommission, 0) : 0,
      totalPartsCost: (includeServiceRepairs ? filtered.reduce((sum, t) => sum + t.serviceRepairsPartsCost, 0) : 0) +
                      (includeWindyDay ? filtered.reduce((sum, t) => sum + t.windyDayPartsCost, 0) : 0),
      totalCommission: (includeServiceRepairs ? filtered.reduce((sum, t) => sum + t.serviceRepairsCommission, 0) : 0) +
                       (includeWindyDay ? filtered.reduce((sum, t) => sum + t.windyDayCommission, 0) : 0),
    };
    
    // Modify each technician's displayed values based on filters
    const displayTechs = filtered.map(t => ({
      ...t,
      serviceRepairsCount: includeServiceRepairs ? t.serviceRepairsCount : 0,
      serviceRepairsPartsCost: includeServiceRepairs ? t.serviceRepairsPartsCost : 0,
      serviceRepairsCommission: includeServiceRepairs ? t.serviceRepairsCommission : 0,
      windyDayCount: includeWindyDay ? t.windyDayCount : 0,
      windyDayPartsCost: includeWindyDay ? t.windyDayPartsCost : 0,
      windyDayCommission: includeWindyDay ? t.windyDayCommission : 0,
      totalCommission: (includeServiceRepairs ? t.serviceRepairsCommission : 0) + (includeWindyDay ? t.windyDayCommission : 0),
    }));
    
    return { technicians: displayTechs, totals };
  }, [commissions, commSelectedTech, includeWindyDay, includeServiceRepairs]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const handleExportCSV = () => {
    alert("CSV export would be triggered here");
  };

  const handleExportPDF = () => {
    alert("PDF export would be triggered here");
  };

  const metrics = reportsData?.metrics;
  const charts = reportsData?.charts;
  const logs = reportsData?.logs;

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color 
  }: { 
    title: string; 
    value: string; 
    subtitle?: string; 
    icon: any; 
    color: string;
  }) => (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", `${color.replace('text-', 'bg-')}/10`)}>
            <Icon className={cn("w-5 h-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const SimpleBarChart = ({ data, title, valueKey, labelKey, color }: { data: any[]; title: string; valueKey: string; labelKey: string; color: string }) => {
    const maxValue = Math.max(...data.map(d => d[valueKey] || 0), 1);
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-24 truncate">{item[labelKey]}</span>
                <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                  <div 
                    className={cn("h-full rounded", color)}
                    style={{ width: `${(item[valueKey] / maxValue) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-16 text-right">
                  {typeof item[valueKey] === 'number' && item[valueKey] > 1000 
                    ? formatCurrency(item[valueKey]) 
                    : item[valueKey]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const SimplePieChart = ({ data, title, colors }: { data: Array<{ name: string; value: number }>; title: string; colors: string[] }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full border-8 border-slate-100 relative">
              {data.map((item, i) => {
                const percentage = (item.value / total) * 100;
                return (
                  <div
                    key={i}
                    className={cn("absolute inset-0 rounded-full", colors[i % colors.length])}
                    style={{
                      clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin(2 * Math.PI * percentage / 100)}% ${50 - 50 * Math.cos(2 * Math.PI * percentage / 100)}%)`,
                    }}
                  />
                );
              })}
            </div>
            <div className="flex-1 space-y-1">
              {data.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className={cn("w-3 h-3 rounded", colors[i % colors.length])} />
                  <span className="text-slate-600 flex-1 truncate">{item.name}</span>
                  <span className="font-medium">{((item.value / total) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const DataTable = ({ 
    data, 
    columns, 
    searchKey 
  }: { 
    data: any[]; 
    columns: Array<{ key: string; label: string; format?: (v: any) => string }>; 
    searchKey: string;
  }) => {
    const filteredData = useMemo(() => {
      let result = data || [];
      if (searchTerm) {
        result = result.filter(item => 
          String(item[searchKey] || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (sortConfig) {
        result = [...result].sort((a, b) => {
          const aVal = a[sortConfig.key];
          const bVal = b[sortConfig.key];
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
      return result;
    }, [data, searchTerm, sortConfig]);

    const handleSort = (key: string) => {
      setSortConfig(prev => 
        prev?.key === key 
          ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
          : { key, direction: 'asc' }
      );
    };

    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              {columns.map(col => (
                <TableHead 
                  key={col.key} 
                  className="cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-slate-500">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              filteredData.slice(0, 50).map((row, i) => (
                <TableRow key={i}>
                  {columns.map(col => (
                    <TableCell key={col.key}>
                      {col.format ? col.format(row[col.key]) : row[col.key] ?? '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileBarChart className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800" data-testid="text-heading-reports">Reports Dashboard</h1>
              <p className="text-slate-500 text-sm">Comprehensive business analytics and data logs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-date-range">
                  <CalendarIcon className="w-4 h-4" />
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-csv">
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} data-testid="button-export-pdf">
              <FileText className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <MetricCard 
                title="Total Revenue" 
                value={formatCurrency(metrics?.totalRevenue || 0)} 
                icon={DollarSign} 
                color="text-emerald-600" 
              />
              <MetricCard 
                title="Estimates Sent" 
                value={formatNumber(metrics?.estimatesSent?.count || 0)} 
                subtitle={formatCurrency(metrics?.estimatesSent?.value || 0)}
                icon={FileText} 
                color="text-blue-600" 
              />
              <MetricCard 
                title="Estimates Approved" 
                value={formatNumber(metrics?.estimatesApproved?.count || 0)} 
                subtitle={formatCurrency(metrics?.estimatesApproved?.value || 0)}
                icon={CheckCircle} 
                color="text-emerald-600" 
              />
              <MetricCard 
                title="Invoices Sent" 
                value={formatNumber(metrics?.invoicesSent?.count || 0)} 
                subtitle={formatCurrency(metrics?.invoicesSent?.value || 0)}
                icon={FileText} 
                color="text-purple-600" 
              />
              <MetricCard 
                title="Invoices Paid" 
                value={formatNumber(metrics?.invoicesPaid?.count || 0)} 
                subtitle={formatCurrency(metrics?.invoicesPaid?.value || 0)}
                icon={DollarSign} 
                color="text-emerald-600" 
              />
              <MetricCard 
                title="Outstanding" 
                value={formatCurrency(metrics?.outstandingBalance || 0)} 
                icon={Clock} 
                color="text-amber-600" 
              />
              <MetricCard 
                title="Service Repairs" 
                value={formatNumber(metrics?.serviceRepairs?.count || 0)} 
                subtitle={formatCurrency(metrics?.serviceRepairs?.value || 0)}
                icon={Wrench} 
                color="text-red-600" 
              />
              <MetricCard 
                title="Windy Day" 
                value={formatNumber(metrics?.windyDayCleanups?.count || 0)} 
                subtitle={formatCurrency(metrics?.windyDayCleanups?.value || 0)}
                icon={Wind} 
                color="text-teal-600" 
              />
              <MetricCard 
                title="Chemical Orders" 
                value={formatNumber(metrics?.chemicalOrders?.count || 0)} 
                subtitle={formatCurrency(metrics?.chemicalOrders?.value || 0)}
                icon={Droplets} 
                color="text-blue-600" 
              />
              <MetricCard 
                title="Commissions Owed" 
                value={formatCurrency(metrics?.commissionsOwed || 0)} 
                icon={Users} 
                color="text-orange-600" 
              />
              <MetricCard 
                title="Commissions Paid" 
                value={formatCurrency(metrics?.commissionsPaid || 0)} 
                icon={CheckCircle} 
                color="text-emerald-600" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SimplePieChart 
                data={charts?.revenueBySource || []}
                title="Revenue by Source"
                colors={['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500']}
              />
              <SimplePieChart 
                data={charts?.estimatesStatusBreakdown || []}
                title="Estimates Status"
                colors={['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500']}
              />
              <SimplePieChart 
                data={charts?.repairsByType || []}
                title="Repairs by Type"
                colors={['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-teal-500']}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SimpleBarChart 
                data={charts?.monthlyRevenue || []}
                title="Monthly Revenue"
                valueKey="revenue"
                labelKey="month"
                color="bg-emerald-500"
              />
              <SimpleBarChart 
                data={charts?.repairsByTechnician || []}
                title="Service Repairs by Technician"
                valueKey="count"
                labelKey="name"
                color="bg-red-500"
              />
              <SimpleBarChart 
                data={charts?.commissionsByTechnician || []}
                title="Commissions by Technician"
                valueKey="amount"
                labelKey="name"
                color="bg-purple-500"
              />
              <SimpleBarChart 
                data={charts?.estimatesVsInvoices || []}
                title="Estimates vs Invoices by Month"
                valueKey="estimates"
                labelKey="month"
                color="bg-blue-500"
              />
            </div>

            {/* Commissions Report Section */}
            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Commissions Report
                  </CardTitle>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select value={commSelectedProperty} onValueChange={setCommSelectedProperty}>
                      <SelectTrigger className="w-[180px]" data-testid="select-comm-property">
                        <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="All Properties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Properties</SelectItem>
                        {uniqueCommProperties.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={commSelectedTech} onValueChange={setCommSelectedTech}>
                      <SelectTrigger className="w-[180px]" data-testid="select-comm-technician">
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="All Technicians" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Technicians</SelectItem>
                        {uniqueCommTechs.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-4 border rounded-lg px-3 py-2 bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="include-windy" 
                          checked={includeWindyDay} 
                          onCheckedChange={(checked) => setIncludeWindyDay(!!checked)}
                          data-testid="checkbox-include-windy"
                        />
                        <Label htmlFor="include-windy" className="text-sm cursor-pointer flex items-center gap-1">
                          <Wind className="w-4 h-4 text-teal-600" />
                          Windy Day
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="include-service" 
                          checked={includeServiceRepairs} 
                          onCheckedChange={(checked) => setIncludeServiceRepairs(!!checked)}
                          data-testid="checkbox-include-service"
                        />
                        <Label htmlFor="include-service" className="text-sm cursor-pointer flex items-center gap-1">
                          <Wrench className="w-4 h-4 text-purple-600" />
                          Service Repairs
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Commission Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200" data-testid="comm-total-commission">
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(filteredCommissions?.totals?.totalCommission || 0)}
                    </div>
                    <div className="text-sm text-emerald-600">Total Commissions</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200" data-testid="comm-total-parts">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(filteredCommissions?.totals?.totalPartsCost || 0)}
                    </div>
                    <div className="text-sm text-blue-600">Total Parts Cost</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200" data-testid="comm-service-repairs">
                    <div className="text-2xl font-bold text-purple-600">
                      {filteredCommissions?.totals?.serviceRepairsCount || 0}
                    </div>
                    <div className="text-sm text-purple-600">Service Repairs</div>
                  </div>
                  <div className="p-4 bg-teal-50 rounded-lg border border-teal-200" data-testid="comm-windy-day">
                    <div className="text-2xl font-bold text-teal-600">
                      {filteredCommissions?.totals?.windyDayCount || 0}
                    </div>
                    <div className="text-sm text-teal-600">Windy Day Cleanups</div>
                  </div>
                </div>

                {/* Commission Table */}
                {commissionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  </div>
                ) : !filteredCommissions?.technicians?.length ? (
                  <div className="text-center py-12 text-slate-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No commission data for the selected period</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Technician</TableHead>
                          <TableHead className="text-center">Commission %</TableHead>
                          {includeServiceRepairs && (
                            <>
                              <TableHead className="text-center">Service Repairs</TableHead>
                              <TableHead className="text-right">Service Parts</TableHead>
                              <TableHead className="text-right">Service Comm.</TableHead>
                            </>
                          )}
                          {includeWindyDay && (
                            <>
                              <TableHead className="text-center">Windy Day</TableHead>
                              <TableHead className="text-right">Windy Parts</TableHead>
                              <TableHead className="text-right">Windy Comm.</TableHead>
                            </>
                          )}
                          <TableHead className="text-right font-bold">Total Comm.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCommissions.technicians.map((tech) => (
                          <TableRow key={tech.technicianName} data-testid={`comm-row-${tech.technicianName}`}>
                            <TableCell className="font-medium">{tech.technicianName}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                {tech.commissionPercent}%
                              </Badge>
                            </TableCell>
                            {includeServiceRepairs && (
                              <>
                                <TableCell className="text-center">{tech.serviceRepairsCount}</TableCell>
                                <TableCell className="text-right">{formatCurrency(tech.serviceRepairsPartsCost)}</TableCell>
                                <TableCell className="text-right text-emerald-600">{formatCurrency(tech.serviceRepairsCommission)}</TableCell>
                              </>
                            )}
                            {includeWindyDay && (
                              <>
                                <TableCell className="text-center">{tech.windyDayCount}</TableCell>
                                <TableCell className="text-right">{formatCurrency(tech.windyDayPartsCost)}</TableCell>
                                <TableCell className="text-right text-emerald-600">{formatCurrency(tech.windyDayCommission)}</TableCell>
                              </>
                            )}
                            <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(tech.totalCommission)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-50 font-medium">
                          <TableCell colSpan={2}>Totals</TableCell>
                          {includeServiceRepairs && (
                            <>
                              <TableCell className="text-center">{filteredCommissions.totals.serviceRepairsCount}</TableCell>
                              <TableCell className="text-right">{formatCurrency(filteredCommissions.totals.serviceRepairsPartsCost)}</TableCell>
                              <TableCell className="text-right text-emerald-600">{formatCurrency(filteredCommissions.totals.serviceRepairsCommission)}</TableCell>
                            </>
                          )}
                          {includeWindyDay && (
                            <>
                              <TableCell className="text-center">{filteredCommissions.totals.windyDayCount}</TableCell>
                              <TableCell className="text-right">{formatCurrency(filteredCommissions.totals.windyDayPartsCost)}</TableCell>
                              <TableCell className="text-right text-emerald-600">{formatCurrency(filteredCommissions.totals.windyDayCommission)}</TableCell>
                            </>
                          )}
                          <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(filteredCommissions.totals.totalCommission)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Data Logs</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                        data-testid="input-search-logs"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="repairs" data-testid="tab-repairs-log">Repairs</TabsTrigger>
                    <TabsTrigger value="chemicals" data-testid="tab-chemicals-log">Chemicals</TabsTrigger>
                    <TabsTrigger value="commissions" data-testid="tab-commissions-log">Commissions</TabsTrigger>
                    <TabsTrigger value="equipment" data-testid="tab-equipment-log">Equipment</TabsTrigger>
                    <TabsTrigger value="invoices" data-testid="tab-invoices-log">Invoices</TabsTrigger>
                  </TabsList>

                  <TabsContent value="repairs">
                    <ScrollArea className="max-h-[400px]">
                      <DataTable
                        data={logs?.repairs || []}
                        searchKey="propertyName"
                        columns={[
                          { key: 'date', label: 'Date', format: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
                          { key: 'propertyName', label: 'Property' },
                          { key: 'repairType', label: 'Type' },
                          { key: 'technicianName', label: 'Technician' },
                          { key: 'status', label: 'Status' },
                          { key: 'revenue', label: 'Revenue', format: (v) => formatCurrency(v || 0) },
                          { key: 'commission', label: 'Commission', format: (v) => formatCurrency(v || 0) },
                        ]}
                      />
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="chemicals">
                    <ScrollArea className="max-h-[400px]">
                      <DataTable
                        data={logs?.chemicals || []}
                        searchKey="propertyName"
                        columns={[
                          { key: 'date', label: 'Date', format: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
                          { key: 'propertyName', label: 'Property' },
                          { key: 'technicianName', label: 'Technician' },
                          { key: 'orderType', label: 'Order Type' },
                          { key: 'items', label: 'Items' },
                          { key: 'status', label: 'Status' },
                        ]}
                      />
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="commissions">
                    <ScrollArea className="max-h-[400px]">
                      <DataTable
                        data={logs?.commissions || []}
                        searchKey="technicianName"
                        columns={[
                          { key: 'date', label: 'Date', format: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
                          { key: 'technicianName', label: 'Technician' },
                          { key: 'propertyName', label: 'Property' },
                          { key: 'jobType', label: 'Job' },
                          { key: 'totalAmount', label: 'Total', format: (v) => formatCurrency(v || 0) },
                          { key: 'commissionRate', label: 'Rate', format: (v) => `${v || 0}%` },
                          { key: 'commissionOwed', label: 'Commission', format: (v) => formatCurrency(v || 0) },
                          { key: 'paidStatus', label: 'Paid' },
                        ]}
                      />
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="equipment">
                    <ScrollArea className="max-h-[400px]">
                      <DataTable
                        data={logs?.equipment || []}
                        searchKey="propertyName"
                        columns={[
                          { key: 'dateAdded', label: 'Date Added', format: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
                          { key: 'propertyName', label: 'Property' },
                          { key: 'equipmentType', label: 'Type' },
                          { key: 'model', label: 'Model' },
                          { key: 'serialNumber', label: 'Serial #' },
                          { key: 'installDate', label: 'Install Date', format: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
                          { key: 'warrantyStatus', label: 'Warranty' },
                        ]}
                      />
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="invoices">
                    <ScrollArea className="max-h-[400px]">
                      <DataTable
                        data={logs?.invoices || []}
                        searchKey="propertyName"
                        columns={[
                          { key: 'date', label: 'Date', format: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
                          { key: 'invoiceNumber', label: 'Invoice #' },
                          { key: 'propertyName', label: 'Property' },
                          { key: 'description', label: 'Description' },
                          { key: 'amount', label: 'Amount', format: (v) => formatCurrency(v || 0) },
                          { key: 'status', label: 'Status' },
                          { key: 'paidDate', label: 'Paid Date', format: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
                        ]}
                      />
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
