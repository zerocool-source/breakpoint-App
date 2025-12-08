import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, User, MapPin, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface Job {
  jobId: string;
  jobType: string;
  title: string;
  description: string;
  status: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  technicianId: string;
  technicianName: string;
  customerId: string;
  customerName: string;
  poolName: string;
  address: string;
  isScheduled: boolean;
}

interface TechnicianSummary {
  name: string;
  jobCount: number;
  jobs: Job[];
}

interface JobsData {
  jobs: Job[];
  unscheduledJobs: Job[];
  scheduledJobs: Job[];
  technicians: TechnicianSummary[];
  summary: {
    totalJobs: number;
    scheduledCount: number;
    unscheduledCount: number;
    technicianCount: number;
  };
}

function JobCard({ job }: { job: Job }) {
  return (
    <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors" data-testid={`job-card-${job.jobId}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={job.jobType === "One-Time" ? "border-purple-500/50 text-purple-400" : "border-cyan-500/50 text-cyan-400"}>
                {job.jobType}
              </Badge>
              <Badge variant="outline" className={
                job.status === "Completed" ? "border-green-500/50 text-green-400" :
                job.status === "In Progress" ? "border-yellow-500/50 text-yellow-400" :
                "border-muted-foreground/50 text-muted-foreground"
              }>
                {job.status}
              </Badge>
            </div>
            <h4 className="font-ui font-semibold text-foreground truncate" data-testid={`job-title-${job.jobId}`}>
              {job.title}
            </h4>
            <p className="text-sm text-muted-foreground truncate" data-testid={`job-customer-${job.jobId}`}>
              {job.customerName} {job.poolName && `- ${job.poolName}`}
            </p>
            {job.description && (
              <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                {job.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
            {job.scheduledDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
              </div>
            )}
            {job.scheduledTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{job.scheduledTime}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className={job.technicianName === "Unassigned" ? "text-yellow-400" : ""}>{job.technicianName}</span>
            </div>
          </div>
        </div>
        {job.address && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground/70">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{job.address}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TechnicianCard({ tech }: { tech: TechnicianSummary }) {
  return (
    <Card className="bg-card/50 border-border/50" data-testid={`tech-card-${tech.name}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <span className="font-ui text-lg">{tech.name}</span>
          </div>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            {tech.jobCount} jobs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {tech.jobs.slice(0, 5).map((job) => (
            <div key={job.jobId} className="flex items-center justify-between text-sm border-b border-border/30 pb-2 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">{job.customerName}</p>
                <p className="text-xs text-muted-foreground">{job.title}</p>
              </div>
              {job.scheduledDate && (
                <span className="text-xs text-muted-foreground">
                  {new Date(job.scheduledDate).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
          {tech.jobs.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              +{tech.jobs.length - 5} more jobs
            </p>
          )}
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-wider text-foreground" data-testid="jobs-title">
              JOBS & SCHEDULING
            </h1>
            <p className="text-muted-foreground font-ui mt-1">
              View job assignments, unscheduled work, and technician schedules
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
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground">{data.summary.totalJobs}</p>
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
                    <p className="text-2xl font-bold font-ui text-foreground">{data.summary.scheduledCount}</p>
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground">{data.summary.unscheduledCount}</p>
                    <p className="text-sm text-muted-foreground">Unscheduled</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-ui text-foreground">{data.summary.technicianCount}</p>
                    <p className="text-sm text-muted-foreground">Technicians</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="technicians" className="w-full">
              <TabsList className="bg-card/50 border border-border/50">
                <TabsTrigger value="technicians" data-testid="tab-technicians">
                  <User className="w-4 h-4 mr-2" />
                  By Technician
                </TabsTrigger>
                <TabsTrigger value="unscheduled" data-testid="tab-unscheduled">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Unscheduled ({data.unscheduledJobs.length})
                </TabsTrigger>
                <TabsTrigger value="scheduled" data-testid="tab-scheduled">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Scheduled ({data.scheduledJobs.length})
                </TabsTrigger>
                <TabsTrigger value="all" data-testid="tab-all">
                  <Calendar className="w-4 h-4 mr-2" />
                  All Jobs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="technicians" className="mt-4">
                {data.technicians.length === 0 ? (
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No technicians with assigned jobs found
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.technicians.map((tech) => (
                      <TechnicianCard key={tech.name} tech={tech} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="unscheduled" className="mt-4">
                <ScrollArea className="h-[600px]">
                  {data.unscheduledJobs.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                        <p>All jobs are scheduled!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {data.unscheduledJobs.map((job) => (
                        <JobCard key={job.jobId} job={job} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="scheduled" className="mt-4">
                <ScrollArea className="h-[600px]">
                  {data.scheduledJobs.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No scheduled jobs found
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {data.scheduledJobs.map((job) => (
                        <JobCard key={job.jobId} job={job} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="all" className="mt-4">
                <ScrollArea className="h-[600px]">
                  {data.jobs.length === 0 ? (
                    <Card className="bg-card/50 border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No jobs found
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {data.jobs.map((job) => (
                        <JobCard key={job.jobId} job={job} />
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
