import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Building2, DollarSign, Wrench, Search, ChevronDown, ChevronRight, ChevronLeft, Loader2, TrendingUp, MapPin, Calendar, User, CheckCircle2, Clock, AlertCircle, ArrowUpDown, FileDown, BarChart3, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { PropertyRepairSummary } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface PropertyRepairsResponse {
  properties: PropertyRepairSummary[];
  summary: {
    totalProperties: number;
    totalRepairs: number;
    totalSpend: number;
    averageSpendPerProperty: number;
    topSpender: { name: string; spend: number } | null;
    monthlyTotals: Record<string, number>;
  };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

type SortField = "totalSpend" | "totalRepairs" | "propertyName" | "lastServiceDate";
type SortDirection = "asc" | "desc";

async function exportPropertyRepairsExcel(properties: PropertyRepairSummary[], summary: PropertyRepairsResponse['summary']) {
  const now = new Date();
  const wb = new ExcelJS.Workbook();
  
  // Summary sheet
  const wsSummary = wb.addWorksheet("Summary");
  wsSummary.columns = [{ header: "Metric", key: "metric" }, { header: "Value", key: "value" }];
  wsSummary.addRow({ metric: "Total Properties", value: summary.totalProperties });
  wsSummary.addRow({ metric: "Total Repairs", value: summary.totalRepairs });
  wsSummary.addRow({ metric: "Total Spend", value: summary.totalSpend });
  wsSummary.addRow({ metric: "Average per Property", value: summary.averageSpendPerProperty });
  wsSummary.addRow({ metric: "Top Spender", value: summary.topSpender?.name || "N/A" });
  wsSummary.addRow({ metric: "Top Spender Amount", value: summary.topSpender?.spend || 0 });
  
  // Properties sheet
  const wsProperties = wb.addWorksheet("Properties");
  wsProperties.columns = [
    { header: "Property Name", key: "name" }, { header: "Address", key: "address" },
    { header: "Total Repairs", key: "totalRepairs" }, { header: "Completed", key: "completed" },
    { header: "Pending", key: "pending" }, { header: "Total Spend", key: "totalSpend" },
    { header: "Average Cost", key: "avgCost" }, { header: "Last Service", key: "lastService" },
    { header: "Technicians", key: "techs" }, { header: "Pools", key: "pools" }
  ];
  properties.forEach(p => wsProperties.addRow({
    name: p.propertyName, address: p.address || "N/A",
    totalRepairs: p.totalRepairs, completed: p.completedRepairs, pending: p.pendingRepairs,
    totalSpend: p.totalSpend, avgCost: p.averageRepairCost,
    lastService: p.lastServiceDate ? new Date(p.lastServiceDate).toLocaleDateString() : "N/A",
    techs: p.technicians.join(", ") || "N/A", pools: p.poolNames.join(", ") || "N/A"
  }));
  
  // All Repairs sheet
  const wsRepairs = wb.addWorksheet("All Repairs");
  wsRepairs.columns = [
    { header: "Property", key: "property" }, { header: "Job Title", key: "title" },
    { header: "Price", key: "price" }, { header: "Status", key: "status" },
    { header: "Date", key: "date" }, { header: "Technician", key: "tech" }
  ];
  properties.forEach(p => {
    p.repairs.forEach(r => wsRepairs.addRow({
      property: p.propertyName, title: r.title, price: r.price,
      status: r.isCompleted ? "Completed" : "Pending",
      date: r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString() : "N/A",
      tech: r.technician || "Unassigned"
    }));
  });
  
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `property-repairs-${now.toISOString().split('T')[0]}.xlsx`);
}

function exportPropertyRepairsPDF(properties: PropertyRepairSummary[], summary: PropertyRepairsResponse['summary']) {
  const doc = new jsPDF();
  const now = new Date();
  
  doc.setFontSize(20);
  doc.setTextColor(0, 128, 128);
  doc.text("Property Repair Prices Report", 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, 28);
  
  doc.setFontSize(11);
  doc.text(`Total Properties: ${summary.totalProperties}`, 14, 38);
  doc.text(`Total Repairs: ${summary.totalRepairs}`, 14, 45);
  doc.text(`Total Spend: ${formatPrice(summary.totalSpend)}`, 14, 52);
  doc.text(`Avg per Property: ${formatPrice(summary.averageSpendPerProperty)}`, 14, 59);
  
  const tableData = properties.map(p => [
    p.propertyName.substring(0, 25),
    p.totalRepairs.toString(),
    `${p.completedRepairs}/${p.pendingRepairs}`,
    formatPrice(p.totalSpend),
    formatPrice(p.averageRepairCost),
    formatDate(p.lastServiceDate)
  ]);

  autoTable(doc, {
    startY: 68,
    head: [['Property', 'Repairs', 'Done/Pending', 'Total Spend', 'Avg Cost', 'Last Service']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 128, 128], textColor: 255 },
    styles: { fontSize: 8 }
  });

  doc.save(`property-repairs-report-${now.toISOString().split('T')[0]}.pdf`);
}

function MonthlySpendChart({ monthlyTotals }: { monthlyTotals: Record<string, number> }) {
  const chartData = useMemo(() => {
    return Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, spend]) => ({
        month: formatMonth(month),
        spend: Math.round(spend * 100) / 100
      }));
  }, [monthlyTotals]);

  if (chartData.length === 0) return null;

  return (
    <Card className="bg-card/50 border-[#17BEBB]/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-ui flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#17BEBB]" />
          Monthly Repair Spending (Last 12 Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" stroke="#888" fontSize={11} />
            <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip 
              formatter={(value: number) => [formatPrice(value), "Spend"]}
              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #0ff', borderRadius: '8px' }}
              labelStyle={{ color: '#0ff' }}
            />
            <Bar dataKey="spend" fill="#0ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PropertySpendChart({ property }: { property: PropertyRepairSummary }) {
  const chartData = useMemo(() => {
    return Object.entries(property.monthlySpend || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, spend]) => ({
        month: formatMonth(month),
        spend: Math.round(spend * 100) / 100
      }));
  }, [property.monthlySpend]);

  if (chartData.length < 2) return null;

  return (
    <div className="mt-4 p-4 bg-background/30 rounded-lg border border-border/30">
      <h5 className="text-sm font-ui font-semibold text-purple-400 mb-3">Monthly Spending Trend</h5>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="month" stroke="#888" fontSize={10} />
          <YAxis stroke="#888" fontSize={10} tickFormatter={(v) => `$${v}`} />
          <Tooltip 
            formatter={(value: number) => [formatPrice(value), "Spend"]}
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #a855f7', borderRadius: '8px' }}
          />
          <Line type="monotone" dataKey="spend" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PropertyRepairPrices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("totalSpend");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<PropertyRepairsResponse>({
    queryKey: ["/api/properties/repairs"],
    queryFn: async () => {
      const res = await fetch("/api/properties/repairs");
      if (!res.ok) throw new Error("Failed to fetch property repairs");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const toggleProperty = (propertyId: string) => {
    setExpandedProperties(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const availableMonths = useMemo(() => {
    if (!data?.summary.monthlyTotals) return [];
    return Object.keys(data.summary.monthlyTotals).sort().reverse();
  }, [data?.summary.monthlyTotals]);

  const filteredProperties = useMemo(() => {
    let props = data?.properties || [];
    
    if (searchTerm) {
      props = props.filter(p => 
        p.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.poolNames.some(pool => pool.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedMonth) {
      props = props.filter(p => p.monthlySpend && p.monthlySpend[selectedMonth] > 0);
    }
    
    return props;
  }, [data?.properties, searchTerm, selectedMonth]);

  const sortedProperties = useMemo(() => {
    return [...filteredProperties].sort((a, b) => {
      const mult = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "totalSpend":
          return (a.totalSpend - b.totalSpend) * mult;
        case "totalRepairs":
          return (a.totalRepairs - b.totalRepairs) * mult;
        case "propertyName":
          return a.propertyName.localeCompare(b.propertyName) * mult;
        case "lastServiceDate":
          if (!a.lastServiceDate && !b.lastServiceDate) return 0;
          if (!a.lastServiceDate) return 1;
          if (!b.lastServiceDate) return -1;
          return (new Date(a.lastServiceDate).getTime() - new Date(b.lastServiceDate).getTime()) * mult;
        default:
          return 0;
      }
    });
  }, [filteredProperties, sortField, sortDirection]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#17BEBB]" />
          <p className="text-muted-foreground font-ui">Loading property repair data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-red-400">Failed to load property repair data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground hover:text-[#17BEBB]" data-testid="btn-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-display font-bold text-[#17BEBB]" data-testid="page-title">
            Property Repair Prices
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive repair spending by property with monthly trends
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportPropertyRepairsExcel(sortedProperties, summary!)}
            className="gap-2 text-green-400 border-[#22D69A]/30 hover:bg-[#22D69A]/10"
            data-testid="btn-export-excel"
          >
            <FileDown className="w-4 h-4" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => exportPropertyRepairsPDF(sortedProperties, summary!)}
            className="gap-2 text-[#17BEBB] border-[#17BEBB]/30 hover:bg-[#17BEBB]/10"
            data-testid="btn-export-pdf"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-card/50 border-[#17BEBB]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#17BEBB]/20">
                    <Building2 className="w-5 h-5 text-[#17BEBB]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Properties</p>
                    <p className="text-2xl font-display font-bold text-[#17BEBB]" data-testid="stat-total-properties">
                      {summary.totalProperties}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-[#17BEBB]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#17BEBB]/20">
                    <Wrench className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Repairs</p>
                    <p className="text-2xl font-display font-bold text-purple-400" data-testid="stat-total-repairs">
                      {summary.totalRepairs}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-[#22D69A]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#22D69A]/20">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spend</p>
                    <p className="text-2xl font-display font-bold text-green-400" data-testid="stat-total-spend">
                      {formatPrice(summary.totalSpend)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-[#FF8000]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#FF8000]/20">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg/Property</p>
                    <p className="text-2xl font-display font-bold text-orange-400" data-testid="stat-avg-spend">
                      {formatPrice(summary.averageSpendPerProperty)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {summary.topSpender && (
              <Card className="bg-card/50 border-[#FF8000]/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#FF8000]/20">
                      <BarChart3 className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Top Spender</p>
                      <p className="text-sm font-display font-bold text-yellow-400 truncate max-w-[120px]" title={summary.topSpender.name}>
                        {summary.topSpender.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatPrice(summary.topSpender.spend)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {summary.monthlyTotals && Object.keys(summary.monthlyTotals).length > 0 && (
            <MonthlySpendChart monthlyTotals={summary.monthlyTotals} />
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search properties, addresses, pools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50"
            data-testid="input-search"
          />
        </div>
        
        {availableMonths.length > 0 && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedMonth || ""}
              onChange={(e) => setSelectedMonth(e.target.value || null)}
              className="bg-background/50 border border-border rounded-md px-3 py-2 text-sm"
              data-testid="select-month"
            >
              <option value="">All Months</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>{formatMonth(month)}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            variant={sortField === "totalSpend" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("totalSpend")}
            className="gap-1"
            data-testid="btn-sort-spend"
          >
            <DollarSign className="w-3 h-3" />
            Spend
            {sortField === "totalSpend" && <ArrowUpDown className="w-3 h-3" />}
          </Button>
          <Button
            variant={sortField === "totalRepairs" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("totalRepairs")}
            className="gap-1"
            data-testid="btn-sort-repairs"
          >
            <Wrench className="w-3 h-3" />
            Repairs
            {sortField === "totalRepairs" && <ArrowUpDown className="w-3 h-3" />}
          </Button>
          <Button
            variant={sortField === "propertyName" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("propertyName")}
            className="gap-1"
            data-testid="btn-sort-name"
          >
            <Building2 className="w-3 h-3" />
            Name
            {sortField === "propertyName" && <ArrowUpDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-4">
          {sortedProperties.map((property, index) => (
            <Collapsible
              key={property.propertyId}
              open={expandedProperties.has(property.propertyId)}
              onOpenChange={() => toggleProperty(property.propertyId)}
            >
              <Card className="bg-card/50 border-border/50 hover:border-[#17BEBB]/30 transition-colors">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#17BEBB]/20 text-[#17BEBB] font-display font-bold text-sm">
                          {index + 1}
                        </div>
                        {expandedProperties.has(property.propertyId) ? (
                          <ChevronDown className="w-5 h-5 text-[#17BEBB]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-lg font-ui text-foreground flex items-center gap-2" data-testid={`property-name-${property.propertyId}`}>
                            {property.propertyName}
                            {property.poolNames.length > 0 && (
                              <Badge variant="outline" className="text-xs text-blue-400 border-[#2374AB]/30">
                                {property.poolNames.length} {property.poolNames.length === 1 ? 'pool' : 'pools'}
                              </Badge>
                            )}
                          </CardTitle>
                          {property.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {property.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-2xl font-display font-bold text-green-400" data-testid={`property-spend-${property.propertyId}`}>
                            {formatPrice(property.totalSpend)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {property.totalRepairs} repairs · avg {formatPrice(property.averageRepairCost)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`${property.completedRepairs > 0 ? 'text-green-400 border-[#22D69A]/30' : 'text-muted-foreground'}`}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {property.completedRepairs}
                          </Badge>
                          {property.pendingRepairs > 0 && (
                            <Badge variant="outline" className="text-yellow-400 border-[#FF8000]/30">
                              <Clock className="w-3 h-3 mr-1" />
                              {property.pendingRepairs}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className="border-t border-border/30 pt-4">
                      {property.technicians.length > 0 && (
                        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>Technicians: {property.technicians.join(", ")}</span>
                        </div>
                      )}
                      {property.poolNames.length > 0 && (
                        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span>Pools: {property.poolNames.join(", ")}</span>
                        </div>
                      )}
                      
                      <PropertySpendChart property={property} />
                      
                      <div className="space-y-2 mt-4">
                        <h4 className="text-sm font-ui font-semibold text-[#17BEBB]">Repair History</h4>
                        <div className="grid gap-2">
                          {property.repairs.slice(0, 10).map((repair, rIndex) => (
                            <div 
                              key={repair.jobId || rIndex}
                              className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
                              data-testid={`repair-item-${repair.jobId}`}
                            >
                              <div className="flex items-center gap-3">
                                {repair.isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Clock className="w-4 h-4 text-yellow-400" />
                                )}
                                <div>
                                  <p className="font-ui text-sm">{repair.title}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(repair.scheduledDate)}
                                    {repair.technician && (
                                      <>
                                        <span>·</span>
                                        <User className="w-3 h-3" />
                                        {repair.technician}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <p className="font-display font-semibold text-green-400">
                                {formatPrice(repair.price)}
                              </p>
                            </div>
                          ))}
                          {property.repairs.length > 10 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              + {property.repairs.length - 10} more repairs
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}

          {sortedProperties.length === 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchTerm || selectedMonth ? "No properties match your filters" : "No property data available"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
