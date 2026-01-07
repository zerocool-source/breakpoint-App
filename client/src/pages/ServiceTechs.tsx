import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, ChevronDown, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Technician {
  TechnicianID: number;
  FirstName: string;
  LastName: string;
  Phone: string;
  Email: string;
  Active: boolean;
  CompanyID?: number;
}

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-600",
    "bg-green-600", 
    "bg-purple-600",
    "bg-orange-600",
    "bg-pink-600",
    "bg-cyan-600",
    "bg-indigo-600",
    "bg-teal-600",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default function ServiceTechs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");

  const { data: technicians = [], isLoading, refetch, isRefetching } = useQuery<Technician[]>({
    queryKey: ["/api/technicians/poolbrain"],
    queryFn: async () => {
      const res = await fetch("/api/technicians/poolbrain");
      if (!res.ok) throw new Error("Failed to fetch technicians");
      const data = await res.json();
      return data.technicians || data.data || data || [];
    },
  });

  const filteredTechnicians = technicians.filter((tech) => {
    const fullName = `${tech.FirstName || ""} ${tech.LastName || ""}`.toLowerCase();
    const phone = (tech.Phone || "").toLowerCase();
    const email = (tech.Email || "").toLowerCase();
    const matchesSearch = 
      fullName.includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery.toLowerCase()) ||
      email.includes(searchQuery.toLowerCase());
    
    if (filterStatus === "active") return matchesSearch && tech.Active;
    if (filterStatus === "inactive") return matchesSearch && !tech.Active;
    return matchesSearch;
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Service Technicians</h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-techs"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
            Sync from Pool Brain
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700" data-testid="dropdown-filter-status">
                Filter: {filterStatus === "all" ? "All" : filterStatus === "active" ? "Active" : "Inactive"}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("active")}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("inactive")}>Inactive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="tech name, phone #, email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-techs"
            />
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700 ml-auto" data-testid="button-add-technician">
            <Plus className="w-4 h-4 mr-2" />
            Add Technician
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Technicians
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Phone
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Loading technicians from Pool Brain...
                  </td>
                </tr>
              ) : filteredTechnicians.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    {searchQuery ? "No technicians match your search" : "No technicians found"}
                  </td>
                </tr>
              ) : (
                filteredTechnicians.map((tech) => {
                  const fullName = `${tech.FirstName || ""} ${tech.LastName || ""}`.trim();
                  const initials = getInitials(tech.FirstName, tech.LastName);
                  const avatarColor = getAvatarColor(fullName);
                  
                  return (
                    <tr 
                      key={tech.TechnicianID} 
                      className="hover:bg-slate-50 transition-colors"
                      data-testid={`row-technician-${tech.TechnicianID}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                            avatarColor
                          )}>
                            {initials}
                          </div>
                          <span className="font-medium text-blue-600 hover:underline cursor-pointer">
                            {fullName || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {tech.Phone || "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {tech.Email || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <Switch 
                            checked={tech.Active} 
                            className="data-[state=checked]:bg-blue-600"
                            data-testid={`switch-status-${tech.TechnicianID}`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="link" 
                          className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                          data-testid={`button-edit-${tech.TechnicianID}`}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-slate-500">
          Showing {filteredTechnicians.length} of {technicians.length} technicians
        </div>
      </div>
    </AppLayout>
  );
}
