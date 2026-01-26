import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceDetailModal } from "@/components/InvoiceDetailModal";
import { 
  FileText, 
  Search, 
  Filter, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Building2,
  Calendar,
  ArrowLeft,
  XCircle,
  Link2,
  Camera
} from "lucide-react";
import { Link } from "wouter";
import type { Invoice } from "@shared/schema";

type InvoiceStatus = "all" | "draft" | "sent" | "paid" | "overdue" | "voided" | "partial";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600 border-slate-300", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Clock },
  paid: { label: "Paid", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700 border-red-300", icon: AlertCircle },
  voided: { label: "Voided", color: "bg-gray-200 text-gray-600 border-gray-400", icon: XCircle },
  partial: { label: "Partial", color: "bg-orange-100 text-orange-700 border-orange-300", icon: DollarSign },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const queryClient = useQueryClient();

  const { data: invoicesData, isLoading, refetch, isRefetching } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });

  const { data: qbStatus } = useQuery({
    queryKey: ["/api/quickbooks/status"],
    queryFn: async () => {
      const res = await fetch("/api/quickbooks/status");
      return res.json();
    },
  });

  const invoices = invoicesData?.invoices || [];

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
    paid: invoices.filter(inv => inv.status === "paid").length,
    paidAmount: invoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
    overdue: invoices.filter(inv => inv.status === "overdue").length,
    overdueAmount: invoices.filter(inv => inv.status === "overdue").reduce((sum, inv) => sum + (inv.amountDue || 0), 0),
    pending: invoices.filter(inv => inv.status === "sent").length,
    pendingAmount: invoices.filter(inv => inv.status === "sent").reduce((sum, inv) => sum + (inv.amountDue || 0), 0),
  };

  const handleSyncPayments = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/quickbooks/sync-payments", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        alert(`Payment sync complete! ${data.updated || 0} invoice(s) updated.`);
      } else {
        alert(data.error || "Failed to sync payments");
      }
    } catch (error) {
      console.error("Error syncing payments:", error);
      alert("Failed to sync payments from QuickBooks");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <Link href="/estimates">
          <Button variant="ghost" size="sm" className="mb-2 gap-2 text-slate-600 hover:text-blue-600" data-testid="btn-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Estimates
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Invoices
            </h1>
            <p className="text-slate-600 mt-1">
              Track invoices sent to QuickBooks and their payment status
            </p>
          </div>
          <div className="flex items-center gap-3">
            {qbStatus?.connected ? (
              <Badge variant="outline" className="border-green-500 text-green-700 bg-green-100 gap-2">
                <Link2 className="w-3 h-3" />
                QuickBooks Connected
              </Badge>
            ) : (
              <Link href="/settings">
                <Badge variant="outline" className="border-orange-400 text-orange-700 bg-orange-100 gap-2 cursor-pointer hover:bg-orange-200">
                  <AlertCircle className="w-3 h-3" />
                  Connect QuickBooks
                </Badge>
              </Link>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncPayments}
              disabled={isSyncing || !qbStatus?.connected}
              className="gap-2"
              data-testid="btn-sync-payments"
            >
              <DollarSign className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
              {isSyncing ? "Syncing..." : "Sync Payments"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-2"
              data-testid="btn-refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Invoices</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-2">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
                <p className="text-xs text-slate-500">Paid</p>
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">{formatCurrency(stats.paidAmount)}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
            <p className="text-sm text-blue-600 mt-2">{formatCurrency(stats.pendingAmount)}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-xs text-slate-500">Overdue</p>
              </div>
            </div>
            <p className="text-sm text-red-600 mt-2">{formatCurrency(stats.overdueAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border border-slate-200 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by invoice #, customer, or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus)}>
              <SelectTrigger className="w-48 bg-slate-50 border-slate-200 text-slate-900" data-testid="select-status">
                <Filter className="w-4 h-4 mr-2 text-slate-500" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="partial">Partial Payment</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900">
            {filteredInvoices.length} Invoice{filteredInvoices.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No invoices found</p>
              <p className="text-sm text-slate-500 mt-1">
                Invoices will appear here when you send estimates to QuickBooks
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Invoice #</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">QB Invoice #</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Customer</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Technicians</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Sent By</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Date Sent</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Due Date</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Amount</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Date Paid</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Payment Method</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">QB Sync</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const statusInfo = statusConfig[invoice.status] || statusConfig.draft;
                    const StatusIcon = statusInfo.icon;
                    const photoCount = (invoice.attachments?.length || 0);
                    
                    return (
                      <tr 
                        key={invoice.id} 
                        className="border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedInvoice(invoice)}
                        data-testid={`invoice-row-${invoice.id}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="font-mono text-sm text-slate-900">{invoice.invoiceNumber}</span>
                              {invoice.estimateNumber && (
                                <p className="text-xs text-slate-500">From: {invoice.estimateNumber}</p>
                              )}
                            </div>
                            {photoCount > 0 && (
                              <div className="flex items-center gap-0.5 text-blue-600" title={`${photoCount} photo(s) attached`}>
                                <Camera className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">{photoCount}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {invoice.quickbooksDocNumber ? (
                            <span className="font-mono text-sm text-blue-600">{invoice.quickbooksDocNumber}</span>
                          ) : invoice.quickbooksInvoiceId ? (
                            <span className="text-xs text-slate-400 italic">Sync to fetch</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <span className="text-sm text-slate-900">{invoice.customerName}</span>
                            {invoice.propertyName && invoice.propertyName !== invoice.customerName && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-500">{invoice.propertyName}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            {invoice.serviceTechName && (
                              <p className="text-xs text-slate-600">Service: {invoice.serviceTechName}</p>
                            )}
                            {invoice.repairTechName && (
                              <p className="text-xs text-slate-600">Repair: {invoice.repairTechName}</p>
                            )}
                            {!invoice.serviceTechName && !invoice.repairTechName && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600">{invoice.sentByUserName || "—"}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-sm text-slate-600">{formatDate(invoice.sentAt)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600">{formatDate(invoice.dueDate)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div>
                            <span className="font-semibold text-slate-900">{formatCurrency(invoice.totalAmount || 0)}</span>
                            {invoice.amountDue && invoice.amountDue > 0 && invoice.amountDue !== invoice.totalAmount && (
                              <p className="text-xs text-orange-600">Due: {formatCurrency(invoice.amountDue)}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className={`${statusInfo.color} gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {invoice.paidAt ? (
                            <span className="text-sm text-green-600">{formatDate(invoice.paidAt)}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {invoice.paymentMethod ? (
                            <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-50 text-xs capitalize">
                              {invoice.paymentMethod}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {invoice.quickbooksSyncStatus === "synced" ? (
                            <Badge variant="outline" className="border-green-300 text-green-700 bg-green-100 text-xs">
                              Synced
                            </Badge>
                          ) : invoice.quickbooksSyncStatus === "failed" ? (
                            <Badge variant="outline" className="border-red-300 text-red-700 bg-red-100 text-xs">
                              Failed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-100 text-xs">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {invoice.quickbooksInvoiceId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://app.qbo.intuit.com/app/invoice?txnId=${invoice.quickbooksInvoiceId}`, '_blank');
                              }}
                              data-testid={`btn-view-qb-${invoice.id}`}
                            >
                              <ExternalLink className="w-3 h-3" />
                              View in QB
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceDetailModal
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </AppLayout>
  );
}
