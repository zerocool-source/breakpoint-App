import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, User, MapPin, AlertCircle, CheckCircle2, Loader2, DollarSign, Building2, Wrench, ChevronDown, ChevronRight, Settings, Mail, TrendingUp, Trophy, BarChart3, HardHat, AlertTriangle } from "lucide-react";

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
        <span className="animate-pulse font-semibold">⚠ Need Estimate</span>
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
  
  const isPastDue = (() => {
    if (job.isCompleted || !job.scheduledDate) return false;
    const scheduled = new Date(job.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled < today;
  })();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`bg-card/50 hover:border-primary/30 transition-colors ${isPastDue ? 'border-red-500/50' : 'border-border/50'}`} data-testid={`job-card-${job.jobId}`}>
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
                  job.isCompleted ? 'bg-green-500/20' : isPastDue ? 'bg-red-500/20' : 'bg-yellow-500/20'
                }`}>
                  {job.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : isPastDue ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
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
                  {isPastDue && (
                    <p className="text-xs text-red-400 font-semibold animate-pulse mt-1">
                      ⚠ Did not do repair - needs rescheduling
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isPastDue && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">
                    Past Due
                  </Badge>
                )}
                <Badge variant="outline" className={
                  job.isCompleted ? "border-green-500/50 text-green-400" : isPastDue ? "border-red-500/50 text-red-400" : "border-yellow-500/50 text-yellow-400"
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

function SRAccountSubfolder({ accountName, jobs }: { accountName: string; jobs: Job[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const completedCount = jobs.filter(j => j.isCompleted).length;
  const totalValue = jobs.reduce((sum, j) => sum + j.price, 0);
  const readyToInvoice = totalValue >= 500;

  const handleSendInvoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    const jobDetails = jobs.map(j => `• ${j.title}: ${formatPrice(j.price)}`).join('%0D%0A');
    const subject = encodeURIComponent(`Invoice Ready: ${accountName} - SR Repairs Total ${formatPrice(totalValue)}`);
    const body = encodeURIComponent(
      `Invoice Summary for ${accountName}\n\n` +
      `Total Amount: ${formatPrice(totalValue)}\n` +
      `Completed: ${completedCount}/${jobs.length} jobs\n\n` +
      `Job Details:\n` +
      jobs.map(j => `• ${j.title}: ${formatPrice(j.price)} - ${j.isCompleted ? 'Complete' : 'Pending'}`).join('\n') +
      `\n\nPlease process this invoice at your earliest convenience.`
    );
    window.open(`https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`border rounded-lg bg-background/20 overflow-hidden ${readyToInvoice ? 'border-green-500/50' : 'border-orange-500/20'}`}>
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-orange-500/10 transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-orange-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-orange-300" />
            )}
            <Building2 className="w-4 h-4 text-orange-400" />
            <span className="font-ui font-medium text-foreground">{accountName}</span>
            <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-300">
              {jobs.length} jobs
            </Badge>
            {readyToInvoice && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 animate-pulse text-xs">
                Ready to Invoice
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{completedCount}/{jobs.length} done</span>
            <span className={`font-ui font-semibold ${readyToInvoice ? 'text-green-400' : 'text-orange-400'}`}>
              {formatPrice(totalValue)}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-2 border-t border-orange-500/10">
            {readyToInvoice && (
              <button
                onClick={handleSendInvoice}
                className="w-full mb-3 py-2 px-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-400 font-ui font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                data-testid={`send-invoice-${accountName}`}
              >
                <Mail className="w-4 h-4" />
                Send Invoice ({formatPrice(totalValue)})
              </button>
            )}
            {jobs.map((job) => (
              <ExpandableJobCard key={job.jobId} job={job} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SRTechnicianCard({ techName, jobs }: { techName: string; jobs: Job[] }) {
  const completedCount = jobs.filter(j => j.isCompleted).length;
  const totalValue = jobs.reduce((sum, j) => sum + j.price, 0);
  const completionPercent = jobs.length > 0 ? Math.round((completedCount / jobs.length) * 100) : 0;
  const commission10 = Math.round(totalValue * 0.10 * 100) / 100;
  const commission15 = Math.round(totalValue * 0.15 * 100) / 100;

  const jobsByAccount = useMemo(() => {
    const grouped: Record<string, Job[]> = {};
    jobs.forEach(job => {
      const accountName = job.customerName || "Unknown Account";
      if (!grouped[accountName]) {
        grouped[accountName] = [];
      }
      grouped[accountName].push(job);
    });
    return Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  }, [jobs]);

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
                Service Repairs (&lt;$500) • {jobsByAccount.length} accounts
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
        <div className="space-y-3">
          {jobsByAccount.map(([accountName, accountJobs]) => (
            <SRAccountSubfolder key={accountName} accountName={accountName} jobs={accountJobs} />
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

  const repairTechData = useMemo(() => {
    if (!data?.jobs) return { repairTechs: [], totalJobs: 0, totalValue: 0, topEarner: null, mostJobs: null };

    const REPAIR_TECH_NAMES = new Set([
      "Alan Bateman",
      "Don Johnson", 
      "Jose Puente",
      "Matt Cummins",
      "Rick Jacobs",
      "Vit Kruml"
    ]);

    const repairJobs = data.jobs.filter(job => REPAIR_TECH_NAMES.has(job.technicianName));

    const techMap: Record<string, {
      name: string;
      jobs: Job[];
      totalValue: number;
      completedCount: number;
      commission10: number;
      commission15: number;
      repairTypes: Record<string, { count: number; value: number }>;
    }> = {};

    repairJobs.forEach(job => {
      const name = job.technicianName;
      if (!techMap[name]) {
        techMap[name] = {
          name,
          jobs: [],
          totalValue: 0,
          completedCount: 0,
          commission10: 0,
          commission15: 0,
          repairTypes: {}
        };
      }
      techMap[name].jobs.push(job);
      techMap[name].totalValue += job.price;
      if (job.isCompleted) techMap[name].completedCount++;
      
      const repairType = job.title || "Other";
      if (!techMap[name].repairTypes[repairType]) {
        techMap[name].repairTypes[repairType] = { count: 0, value: 0 };
      }
      techMap[name].repairTypes[repairType].count++;
      techMap[name].repairTypes[repairType].value += job.price;
    });

    Object.values(techMap).forEach(tech => {
      tech.commission10 = Math.round(tech.totalValue * 0.10 * 100) / 100;
      tech.commission15 = Math.round(tech.totalValue * 0.15 * 100) / 100;
    });

    const repairTechs = Object.values(techMap).sort((a, b) => b.totalValue - a.totalValue);
    const totalJobs = repairJobs.length;
    const totalValue = repairJobs.reduce((sum, j) => sum + j.price, 0);
    const topEarner = repairTechs[0] || null;
    const mostJobs = [...repairTechs].sort((a, b) => b.jobs.length - a.jobs.length)[0] || null;

    return { repairTechs, totalJobs, totalValue, topEarner, mostJobs };
  }, [data?.jobs]);

  const [selectedRepairTech, setSelectedRepairTech] = useState<string | null>(null);
  
  const filteredRepairTechs = useMemo(() => {
    if (!selectedRepairTech) return repairTechData.repairTechs;
    return repairTechData.repairTechs.filter(t => t.name === selectedRepairTech);
  }, [selectedRepairTech, repairTechData.repairTechs]);

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
                <TabsTrigger value="sr-stats" data-testid="tab-sr-stats" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Service Tech Stats
                </TabsTrigger>
                <TabsTrigger value="repair-techs" data-testid="tab-repair-techs" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                  <HardHat className="w-4 h-4 mr-2" />
                  Repair Techs ({repairTechData.totalJobs})
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

              <TabsContent value="sr-stats" className="mt-4">
                {(() => {
                  const techStats = Object.entries(srData.srByTechnician).map(([name, jobs]) => {
                    const totalValue = jobs.reduce((sum, j) => sum + j.price, 0);
                    const completedCount = jobs.filter(j => j.isCompleted).length;
                    const repairTypes: Record<string, { count: number; value: number }> = {};
                    jobs.forEach(job => {
                      const type = job.title || "Other";
                      if (!repairTypes[type]) repairTypes[type] = { count: 0, value: 0 };
                      repairTypes[type].count++;
                      repairTypes[type].value += job.price;
                    });
                    return {
                      name,
                      jobCount: jobs.length,
                      completedCount,
                      totalValue,
                      commission10: totalValue * 0.10,
                      commission15: totalValue * 0.15,
                      repairTypes: Object.entries(repairTypes).sort((a, b) => b[1].count - a[1].count),
                    };
                  }).sort((a, b) => b.totalValue - a.totalValue);

                  const topEarner = techStats[0];
                  const mostJobs = [...techStats].sort((a, b) => b.jobCount - a.jobCount)[0];

                  return (
                    <div className="space-y-4">
                      <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-5 h-5 text-cyan-400" />
                          <h3 className="font-ui font-semibold text-cyan-400">Service Tech Performance Stats</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Who does the most SR repairs, what they're working on, and who's making the most money.
                        </p>
                      </div>

                      {topEarner && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/50">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-2">
                                <Trophy className="w-8 h-8 text-yellow-400" />
                                <div>
                                  <p className="text-xs text-yellow-400 uppercase tracking-wider">Top Earner</p>
                                  <p className="text-xl font-ui font-bold text-foreground">{topEarner.name}</p>
                                </div>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="text-yellow-400 font-semibold">{formatPrice(topEarner.totalValue)}</span>
                                <span className="text-muted-foreground">{topEarner.jobCount} jobs</span>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/50">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-2">
                                <Wrench className="w-8 h-8 text-cyan-400" />
                                <div>
                                  <p className="text-xs text-cyan-400 uppercase tracking-wider">Most Repairs</p>
                                  <p className="text-xl font-ui font-bold text-foreground">{mostJobs?.name}</p>
                                </div>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="text-cyan-400 font-semibold">{mostJobs?.jobCount} jobs</span>
                                <span className="text-muted-foreground">{formatPrice(mostJobs?.totalValue || 0)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      <ScrollArea className="h-[550px]">
                        <div className="space-y-4">
                          {techStats.map((tech, index) => (
                            <Card key={tech.name} className="bg-card/50 border-border/50 hover:border-cyan-500/30 transition-colors" data-testid={`sr-stat-${tech.name}`}>
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                      <span className="text-lg font-bold text-cyan-400">#{index + 1}</span>
                                    </div>
                                    <div>
                                      <p className="font-ui text-lg text-foreground">{tech.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {tech.completedCount}/{tech.jobCount} completed
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-ui font-bold text-2xl text-cyan-400">{formatPrice(tech.totalValue)}</p>
                                    <div className="flex gap-2 mt-1">
                                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                                        10%: {formatPrice(tech.commission10)}
                                      </Badge>
                                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
                                        15%: {formatPrice(tech.commission15)}
                                      </Badge>
                                    </div>
                                  </div>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="mt-3 pt-3 border-t border-border/30">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Repair Types</p>
                                  <div className="flex flex-wrap gap-2">
                                    {tech.repairTypes.slice(0, 8).map(([type, data]) => (
                                      <Badge key={type} variant="outline" className="text-xs border-cyan-500/30 text-cyan-300">
                                        {type.length > 30 ? type.substring(0, 30) + '...' : type}
                                        <span className="ml-1 text-muted-foreground">({data.count}x, {formatPrice(data.value)})</span>
                                      </Badge>
                                    ))}
                                    {tech.repairTypes.length > 8 && (
                                      <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
                                        +{tech.repairTypes.length - 8} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="repair-techs" className="mt-4">
                <div className="space-y-4">
                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <HardHat className="w-5 h-5 text-purple-400" />
                        <h3 className="font-ui font-semibold text-purple-400">Repair Technicians</h3>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="text-purple-400 font-semibold">{repairTechData.totalJobs} Jobs</span>
                        <span className="text-purple-400 font-semibold">{formatPrice(repairTechData.totalValue)} Total</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedRepairTech(null)}
                        className={`px-3 py-1.5 rounded-full font-ui text-sm transition-all ${
                          selectedRepairTech === null 
                            ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' 
                            : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                        }`}
                        data-testid="repair-tech-all"
                      >
                        All Techs
                      </button>
                      {["Alan Bateman", "Don Johnson", "Jose Puente", "Matt Cummins", "Rick Jacobs", "Vit Kruml"].map(name => {
                        const techData = repairTechData.repairTechs.find(t => t.name === name);
                        return (
                          <button
                            key={name}
                            onClick={() => setSelectedRepairTech(name)}
                            className={`px-3 py-1.5 rounded-full font-ui text-sm transition-all flex items-center gap-2 ${
                              selectedRepairTech === name 
                                ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' 
                                : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                            }`}
                            data-testid={`repair-tech-btn-${name}`}
                          >
                            {name}
                            {techData && (
                              <span className="text-xs opacity-75">({techData.jobs.length})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {!selectedRepairTech && repairTechData.topEarner && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Trophy className="w-8 h-8 text-yellow-400" />
                            <div>
                              <p className="text-xs text-yellow-400 uppercase tracking-wider">Top Earner</p>
                              <p className="text-xl font-ui font-bold text-foreground">{repairTechData.topEarner.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-yellow-400 font-semibold">{formatPrice(repairTechData.topEarner.totalValue)}</span>
                            <span className="text-muted-foreground">{repairTechData.topEarner.jobs.length} jobs</span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Wrench className="w-8 h-8 text-purple-400" />
                            <div>
                              <p className="text-xs text-purple-400 uppercase tracking-wider">Most Jobs</p>
                              <p className="text-xl font-ui font-bold text-foreground">{repairTechData.mostJobs?.name}</p>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-purple-400 font-semibold">{repairTechData.mostJobs?.jobs.length} jobs</span>
                            <span className="text-muted-foreground">{formatPrice(repairTechData.mostJobs?.totalValue || 0)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <ScrollArea className="h-[550px]">
                    <div className="space-y-4">
                      {repairTechData.repairTechs.length === 0 ? (
                        <Card className="bg-card/50 border-border/50">
                          <CardContent className="p-8 text-center text-muted-foreground">
                            No jobs found for repair technicians
                          </CardContent>
                        </Card>
                      ) : (
                        filteredRepairTechs.map((tech) => (
                          <Collapsible key={tech.name} defaultOpen>
                            <Card className="bg-card/50 border-purple-500/30 hover:border-purple-500/50 transition-colors" data-testid={`repair-tech-${tech.name}`}>
                              <CollapsibleTrigger className="w-full">
                                <CardHeader className="pb-2">
                                  <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <HardHat className="w-5 h-5 text-purple-400" />
                                      </div>
                                      <div className="text-left">
                                        <p className="font-ui text-lg text-foreground">{tech.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {tech.completedCount}/{tech.jobs.length} completed
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-ui font-bold text-2xl text-purple-400">{formatPrice(tech.totalValue)}</p>
                                      <div className="flex gap-2 mt-1">
                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                                          10%: {formatPrice(tech.commission10)}
                                        </Badge>
                                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
                                          15%: {formatPrice(tech.commission15)}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardTitle>
                                </CardHeader>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <CardContent className="pt-0">
                                  <div className="mt-3 pt-3 border-t border-border/30">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Repair Types</p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                      {Object.entries(tech.repairTypes).slice(0, 6).map(([type, data]) => (
                                        <Badge key={type} variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                                          {type.length > 25 ? type.substring(0, 25) + '...' : type}
                                          <span className="ml-1 text-muted-foreground">({data.count}x, {formatPrice(data.value)})</span>
                                        </Badge>
                                      ))}
                                      {Object.keys(tech.repairTypes).length > 6 && (
                                        <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
                                          +{Object.keys(tech.repairTypes).length - 6} more
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Jobs ({tech.jobs.length})</p>
                                    <div className="space-y-2">
                                      {tech.jobs.map((job) => (
                                        <ExpandableJobCard key={job.jobId} job={job} />
                                      ))}
                                    </div>
                                  </div>
                                </CardContent>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
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
