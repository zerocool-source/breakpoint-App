import React from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wrench, Droplets, Wind, AlertTriangle, FileText, ChevronRight
} from "lucide-react";

const techOpsOptions = [
  { 
    id: "repairs-needed",
    label: "Repairs Needed", 
    href: "/tech-ops/repairs-needed",
    icon: Wrench, 
    color: "bg-red-100 text-red-700 border-red-200",
    description: "Report equipment or pool repairs needed at a property"
  },
  { 
    id: "chemical-order",
    label: "Chemical Order", 
    href: "/tech-ops/chemical-order",
    icon: Droplets, 
    color: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Request chemicals to be ordered for a property"
  },
  { 
    id: "chemicals-dropoff",
    label: "Chemicals Drop-Off", 
    href: "/tech-ops/chemicals-dropoff",
    icon: Droplets, 
    color: "bg-green-100 text-green-700 border-green-200",
    description: "Log chemicals delivered or dropped off at a property"
  },
  { 
    id: "windy-cleanup",
    label: "Windy Day Clean Up", 
    href: "/tech-ops/windy-cleanup",
    icon: Wind, 
    color: "bg-amber-100 text-amber-700 border-amber-200",
    description: "Schedule additional cleanup due to windy conditions"
  },
  { 
    id: "report-issue",
    label: "Report Issue", 
    href: "/tech-ops/report-issue",
    icon: AlertTriangle, 
    color: "bg-orange-100 text-orange-700 border-orange-200",
    description: "Report any issue or concern at a property"
  },
  { 
    id: "add-notes",
    label: "Add Notes", 
    href: "/tech-ops/add-notes",
    icon: FileText, 
    color: "bg-slate-100 text-slate-700 border-slate-200",
    description: "Add general notes about a property or service"
  },
];

export default function TechOpsLanding() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#1E3A8A]/10 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-[#1E3A8A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading-techops">Tech Ops</h1>
            <p className="text-slate-500 text-sm">Field technician requests and submissions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {techOpsOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Link key={option.href} href={option.href} data-testid={`link-techops-${option.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group h-full" data-testid={`card-techops-${option.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${option.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-[#1E293B] group-hover:text-[#1E3A8A] transition-colors">
                            {option.label}
                          </h3>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#1E3A8A] transition-colors" />
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{option.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
