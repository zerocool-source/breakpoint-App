import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  RefreshCw, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Wrench,
  Droplets,
  Flame,
  Gauge,
  Timer,
  Beaker,
  User,
  MapPin,
  Building
} from "lucide-react";

interface PoolEquipment {
  category: string;
  type: string;
  notes: string | null;
}

interface Pool {
  id: string;
  name: string;
  type: string;
  address: string | null;
  waterType: string | null;
  serviceLevel: string | null;
  equipment: PoolEquipment[];
  notes: string | null;
}

interface Customer {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  email: string | null;
  phone: string | null;
  pools: Pool[];
}

const EQUIPMENT_ICONS: Record<string, React.ReactNode> = {
  filter: <Wrench className="h-4 w-4" />,
  pump: <Droplets className="h-4 w-4" />,
  heater: <Flame className="h-4 w-4" />,
  controller: <Gauge className="h-4 w-4" />,
  chlorinator: <Beaker className="h-4 w-4" />,
  cleaner: <Wrench className="h-4 w-4" />,
  timer: <Timer className="h-4 w-4" />,
};

const EQUIPMENT_COLORS: Record<string, string> = {
  filter: "bg-blue-100 text-blue-700 border-blue-200",
  pump: "bg-cyan-100 text-cyan-700 border-cyan-200",
  heater: "bg-orange-100 text-orange-700 border-orange-200",
  controller: "bg-purple-100 text-purple-700 border-purple-200",
  chlorinator: "bg-green-100 text-green-700 border-green-200",
  cleaner: "bg-slate-100 text-slate-700 border-slate-200",
  timer: "bg-amber-100 text-amber-700 border-amber-200",
};

function EquipmentBadge({ equipment }: { equipment: PoolEquipment }) {
  const icon = EQUIPMENT_ICONS[equipment.category] || <Wrench className="h-4 w-4" />;
  const colorClass = EQUIPMENT_COLORS[equipment.category] || "bg-gray-100 text-gray-700 border-gray-200";
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm ${colorClass}`}>
      {icon}
      <span className="font-medium capitalize">{equipment.category}:</span>
      <span>{equipment.type}</span>
    </div>
  );
}

function CustomerCard({ customer, isExpanded, onToggle }: { 
  customer: Customer; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const totalEquipment = customer.pools.reduce((sum, pool) => sum + pool.equipment.length, 0);
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="border-l-4 border-l-blue-500">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base font-semibold">{customer.name}</CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {customer.pools.length} pool{customer.pools.length !== 1 ? 's' : ''}
                </Badge>
                {totalEquipment > 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {totalEquipment} equipment
                  </Badge>
                )}
              </div>
            </div>
            {customer.address && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 ml-8 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {customer.address}
                  {customer.city && `, ${customer.city}`}
                  {customer.state && `, ${customer.state}`}
                  {customer.zip && ` ${customer.zip}`}
                </span>
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="space-y-4">
              {customer.pools.map((pool) => (
                <div key={pool.id} className="bg-slate-50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-slate-800">{pool.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {pool.type}
                      </Badge>
                    </div>
                    {pool.waterType && (
                      <span className="text-xs text-slate-500">{pool.waterType}</span>
                    )}
                  </div>
                  
                  {pool.address && (
                    <p className="text-sm text-slate-500 mb-3">{pool.address}</p>
                  )}
                  
                  {pool.equipment.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Equipment</p>
                      <div className="flex flex-wrap gap-2">
                        {pool.equipment.map((equip, idx) => (
                          <EquipmentBadge key={idx} equipment={equip} />
                        ))}
                      </div>
                      
                      {pool.equipment.some(e => e.notes) && (
                        <div className="mt-3 space-y-1">
                          {pool.equipment.filter(e => e.notes).map((equip, idx) => (
                            <div key={idx} className="text-sm text-slate-600 bg-white p-2 rounded border">
                              <span className="font-medium capitalize">{equip.category} Notes:</span>{' '}
                              {equip.notes}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No equipment recorded</p>
                  )}
                  
                  {pool.notes && (
                    <div className="mt-3 text-sm text-slate-600 bg-white p-2 rounded border">
                      <span className="font-medium">Pool Notes:</span> {pool.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function Notes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isFetching } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/poolbrain/customers-equipment"],
    queryFn: async () => {
      const res = await fetch("/api/poolbrain/customers-equipment");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch data");
      }
      return res.json();
    },
  });

  const customers = data?.customers || [];
  
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (customer.name.toLowerCase().includes(query)) return true;
    if (customer.address?.toLowerCase().includes(query)) return true;
    
    for (const pool of customer.pools) {
      if (pool.name.toLowerCase().includes(query)) return true;
      if (pool.notes?.toLowerCase().includes(query)) return true;
      for (const equip of pool.equipment) {
        if (equip.type.toLowerCase().includes(query)) return true;
        if (equip.category.toLowerCase().includes(query)) return true;
        if (equip.notes?.toLowerCase().includes(query)) return true;
      }
    }
    
    return false;
  });

  const toggleCustomer = (id: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCustomers(new Set(filteredCustomers.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedCustomers(new Set());
  };

  const totalEquipment = customers.reduce(
    (sum, c) => sum + c.pools.reduce((pSum, p) => pSum + p.equipment.length, 0),
    0
  );

  return (
    <AppLayout>
      <div data-testid="notes-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Equipment Notes</h1>
            <p className="text-slate-500 mt-1">
              All customer equipment from Pool Brain
            </p>
          </div>
          <Button 
            onClick={() => refetch()} 
            disabled={isFetching}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Syncing...' : 'Sync from Pool Brain'}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700">{customers.length}</p>
                  <p className="text-sm text-blue-600">Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500 rounded-lg">
                  <Droplets className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-700">
                    {customers.reduce((sum, c) => sum + c.pools.length, 0)}
                  </p>
                  <p className="text-sm text-cyan-600">Pools</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{totalEquipment}</p>
                  <p className="text-sm text-green-600">Equipment Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customers, pools, equipment, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
              Collapse All
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-360px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3 text-slate-500">Loading customers from Pool Brain...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customers match your search</p>
                </>
              ) : (
                <>
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customers with pools found</p>
                  <Button 
                    variant="link" 
                    onClick={() => refetch()}
                    className="mt-2"
                  >
                    Sync from Pool Brain
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  isExpanded={expandedCustomers.has(customer.id)}
                  onToggle={() => toggleCustomer(customer.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </AppLayout>
  );
}
