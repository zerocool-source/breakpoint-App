import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, FileSpreadsheet, Loader2, Flame, Wrench, Filter, AlertTriangle } from "lucide-react";
import { format, startOfYear } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface EquipmentJob {
  id: string;
  date: string;
  propertyName: string;
  customerName: string;
  address: string;
  technicianName: string;
  jobTitle: string;
  equipmentType: string;
  notes: string;
}

export default function EquipmentReports() {
  const today = new Date();
  const yearStart = startOfYear(today);
  const { toast } = useToast();
  
  const [fromDate, setFromDate] = useState(format(yearStart, "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(today, "yyyy-MM-dd"));
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/reports/equipment", fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
      
      const response = await fetch(`/api/reports/equipment?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch report");
      }
      return response.json();
    },
    retry: 1,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
      
      const response = await fetch(`/api/reports/equipment/export?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to export");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `equipment-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Complete",
        description: "Your equipment report has been downloaded.",
      });
    } catch (err: any) {
      console.error("Export failed:", err);
      toast({
        title: "Export Failed",
        description: err.message || "Failed to export report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getEquipmentBadge = (type: string) => {
    switch (type) {
      case "Tear Down":
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">{type}</Badge>;
      case "De-Soot":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100"><Flame className="w-3 h-3 mr-1" />{type}</Badge>;
      case "Heater":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><Flame className="w-3 h-3 mr-1" />{type}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const equipmentJobs: EquipmentJob[] = Array.isArray(data?.data) ? data.data : [];
  const hasPartialData = data?.hasPartialData || false;
  
  const tearDownCount = equipmentJobs.filter(j => j.equipmentType === "Tear Down").length;
  const deSootCount = equipmentJobs.filter(j => j.equipmentType === "De-Soot").length;
  const heaterCount = equipmentJobs.filter(j => j.equipmentType === "Heater").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF]">
      <Sidebar />
      
      <main className="ml-60 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#4169E1]">Equipment Reports</h1>
              <p className="text-slate-600 mt-1">
                Jobs mentioning tear downs, de-soots, and heaters from Pool Brain
              </p>
            </div>
            <Button 
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className="bg-[#4169E1] hover:bg-[#4169E1]/90"
              data-testid="button-export-excel"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white shadow-sm border-[#E2E8F0]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Jobs</p>
                    <p className="text-2xl font-bold text-[#4169E1]">{equipmentJobs.length}</p>
                  </div>
                  <FileSpreadsheet className="w-8 h-8 text-[#60A5FA]" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border-[#E2E8F0]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Tear Downs</p>
                    <p className="text-2xl font-bold text-purple-600">{tearDownCount}</p>
                  </div>
                  <Wrench className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border-[#E2E8F0]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">De-Soots</p>
                    <p className="text-2xl font-bold text-orange-600">{deSootCount}</p>
                  </div>
                  <Flame className="w-8 h-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border-[#E2E8F0]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Heaters</p>
                    <p className="text-2xl font-bold text-red-600">{heaterCount}</p>
                  </div>
                  <Flame className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {hasPartialData && (
            <Alert className="mb-6 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Partial Data Warning</AlertTitle>
              <AlertDescription className="text-amber-700">
                Some job details could not be fetched from Pool Brain. The report may be incomplete.
              </AlertDescription>
            </Alert>
          )}

          <Card className="bg-white shadow-sm border-[#E2E8F0] mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#4169E1]" />
                Date Range Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-48"
                    data-testid="input-from-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">To Date</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-48"
                    data-testid="input-to-date"
                  />
                </div>
                <Button 
                  onClick={() => refetch()} 
                  variant="outline"
                  className="border-[#4169E1] text-[#4169E1] hover:bg-[#EFF6FF]"
                  data-testid="button-apply-filter"
                >
                  Apply Filter
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-[#E2E8F0]">
            <CardHeader>
              <CardTitle>Equipment Jobs</CardTitle>
              <CardDescription>
                {data?.dateRange ? 
                  `Showing jobs from ${data.dateRange.from} to ${data.dateRange.to}` : 
                  "Loading..."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Loading Report</AlertTitle>
                  <AlertDescription>
                    {(error as Error).message || "Failed to fetch equipment jobs. Please check your Pool Brain connection."}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-4"
                      onClick={() => refetch()}
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#4169E1]" />
                  <span className="ml-3 text-slate-600">Loading equipment jobs from Pool Brain...</span>
                </div>
              ) : equipmentJobs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No equipment jobs found for the selected date range.</p>
                  <p className="text-sm mt-2">Try adjusting the date filter or check Pool Brain for data.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F8FAFC]">
                        <TableHead className="font-semibold text-[#4169E1]">Date</TableHead>
                        <TableHead className="font-semibold text-[#4169E1]">Property</TableHead>
                        <TableHead className="font-semibold text-[#4169E1]">Customer</TableHead>
                        <TableHead className="font-semibold text-[#4169E1]">Technician</TableHead>
                        <TableHead className="font-semibold text-[#4169E1]">Type</TableHead>
                        <TableHead className="font-semibold text-[#4169E1]">Job Title</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipmentJobs.map((job, index) => (
                        <TableRow 
                          key={job.id || index}
                          className="hover:bg-[#EFF6FF]/50 transition-colors"
                          data-testid={`row-equipment-job-${index}`}
                        >
                          <TableCell className="font-medium">
                            {job.date ? format(new Date(job.date), "MMM d, yyyy") : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{job.propertyName}</p>
                              {job.address && (
                                <p className="text-sm text-slate-500">{job.address}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{job.customerName}</TableCell>
                          <TableCell>{job.technicianName}</TableCell>
                          <TableCell>{getEquipmentBadge(job.equipmentType)}</TableCell>
                          <TableCell className="max-w-xs truncate">{job.jobTitle}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
