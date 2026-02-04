import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Search, 
  Calendar, 
  DollarSign, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  Filter,
  ArrowUpDown,
  Building2,
  Mail
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Estimate {
  id: number;
  estimateNumber: string;
  title: string;
  propertyId: string;
  propertyName: string;
  address?: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount: number;
  status: string;
  estimateDate: string;
  createdAt: string;
  sentAt?: string;
  approvedAt?: string;
  declinedAt?: string;
  sentBy?: string;
  approvedBy?: string;
  declinedBy?: string;
  items?: any[];
  notes?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
  pending_approval: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  declined: { label: "Declined", color: "bg-red-100 text-red-700", icon: XCircle },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-500", icon: AlertTriangle },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  needs_scheduling: { label: "Needs Scheduling", color: "bg-purple-100 text-purple-700", icon: Calendar },
  scheduled: { label: "Scheduled", color: "bg-indigo-100 text-indigo-700", icon: Calendar },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function Proposals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: estimates = [], isLoading } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates"],
  });

  const groupedByProperty = useMemo(() => {
    let filtered = estimates.filter((est) => {
      const matchesSearch = 
        est.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.estimateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || est.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    filtered = filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "amount") {
        comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
      } else if (sortBy === "status") {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    const grouped: Record<string, { property: string; address: string; estimates: Estimate[] }> = {};
    filtered.forEach((est) => {
      const key = est.propertyId || est.propertyName;
      if (!grouped[key]) {
        grouped[key] = {
          property: est.propertyName || "Unknown Property",
          address: est.address || "",
          estimates: []
        };
      }
      grouped[key].estimates.push(est);
    });

    return grouped;
  }, [estimates, searchTerm, statusFilter, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = estimates.length;
    const pending = estimates.filter(e => e.status === "pending_approval").length;
    const approved = estimates.filter(e => e.status === "approved" || e.status === "completed").length;
    const declined = estimates.filter(e => e.status === "declined").length;
    const totalValue = estimates.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    return { total, pending, approved, declined, totalValue };
  }, [estimates]);

  const toggleProperty = (propertyId: string) => {
    setExpandedProperty(expandedProperty === propertyId ? null : propertyId);
  };

  const viewEstimateDetails = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setShowDetailDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: "bg-gray-100 text-gray-700", icon: FileText };
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <FileText className="w-7 h-7" />
            Proposals
          </h1>
          <p className="text-gray-500 mt-1">View all estimates and proposals sent to customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Proposals</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-total-proposals">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="stat-pending-proposals">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600" data-testid="stat-approved-proposals">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="stat-total-value">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by property, address, or estimate number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-proposals"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[140px]" data-testid="select-sort-by">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                data-testid="button-toggle-sort"
              >
                <ArrowUpDown className={`w-4 h-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {Object.keys(groupedByProperty).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No proposals found</p>
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedByProperty).map(([propertyId, data]) => (
                <div key={propertyId}>
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleProperty(propertyId)}
                    data-testid={`property-row-${propertyId}`}
                  >
                    <div className="flex items-center gap-3">
                      {expandedProperty === propertyId ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                      <Building2 className="w-5 h-5 text-[#1e3a5f]" />
                      <div>
                        <p className="font-medium text-gray-900">{data.property}</p>
                        <p className="text-sm text-gray-500">{data.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        {data.estimates.length} proposal{data.estimates.length !== 1 ? 's' : ''}
                      </Badge>
                      <span className="text-sm font-medium text-gray-600">
                        {formatCurrency(data.estimates.reduce((sum, e) => sum + (e.totalAmount || 0), 0))}
                      </span>
                    </div>
                  </div>
                  
                  {expandedProperty === propertyId && (
                    <div className="bg-gray-50 border-t">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead className="w-[120px]">Estimate #</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead className="w-[100px]">Date Sent</TableHead>
                            <TableHead className="w-[100px]">Amount</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead className="w-[150px]">Sent By</TableHead>
                            <TableHead className="w-[150px]">Response By</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.estimates.map((est) => (
                            <TableRow key={est.id} className="hover:bg-white">
                              <TableCell className="font-mono text-sm">{est.estimateNumber || "—"}</TableCell>
                              <TableCell className="font-medium">{est.title || "Untitled"}</TableCell>
                              <TableCell className="text-sm">{formatDate(est.sentAt || est.createdAt)}</TableCell>
                              <TableCell className="font-medium text-[#0078D4]">{formatCurrency(est.totalAmount)}</TableCell>
                              <TableCell>{getStatusBadge(est.status)}</TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {est.sentBy || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {est.approvedBy || est.declinedBy || "—"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewEstimateDetails(est);
                                  }}
                                  data-testid={`view-estimate-${est.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1e3a5f]" />
              Estimate Details
            </DialogTitle>
          </DialogHeader>
          {selectedEstimate && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Estimate Number</p>
                  <p className="font-mono font-medium">{selectedEstimate.estimateNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedEstimate.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Property</p>
                  <p className="font-medium">{selectedEstimate.propertyName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{selectedEstimate.customerName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-xl font-bold text-[#0078D4]">{formatCurrency(selectedEstimate.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date Created</p>
                  <p className="font-medium">{formatDateTime(selectedEstimate.createdAt)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">History Log</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-gray-500">{formatDateTime(selectedEstimate.createdAt)}</p>
                    </div>
                  </div>
                  {selectedEstimate.sentAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Sent for Approval</p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(selectedEstimate.sentAt)}
                          {selectedEstimate.sentBy && ` by ${selectedEstimate.sentBy}`}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedEstimate.approvedAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Approved</p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(selectedEstimate.approvedAt)}
                          {selectedEstimate.approvedBy && ` by ${selectedEstimate.approvedBy}`}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedEstimate.declinedAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Declined</p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(selectedEstimate.declinedAt)}
                          {selectedEstimate.declinedBy && ` by ${selectedEstimate.declinedBy}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedEstimate.items && selectedEstimate.items.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Line Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[60px] text-right">Qty</TableHead>
                        <TableHead className="w-[100px] text-right">Rate</TableHead>
                        <TableHead className="w-[100px] text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEstimate.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{item.description || item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity || 1}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice || item.rate || 0)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency((item.quantity || 1) * (item.unitPrice || item.rate || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
