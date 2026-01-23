import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Link2
} from "lucide-react";
import { Link } from "wouter";
import type { Invoice } from "@shared/schema";

type InvoiceStatus = "all" | "draft" | "sent" | "paid" | "overdue" | "voided" | "partial";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  paid: { label: "Paid", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertCircle },
  voided: { label: "Voided", color: "bg-gray-600/20 text-gray-500 border-gray-600/30", icon: XCircle },
  partial: { label: "Partial", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: DollarSign },
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

  return (
    <AppLayout>
      <div className="mb-6">
        <Link href="/estimates">
          <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground hover:text-primary" data-testid="btn-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Estimates
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              Invoices
            </h1>
            <p className="text-muted-foreground mt-1">
              Track invoices sent to QuickBooks and their payment status
            </p>
          </div>
          <div className="flex items-center gap-3">
            {qbStatus?.connected ? (
              <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 gap-2">
                <Link2 className="w-3 h-3" />
                QuickBooks Connected
              </Badge>
            ) : (
              <Link href="/settings">
                <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/10 gap-2 cursor-pointer hover:bg-orange-500/20">
                  <AlertCircle className="w-3 h-3" />
                  Connect QuickBooks
                </Badge>
              </Link>
            )}
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
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.paid}</p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
            </div>
            <p className="text-sm text-green-400 mt-2">{formatCurrency(stats.paidAmount)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
            <p className="text-sm text-blue-400 mt-2">{formatCurrency(stats.pendingAmount)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
            <p className="text-sm text-red-400 mt-2">{formatCurrency(stats.overdueAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card border-white/10 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, customer, or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus)}>
              <SelectTrigger className="w-48 bg-white/5 border-white/10" data-testid="select-status">
                <Filter className="w-4 h-4 mr-2" />
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
      <Card className="glass-card border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            {filteredInvoices.length} Invoice{filteredInvoices.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Invoices will appear here when you send estimates to QuickBooks
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Invoice #</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Customer</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Property</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Due Date</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">QB Sync</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const statusInfo = statusConfig[invoice.status] || statusConfig.draft;
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <tr 
                        key={invoice.id} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        data-testid={`invoice-row-${invoice.id}`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-white">{invoice.invoiceNumber}</span>
                          {invoice.estimateNumber && (
                            <p className="text-xs text-muted-foreground">From: {invoice.estimateNumber}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-white">{invoice.customerName}</span>
                        </td>
                        <td className="py-3 px-4">
                          {invoice.propertyName ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{invoice.propertyName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{formatDate(invoice.createdAt)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">{formatDate(invoice.dueDate)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div>
                            <span className="font-semibold text-white">{formatCurrency(invoice.totalAmount || 0)}</span>
                            {invoice.amountDue && invoice.amountDue > 0 && invoice.amountDue !== invoice.totalAmount && (
                              <p className="text-xs text-orange-400">Due: {formatCurrency(invoice.amountDue)}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className={`${statusInfo.color} gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {invoice.quickbooksSyncStatus === "synced" ? (
                            <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 text-xs">
                              Synced
                            </Badge>
                          ) : invoice.quickbooksSyncStatus === "failed" ? (
                            <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-xs">
                              Failed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-500/30 text-gray-400 bg-gray-500/10 text-xs">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {invoice.quickbooksInvoiceId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => {
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
    </AppLayout>
  );
}
