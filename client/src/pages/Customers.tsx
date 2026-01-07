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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Download, Loader2, Search, Plus, Users, Building2, User,
  MapPin, Phone, Mail, Filter, MoreVertical, X, ChevronLeft,
  Droplets, DollarSign, FileText, Tag, Calendar, Clock
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

interface Pool {
  id: string;
  externalId: string;
  name: string;
  poolType: string | null;
  serviceLevel: string | null;
  waterType: string | null;
  gallons: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface CustomerAddress {
  type: string;
  addressLine1: string;
  city: string | null;
  state: string | null;
  zip: string | null;
}

const STATUS_BADGES: Record<string, { label: string; color: string; bgColor: string }> = {
  active_routed: { label: "Active (routed)", color: "text-white", bgColor: "bg-green-500" },
  active: { label: "Active (no route)", color: "text-white", bgColor: "bg-yellow-500" },
  inactive: { label: "Inactive", color: "text-white", bgColor: "bg-red-500" },
  lead: { label: "Lead", color: "text-white", bgColor: "bg-blue-500" },
};

const POOL_TAB_COLORS = ["bg-blue-600", "bg-green-600", "bg-orange-500", "bg-purple-600", "bg-cyan-600"];

function CustomerDetail({ 
  customer, 
  onClose 
}: { 
  customer: Customer; 
  onClose: () => void;
}) {
  const [leftTab, setLeftTab] = useState("profile");
  const [activePoolIndex, setActivePoolIndex] = useState(0);
  const [showRouteSchedule, setShowRouteSchedule] = useState(false);

  const { data: detailData, isLoading } = useQuery({
    queryKey: ["customer-detail", customer.externalId],
    queryFn: async () => {
      if (!customer.externalId) return { pools: [], addresses: [], notes: "" };
      const response = await fetch(`/api/customers/${customer.externalId}/detail`);
      if (!response.ok) throw new Error("Failed to fetch details");
      return response.json();
    },
    enabled: !!customer.externalId,
  });

  const pools: Pool[] = detailData?.pools || [];
  const addresses: CustomerAddress[] = detailData?.addresses || [];
  const notes: string = detailData?.notes || customer.notes || "";
  
  const statusBadge = STATUS_BADGES[customer.status || "active"] || STATUS_BADGES.active;

  const formatAddress = (addr: CustomerAddress | null) => {
    if (!addr) return "";
    const parts = [addr.addressLine1, addr.city, addr.state, addr.zip].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-blue-700">Customer</h1>
              <Badge className={`${statusBadge.bgColor} ${statusBadge.color}`}>
                {statusBadge.label}
              </Badge>
            </div>
            <h2 className="text-xl font-semibold text-slate-800">{customer.name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
            <Input 
              placeholder="customer, address, job #" 
              className="pl-10 w-64 bg-green-500 text-white placeholder:text-white/70 border-green-600"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r bg-white flex flex-col">
          <Tabs value={leftTab} onValueChange={setLeftTab} className="flex-1 flex flex-col">
            <TabsList className="flex justify-start gap-1 px-4 pt-4 bg-transparent">
              <TabsTrigger value="profile" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                <User className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="addresses" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                <MapPin className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="billing" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                <DollarSign className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                <FileText className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            <div className="absolute right-4 top-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-green-600 border-green-600"
                onClick={() => setShowRouteSchedule(true)}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Route
              </Button>
            </div>

            <TabsContent value="profile" className="flex-1 px-4 py-4 space-y-4 overflow-auto">
              <div>
                <h3 className="font-semibold text-slate-800">{customer.name}</h3>
                <p className="text-sm text-slate-600">
                  {customer.address && `${customer.address}`}
                  {customer.city && `, ${customer.city}`}
                  {customer.state && ` ${customer.state}`}
                  {customer.zip && ` ${customer.zip}`}
                </p>
                {addresses.length > 1 && (
                  <p className="text-sm text-green-600 underline cursor-pointer">
                    {addresses.length - 1} more addresses
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{customer.name}</span>
                </div>
                <div className="text-xs text-slate-400 uppercase">Customer</div>
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-blue-600">{customer.email}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Route Stop Email</p>
                <Input 
                  value={customer.email || ""} 
                  placeholder="email@example.com" 
                  className="text-sm"
                  readOnly
                />
              </div>

              <div className="flex gap-6 py-4">
                <div className="flex flex-col items-center cursor-pointer hover:opacity-75">
                  <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                    <Droplets className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
                <div className="flex flex-col items-center cursor-pointer hover:opacity-75">
                  <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
                <div className="flex flex-col items-center cursor-pointer hover:opacity-75">
                  <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium">Tags</span>
                  <Button variant="link" size="sm" className="text-blue-600 p-0 h-auto">
                    Add
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-slate-100">Summer - 6 Days</Badge>
                  <Badge variant="outline" className="bg-slate-100">Winter - 5 Days</Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="addresses" className="flex-1 px-4 py-4 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <Input placeholder="Search addresses" className="w-48" />
                <Button variant="link" className="text-blue-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  + Add Address
                </Button>
              </div>
              
              <div className="space-y-4">
                {addresses.length > 0 ? addresses.map((addr, idx) => (
                  <div key={idx} className="flex gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800">{addr.addressLine1}</p>
                      <p className="text-sm text-slate-600">
                        {[addr.city, addr.state, addr.zip].filter(Boolean).join(" ")}
                      </p>
                      <Badge 
                        className={`mt-1 text-xs ${addr.type === "billing" ? "bg-orange-500" : "bg-green-500"} text-white`}
                      >
                        {addr.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                )) : (
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800">{customer.address || "No address"}</p>
                      <p className="text-sm text-slate-600">
                        {[customer.city, customer.state, customer.zip].filter(Boolean).join(" ")}
                      </p>
                      <Badge className="mt-1 text-xs bg-green-500 text-white">PRIMARY</Badge>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="billing" className="flex-1 px-4 py-4 overflow-auto">
              <p className="text-slate-500">Billing information coming soon...</p>
            </TabsContent>

            <TabsContent value="notes" className="flex-1 px-4 py-4 overflow-auto">
              <Textarea 
                value={notes} 
                placeholder="Customer notes..."
                className="min-h-[200px]"
                readOnly
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : pools.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Droplets className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No bodies of water found</p>
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Pool
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center p-2 border-b bg-white overflow-x-auto">
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1">
                  {pools.map((pool, idx) => (
                    <button
                      key={pool.id}
                      onClick={() => setActivePoolIndex(idx)}
                      className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                        activePoolIndex === idx
                          ? `${POOL_TAB_COLORS[idx % POOL_TAB_COLORS.length]} text-white`
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      {pool.name}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="icon" className="flex-shrink-0 ml-auto">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 p-6 overflow-auto">
                {pools[activePoolIndex] && (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm text-slate-500">Service Level</Label>
                            <Select defaultValue={pools[activePoolIndex].serviceLevel || ""}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select service level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pool Tech Services">Pool Tech Services</SelectItem>
                                <SelectItem value="Full Service">Full Service</SelectItem>
                                <SelectItem value="Chemical Only">Chemical Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm text-slate-500">Type</Label>
                            <Select defaultValue={pools[activePoolIndex].waterType || ""}>
                              <SelectTrigger>
                                <SelectValue placeholder="--" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Chlorine">Chlorine</SelectItem>
                                <SelectItem value="Salt">Salt</SelectItem>
                                <SelectItem value="Bromine">Bromine</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm text-slate-500">Gallons</Label>
                            <Input 
                              type="number" 
                              defaultValue={pools[activePoolIndex].gallons || ""} 
                              placeholder="Volume"
                            />
                          </div>
                        </div>
                        <div className="mt-2 text-right">
                          <Button variant="link" className="text-blue-600 text-sm">
                            Add Item
                            <Plus className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center text-slate-400 text-sm border-2 border-dashed rounded-lg py-8 mb-4">
                          <p className="font-medium">WHEN ARRIVING</p>
                          <p>DRAG ITEMS HERE</p>
                        </div>

                        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 whitespace-nowrap">
                            BEFORE PICTURES
                            <span className="ml-1 text-xs opacity-60">○</span>
                          </Badge>
                          <span className="text-slate-300">&gt;</span>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 whitespace-nowrap">
                            CHEMICAL READINGS
                          </Badge>
                          <span className="text-slate-300">&gt;</span>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 whitespace-nowrap">
                            CHEMICAL DOSING
                          </Badge>
                        </div>

                        <div className="text-center text-sm text-slate-500 border-b pb-2 mb-4">
                          JOB IN PROGRESS
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                            <div className="flex gap-1">
                              <div className="w-1 h-4 bg-slate-300 rounded"></div>
                              <div className="w-1 h-4 bg-slate-300 rounded"></div>
                            </div>
                            <Checkbox checked className="text-green-600" />
                            <span className="flex-1">Take equipment photo</span>
                            <div className="flex items-center gap-2">
                              <span className="text-blue-500 text-xs">○</span>
                              <span className="text-slate-400">📷</span>
                              <span className="text-green-500">&gt;</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50 border-yellow-200">
                            <div className="flex gap-1">
                              <div className="w-1 h-4 bg-slate-300 rounded"></div>
                              <div className="w-1 h-4 bg-slate-300 rounded"></div>
                            </div>
                            <span className="flex-1 font-medium">Backwash</span>
                            <span className="text-green-500">&gt;</span>
                          </div>

                          <div className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                            <div className="flex gap-1">
                              <div className="w-1 h-4 bg-slate-300 rounded"></div>
                              <div className="w-1 h-4 bg-slate-300 rounded"></div>
                            </div>
                            <span className="text-slate-400">Cleaned Filter</span>
                            <span className="text-xs text-slate-400 ml-auto">Not shown in app (Sand Filter)</span>
                          </div>

                          <div className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                            <div className="flex gap-1">
                              <div className="w-1 h-4 bg-slate-300 rounded"></div>
                              <div className="w-1 h-4 bg-slate-300 rounded"></div>
                            </div>
                            <span className="text-slate-400">Cleaned Salt Cell</span>
                            <span className="text-xs text-slate-400 ml-auto">Not shown in app (No Salt System)</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={showRouteSchedule} onOpenChange={setShowRouteSchedule}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-blue-600 text-xl">Route Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center gap-3">
              <span className="font-medium">Activate Route Schedule</span>
              <Switch defaultChecked />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, idx) => (
                <div key={day} className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-sm">
                    KP
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-600">(Beaumont/North) {day}</p>
                    <p className="text-xs text-slate-500">Kyle Pollock</p>
                  </div>
                  <span className="text-xs text-slate-400">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][idx]}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="font-medium">How Often?</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="frequency" defaultChecked className="text-blue-600" />
                    <span className="text-sm">Once a week</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="frequency" className="text-blue-600" />
                    <span className="text-sm">Every other week</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="frequency" className="text-blue-600" />
                    <span className="text-sm">Every (x) weeks</span>
                  </label>
                </div>
              </div>
              <div>
                <Label className="font-medium">Ends On:</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="ends" defaultChecked className="text-blue-600" />
                    <span className="text-sm">Never</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="ends" className="text-blue-600" />
                    <span className="text-sm">Date 📅</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label className="font-medium">Multiple visits per week</Label>
              <div className="flex gap-1 mt-2">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d, i) => (
                  <button
                    key={d}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      i < 5 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-medium">Notes</Label>
              <Textarea placeholder="Add notes..." className="mt-2" />
              <p className="text-xs text-slate-400 mt-1">Character limit: 6000</p>
            </div>

            <div className="text-center pt-4 border-t">
              <h4 className="font-semibold text-lg">Billing Schedule</h4>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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

  if (selectedCustomer) {
    return <CustomerDetail customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />;
  }

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
              data-testid="button-import-customers"
            >
              {importCustomersMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Import Customers
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-customer">
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
            data-testid="filter-active-routed"
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
            data-testid="filter-active-no-route"
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
            data-testid="filter-inactive"
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
            data-testid="filter-leads"
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {statusCounts.lead}
            </span>
            LEADS
          </button>
          
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" data-testid="button-filter">
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
              data-testid="checkbox-show-archived"
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
            data-testid="input-search-customers"
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
                        onClick={() => setSelectedCustomer(customer)}
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
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                                View Details
                              </DropdownMenuItem>
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

        <div className="text-sm text-slate-500" data-testid="text-customer-count">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>
      </div>
    </AppLayout>
  );
}
