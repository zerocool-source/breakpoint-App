import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft,
  ClipboardCheck,
  Save,
  Flame,
  Wrench,
  Droplets,
  Gauge,
  Beaker,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { type PmServiceType, type PmIntervalSetting } from "@shared/schema";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  heater: <Flame className="h-4 w-4" />,
  filter: <Wrench className="h-4 w-4" />,
  pump: <Droplets className="h-4 w-4" />,
  automation: <Gauge className="h-4 w-4" />,
  salt_system: <Beaker className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  heater: "bg-orange-100 text-orange-700 border-orange-200",
  filter: "bg-blue-100 text-blue-700 border-blue-200",
  pump: "bg-cyan-100 text-cyan-700 border-cyan-200",
  automation: "bg-purple-100 text-purple-700 border-purple-200",
  salt_system: "bg-green-100 text-green-700 border-green-200",
};

const WATER_TYPE_LABELS: Record<string, string> = {
  spa: "Spa",
  pool: "Pool",
  wader: "Wader",
  fountain: "Fountain",
  all: "All Water Types",
};

export default function PmSettings() {
  const queryClient = useQueryClient();
  const [editingInterval, setEditingInterval] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PmIntervalSetting>>({});

  const { data: serviceTypes = [], isLoading: typesLoading } = useQuery<PmServiceType[]>({
    queryKey: ["/api/pm/service-types"],
    queryFn: async () => {
      const res = await fetch("/api/pm/service-types");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: intervalSettings = [], isLoading: intervalsLoading } = useQuery<PmIntervalSetting[]>({
    queryKey: ["/api/pm/interval-settings"],
    queryFn: async () => {
      const res = await fetch("/api/pm/interval-settings");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const seedPm = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/pm/seed", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/service-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/interval-settings"] });
    },
  });

  const updateInterval = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PmIntervalSetting> }) => {
      const res = await fetch(`/api/pm/interval-settings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/interval-settings"] });
      setEditingInterval(null);
      setEditValues({});
    },
  });

  const startEditing = (interval: PmIntervalSetting) => {
    setEditingInterval(interval.id);
    setEditValues({
      recommendedIntervalMonths: interval.recommendedIntervalMonths,
      minimumIntervalMonths: interval.minimumIntervalMonths,
      maximumIntervalMonths: interval.maximumIntervalMonths,
      warningThresholdDays: interval.warningThresholdDays || 30,
    });
  };

  const saveEdit = () => {
    if (!editingInterval) return;
    updateInterval.mutate({ id: editingInterval, updates: editValues });
  };

  const groupedIntervals = serviceTypes.map(type => ({
    type,
    intervals: intervalSettings.filter(i => i.pmServiceTypeId === type.id),
  }));

  const isLoading = typesLoading || intervalsLoading;

  return (
    <AppLayout>
      <div className="space-y-6" data-testid="pm-settings-page">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/notes">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6 text-blue-600" />
                PM Interval Settings
              </h1>
              <p className="text-slate-500 mt-1">
                Configure service intervals for different equipment types and water types
              </p>
            </div>
          </div>
          {serviceTypes.length === 0 && (
            <Button 
              onClick={() => seedPm.mutate()}
              disabled={seedPm.isPending}
              data-testid="button-seed-pm"
            >
              {seedPm.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-2" />
              )}
              Initialize Default PM Types
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-slate-500">Loading PM settings...</span>
          </div>
        ) : serviceTypes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardCheck className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 text-center mb-4">
                No PM service types configured yet. Initialize defaults to get started.
              </p>
              <Button onClick={() => seedPm.mutate()} disabled={seedPm.isPending}>
                Initialize Default PM Types
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-6">
              {groupedIntervals.map(({ type, intervals }) => (
                <Card key={type.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${CATEGORY_COLORS[type.category] || 'bg-slate-100'}`}>
                          {CATEGORY_ICONS[type.category] || <Wrench className="h-4 w-4" />}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{type.name}</CardTitle>
                          <CardDescription>{type.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {type.category.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {intervals.map((interval) => (
                        <div 
                          key={interval.id} 
                          className="border rounded-lg p-4 bg-slate-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="secondary">
                                {WATER_TYPE_LABELS[interval.waterType] || interval.waterType}
                              </Badge>
                            </div>
                            {editingInterval === interval.id ? (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setEditingInterval(null)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={saveEdit}
                                  disabled={updateInterval.isPending}
                                  data-testid={`button-save-interval-${interval.id}`}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => startEditing(interval)}
                                data-testid={`button-edit-interval-${interval.id}`}
                              >
                                Edit
                              </Button>
                            )}
                          </div>

                          {editingInterval === interval.id ? (
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <Label className="text-xs">Recommended (months)</Label>
                                <Input
                                  type="number"
                                  value={editValues.recommendedIntervalMonths || ''}
                                  onChange={(e) => setEditValues(v => ({ 
                                    ...v, 
                                    recommendedIntervalMonths: parseInt(e.target.value) 
                                  }))}
                                  data-testid="input-recommended"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Minimum (months)</Label>
                                <Input
                                  type="number"
                                  value={editValues.minimumIntervalMonths || ''}
                                  onChange={(e) => setEditValues(v => ({ 
                                    ...v, 
                                    minimumIntervalMonths: parseInt(e.target.value) 
                                  }))}
                                  data-testid="input-minimum"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Maximum (months)</Label>
                                <Input
                                  type="number"
                                  value={editValues.maximumIntervalMonths || ''}
                                  onChange={(e) => setEditValues(v => ({ 
                                    ...v, 
                                    maximumIntervalMonths: parseInt(e.target.value) 
                                  }))}
                                  data-testid="input-maximum"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Warning (days before)</Label>
                                <Input
                                  type="number"
                                  value={editValues.warningThresholdDays || ''}
                                  onChange={(e) => setEditValues(v => ({ 
                                    ...v, 
                                    warningThresholdDays: parseInt(e.target.value) 
                                  }))}
                                  data-testid="input-warning"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500 text-xs">Recommended</p>
                                <p className="font-medium">{interval.recommendedIntervalMonths} months</p>
                              </div>
                              <div>
                                <p className="text-slate-500 text-xs">Minimum</p>
                                <p className="font-medium">{interval.minimumIntervalMonths} months</p>
                              </div>
                              <div>
                                <p className="text-slate-500 text-xs">Maximum</p>
                                <p className="font-medium">{interval.maximumIntervalMonths} months</p>
                              </div>
                              <div>
                                <p className="text-slate-500 text-xs">Warning Threshold</p>
                                <p className="font-medium">{interval.warningThresholdDays || 30} days</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {intervals.length === 0 && (
                        <p className="text-sm text-slate-400 italic">No intervals configured for this service type</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </AppLayout>
  );
}
