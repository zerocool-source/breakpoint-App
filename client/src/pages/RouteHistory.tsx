import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Calendar as CalendarIcon, Filter, X, History, RefreshCw, ArrowRightLeft } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface RouteOverride {
  id: string;
  date: string;
  propertyId: string;
  propertyName: string | null;
  originalTechnicianId: string | null;
  originalTechnicianName: string | null;
  coveringTechnicianId: string | null;
  coveringTechnicianName: string | null;
  overrideType: string;
  reason: string | null;
  notes: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  createdAt: string;
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface Customer {
  id: string;
  name: string;
}

const REASON_OPTIONS = [
  { value: "Sick", label: "Sick" },
  { value: "PTO", label: "PTO" },
  { value: "Emergency", label: "Emergency" },
  { value: "Route Optimization", label: "Route Optimization" },
  { value: "Training", label: "Training" },
  { value: "Other", label: "Other" },
];

const OVERRIDE_TYPE_COLORS: Record<string, string> = {
  reassign: "bg-blue-100 text-blue-800",
  split: "bg-purple-100 text-purple-800",
  cancel: "bg-red-100 text-red-800",
};

export default function RouteHistory() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [technicianFilter, setTechnicianFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data: routeHistoryData, isLoading, refetch } = useQuery<{
    data: RouteOverride[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ["/api/route-history", startDate, endDate, technicianFilter, propertyFilter, reasonFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (technicianFilter) params.set("technicianId", technicianFilter);
      if (propertyFilter) params.set("propertyId", propertyFilter);
      if (reasonFilter) params.set("reason", reasonFilter);
      params.set("page", page.toString());
      params.set("limit", "50");
      
      const res = await fetch(`/api/route-history?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch route history");
      return res.json();
    },
  });

  const { data: techniciansData } = useQuery<{ technicians: Technician[] }>({
    queryKey: ["/api/technicians"],
    queryFn: async () => {
      const res = await fetch("/api/technicians");
      if (!res.ok) return { technicians: [] };
      return res.json();
    },
  });

  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) return { customers: [] };
      return res.json();
    },
  });

  const technicians = techniciansData?.technicians || [];
  const customers = customersData?.customers || [];
  const history = routeHistoryData?.data || [];
  const pagination = routeHistoryData?.pagination;

  const hasActiveFilters = technicianFilter || propertyFilter || reasonFilter;

  const clearFilters = () => {
    setTechnicianFilter("");
    setPropertyFilter("");
    setReasonFilter("");
  };

  const setDateRange = (range: "today" | "week" | "month") => {
    const today = new Date();
    if (range === "today") {
      setStartDate(format(today, "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else if (range === "week") {
      setStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0078D4] rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Route History</h1>
              <p className="text-sm text-slate-500">Track all temporary route changes and reassignments</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Filters</span>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="ml-auto text-xs h-7"
                  data-testid="button-clear-filters"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9"
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9"
                  data-testid="input-end-date"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Technician</Label>
                <Select value={technicianFilter || "_all"} onValueChange={(v) => setTechnicianFilter(v === "_all" ? "" : v)}>
                  <SelectTrigger className="h-9" data-testid="select-technician">
                    <SelectValue placeholder="All Technicians" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Technicians</SelectItem>
                    {technicians.map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.firstName} {tech.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Property</Label>
                <Select value={propertyFilter || "_all"} onValueChange={(v) => setPropertyFilter(v === "_all" ? "" : v)}>
                  <SelectTrigger className="h-9" data-testid="select-property">
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Properties</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Reason</Label>
                <Select value={reasonFilter || "_all"} onValueChange={(v) => setReasonFilter(v === "_all" ? "" : v)}>
                  <SelectTrigger className="h-9" data-testid="select-reason">
                    <SelectValue placeholder="All Reasons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Reasons</SelectItem>
                    {REASON_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Quick Range</Label>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-9 flex-1 text-xs" onClick={() => setDateRange("today")}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 flex-1 text-xs" onClick={() => setDateRange("week")}>
                    Week
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 flex-1 text-xs" onClick={() => setDateRange("month")}>
                    Month
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ArrowRightLeft className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">No route changes found</p>
                <p className="text-sm">Route overrides and reassignments will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Original Tech</TableHead>
                      <TableHead>Covered By</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Changed By</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((override) => (
                      <TableRow key={override.id} data-testid={`row-override-${override.id}`}>
                        <TableCell className="font-medium">
                          {format(new Date(override.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{override.propertyName || "Unknown"}</TableCell>
                        <TableCell>{override.originalTechnicianName || "-"}</TableCell>
                        <TableCell>{override.coveringTechnicianName || "-"}</TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize", OVERRIDE_TYPE_COLORS[override.overrideType] || "bg-gray-100 text-gray-800")}>
                            {override.overrideType}
                          </Badge>
                        </TableCell>
                        <TableCell>{override.reason || "-"}</TableCell>
                        <TableCell>{override.createdByName || "System"}</TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {format(new Date(override.createdAt), "MMM d, h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-slate-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
