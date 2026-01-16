import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History, FileText, Download, Filter, Calendar as CalendarIcon,
  CheckCircle2, XCircle, Clock, Archive, Trash2, RotateCcw, 
  Send, Phone, Mail, Building2, User, ChevronDown, ChevronRight, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HistoryLog {
  id: string;
  estimateId: string;
  estimateNumber: string | null;
  propertyId: string | null;
  propertyName: string | null;
  customerId: string | null;
  customerName: string | null;
  estimateValue: number | null;
  actionType: string;
  actionDescription: string;
  performedByUserId: string | null;
  performedByUserName: string | null;
  performedAt: string;
  previousStatus: string | null;
  newStatus: string | null;
  approverName: string | null;
  approverTitle: string | null;
  approvalMethod: string | null;
  approvalDetails: string | null;
  reason: string | null;
  emailSubject: string | null;
  emailRecipients: string[] | null;
  metadata: Record<string, any> | null;
}

interface HistoryMetrics {
  total: number;
  emailApprovals: number;
  verbalApprovals: number;
  archived: number;
  deleted: number;
}

export default function EstimateHistory() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    actionType: "",
    propertyName: "",
    performedByUserName: "",
    approvalMethod: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: historyLogs = [], isLoading } = useQuery<HistoryLog[]>({
    queryKey: ["estimate-history", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.actionType) params.append("actionType", filters.actionType);
      if (filters.performedByUserName) params.append("performedByUserName", filters.performedByUserName);
      if (filters.approvalMethod) params.append("approvalMethod", filters.approvalMethod);
      if (filters.startDate) params.append("startDate", filters.startDate.toISOString());
      if (filters.endDate) params.append("endDate", filters.endDate.toISOString());
      
      const response = await fetch(`/api/estimate-history?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch history");
      return response.json();
    },
  });

  const { data: metrics } = useQuery<HistoryMetrics>({
    queryKey: ["estimate-history-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/estimate-history-metrics");
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
  });

  const filteredLogs = useMemo(() => {
    return historyLogs.filter(log => {
      if (filters.propertyName && log.propertyName && 
          !log.propertyName.toLowerCase().includes(filters.propertyName.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [historyLogs, filters.propertyName]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.actionType) params.append("actionType", filters.actionType);
      if (filters.startDate) params.append("startDate", filters.startDate.toISOString());
      if (filters.endDate) params.append("endDate", filters.endDate.toISOString());
      
      const response = await fetch(`/api/estimate-history/export/csv?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to export");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estimate-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Export successful", description: "History exported to CSV" });
    } catch (error) {
      toast({ title: "Export failed", description: "Unable to export history", variant: "destructive" });
    }
  };

  const clearFilters = () => {
    setFilters({
      actionType: "",
      propertyName: "",
      performedByUserName: "",
      approvalMethod: "",
      startDate: null,
      endDate: null,
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "created": return <FileText className="h-4 w-4 text-[#0078D4]" />;
      case "sent_for_approval": return <Send className="h-4 w-4 text-[#FF8000]" />;
      case "approved": return <CheckCircle2 className="h-4 w-4 text-[#22D69A]" />;
      case "verbal_approval": return <Phone className="h-4 w-4 text-[#17BEBB]" />;
      case "rejected": return <XCircle className="h-4 w-4 text-red-500" />;
      case "archived": return <Archive className="h-4 w-4 text-gray-500" />;
      case "deleted": return <Trash2 className="h-4 w-4 text-red-600" />;
      case "restored": return <RotateCcw className="h-4 w-4 text-[#0078D4]" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    const variants: Record<string, string> = {
      created: "bg-[#0078D4]1A text-[#0078D4]",
      sent_for_approval: "bg-[#FF8000]1A text-[#FF8000]",
      approved: "bg-[#22D69A]1A text-[#22D69A]",
      verbal_approval: "bg-[#17BEBB]1A text-[#17BEBB]",
      rejected: "bg-red-100 text-red-700",
      archived: "bg-gray-100 text-gray-700",
      deleted: "bg-red-100 text-red-800",
      restored: "bg-[#0078D4]1A text-[#0078D4]",
      scheduled: "bg-[#17BEBB]1A text-[#17BEBB]",
      completed: "bg-[#22D69A]1A text-[#22D69A]",
      invoiced: "bg-[#0078D4]1A text-[#0078D4]",
    };
    
    return (
      <Badge className={`${variants[actionType] || "bg-gray-100 text-gray-700"} font-medium`}>
        {actionType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-7 w-7 text-[#0078D4]" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Estimate History Log</h1>
              <p className="text-sm text-gray-500">Complete audit trail of all estimate actions</p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2" data-testid="export-csv-button">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#0078D4]" />
                <div>
                  <p className="text-2xl font-bold">{metrics?.total || 0}</p>
                  <p className="text-xs text-gray-500">Total Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#22D69A]" />
                <div>
                  <p className="text-2xl font-bold">{metrics?.emailApprovals || 0}</p>
                  <p className="text-xs text-gray-500">Email Approvals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-[#17BEBB]" />
                <div>
                  <p className="text-2xl font-bold">{metrics?.verbalApprovals || 0}</p>
                  <p className="text-xs text-gray-500">Verbal Approvals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-2xl font-bold">{metrics?.archived || 0}</p>
                  <p className="text-xs text-gray-500">Archived</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{metrics?.deleted || 0}</p>
                  <p className="text-xs text-gray-500">Deleted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-filters-button">
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <Label className="text-xs">Action Type</Label>
                <Select 
                  value={filters.actionType} 
                  onValueChange={(v) => setFilters(f => ({ ...f, actionType: v === "all" ? "" : v }))}
                >
                  <SelectTrigger className="mt-1" data-testid="filter-action-type">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="sent_for_approval">Sent for Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="verbal_approval">Verbal Approval</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="invoiced">Invoiced</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                    <SelectItem value="restored">Restored</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Property</Label>
                <Input
                  value={filters.propertyName}
                  onChange={(e) => setFilters(f => ({ ...f, propertyName: e.target.value }))}
                  placeholder="Search property..."
                  className="mt-1"
                  data-testid="filter-property"
                />
              </div>

              <div>
                <Label className="text-xs">Performed By</Label>
                <Input
                  value={filters.performedByUserName}
                  onChange={(e) => setFilters(f => ({ ...f, performedByUserName: e.target.value }))}
                  placeholder="Search user..."
                  className="mt-1"
                  data-testid="filter-user"
                />
              </div>

              <div>
                <Label className="text-xs">Approval Method</Label>
                <Select 
                  value={filters.approvalMethod} 
                  onValueChange={(v) => setFilters(f => ({ ...f, approvalMethod: v === "all" ? "" : v }))}
                >
                  <SelectTrigger className="mt-1" data-testid="filter-approval-method">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="verbal">Verbal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full mt-1 justify-start text-left font-normal"
                      data-testid="filter-start-date"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.startDate ? format(filters.startDate, "MMM d, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.startDate || undefined}
                      onSelect={(d) => setFilters(f => ({ ...f, startDate: d || null }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-xs">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full mt-1 justify-start text-left font-normal"
                      data-testid="filter-end-date"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.endDate ? format(filters.endDate, "MMM d, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.endDate || undefined}
                      onSelect={(d) => setFilters(f => ({ ...f, endDate: d || null }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0078D4]" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <History className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">No history records found</p>
                <p className="text-sm">Actions will appear here as estimates are modified</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-40">Date/Time</TableHead>
                    <TableHead className="w-36">Action</TableHead>
                    <TableHead>Estimate</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleRow(log.id)}
                        data-testid={`history-row-${log.id}`}
                      >
                        <TableCell>
                          {expandedRows.has(log.id) ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.performedAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.actionType)}
                            {getActionBadge(log.actionType)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-[#0078D4]">
                            {log.estimateNumber || log.estimateId.slice(0, 8)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span className="truncate max-w-[200px]">{log.propertyName || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(log.estimateValue)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span>{log.performedByUserName || "System"}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(log.id) && (
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={7} className="py-4 px-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 text-xs">Description</p>
                                <p className="font-medium">{log.actionDescription}</p>
                              </div>
                              {log.previousStatus && (
                                <div>
                                  <p className="text-gray-500 text-xs">Status Change</p>
                                  <p className="font-medium">
                                    {log.previousStatus} → {log.newStatus}
                                  </p>
                                </div>
                              )}
                              {log.approverName && (
                                <div>
                                  <p className="text-gray-500 text-xs">Approver</p>
                                  <p className="font-medium">
                                    {log.approverName}
                                    {log.approverTitle && <span className="text-gray-500"> ({log.approverTitle})</span>}
                                  </p>
                                </div>
                              )}
                              {log.approvalMethod && (
                                <div>
                                  <p className="text-gray-500 text-xs">Approval Method</p>
                                  <p className="font-medium capitalize">{log.approvalMethod}</p>
                                  {log.approvalDetails && (
                                    <p className="text-gray-500 text-xs mt-1">{log.approvalDetails}</p>
                                  )}
                                </div>
                              )}
                              {log.reason && (
                                <div className="col-span-2">
                                  <p className="text-gray-500 text-xs">Reason</p>
                                  <p className="font-medium">{log.reason}</p>
                                </div>
                              )}
                              {log.emailRecipients && log.emailRecipients.length > 0 && (
                                <div className="col-span-2">
                                  <p className="text-gray-500 text-xs">Email Recipients</p>
                                  <p className="font-medium">{log.emailRecipients.join(", ")}</p>
                                </div>
                              )}
                              {log.customerName && (
                                <div>
                                  <p className="text-gray-500 text-xs">Customer</p>
                                  <p className="font-medium">{log.customerName}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
