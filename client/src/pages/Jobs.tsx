import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, User, MapPin, AlertCircle, CheckCircle2, Loader2, DollarSign, Building2, Wrench } from "lucide-react";

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

function JobRow({ job }: { job: Job }) {
  return (
    <div 
      className="flex items-center justify-between py-3 px-4 bg-background/30 rounded-lg border border-border/30 hover:border-primary/30 transition-colors"
      data-testid={`job-row-${job.jobId}`}
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
        <span className="font-ui font-semibold text-primary min-w-[80px] text-right" data-testid={`job-price-${job.jobId}`}>
          {formatPrice(job.price)}
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
            <JobRow key={job.jobId} job={job} />
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
            <div className="w-full bg-background/30 rounded-full h-2 mb-4">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="space-y-2">
              {tech.jobs.map((job) => (
                <JobRow key={job.jobId} job={job} />
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-wider text-foreground" data-testid="jobs-title">
              JOBS & SCHEDULING
            </h1>
            <p className="text-muted-foreground font-ui mt-1">
              Jobs grouped by account and technician with pricing
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <Tabs defaultValue="accounts" className="w-full">
              <TabsList className="bg-card/50 border border-border/50 flex-wrap">
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
                        <Card key={job.jobId} className="bg-card/50 border-border/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                <div>
                                  <p className="font-medium text-foreground">{job.title}</p>
                                  <p className="text-sm text-muted-foreground">{job.customerName} • {job.technicianName}</p>
                                </div>
                              </div>
                              <span className="font-ui font-semibold text-primary">{formatPrice(job.price)}</span>
                            </div>
                          </CardContent>
                        </Card>
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
                        <Card key={job.jobId} className="bg-card/50 border-border/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-yellow-400" />
                                <div>
                                  <p className="font-medium text-foreground">{job.title}</p>
                                  <p className="text-sm text-muted-foreground">{job.customerName} • {job.technicianName}</p>
                                  {job.scheduledDate && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(job.scheduledDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="font-ui font-semibold text-primary">{formatPrice(job.price)}</span>
                            </div>
                          </CardContent>
                        </Card>
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
