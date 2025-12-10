import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, User, MapPin, AlertCircle, CheckCircle2, Loader2, DollarSign, Building2, Wrench, ChevronDown, ChevronRight, Settings } from "lucide-react";

interface Job {
  jobId: string;
  title: string;
  description: string;
  status: string;
  isCompleted: boolean;
  scheduledDate: string | null;
  scheduledTime: string | null;
  createdDate: string | null;
  technicianId: string;
  technicianName: string;
  customerId: string;
  customerName: string;
  poolName: string;
  address: string;
  price: number;
  items: { productId: string; qty: number; unitCost: number; taxable: number }[];
  raw?: any;
}

interface Account {
  accountId: string;
  accountName: string;
  address: string;
  totalJobs: number;
  completedJobs: number;
  totalValue: number;
  jobs: Job[];
}

interface Technician {
  techId: string;
  name: string;
  phone: string;
  email: string;
  totalJobs: number;
  completedJobs: number;
  totalValue: number;
  commission10: number;
  commission15: number;
  jobs: Job[];
}

interface JobsData {
  jobs: Job[];
  accounts: Account[];
  technicians: Technician[];
  techsWithJobs: Technician[];
  techsWithoutJobs: Technician[];
  completedJobs: Job[];
  pendingJobs: Job[];
  summary: {
    totalJobs: number;
    completedCount: number;
    pendingCount: number;
    totalValue: number;
    accountCount: number;
    technicianCount: number;
    techsWithJobsCount: number;
  };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function PriceDisplay({ price, productName, testId }: { price: number; productName?: string; testId?: string }) {
  if (!price || price === 0) {
    return (
      <span className="text-yellow-400 font-ui text-sm" data-testid={testId}>
        <span className="italic">Need to look for price</span>
        {productName && (
          <span className="block text-xs text-yellow-300 mt-0.5">
            → Look up: {productName}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="font-ui font-bold text-primary" data-testid={testId}>
      {formatPrice(price)}
    </span>
  );
}

function ExpandableJobCard({ job }: { job: Job }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors" data-testid={`job-card-${job.jobId}`}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  job.isCompleted ? 'bg-green-500/20' : 'bg-yellow-500/20'
                }`}>
                  {job.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground" data-testid={`job-title-${job.jobId}`}>
                    {job.title || "Service Job"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {job.customerName} • {job.technicianName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className={
                  job.isCompleted ? "border-green-500/50 text-green-400" : "border-yellow-500/50 text-yellow-400"
                }>
                  {job.status}
                </Badge>
                <span className="text-lg" data-testid={`job-price-${job.jobId}`}>
                  <PriceDisplay price={job.price} productName={job.title} />
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 border-t border-border/30 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Customer</p>
                  <p className="text-sm font-medium text-foreground">{job.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Technician</p>
                  <p className="text-sm font-medium text-foreground">{job.technicianName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Pool</p>
                  <p className="text-sm font-medium text-foreground">{job.poolName || "N/A"}</p>
                </div>
                {job.address && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Service Address</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.address}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Job ID</p>
                  <p className="text-sm font-medium text-foreground">{job.jobId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                  <Badge className={
                    job.isCompleted ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                  }>
                    {job.status}
                  </Badge>
                </div>
                {job.scheduledDate && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Scheduled Date</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(job.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Price</p>
                  <p className="text-lg"><PriceDisplay price={job.price} productName={job.title} /></p>
                </div>
              </div>
            </div>
            {job.description && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Description / Notes</p>
                <p className="text-sm text-foreground bg-background/30 p-3 rounded-lg">{job.description}</p>
              </div>
            )}
            {job.items && job.items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Line Items</p>
                <div className="space-y-2">
                  {job.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-background/30 p-2 rounded">
                      <span>Product #{item.productId}</span>
                      <span>Qty: {item.qty} @ {formatPrice(item.unitCost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function JobRow({ job, onClick }: { job: Job; onClick?: () => void }) {
  return (
    <div 
      className="flex items-center justify-between py-3 px-4 bg-background/30 rounded-lg border border-border/30 hover:border-primary/30 transition-colors cursor-pointer"
      data-testid={`job-row-${job.jobId}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          job.isCompleted ? 'bg-green-500/20' : 'bg-yellow-500/20'
        }`}>
          {job.isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <Clock className="w-4 h-4 text-yellow-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate" data-testid={`job-title-${job.jobId}`}>
            {job.title || "Service Job"}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {job.scheduledDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(job.scheduledDate).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {job.technicianName}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <Badge variant="outline" className={
          job.isCompleted ? "border-green-500/50 text-green-400" : "border-yellow-500/50 text-yellow-400"
        }>
          {job.isCompleted ? "Complete" : "Pending"}
        </Badge>
        <span className="min-w-[80px] text-right" data-testid={`job-price-${job.jobId}`}>
          <PriceDisplay price={job.price} productName={job.title} />
        </span>
      </div>
    </div>
  );
}

function AccountCard({ account }: { account: Account }) {
  const completionPercent = account.totalJobs > 0 
    ? Math.round((account.completedJobs / account.totalJobs) * 100) 
    : 0;

  return (
    <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors" data-testid={`account-card-${account.accountId}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-ui text-lg text-foreground" data-testid={`account-name-${account.accountId}`}>
                {account.accountName}
              </p>
              {account.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {account.address.substring(0, 50)}...
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-ui font-bold text-xl text-primary" data-testid={`account-value-${account.accountId}`}>
              {formatPrice(account.totalValue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {account.completedJobs}/{account.totalJobs} complete ({completionPercent}%)
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full bg-background/30 rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <div className="space-y-2">
          {account.jobs.map((job) => (
            <ExpandableJobCard key={job.jobId} job={job} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TechnicianCard({ tech }: { tech: Technician }) {
  const completionPercent = tech.totalJobs > 0 
    ? Math.round((tech.completedJobs / tech.totalJobs) * 100) 
    : 0;

  return (
    <Card className={`bg-card/50 border-border/50 hover:border-primary/30 transition-colors ${tech.totalJobs === 0 ? 'opacity-60' : ''}`} data-testid={`tech-card-${tech.techId}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              tech.totalJobs > 0 ? 'bg-purple-500/20' : 'bg-muted/20'
            }`}>
              <User className={`w-5 h-5 ${tech.totalJobs > 0 ? 'text-purple-400' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="font-ui text-lg text-foreground" data-testid={`tech-name-${tech.techId}`}>
                {tech.name}
              </p>
              {(tech.phone || tech.email) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tech.phone || tech.email}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-ui font-bold text-xl text-primary" data-testid={`tech-value-${tech.techId}`}>
              {formatPrice(tech.totalValue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {tech.totalJobs} jobs ({completionPercent}% done)
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {tech.totalJobs > 0 && (
          <>
            <div className="flex gap-2 mb-3">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50" data-testid={`tech-commission10-${tech.techId}`}>
                10%: {formatPrice(tech.commission10 || 0)}
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50" data-testid={`tech-commission15-${tech.techId}`}>
                15%: {formatPrice(tech.commission15 || 0)}
              </Badge>
            </div>
            <div className="w-full bg-background/30 rounded-full h-2 mb-4">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="space-y-2">
              {tech.jobs.map((job) => (
                <ExpandableJobCard key={job.jobId} job={job} />
              ))}
            </div>
          </>
        )}
        {tech.totalJobs === 0 && (
          <p className="text-center text-muted-foreground/60 py-4 text-sm">
            No jobs assigned
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SRTechnicianCard({ techName, jobs }: { techName: string; jobs: Job[] }) {
  const completedCount = jobs.filter(j => j.isCompleted).length;
  const totalValue = jobs.reduce((sum, j) => sum + j.price, 0);
  const completionPercent = jobs.length > 0 ? Math.round((completedCount / jobs.length) * 100) : 0;
  const commission10 = Math.round(totalValue * 0.10 * 100) / 100;
  const commission15 = Math.round(totalValue * 0.15 * 100) / 100;

  return (
    <Card className="bg-card/50 border-orange-500/30 hover:border-orange-500/50 transition-colors" data-testid={`sr-tech-${techName}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-ui text-lg text-foreground">{techName}</p>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">SR</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Service Repairs (&lt;$500)
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-ui font-bold text-xl text-orange-400">
              {formatPrice(totalValue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{jobs.length} complete ({completionPercent}%)
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2 mb-3">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50" data-testid={`sr-commission10-${techName}`}>
            10%: {formatPrice(commission10)}
          </Badge>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50" data-testid={`sr-commission15-${techName}`}>
            15%: {formatPrice(commission15)}
          </Badge>
        </div>
        <div className="w-full bg-background/30 rounded-full h-2 mb-4">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <div className="space-y-2">
          {jobs.map((job) => (
            <ExpandableJobCard key={job.jobId} job={job} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Jobs() {
  const { data, isLoading, error, refetch } = useQuery<JobsData>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const response = await fetch("/api/jobs");
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      return response.json();
    },
    refetchInterval: 60000,
  });

  const srData = useMemo(() => {
    if (!data?.jobs) return { srJobs: [], srByTechnician: {}, srCount: 0, srValue: 0 };

    const srJobs = data.jobs.filter(job => {
      const title = job.title?.toUpperCase() || "";
      const template = job.raw?.Template?.toUpperCase() || "";
      
      const isSR = (
        title.startsWith("SR ") ||
        title.startsWith("SR-") ||
        title.startsWith("SR:") ||
        title.startsWith("\"SR\"") ||
        title.startsWith("(SR)") ||
        title.includes(" SR ") ||
        title.includes(" SR-") ||
        title.includes("(SR)") ||
        title.includes("\"SR\"") ||
        title === "SR" ||
        /\bSR\d/.test(title) ||
        title.includes("SERVICE REPAIR") ||
        template.includes("S.T") ||
        template.includes("REPAIR")
      );
      
      return isSR && job.price < 500;
    });

    const srByTechnician: Record<string, Job[]> = {};
    srJobs.forEach(job => {
      const techName = job.technicianName || "Unassigned";
      if (!srByTechnician[techName]) {
        srByTechnician[techName] = [];
      }
      srByTechnician[techName].push(job);
    });

    const srValue = srJobs.reduce((sum, j) => sum + j.price, 0);

    return { srJobs, srByTechnician, srCount: srJobs.length, srValue };
  }, [data?.jobs]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-wider text-foreground" data-testid="jobs-title">
              JOBS & SCHEDULING
            </h1>
            <p className="text-muted-foreground font-ui mt-1">
              Jobs grouped by account, technician, and SR repairs with full details
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg font-ui text-sm transition-colors"
            data-testid="refresh-jobs-btn"
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="flex items-center gap-3 p-6">
              <AlertCircle className="w-6 h-6 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Failed to load jobs</p>
                <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
              </div>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground" data-testid="total-jobs-count">{data.summary.totalJobs}</p>
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground" data-testid="completed-count">{data.summary.completedCount}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground" data-testid="pending-count">{data.summary.pendingCount}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-orange-500/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground" data-testid="sr-count">{srData.srCount}</p>
                    <p className="text-sm text-muted-foreground">SR Jobs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground" data-testid="total-value">{formatPrice(data.summary.totalValue)}</p>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="sr" className="w-full">
              <TabsList className="bg-card/50 border border-border/50 flex-wrap">
                <TabsTrigger value="sr" data-testid="tab-sr" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
                  <Settings className="w-4 h-4 mr-2" />
                  SR Jobs ({srData.srCount})
                </TabsTrigger>
                <TabsTrigger value="accounts" data-testid="tab-accounts">
                  <Building2 className="w-4 h-4 mr-2" />
                  By Account ({data.summary.accountCount})
                </TabsTrigger>
                <TabsTrigger value="technicians" data-testid="tab-technicians">
                  <User className="w-4 h-4 mr-2" />
                  By Technician ({data.summary.techsWithJobsCount})
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Completed ({data.summary.completedCount})
                </TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">
                  <Clock className="w-4 h-4 mr-2" />
                  Pending ({data.summary.pendingCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sr" className="mt-4">
                <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-5 h-5 text-orange-400" />
                    <h3 className="font-ui font-semibold text-orange-400">Service Repairs (SR)</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Small repairs under $500, grouped by technician. Click any job to see full details.
                  </p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-orange-400 font-semibold">{srData.srCount} SR Jobs</span>
                    <span className="text-orange-400 font-semibold">{formatPrice(srData.srValue)} Total</span>
                    <span className="text-muted-foreground">{Object.keys(srData.srByTechnician).length} Technicians</span>
                  </div>
                </div>
                <ScrollArea className="h-[650px]">
                  {Object.keys(srData.srByTechnician).length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No SR jobs found
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(srData.srByTechnician)
                        .sort((a, b) => b[1].length - a[1].length)
                        .map(([techName, jobs]) => (
                          <SRTechnicianCard key={techName} techName={techName} jobs={jobs} />
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="accounts" className="mt-4">
                <ScrollArea className="h-[700px]">
                  {data.accounts.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No accounts with jobs found
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {data.accounts.map((account) => (
                        <AccountCard key={account.accountId || account.accountName} account={account} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="technicians" className="mt-4">
                <ScrollArea className="h-[700px]">
                  {data.techsWithJobs.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No technicians with jobs found
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {data.techsWithJobs.map((tech) => (
                        <TechnicianCard key={tech.techId || tech.name} tech={tech} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="completed" className="mt-4">
                <ScrollArea className="h-[700px]">
                  {data.completedJobs.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
                        <p>No completed jobs yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {data.completedJobs.map((job) => (
                        <ExpandableJobCard key={job.jobId} job={job} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pending" className="mt-4">
                <ScrollArea className="h-[700px]">
                  {data.pendingJobs.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                        <p>All jobs are completed!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {data.pendingJobs.map((job) => (
                        <ExpandableJobCard key={job.jobId} job={job} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
