import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download, Loader2, Search, Plus, Users, Building2,
  MapPin, Phone, Mail, Filter, MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Customer {
  id: string;
  externalId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string | null;
  poolCount: number | null;
  tags: string | null;
  notes: string | null;
}

const STATUS_BADGES: Record<string, { label: string; color: string; bgColor: string }> = {
  active_routed: { label: "ACTIVE (routed)", color: "text-white", bgColor: "bg-green-600" },
  active: { label: "ACTIVE (no route)", color: "text-white", bgColor: "bg-yellow-500" },
  inactive: { label: "INACTIVE", color: "text-white", bgColor: "bg-red-500" },
  lead: { label: "LEADS", color: "text-white", bgColor: "bg-blue-500" },
};

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ["stored-customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers/stored");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const importCustomersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearExisting: true }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import customers");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stored-customers"] });
      toast({ title: "Customers Imported", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });

  const customers: Customer[] = customersData?.customers || [];

  const filteredCustomers = useMemo(() => {
    let result = customers;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.address?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter) {
      result = result.filter(c => c.status === statusFilter);
    }
    
    return result;
  }, [customers, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      active_routed: 0,
      active: 0,
      inactive: 0,
      lead: 0,
    };
    for (const c of customers) {
      const status = c.status || "active";
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    }
    return counts;
  }, [customers]);

  const formatAddress = (customer: Customer) => {
    const parts = [];
    if (customer.address) parts.push(customer.address);
    if (customer.city) parts.push(customer.city);
    if (customer.state) parts.push(customer.state);
    if (customer.zip) parts.push(customer.zip);
    return parts.join(", ") || null;
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4 h-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900" data-testid="page-title">
            Customers
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => importCustomersMutation.mutate()}
              disabled={importCustomersMutation.isPending}
            >
              {importCustomersMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Import Customers
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Add Customer
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter(statusFilter === "active_routed" ? null : "active_routed")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "active_routed" ? "ring-2 ring-offset-2 ring-green-600" : ""
            } bg-green-600 text-white`}
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {statusCounts.active_routed}
            </span>
            ACTIVE (routed)
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "active" ? null : "active")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "active" ? "ring-2 ring-offset-2 ring-yellow-500" : ""
            } bg-yellow-500 text-white`}
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {statusCounts.active}
            </span>
            ACTIVE (no route)
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "inactive" ? null : "inactive")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "inactive" ? "ring-2 ring-offset-2 ring-red-500" : ""
            } bg-red-500 text-white`}
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {statusCounts.inactive}
            </span>
            INACTIVE
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "lead" ? null : "lead")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "lead" ? "ring-2 ring-offset-2 ring-blue-500" : ""
            } bg-blue-500 text-white`}
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {statusCounts.lead}
            </span>
            LEADS
          </button>
          
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Filter className="h-4 w-4" />
              FILTER
              <Badge variant="secondary" className="ml-1">OFF</Badge>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(checked) => setShowArchived(!!checked)}
            />
            Show archived customers
          </label>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, address, email or phone"
            className="pl-10"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">CUSTOMER</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">ADDRESS</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">PHONE</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">EMAIL</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                      <p className="text-sm text-slate-500 mt-2">Loading customers...</p>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500">
                        {customers.length === 0 
                          ? "No customers yet. Click 'Import Customers' to get started."
                          : "No customers match your search."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const fullAddress = formatAddress(customer);
                    const addressCount = customer.poolCount || 0;
                    
                    return (
                      <tr 
                        key={customer.id} 
                        className="hover:bg-slate-50 cursor-pointer"
                        data-testid={`customer-row-${customer.id}`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-blue-600 hover:underline">
                              {customer.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          {addressCount > 1 ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <MapPin className="h-4 w-4" />
                              <span className="underline">{addressCount} Addresses</span>
                            </div>
                          ) : fullAddress ? (
                            <span className="text-slate-600 text-sm">{fullAddress}</span>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {customer.phone ? (
                            <span className="text-slate-600 text-sm">{customer.phone}</span>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {customer.email ? (
                            <span className="text-slate-600 text-sm">{customer.email}</span>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>View Pools</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="text-sm text-slate-500">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>
      </div>
    </AppLayout>
  );
}
