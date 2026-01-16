import React, { useState, useContext } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, User, MapPin, CheckCircle2, DollarSign, ChevronDown, ChevronRight, Archive, ArchiveRestore, Trash2, AlertTriangle, AlertCircle, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { Job, ArchiveContext, formatPrice } from "./JobTypes";

export function PriceDisplay({ price, productName, testId }: { price: number; productName?: string; testId?: string }) {
  if (!price || price === 0) {
    return (
      <span className="text-[#FF8000] font-ui text-sm" data-testid={testId}>
        <span className="animate-pulse font-semibold">⚠ Need Estimate</span>
        {productName && (
          <span className="block text-xs text-[#FF8000]/80 mt-0.5">
            → Look up: {productName}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="font-ui font-bold text-[#2374AB]" data-testid={testId}>
      {formatPrice(price)}
    </span>
  );
}

export function ExpandableJobCard({ job }: { job: Job }) {
  const [isOpen, setIsOpen] = useState(false);
  const archive = useContext(ArchiveContext);
  
  const isPastDue = (() => {
    const isClosed = job.status?.toLowerCase() === 'closed';
    if (job.isCompleted || isClosed || !job.scheduledDate) return false;
    const scheduled = new Date(job.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled < today;
  })();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`bg-slate-800/60 hover:border-[#2374AB]/50 transition-all duration-200 ${isPastDue ? 'border-red-500/50' : 'border-slate-600/50'}`} data-testid={`job-card-${job.jobId}`}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-[#2374AB]" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  job.isCompleted ? 'bg-[#2374AB]/30' : isPastDue ? 'bg-red-500/30' : 'bg-[#FF8000]/30'
                }`}>
                  {job.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2374AB]" />
                  ) : isPastDue ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#FF8000]" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-white" data-testid={`job-title-${job.jobId}`}>
                    {job.title || "Service Job"}
                  </p>
                  <p className="text-sm text-slate-400">
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
                  <Badge className="bg-red-500/30 text-red-300 border-red-500/50 animate-pulse">
                    Past Due
                  </Badge>
                )}
                <Badge variant="outline" className={
                  job.isCompleted ? "border-[#2374AB]/50 text-[#2374AB]" : isPastDue ? "border-red-500/50 text-red-400" : "border-[#FF8000]/50 text-[#FF8000]"
                }>
                  {job.status}
                </Badge>
                <span className="text-lg text-white font-semibold" data-testid={`job-price-${job.jobId}`}>
                  <PriceDisplay price={job.price} productName={job.title} />
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 border-t border-slate-600/50 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Customer</p>
                  <Link href={`/accounts/${job.customerId}`}>
                    <p className="text-sm font-medium text-[#2374AB] hover:text-[#2374AB] cursor-pointer flex items-center gap-1">
                      {job.customerName}
                      <MessageCircle className="w-3 h-3" />
                    </p>
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Pool / Location</p>
                  <p className="text-sm text-white">{job.poolName}</p>
                </div>
                {job.address && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Address</p>
                    <p className="text-sm text-white flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.address}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Technician</p>
                  <p className="text-sm text-white flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {job.technicianName}
                  </p>
                </div>
                {job.scheduledDate && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Scheduled</p>
                    <p className="text-sm text-white flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(job.scheduledDate).toLocaleDateString()}
                      {job.scheduledTime && ` at ${job.scheduledTime}`}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Value</p>
                  <p className="text-sm text-white flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <PriceDisplay price={job.price} productName={job.title} />
                  </p>
                </div>
              </div>
            </div>
            
            {job.description && (
              <div className="mt-4 pt-3 border-t border-slate-600/30">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-slate-200">{job.description}</p>
              </div>
            )}
            
            {(job.officeNotes || job.instructions) && (
              <div className="mt-3 p-3 bg-[#FF8000]/20 border border-[#FF8000]/30 rounded-lg">
                <p className="text-xs text-[#FF8000] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Office Notes
                </p>
                {job.officeNotes && <p className="text-sm text-white">{job.officeNotes}</p>}
                {job.instructions && (
                  <p className="text-sm text-slate-300 mt-1">
                    <span className="text-[#FF8000]">Instructions:</span> {job.instructions}
                  </p>
                )}
              </div>
            )}
            
            {job.items && job.items.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-600/30">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Products</p>
                <div className="space-y-1">
                  {job.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-300">{item.productName || item.productId} x{item.qty}</span>
                      <span className="text-white">{formatPrice(item.unitCost * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {archive && (
              <div className="mt-4 pt-3 border-t border-slate-600/30 flex gap-2">
                {archive.archivedIds.has(String(job.jobId)) ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => archive.unarchiveJob(String(job.jobId))}
                      className="gap-1 bg-[#2374AB] text-white hover:bg-[#2374AB] border-0 shadow-sm"
                      data-testid={`btn-unarchive-${job.jobId}`}
                    >
                      <ArchiveRestore className="w-3 h-3" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => archive.deleteJob(String(job.jobId))}
                      className="gap-1 bg-red-500/80 text-white hover:bg-red-500 border-0 shadow-sm"
                      data-testid={`btn-delete-${job.jobId}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => archive.archiveJob(String(job.jobId))}
                    className="gap-1 bg-slate-600 text-slate-200 hover:bg-slate-500 border border-slate-500/50 shadow-sm"
                    data-testid={`btn-archive-${job.jobId}`}
                  >
                    <Archive className="w-3 h-3" />
                    Archive Job
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function JobRow({ job, onClick }: { job: Job; onClick?: () => void }) {
  return (
    <div 
      className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg border border-slate-600/50 hover:border-[#2374AB]/50 transition-colors cursor-pointer"
      data-testid={`job-row-${job.jobId}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          job.isCompleted ? 'bg-[#2374AB]/30' : 'bg-[#FF8000]/30'
        }`}>
          {job.isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-[#2374AB]" />
          ) : (
            <Clock className="w-4 h-4 text-[#FF8000]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate" data-testid={`job-title-${job.jobId}`}>
            {job.title || "Service Job"}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
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
          job.isCompleted ? "border-[#2374AB]/50 text-[#2374AB]" : "border-[#FF8000]/50 text-[#FF8000]"
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
