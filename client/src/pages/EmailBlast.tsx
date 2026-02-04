import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Mail, 
  Send, 
  Users, 
  Building2, 
  Search, 
  CheckSquare, 
  Square,
  MinusSquare,
  Eye,
  Calendar,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function EmailBlast() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [templateName, setTemplateName] = useState("custom");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const customersWithEmail = useMemo(() => {
    return customers.filter(c => c.email && c.email.includes('@'));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customersWithEmail.filter((customer) => {
      const matchesSearch = 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === "all" || customer.type === typeFilter;
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [customersWithEmail, searchTerm, typeFilter, statusFilter]);

  const customerTypes = useMemo(() => {
    const types = new Set<string>();
    customers.forEach(c => {
      if (c.type) types.add(c.type);
    });
    return Array.from(types);
  }, [customers]);

  const allSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => selectedIds.has(c.id));
  const someSelected = filteredCustomers.some(c => selectedIds.has(c.id));
  const noneSelected = !someSelected;

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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
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
            <Mail className="w-7 h-7" />
            Email Blast
          </h1>
          <p className="text-gray-500 mt-1">Send bulk emails and newsletters to your customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-total-customers">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">With Email Address</p>
                <p className="text-2xl font-bold text-green-600" data-testid="stat-customers-with-email">{customersWithEmail.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Selected</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="stat-selected-count">{selectedIds.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-fit">
          <CardHeader className="border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Recipients
            </CardTitle>
            <CardDescription>
              Choose which customers to include in this email blast
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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

            <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-lg">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Mail className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>No customers with email found</p>
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
                      <Badge variant="secondary" className="flex-shrink-0">
                        {customer.type}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-gray-600">
                {selectedIds.size} of {filteredCustomers.length} selected
              </span>
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
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Compose Email
            </CardTitle>
            <CardDescription>
              Create your email content or choose from templates
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
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
                className="mt-1 min-h-[250px] font-mono text-sm"
                data-testid="textarea-email-body"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {"{{customer_name}}"} to personalize the email with each recipient's name
              </p>
            </div>

            <div className="flex gap-2 pt-4 border-t">
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
          </CardContent>
        </Card>
      </div>

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
              <p className="font-medium">{emailSubject.replace("{{customer_name}}", "Sample Customer")}</p>
            </div>
            <div className="whitespace-pre-wrap text-sm">
              {emailBody.replace(/\{\{customer_name\}\}/g, "Sample Customer")}
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
