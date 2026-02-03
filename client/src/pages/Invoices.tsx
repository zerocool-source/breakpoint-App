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
  Camera,
  Mail,
  Wrench,
  User,
  Send,
  ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const handleSendToQuickBooks = async (invoice: Invoice) => {
    setSendingInvoiceId(invoice.id);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send-to-quickbooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: invoice.emailedTo || "",
          sendEmail: true,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast({
          title: "Invoice Sent to QuickBooks",
          description: `${invoice.invoiceNumber} → QB #${data.qbNumber}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      } else {
        toast({
          title: "Failed to Send Invoice",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error sending invoice to QuickBooks:", error);
      toast({
        title: "Error",
        description: "Failed to send invoice to QuickBooks",
        variant: "destructive",
      });
    } finally {
      setSendingInvoiceId(null);
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
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">QB #</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Customer / Work</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Technician</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Emailed</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Sent</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Due</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Amount</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Paid</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Photos</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const statusInfo = statusConfig[invoice.status] || statusConfig.draft;
                    const StatusIcon = statusInfo.icon;
                    const photoCount = (invoice.attachments?.length || 0);
                    
                    const lineItems = invoice.lineItems as Array<{ description?: string; productService?: string }> | null;
                    const firstLineItem = lineItems?.[0];
                    const workDescription = firstLineItem?.description || firstLineItem?.productService || "";
                    const truncatedWork = workDescription.length > 50 ? workDescription.slice(0, 47) + "..." : workDescription;
                    
                    const techName = invoice.repairTechName || invoice.serviceTechName;
                    const techType = invoice.repairTechName ? "Repair" : invoice.serviceTechName ? "Service" : null;
                    
                    return (
                      <tr 
                        key={invoice.id} 
                        className="border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedInvoice(invoice)}
                        data-testid={`invoice-row-${invoice.id}`}
                      >
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-mono text-sm text-slate-900">{invoice.invoiceNumber}</span>
                            {invoice.estimateNumber && (
                              <p className="text-xs text-slate-500">Est: {invoice.estimateNumber}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {invoice.quickbooksDocNumber ? (
                            <span className="font-mono text-sm text-blue-600">{invoice.quickbooksDocNumber}</span>
                          ) : invoice.quickbooksInvoiceId ? (
                            <span className="text-xs text-slate-400 italic">Sync</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-[280px]">
                          <div>
                            <span className="text-sm font-medium text-slate-900">{invoice.customerName}</span>
                            {invoice.propertyName && invoice.propertyName !== invoice.customerName && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="text-xs text-slate-500 truncate">{invoice.propertyName}</span>
                              </div>
                            )}
                            {truncatedWork && (
                              <div className="flex items-center gap-1 mt-1">
                                <Wrench className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                <span className="text-xs text-slate-600 italic truncate" title={workDescription}>
                                  {truncatedWork}
                                </span>
                              </div>
                            )}
                            {invoice.sourceType === "work_order" && (
                              <div className="mt-1">
                                <Badge 
                                  variant="outline" 
                                  className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] px-1.5 py-0 gap-0.5"
                                >
                                  <ClipboardList className="w-2.5 h-2.5" />
                                  Work Order
                                </Badge>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {techName ? (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <div>
                                <span className="text-sm text-slate-900">{techName}</span>
                                {techType && (
                                  <span className="text-xs text-slate-500 ml-1">({techType})</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {invoice.emailedTo ? (
                            <div className="flex items-center gap-1.5" title={`Sent to ${invoice.emailedTo}`}>
                              <Mail className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-xs text-slate-600 max-w-[120px] truncate">{invoice.emailedTo}</span>
                            </div>
                          ) : invoice.sentAt ? (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="text-xs">Not emailed</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600">{formatDate(invoice.sentAt)}</span>
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
                            <div>
                              <span className="text-sm text-green-600">{formatDate(invoice.paidAt)}</span>
                              {invoice.paymentMethod && (
                                <p className="text-xs text-slate-500 capitalize">{invoice.paymentMethod}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {photoCount > 0 ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                              <Camera className="w-3 h-3" />
                              {photoCount}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Send Invoice button for draft work order invoices */}
                            {invoice.status === "draft" && invoice.sourceType === "work_order" && !invoice.quickbooksInvoiceId && (
                              <Button
                                variant="default"
                                size="sm"
                                className="gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={sendingInvoiceId === invoice.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendToQuickBooks(invoice);
                                }}
                                data-testid={`btn-send-invoice-${invoice.id}`}
                              >
                                {sendingInvoiceId === invoice.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                Send Invoice
                              </Button>
                            )}
                            {/* View in QB button for synced invoices */}
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
                          </div>
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
