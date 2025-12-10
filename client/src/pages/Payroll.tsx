import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DollarSign, Users, Briefcase, Clock, Plus, Trash2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isFriday, addDays, isBefore, isAfter, isWithinInterval } from "date-fns";

interface PayPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
}

interface PayrollEntry {
  id: string;
  payPeriodId: string;
  technicianId: string;
  technicianName: string;
  jobId: string;
  jobTitle: string;
  customerName: string | null;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  notes: string | null;
  addedBy: string | null;
  createdAt: string;
}

interface Job {
  jobId: string;
  title: string;
  customerName: string;
  technicianId: string;
  technicianName: string;
  price: number;
  status: string;
  scheduledDate: string;
  isCompleted: boolean;
}

interface Technician {
  techId: string;
  name: string;
  phone: string;
  email: string;
}

interface JobsData {
  jobs: Job[];
  technicians: Technician[];
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function getNextPayday(): Date {
  const today = new Date();
  let current = new Date(today);
  while (!isFriday(current)) {
    current = addDays(current, 1);
  }
  return current;
}

function getCurrentPayPeriodDates(): { start: Date; end: Date } {
  const payday = getNextPayday();
  const end = payday;
  const start = addDays(payday, -13);
  return { start, end };
}

function generateBiweeklyPeriods(basePayday: Date, count: number = 6): { start: Date; end: Date }[] {
  const periods: { start: Date; end: Date }[] = [];
  let currentPayday = basePayday;
  
  for (let i = 0; i < count; i++) {
    const end = addDays(currentPayday, -14 * i);
    const start = addDays(end, -13);
    periods.push({ start, end });
  }
  
  for (let i = 1; i <= 2; i++) {
    const end = addDays(basePayday, 14 * i);
    const start = addDays(end, -13);
    periods.unshift({ start, end });
  }
  
  return periods.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export default function Payroll() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<PayPeriod | null>(null);
  const [isAddJobDialogOpen, setIsAddJobDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [commissionRate, setCommissionRate] = useState("10");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: payPeriods = [] } = useQuery<PayPeriod[]>({
    queryKey: ["/api/payroll/periods"],
    queryFn: async () => {
      const res = await fetch("/api/payroll/periods");
      return res.json();
    }
  });

  const { data: payrollEntries = [] } = useQuery<PayrollEntry[]>({
    queryKey: ["/api/payroll/entries", selectedPeriod?.id],
    queryFn: async () => {
      const url = selectedPeriod ? `/api/payroll/entries?payPeriodId=${selectedPeriod.id}` : "/api/payroll/entries";
      const res = await fetch(url);
      return res.json();
    }
  });

  const { data: jobsData } = useQuery<JobsData>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      return res.json();
    }
  });

  const createPeriodMutation = useMutation({
    mutationFn: async (period: { startDate: string; endDate: string }) => {
      const res = await fetch("/api/payroll/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(period)
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/payroll/periods"] })
  });

  const updatePeriodMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/payroll/periods/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/payroll/periods"] })
  });

  const addEntryMutation = useMutation({
    mutationFn: async (entry: any) => {
      const res = await fetch("/api/payroll/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/entries"] });
      setIsAddJobDialogOpen(false);
      setSelectedJob(null);
      setNotes("");
    }
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/payroll/entries/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/payroll/entries"] })
  });

  const nextPayday = getNextPayday();
  const biweeklyPeriods = useMemo(() => generateBiweeklyPeriods(nextPayday), []);
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getPeriodForDate = (date: Date) => {
    return biweeklyPeriods.find(p => 
      isWithinInterval(date, { start: p.start, end: p.end })
    );
  };

  const getPayPeriodDbEntry = (period: { start: Date; end: Date }) => {
    return payPeriods.find(p => {
      const dbStart = new Date(p.startDate);
      const dbEnd = new Date(p.endDate);
      return isSameDay(dbStart, period.start) && isSameDay(dbEnd, period.end);
    });
  };

  const ensurePayPeriodExists = async (period: { start: Date; end: Date }) => {
    const existing = getPayPeriodDbEntry(period);
    if (existing) {
      setSelectedPeriod(existing);
      return existing;
    }
    const newPeriod = await createPeriodMutation.mutateAsync({
      startDate: period.start.toISOString(),
      endDate: period.end.toISOString()
    });
    setSelectedPeriod(newPeriod);
    return newPeriod;
  };

  const currentPeriod = getCurrentPayPeriodDates();
  const currentPeriodDb = getPayPeriodDbEntry(currentPeriod);

  const technicianSummary = useMemo(() => {
    const summary: Record<string, { name: string; totalAmount: number; totalCommission: number; jobCount: number }> = {};
    payrollEntries.forEach(entry => {
      if (!summary[entry.technicianId]) {
        summary[entry.technicianId] = { name: entry.technicianName, totalAmount: 0, totalCommission: 0, jobCount: 0 };
      }
      summary[entry.technicianId].totalAmount += entry.amount;
      summary[entry.technicianId].totalCommission += entry.commissionAmount;
      summary[entry.technicianId].jobCount += 1;
    });
    return Object.entries(summary).map(([id, data]) => ({ id, ...data }));
  }, [payrollEntries]);

  const totalPayroll = payrollEntries.reduce((sum, e) => sum + e.commissionAmount, 0);
  const totalJobValue = payrollEntries.reduce((sum, e) => sum + e.amount, 0);

  const srJobs = (jobsData?.jobs || []).filter(j => j.isCompleted && j.price < 50000);

  const handleAddJob = async () => {
    if (!selectedJob || !selectedPeriod) return;
    await addEntryMutation.mutateAsync({
      payPeriodId: selectedPeriod.id,
      technicianId: selectedJob.technicianId,
      technicianName: selectedJob.technicianName,
      jobId: selectedJob.jobId,
      jobTitle: selectedJob.title,
      customerName: selectedJob.customerName,
      amount: selectedJob.price,
      commissionRate: parseInt(commissionRate),
      notes,
      addedBy: "Office Manager"
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground hover:text-cyan-400" data-testid="btn-back">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground" data-testid="page-title">
              Payroll Calendar
            </h1>
            <p className="text-muted-foreground mt-1">
              Bi-weekly pay periods • Next payday: {format(nextPayday, "EEEE, MMMM d")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const period = getCurrentPayPeriodDates();
                ensurePayPeriodExists(period);
              }}
              data-testid="btn-current-period"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Current Pay Period
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-green-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="total-payroll">{formatPrice(totalPayroll)}</p>
                <p className="text-sm text-muted-foreground">Total Commissions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-blue-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="total-jobs">{payrollEntries.length}</p>
                <p className="text-sm text-muted-foreground">Jobs in Payroll</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-purple-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="tech-count">{technicianSummary.length}</p>
                <p className="text-sm text-muted-foreground">Technicians</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-cyan-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="total-value">{formatPrice(totalJobValue)}</p>
                <p className="text-sm text-muted-foreground">Total Job Value</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Pay Period Calendar</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} data-testid="btn-prev-month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} data-testid="btn-next-month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const period = getPeriodForDate(day);
                  const isPayday = isFriday(day) && period && isSameDay(day, period.end);
                  const isPeriodStart = period && isSameDay(day, period.start);
                  const isInCurrentPeriod = period && isWithinInterval(new Date(), { start: period.start, end: period.end });
                  const dbPeriod = period ? getPayPeriodDbEntry(period) : null;
                  
                  return (
                    <button
                      key={i}
                      onClick={() => period && ensurePayPeriodExists(period)}
                      className={`
                        relative p-2 min-h-[60px] rounded-lg text-sm transition-all
                        ${!isSameMonth(day, currentMonth) ? "text-muted-foreground/40" : "text-foreground"}
                        ${isToday(day) ? "ring-2 ring-primary" : ""}
                        ${isPayday ? "bg-green-500/20 border border-green-500/50" : ""}
                        ${isPeriodStart ? "bg-blue-500/10 border-l-2 border-l-blue-500" : ""}
                        ${isInCurrentPeriod && !isPayday && !isPeriodStart ? "bg-primary/5" : ""}
                        ${selectedPeriod && dbPeriod?.id === selectedPeriod.id ? "ring-2 ring-cyan-500" : ""}
                        hover:bg-white/5
                      `}
                      data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                    >
                      <span className={`${isToday(day) ? "font-bold text-primary" : ""}`}>
                        {format(day, "d")}
                      </span>
                      {isPayday && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                          <span className="text-[10px] font-semibold text-green-400">PAYDAY</span>
                        </div>
                      )}
                      {isPeriodStart && (
                        <div className="absolute bottom-1 left-1">
                          <span className="text-[10px] text-blue-400">Start</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
                  <span>Payday (Friday)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500/10 border-l-2 border-l-blue-500" />
                  <span>Period Start</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded ring-2 ring-primary" />
                  <span>Today</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {selectedPeriod ? (
                  <>Pay Period: {format(new Date(selectedPeriod.startDate), "MMM d")} - {format(new Date(selectedPeriod.endDate), "MMM d")}</>
                ) : (
                  "Select a Pay Period"
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPeriod ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={selectedPeriod.status === "paid" ? "default" : selectedPeriod.status === "closed" ? "secondary" : "outline"}>
                      {selectedPeriod.status.toUpperCase()}
                    </Badge>
                    <div className="flex gap-2">
                      {selectedPeriod.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => updatePeriodMutation.mutate({ id: selectedPeriod.id, status: "closed" })} data-testid="btn-close-period">
                          Close Period
                        </Button>
                      )}
                      {selectedPeriod.status === "closed" && (
                        <Button size="sm" onClick={() => updatePeriodMutation.mutate({ id: selectedPeriod.id, status: "paid" })} data-testid="btn-mark-paid">
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>

                  <Dialog open={isAddJobDialogOpen} onOpenChange={setIsAddJobDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" disabled={selectedPeriod.status !== "open"} data-testid="btn-add-job">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Job to Payroll
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Service Job to Payroll</DialogTitle>
                        <DialogDescription>
                          Select a completed service repair job to add to this pay period.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Select Completed Job</Label>
                          <Select onValueChange={(v) => setSelectedJob(srJobs.find(j => j.jobId === v) || null)}>
                            <SelectTrigger data-testid="select-job">
                              <SelectValue placeholder="Choose a job..." />
                            </SelectTrigger>
                            <SelectContent>
                              {srJobs.map(job => (
                                <SelectItem key={job.jobId} value={job.jobId}>
                                  {job.title} - {job.customerName} ({formatPrice(job.price)}) - {job.technicianName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedJob && (
                          <>
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                              <div>
                                <p className="text-xs text-muted-foreground">Technician</p>
                                <p className="font-medium">{selectedJob.technicianName}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Job Value</p>
                                <p className="font-medium">{formatPrice(selectedJob.price)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Customer</p>
                                <p className="font-medium">{selectedJob.customerName}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Completed</p>
                                <p className="font-medium">{format(new Date(selectedJob.scheduledDate), "MMM d, yyyy")}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Commission Rate</Label>
                                <Select value={commissionRate} onValueChange={setCommissionRate}>
                                  <SelectTrigger data-testid="select-commission">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="10">10%</SelectItem>
                                    <SelectItem value="15">15%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Commission Amount</Label>
                                <div className="h-10 px-3 py-2 bg-muted/50 rounded-md flex items-center font-medium text-green-400">
                                  {formatPrice(Math.round(selectedJob.price * (parseInt(commissionRate) / 100)))}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Notes (optional)</Label>
                              <Input 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                placeholder="Add any notes..."
                                data-testid="input-notes"
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddJobDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddJob} disabled={!selectedJob || addEntryMutation.isPending} data-testid="btn-confirm-add">
                          Add to Payroll
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {payrollEntries.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No jobs added to this pay period yet</p>
                    ) : (
                      payrollEntries.map(entry => (
                        <div key={entry.id} className="p-3 bg-muted/20 rounded-lg flex items-center justify-between" data-testid={`entry-${entry.id}`}>
                          <div>
                            <p className="font-medium text-sm">{entry.jobTitle}</p>
                            <p className="text-xs text-muted-foreground">{entry.technicianName} • {entry.customerName}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-green-400">{formatPrice(entry.commissionAmount)}</p>
                              <p className="text-xs text-muted-foreground">{entry.commissionRate}% of {formatPrice(entry.amount)}</p>
                            </div>
                            {selectedPeriod.status === "open" && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => deleteEntryMutation.mutate(entry.id)}
                                data-testid={`btn-delete-${entry.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Click on a date in the calendar to select a pay period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {technicianSummary.length > 0 && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Technician Payroll Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {technicianSummary.map(tech => (
                  <div key={tech.id} className="p-4 bg-muted/20 rounded-lg" data-testid={`tech-summary-${tech.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{tech.name}</p>
                      <Badge variant="outline">{tech.jobCount} jobs</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Job Value</p>
                        <p className="font-medium">{formatPrice(tech.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Commission</p>
                        <p className="font-semibold text-green-400">{formatPrice(tech.totalCommission)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
