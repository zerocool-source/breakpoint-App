import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { User, MapPin, Building2, ChevronDown, ChevronRight } from "lucide-react";
import { Account, Technician, formatPrice } from "./JobTypes";
import { ExpandableJobCard } from "./JobCard";

export function AccountCard({ account }: { account: Account }) {
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

export function TechnicianCard({ tech }: { tech: Technician }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const completionPercent = tech.totalJobs > 0 
    ? Math.round((tech.completedJobs / tech.totalJobs) * 100) 
    : 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={`bg-card/50 border-border/50 hover:border-primary/30 transition-colors ${tech.totalJobs === 0 ? 'opacity-60' : ''}`} data-testid={`tech-card-${tech.techId}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {tech.totalJobs > 0 ? (
                  isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )
                ) : null}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tech.totalJobs > 0 ? 'bg-primary/20' : 'bg-muted/20'
                }`}>
                  <User className={`w-5 h-5 ${tech.totalJobs > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
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
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/50" data-testid={`tech-commission10-${tech.techId}`}>
                    10%: {formatPrice(tech.commission10 || 0)}
                  </Badge>
                  <Badge className="bg-primary/20 text-primary border-primary/50" data-testid={`tech-commission15-${tech.techId}`}>
                    15%: {formatPrice(tech.commission15 || 0)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-ui font-bold text-xl text-primary" data-testid={`tech-value-${tech.techId}`}>
                    {formatPrice(tech.totalValue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tech.totalJobs} jobs ({completionPercent}% done)
                  </p>
                </div>
              </div>
            </CardTitle>
            {tech.totalJobs > 0 && (
              <div className="w-full bg-background/30 rounded-full h-2 mt-3">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {tech.totalJobs > 0 && (
              <div className="space-y-2 border-t border-border/30 pt-4">
                {tech.jobs.map((job) => (
                  <ExpandableJobCard key={job.jobId} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
        {tech.totalJobs === 0 && (
          <CardContent className="pt-0">
            <p className="text-center text-muted-foreground/60 py-4 text-sm">
              No jobs assigned
            </p>
          </CardContent>
        )}
      </Card>
    </Collapsible>
  );
}
