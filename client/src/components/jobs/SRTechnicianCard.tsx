import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Building2, ChevronDown, ChevronRight, Settings, Mail, AlertCircle } from "lucide-react";
import { Job, formatPrice } from "./JobTypes";
import { ExpandableJobCard } from "./JobCard";

export function SRAccountSubfolder({ accountName, jobs }: { accountName: string; jobs: Job[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const completedCount = jobs.filter(j => j.isCompleted).length;
  const totalValue = jobs.reduce((sum, j) => sum + j.price, 0);
  const readyToInvoice = totalValue >= 500;
  
  const jobWithOfficeNotes = jobs.find(j => j.officeNotes);
  const jobWithInstructions = jobs.find(j => j.instructions);
  const officeNotes = jobWithOfficeNotes?.officeNotes || '';
  const instructions = jobWithInstructions?.instructions || '';
  const hasNotes = !!(officeNotes || instructions);

  const handleSendInvoice = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      <div className={`border rounded-lg bg-slate-700/50 overflow-hidden ${readyToInvoice ? 'border-[#2374AB]' : 'border-slate-600/50'}`}>
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-slate-600/50 transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-[#2374AB]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#2374AB]" />
            )}
            <Building2 className="w-4 h-4 text-[#2374AB]" />
            <span className="font-ui font-medium text-white">{accountName}</span>
            <Badge className="text-xs bg-slate-600/50 text-slate-300 border-slate-500/50">
              {jobs.length} jobs
            </Badge>
            {hasNotes && (
              <Badge className="bg-[#FF8000]/30 text-[#FF8000] border-[#FF8000]/50 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Notes
              </Badge>
            )}
            {readyToInvoice && (
              <Badge className="bg-[#2374AB] text-white border-[#2374AB] animate-pulse text-xs shadow-sm">
                Ready to Invoice
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">{completedCount}/{jobs.length} done</span>
            <span className={`font-ui font-bold ${readyToInvoice ? 'text-[#2374AB]' : 'text-white'}`}>
              {formatPrice(totalValue)}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-2 border-t border-slate-600/50">
            {hasNotes && (
              <div className="mb-3 p-3 bg-[#FF8000]/20 border border-[#FF8000]/30 rounded-lg">
                <p className="text-xs text-[#FF8000] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Office Notes
                </p>
                {officeNotes && (
                  <p className="text-sm text-white">{officeNotes}</p>
                )}
                {instructions && (
                  <p className="text-sm text-slate-300 mt-1">
                    <span className="text-[#FF8000]">Instructions:</span> {instructions}
                  </p>
                )}
              </div>
            )}
            {readyToInvoice && (
              <button
                onClick={handleSendInvoice}
                className="w-full mb-3 py-2 px-4 bg-[#2374AB] hover:bg-[#2374AB] border border-[#2374AB] rounded-lg text-white font-ui font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-md"
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

export function SRTechnicianCard({ techName, jobs }: { techName: string; jobs: Job[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
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
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-[#2374AB]/40 hover:border-[#2374AB]/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all duration-300 shadow-lg" data-testid={`sr-tech-${techName}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-slate-800/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-[#2374AB]" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-[#2374AB]" />
                )}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2374AB]/40 to-sky-600/30 flex items-center justify-center border border-[#2374AB]/50 shadow-md">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-ui text-lg font-bold text-white">{techName}</p>
                    <Badge className="bg-[#2374AB] text-white border-[#2374AB] shadow-sm">SR</Badge>
                  </div>
                  <p className="text-xs text-[#2374AB]/80 mt-0.5">
                    Service Repairs (&lt;$500) • {jobsByAccount.length} accounts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge className="bg-[#2374AB]/30 text-sky-200 border-[#2374AB]/50 text-xs shadow-sm" data-testid={`sr-commission10-${techName}`}>
                    10%: {formatPrice(commission10)}
                  </Badge>
                  <Badge className="bg-sky-600/30 text-[#2374AB1A] border-[#2374AB]/50 text-xs shadow-sm" data-testid={`sr-commission15-${techName}`}>
                    15%: {formatPrice(commission15)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-ui font-bold text-xl text-white">
                    {formatPrice(totalValue)}
                  </p>
                  <p className="text-xs text-[#2374AB]/80">
                    {completedCount}/{jobs.length} complete ({completionPercent}%)
                  </p>
                </div>
              </div>
            </CardTitle>
            <div className="w-full bg-slate-600 rounded-full h-2 mt-3">
              <div 
                className="bg-[#2374AB] h-2 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-[#2374AB]/20">
            <div className="space-y-3 pt-4">
              {jobsByAccount.map(([accountName, accountJobs]) => (
                <SRAccountSubfolder key={accountName} accountName={accountName} jobs={accountJobs} />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
