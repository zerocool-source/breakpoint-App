import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Wrench, X, Camera, Upload, ClipboardList, MapPin, Clock
} from "lucide-react";

interface RepairRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface PhotoAttachment {
  url: string;
  caption: string;
}

interface FormData {
  propertyId: string;
  propertyName: string;
  address: string;
  jobType: string;
  scheduledTime: string;
  officeNotes: string;
  photoAttachments: PhotoAttachment[];
}

const JOB_TYPES = [
  "Pump Motor Replacement",
  "Filter Repair",
  "Heater Repair",
  "Valve Replacement",
  "Plumbing Repair",
  "Electrical Repair",
  "Tile/Coping Repair",
  "Equipment Installation",
  "Leak Detection/Repair",
  "Other"
];

export function RepairRequestForm({ open, onOpenChange, onSuccess }: RepairRequestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<FormData>({
    propertyId: "",
    propertyName: "",
    address: "",
    jobType: "",
    scheduledTime: "08:00",
    officeNotes: "",
    photoAttachments: [],
  });

  const [customJobType, setCustomJobType] = useState("");

  const { data: customersData } = useQuery<{ customers: any[] }>({
    queryKey: ["/api/customers/stored"],
    queryFn: async () => {
      const response = await fetch("/api/customers/stored");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const customers = customersData?.customers || [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/repair-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create repair request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repair-requests"] });
      toast({ title: "Success", description: "Repair request created successfully" });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create repair request", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      propertyId: "",
      propertyName: "",
      address: "",
      jobType: "",
      scheduledTime: "08:00",
      officeNotes: "",
      photoAttachments: [],
    });
    setCustomJobType("");
  };

  const handleSubmit = (asDraft: boolean = false) => {
    if (!formData.propertyId) {
      toast({ title: "Error", description: "Please select a property", variant: "destructive" });
      return;
    }

    const finalJobType = formData.jobType === "Other" ? customJobType : formData.jobType;

    createMutation.mutate({
      propertyId: formData.propertyId,
      propertyName: formData.propertyName,
      address: formData.address || undefined,
      issueDescription: finalJobType,
      scheduledTime: formData.scheduledTime,
      officeNotes: formData.officeNotes || undefined,
      photos: formData.photoAttachments.map(p => p.url),
      photoAttachments: formData.photoAttachments,
      status: asDraft ? "draft" : "pending",
      requestNumber: `RR-${Math.floor(100000 + Math.random() * 900000)}`,
      requestDate: new Date().toISOString(),
      priority: "medium",
      reportedBy: "office_staff",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] overflow-hidden flex flex-col p-0">
        <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold tracking-wide">REPAIR REQUEST</h2>
              <p className="text-sm text-slate-300">New Request</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Office Notes Section - Top of form */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                Office Notes
                <span className="text-xs font-normal text-amber-600 ml-1">(Internal use only)</span>
              </Label>
              <Textarea
                value={formData.officeNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, officeNotes: e.target.value }))}
                placeholder="Add office notes..."
                rows={3}
                className="resize-none bg-white"
                data-testid="textarea-office-notes"
              />
            </div>

            {/* Property Name */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Property Name</Label>
              <Select
                value={formData.propertyId}
                onValueChange={(id) => {
                  const customer = customers.find((c: any) => c.id === id);
                  setFormData(prev => ({
                    ...prev,
                    propertyId: id,
                    propertyName: customer?.name || "",
                    address: customer?.address || "",
                  }));
                }}
              >
                <SelectTrigger data-testid="select-rr-property">
                  <SelectValue placeholder="Select property..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Property Address - Auto-filled */}
            {formData.address && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Property Address
                </Label>
                <p className="text-sm text-slate-700 font-medium" data-testid="text-property-address">
                  {formData.address}
                </p>
              </div>
            )}

            {/* Job Type / Repair Type */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-slate-500" />
                Job Type / Repair Type
              </Label>
              <Select
                value={formData.jobType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, jobType: value }))}
              >
                <SelectTrigger data-testid="select-rr-job-type">
                  <SelectValue placeholder="Select job type..." />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.jobType === "Other" && (
                <Input
                  value={customJobType}
                  onChange={(e) => setCustomJobType(e.target.value)}
                  placeholder="Enter custom job type..."
                  className="mt-2"
                  data-testid="input-custom-job-type"
                />
              )}
            </div>

            {/* Scheduled Time */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Scheduled Time
              </Label>
              <Input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                className="w-48"
                data-testid="input-scheduled-time"
              />
              <p className="text-xs text-slate-500 mt-1">
                {formatTime(formData.scheduledTime)}
              </p>
            </div>

            {/* Attachments from Office */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
                <Camera className="w-4 h-4 text-slate-500" />
                Attachments from Office
              </Label>
              <div className="flex items-center gap-2 mb-3">
                <ObjectUploader
                  maxNumberOfFiles={10}
                  maxFileSize={10485760}
                  onGetUploadParameters={async (file) => {
                    const res = await fetch("/api/uploads/request-url", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: file.name,
                        size: file.size,
                        contentType: file.type,
                      }),
                    });
                    const { uploadURL, objectPath } = await res.json();
                    (file as any).meta.objectPath = objectPath;
                    return {
                      method: "PUT" as const,
                      url: uploadURL,
                      headers: { "Content-Type": file.type },
                    };
                  }}
                  onComplete={async (result) => {
                    const uploadedFiles = result.successful || [];
                    const newAttachments: PhotoAttachment[] = [];
                    for (const file of uploadedFiles) {
                      const objectPath = (file as any).meta?.objectPath;
                      if (objectPath) {
                        try {
                          await fetch("/api/uploads/confirm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ objectPath }),
                          });
                          newAttachments.push({ url: objectPath, caption: "" });
                        } catch (error) {
                          console.error("Failed to confirm upload:", error);
                        }
                      }
                    }
                    if (newAttachments.length > 0) {
                      setFormData(prev => ({ 
                        ...prev, 
                        photoAttachments: [...prev.photoAttachments, ...newAttachments],
                      }));
                    }
                  }}
                  buttonClassName="bg-[#0077b6] text-white hover:bg-[#005f8f]"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Add Photos
                </ObjectUploader>
                <span className="text-xs text-slate-400">Max 10 MB per photo</span>
              </div>
              {formData.photoAttachments.length > 0 ? (
                <div className="space-y-4">
                  {formData.photoAttachments.map((attachment, index) => (
                    <div key={index} className="bg-white rounded-lg border p-3">
                      <div className="flex gap-3">
                        <div className="relative group flex-shrink-0">
                          <img
                            src={attachment.url}
                            alt={`Attachment ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                photoAttachments: prev.photoAttachments.filter((_, i) => i !== index),
                              }));
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-remove-photo-${index}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-slate-500">Caption</Label>
                          <Input
                            value={attachment.caption}
                            onChange={(e) => {
                              const newAttachments = [...formData.photoAttachments];
                              newAttachments[index] = { ...newAttachments[index], caption: e.target.value };
                              setFormData(prev => ({ ...prev, photoAttachments: newAttachments }));
                            }}
                            placeholder="e.g., Current pump motor - note the rust on housing"
                            className="mt-1 text-sm"
                            data-testid={`input-photo-caption-${index}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 border-2 border-dashed rounded-lg">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No attachments added yet</p>
                  <p className="text-xs mt-1">Upload photos with notes for the repair tech</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Bottom Buttons */}
        <div className="border-t bg-slate-50 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={createMutation.isPending}
            data-testid="button-save-draft"
          >
            Save Draft
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-rr"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={createMutation.isPending}
              className="bg-[#f97316] hover:bg-[#ea580c] text-white"
              data-testid="button-submit-rr"
            >
              Submit Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
