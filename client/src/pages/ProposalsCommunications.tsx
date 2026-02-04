import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Search, 
  Calendar, 
  DollarSign, 
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
  Mail,
  Send,
  Users,
  CheckSquare,
  Square,
  MinusSquare,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

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

interface Customer {
  id: string;
  name: string;
  email?: string;
  type?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: string;
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

const templates = [
  { id: "custom", name: "Custom Email", subject: "", body: "" },
  { 
    id: "seasonal", 
    name: "Seasonal Update", 
    subject: "Pool Service Seasonal Update - {{company_name}}",
    body: `Dear {{customer_name}},

As the seasons change, we wanted to reach out with important information about your pool service.

[Add your seasonal update content here]

Thank you for choosing Breakpoint Commercial Pool Systems.

Best regards,
The Breakpoint Team
(951) 653-3333`
  },
  { 
    id: "maintenance", 
    name: "Maintenance Reminder", 
    subject: "Upcoming Pool Maintenance Reminder",
    body: `Dear {{customer_name}},

This is a friendly reminder about upcoming maintenance for your pool facility.

[Add maintenance details here]

Please contact us if you have any questions.

Best regards,
Breakpoint Commercial Pool Systems
(951) 653-3333`
  },
  { 
    id: "newsletter", 
    name: "Monthly Newsletter", 
    subject: "Breakpoint Pool Services - Monthly Newsletter",
    body: `Dear {{customer_name}},

Welcome to our monthly newsletter!

WHAT'S NEW
----------
[Add news and updates here]

TIPS & TRICKS
-------------
[Add helpful pool tips]

REMINDERS
---------
[Add any important reminders]

Thank you for being a valued customer!

Breakpoint Commercial Pool Systems
Keeping People Safe™
(951) 653-3333 | www.BreakpointPools.com`
  }
];

export default function ProposalsCommunications() {
  const { toast } = useToast();
  
  const [proposalSearch, setProposalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const [customerSearch, setCustomerSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [templateName, setTemplateName] = useState("custom");

  const { data: estimatesData, isLoading: estimatesLoading } = useQuery<{ estimates: Estimate[] }>({
    queryKey: ["/api/estimates"],
  });
  const estimates = estimatesData?.estimates || [];

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const groupedByProperty = useMemo(() => {
    let filtered = estimates.filter((est) => {
      const matchesSearch = 
        est.propertyName?.toLowerCase().includes(proposalSearch.toLowerCase()) ||
        est.address?.toLowerCase().includes(proposalSearch.toLowerCase()) ||
        est.estimateNumber?.toLowerCase().includes(proposalSearch.toLowerCase()) ||
        est.title?.toLowerCase().includes(proposalSearch.toLowerCase());
      
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
  }, [estimates, proposalSearch, statusFilter, sortBy, sortOrder]);

  const proposalStats = useMemo(() => {
    return {
      total: estimates.length,
      pending: estimates.filter(e => e.status === "pending_approval").length,
      approved: estimates.filter(e => e.status === "approved").length,
      totalValue: estimates.reduce((sum, e) => sum + (e.totalAmount || 0), 0)
    };
  }, [estimates]);

  const customersWithEmail = useMemo(() => {
    return customers.filter(c => c.email && c.email.includes('@'));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customersWithEmail.filter((customer) => {
      const matchesSearch = 
        customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.address?.toLowerCase().includes(customerSearch.toLowerCase());
      
      const matchesType = typeFilter === "all" || customer.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [customersWithEmail, customerSearch, typeFilter]);

  const customerTypes = useMemo(() => {
    const types = new Set<string>();
    customers.forEach(c => {
      if (c.type) types.add(c.type);
    });
    return Array.from(types);
  }, [customers]);

  const allSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => selectedIds.has(c.id));
  const someSelected = filteredCustomers.some(c => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      const newSelected = new Set(selectedIds);
      filteredCustomers.forEach(c => newSelected.delete(c.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      filteredCustomers.forEach(c => newSelected.add(c.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectedCustomers = useMemo(() => {
    return customersWithEmail.filter(c => selectedIds.has(c.id));
  }, [customersWithEmail, selectedIds]);

  const applyTemplate = (templateId: string) => {
    setTemplateName(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && templateId !== "custom") {
      setEmailSubject(template.subject);
      setEmailBody(template.body);
    }
  };

  const handleSendEmails = async () => {
    if (selectedCustomers.length === 0) {
      toast({ title: "Error", description: "Please select at least one recipient", variant: "destructive" });
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast({ title: "Error", description: "Please enter a subject and message", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/email-blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: selectedCustomers.map(c => ({ id: c.id, name: c.name, email: c.email })),
          subject: emailSubject,
          body: emailBody,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send emails");
      }

      toast({ 
        title: "Emails Sent!", 
        description: `Successfully sent ${selectedCustomers.length} emails` 
      });
      setShowConfirm(false);
      setSelectedIds(new Set());
      setEmailSubject("");
      setEmailBody("");
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to send emails. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSending(false);
    }
  };

  const toggleProperty = (propertyId: string) => {
    setExpandedProperty(expandedProperty === propertyId ? null : propertyId);
  };

  const viewEstimateDetails = (est: Estimate) => {
    setSelectedEstimate(est);
    setShowDetailDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (estimatesLoading || customersLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <FileText className="w-7 h-7" />
          Proposals & Communications
        </h1>
        <p className="text-gray-500 mt-1">View proposal history and send bulk customer communications</p>
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
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-total-proposals">{proposalStats.total}</p>
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
                <p className="text-2xl font-bold text-amber-600" data-testid="stat-pending-proposals">{proposalStats.pending}</p>
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
                <p className="text-2xl font-bold text-green-600" data-testid="stat-approved-proposals">{proposalStats.approved}</p>
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
                <p className="text-2xl font-bold text-purple-600" data-testid="stat-total-value">{formatCurrency(proposalStats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Proposal History
          </CardTitle>
          <div className="flex flex-col md:flex-row gap-4 justify-between mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by property, address, or estimate number..."
                value={proposalSearch}
                onChange={(e) => setProposalSearch(e.target.value)}
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
            <div className="divide-y max-h-[400px] overflow-y-auto">
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

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Blast
          </CardTitle>
          <CardDescription>
            Select customers and send bulk emails or newsletters
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Select Recipients
                </h3>
                <Badge variant="secondary" data-testid="stat-selected-count">
                  {selectedIds.size} of {customersWithEmail.length} selected
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-customers"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {customerTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div 
                className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={toggleSelectAll}
                data-testid="select-all-checkbox"
              >
                {allSelected ? (
                  <CheckSquare className="w-5 h-5 text-[#0078D4]" />
                ) : someSelected ? (
                  <MinusSquare className="w-5 h-5 text-[#0078D4]" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-medium">
                  Select All ({filteredCustomers.length} customers)
                </span>
              </div>

              <div className="max-h-[250px] overflow-y-auto space-y-1 border rounded-lg">
                {filteredCustomers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No customers with email found</p>
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
                        selectedIds.has(customer.id) ? "bg-blue-50" : ""
                      }`}
                      onClick={() => toggleSelect(customer.id)}
                      data-testid={`customer-checkbox-${customer.id}`}
                    >
                      {selectedIds.has(customer.id) ? (
                        <CheckSquare className="w-5 h-5 text-[#0078D4] flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                        <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                      </div>
                      {customer.type && (
                        <Badge variant="secondary" className="flex-shrink-0 text-xs">
                          {customer.type}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={selectedIds.size === 0}
                  data-testid="button-clear-selection"
                >
                  Clear Selection
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Compose Email
              </h3>
              
              <div>
                <Label className="text-sm font-medium">Email Template</Label>
                <Select value={templateName} onValueChange={applyTemplate}>
                  <SelectTrigger className="mt-1" data-testid="select-template">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Subject Line</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="mt-1"
                  data-testid="input-email-subject"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Email Body</Label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your email message here...

Use {{customer_name}} to personalize with the customer's name."
                  className="mt-1 min-h-[150px] font-mono text-sm"
                  data-testid="textarea-email-body"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {"{{customer_name}}"} to personalize the email
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPreview(true)}
                  disabled={!emailSubject.trim() || !emailBody.trim()}
                  data-testid="button-preview-email"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  className="flex-1 bg-[#0078D4] hover:bg-[#0078D4]/90"
                  onClick={() => setShowConfirm(true)}
                  disabled={selectedIds.size === 0 || !emailSubject.trim() || !emailBody.trim()}
                  data-testid="button-send-emails"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to {selectedIds.size} Recipients
                </Button>
              </div>
            </div>
          </div>
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

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Email Preview
            </DialogTitle>
            <DialogDescription>
              This is how your email will appear to recipients
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            <div className="border-b pb-3 mb-4">
              <p className="text-sm text-gray-500">Subject:</p>
              <p className="font-medium">{emailSubject.replace("{{customer_name}}", "Sample Customer").replace("{{company_name}}", "Breakpoint Commercial Pool Systems")}</p>
            </div>
            <div className="whitespace-pre-wrap text-sm">
              {emailBody.replace(/\{\{customer_name\}\}/g, "Sample Customer").replace(/\{\{company_name\}\}/g, "Breakpoint Commercial Pool Systems")}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} data-testid="button-close-preview">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Confirm Email Blast
            </DialogTitle>
            <DialogDescription>
              You are about to send this email to {selectedIds.size} recipients.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Subject:</strong> {emailSubject}
              </p>
              <p className="text-sm text-amber-800 mt-1">
                <strong>Recipients:</strong> {selectedIds.size} customers
              </p>
            </div>
            <p className="text-sm text-gray-600">
              This action cannot be undone. Are you sure you want to send this email blast?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isSending} data-testid="button-cancel-send">
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmails} 
              disabled={isSending}
              className="bg-[#0078D4] hover:bg-[#0078D4]/90"
              data-testid="button-confirm-send"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Emails
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
