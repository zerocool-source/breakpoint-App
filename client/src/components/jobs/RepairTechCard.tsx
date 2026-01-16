import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, HardHat } from "lucide-react";
import { RepairTechData, formatPrice } from "./JobTypes";
import { ExpandableJobCard } from "./JobCard";

export function RepairTechCard({ tech, monthlyQuota }: { tech: RepairTechData; monthlyQuota: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 border-[#2374AB]/40 hover:border-[#2374AB]/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all duration-300 shadow-lg" data-testid={`repair-tech-${tech.name}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-slate-800/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-[#2374AB]" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-[#2374AB]" />
                )}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2374AB]/40 to-sky-600/30 flex items-center justify-center border border-[#2374AB]/50 shadow-md">
                  <HardHat className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-ui text-lg font-bold text-white">{tech.name}</p>
                  <p className="text-xs text-[#2374AB]/80">
                    {tech.completedCount}/{tech.jobs.length} completed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge className="bg-[#2374AB]/30 text-sky-200 border-[#2374AB]/50 text-xs shadow-sm">
                    10%: {formatPrice(tech.commission10)}
                  </Badge>
                  <Badge className="bg-sky-600/30 text-[#2374AB1A] border-[#2374AB]/50 text-xs shadow-sm">
                    15%: {formatPrice(tech.commission15)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-ui font-bold text-2xl text-white">{formatPrice(tech.totalValue)}</p>
                </div>
              </div>
            </CardTitle>
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Monthly Quota Progress</span>
                <span className="text-sm font-ui">
                  <span className={tech.quotaPercent >= 100 ? "text-[#2374AB] font-bold" : "text-slate-200"}>
                    {formatPrice(tech.monthlyValue)}
                  </span>
                  <span className="text-slate-500"> / {formatPrice(monthlyQuota)}</span>
                </span>
              </div>
              <Progress 
                value={tech.quotaPercent} 
                className="h-2 bg-slate-600"
              />
              <div className="flex justify-between mt-1">
                <span className={`text-xs font-semibold ${tech.quotaPercent >= 100 ? 'text-[#2374AB]' : 'text-slate-300'}`}>
                  {tech.quotaPercent}%
                </span>
                <span className="text-xs text-slate-400">
                  {tech.quotaPercent >= 100 ? '✓ Quota Met!' : `${formatPrice(monthlyQuota - tech.monthlyValue)} to go`}
                </span>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-[#2374AB]/20">
            <div className="mt-3 pt-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Daily Activity (1-{tech.daysInMonth})</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {Array.from({ length: tech.daysInMonth }, (_, i) => i + 1).map(day => {
                  const value = tech.dailyValues[day] || 0;
                  const hasActivity = value > 0;
                  const intensity = hasActivity ? Math.min(1, value / 1000) : 0;
                  return (
                    <div
                      key={day}
                      className={`w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold transition-colors ${
                        hasActivity 
                          ? intensity > 0.7 ? 'bg-[#2374AB] text-white' 
                          : intensity > 0.3 ? 'bg-[#2374AB]/60 text-white' 
                          : 'bg-[#2374AB]/30 text-[#2374AB]'
                          : 'bg-slate-700 text-slate-500'
                      }`}
                      title={hasActivity ? `Day ${day}: ${formatPrice(value)}` : `Day ${day}: No activity`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Repair Types</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(tech.repairTypes).slice(0, 6).map(([type, data]) => (
                  <Badge key={type} variant="outline" className="text-xs border-slate-500/50 text-slate-200 bg-slate-700/50">
                    {type.length > 25 ? type.substring(0, 25) + '...' : type}
                    <span className="ml-1 text-slate-400">({data.count}x, {formatPrice(data.value)})</span>
                  </Badge>
                ))}
                {Object.keys(tech.repairTypes).length > 6 && (
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                    +{Object.keys(tech.repairTypes).length - 6} more
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Jobs ({tech.jobs.length})</p>
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
  );
}
