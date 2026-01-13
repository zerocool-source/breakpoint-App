import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardCheck, CalendarIcon, User, MapPin, Loader2, Filter,
  Image as ImageIcon, FileText, Droplets, Clock, CheckCircle, Eye, X
} from "lucide-react";
import type { FieldEntry } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ParsedPayload {
  notes?: string;
  readings?: Record<string, any>;
  photos?: string[];
  serviceType?: string;
  propertyName?: string;
  checklist?: Array<{ item: string; checked: boolean }>;
  quickAction?: string;
  bodyOfWater?: string;
  poolName?: string;
  timestamp?: string;
}

const entryTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  service: { label: "Service Visit", color: "bg-blue-100 text-blue-700", icon: ClipboardCheck },
  repair: { label: "Repair", color: "bg-orange-100 text-orange-700", icon: FileText },
  reading: { label: "Reading", color: "bg-green-100 text-green-700", icon: Droplets },
  note: { label: "Note", color: "bg-slate-100 text-slate-600", icon: FileText },
};

function parsePayload(payload: string | null): ParsedPayload {
  if (!payload) return {};
  try {
    return JSON.parse(payload);
  } catch {
    return { notes: payload };
  }
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export default function Visits() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedTech, setSelectedTech] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (dateRange.from) params.set("startDate", startOfDay(dateRange.from).toISOString());
    if (dateRange.to) params.set("endDate", endOfDay(dateRange.to).toISOString());
    if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
    if (selectedTech !== "all") params.set("technicianName", selectedTech);
    if (selectedType !== "all") params.set("entryType", selectedType);
    return params.toString();
  };

  const { data: visits = [], isLoading } = useQuery<FieldEntry[]>({
    queryKey: ["visits", dateRange, selectedProperty, selectedTech, selectedType],
    queryFn: async () => {
      const response = await fetch(`/api/visits?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch visits");
      return response.json();
    },
  });

  const uniqueProperties = useMemo(() => {
    const props = new Map<string, string>();
    visits.forEach(v => {
      const payload = parsePayload(v.payload);
      if (v.propertyId && payload.propertyName) {
        props.set(v.propertyId, payload.propertyName);
      }
    });
    return Array.from(props.entries()).map(([id, name]) => ({ id, name }));
  }, [visits]);

  const uniqueTechs = useMemo(() => {
    const techs = new Set<string>();
    visits.forEach(v => {
      if (v.technicianName) techs.add(v.technicianName);
    });
    return Array.from(techs);
  }, [visits]);

  const openImageViewer = (images: string[], startIndex: number = 0) => {
    setSelectedImages(images);
    setCurrentImageIndex(startIndex);
    setImageDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#60A5FA]/20 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-[#60A5FA]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]" data-testid="text-heading-visits">Visits</h1>
              <p className="text-slate-500 text-sm">Service technician activity logs from Cove Canvas</p>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap p-4 bg-slate-50 rounded-lg border border-slate-200">
          <Filter className="w-4 h-4 text-slate-500" />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-date-range">
                <CalendarIcon className="w-4 h-4" />
                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[180px]" data-testid="filter-property">
              <MapPin className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {uniqueProperties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTech} onValueChange={setSelectedTech}>
            <SelectTrigger className="w-[180px]" data-testid="filter-technician">
              <User className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="All Technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {uniqueTechs.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[160px]" data-testid="filter-type">
              <FileText className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="service">Service Visit</SelectItem>
              <SelectItem value="repair">Repair</SelectItem>
              <SelectItem value="reading">Reading</SelectItem>
              <SelectItem value="note">Note</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
              </div>
            ) : visits.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No visits found</p>
                <p className="text-sm mt-1">Try adjusting your filters or check back later</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-4">
                  {visits.map((visit) => {
                    const payload = parsePayload(visit.payload);
                    const typeConfig = entryTypeConfig[visit.entryType] || entryTypeConfig.service;
                    const TypeIcon = typeConfig.icon;
                    const photos = payload.photos || [];

                    return (
                      <div
                        key={visit.id}
                        className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all"
                        data-testid={`visit-entry-${visit.id}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", typeConfig.color)}>
                            <TypeIcon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                              {payload.bodyOfWater && (
                                <Badge variant="outline" className="text-blue-600 border-blue-300">
                                  <Droplets className="w-3 h-3 mr-1" />
                                  {payload.bodyOfWater}
                                </Badge>
                              )}
                              {payload.poolName && (
                                <Badge variant="outline" className="text-cyan-600 border-cyan-300">
                                  {payload.poolName}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span className="font-medium text-slate-700">{visit.technicianName || "Unknown"}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {payload.propertyName || "No property"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(visit.submittedAt)}
                              </span>
                            </div>

                            {payload.quickAction && (
                              <div className="mb-2 p-2 bg-amber-50 rounded border border-amber-200">
                                <span className="text-sm font-medium text-amber-700">Quick Action: </span>
                                <span className="text-sm text-amber-600">{payload.quickAction}</span>
                              </div>
                            )}

                            {payload.notes && (
                              <p className="text-sm text-slate-600 mb-2">{payload.notes}</p>
                            )}

                            {payload.checklist && payload.checklist.length > 0 && (
                              <div className="mb-2">
                                <div className="text-xs font-medium text-slate-500 mb-1">Checklist:</div>
                                <div className="flex flex-wrap gap-2">
                                  {payload.checklist.map((item, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        item.checked ? "bg-green-50 text-green-700 border-green-300" : "bg-slate-50 text-slate-500 border-slate-300"
                                      )}
                                    >
                                      {item.checked ? <CheckCircle className="w-3 h-3 mr-1" /> : null}
                                      {item.item}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {payload.readings && Object.keys(payload.readings).length > 0 && (
                              <div className="mb-2">
                                <div className="text-xs font-medium text-slate-500 mb-1">Readings:</div>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(payload.readings).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="text-xs">
                                      {key}: {String(value)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {photos.length > 0 && (
                            <div className="shrink-0">
                              <div className="flex gap-2">
                                {photos.slice(0, 3).map((photo, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => openImageViewer(photos, idx)}
                                    className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                                    data-testid={`button-view-image-${visit.id}-${idx}`}
                                  >
                                    <img
                                      src={photo}
                                      alt={`Visit photo ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                                {photos.length > 3 && (
                                  <button
                                    onClick={() => openImageViewer(photos, 3)}
                                    className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                  >
                                    <span className="text-sm font-medium">+{photos.length - 3}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Photo {currentImageIndex + 1} of {selectedImages.length}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            {selectedImages[currentImageIndex] && (
              <img
                src={selectedImages[currentImageIndex]}
                alt={`Photo ${currentImageIndex + 1}`}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
            {selectedImages.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                  disabled={currentImageIndex === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-500">
                  {currentImageIndex + 1} / {selectedImages.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentImageIndex(Math.min(selectedImages.length - 1, currentImageIndex + 1))}
                  disabled={currentImageIndex === selectedImages.length - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto py-2">
            {selectedImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={cn(
                  "w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors",
                  idx === currentImageIndex ? "border-blue-500" : "border-slate-200 hover:border-slate-400"
                )}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
