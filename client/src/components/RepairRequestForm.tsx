import React, { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Wrench, X, Camera, Upload, ClipboardList, MapPin, UserCheck, Calendar, Loader2
} from "lucide-react";

interface RepairRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface PhotoAttachment {
  url: string;
  caption: string;
  fileName?: string;
}

interface FormData {
  propertyId: string;
  propertyName: string;
  address: string;
  jobType: string;
  scheduledDate: string;
  scheduledTime: string;
  assignedTechId: string;
  assignedTechName: string;
  title: string;
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/heic"];

export function RepairRequestForm({ open, onOpenChange, onSuccess }: RepairRequestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    propertyId: "",
    propertyName: "",
    address: "",
    jobType: "",
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: "08:00",
    assignedTechId: "",
    assignedTechName: "",
    title: "",
    officeNotes: "",
    photoAttachments: [],
  });

  const [customJobType, setCustomJobType] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: customersData } = useQuery<{ customers: any[] }>({
    queryKey: ["/api/customers/stored"],
    queryFn: async () => {
      const response = await fetch("/api/customers/stored");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const customers = customersData?.customers || [];

  const { data: techniciansData } = useQuery<{ technicians: any[] }>({
    queryKey: ["/api/technicians/stored"],
    queryFn: async () => {
      const response = await fetch("/api/technicians/stored");
      if (!response.ok) throw new Error("Failed to fetch technicians");
      return response.json();
    },
  });

  const repairTechnicians = (techniciansData?.technicians || []).filter(
    (tech: any) => tech.role === "repair" && tech.active
  );

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
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create repair request", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      propertyId: "",
      propertyName: "",
      address: "",
      jobType: "",
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: "08:00",
      assignedTechId: "",
      assignedTechName: "",
      title: "",
      officeNotes: "",
      photoAttachments: [],
    });
    setCustomJobType("");
    setIsUploading(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: PhotoAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file type
      if (!ACCEPTED_FILE_TYPES.includes(file.type.toLowerCase())) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported image format. Use JPG, PNG, or HEIC.`,
          variant: "destructive"
        });
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10 MB limit.`,
          variant: "destructive"
        });
        continue;
      }

      // Convert to base64
      try {
        const base64 = await fileToBase64(file);
        newAttachments.push({
          url: base64,
          caption: "",
          fileName: file.name,
        });
      } catch (error) {
        console.error("Error reading file:", error);
        toast({
          title: "Upload error",
          description: `Failed to read ${file.name}`,
          variant: "destructive"
        });
      }
    }

    if (newAttachments.length > 0) {
      setFormData(prev => ({
        ...prev,
        photoAttachments: [...prev.photoAttachments, ...newAttachments].slice(0, 10), // Max 10 photos
      }));
    }

    setIsUploading(false);
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photoAttachments: prev.photoAttachments.filter((_, i) => i !== index),
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.propertyId) {
      toast({ title: "Error", description: "Please select a property", variant: "destructive" });
      return false;
    }

    if (!formData.jobType) {
      toast({ title: "Error", description: "Please select a job type", variant: "destructive" });
      return false;
    }

    if (formData.jobType === "Other" && !customJobType.trim()) {
      toast({ title: "Error", description: "Please enter a custom job type", variant: "destructive" });
      return false;
    }

    if (!formData.scheduledDate) {
      toast({ title: "Error", description: "Please select a scheduled date", variant: "destructive" });
      return false;
    }

    return true;
  };

  const handleSubmit = (asDraft: boolean = false) => {
    if (!validateForm()) return;

    const finalJobType = formData.jobType === "Other" ? customJobType : formData.jobType;

    createMutation.mutate({
      propertyId: formData.propertyId,
      propertyName: formData.propertyName,
      address: formData.address || undefined,
      issueDescription: finalJobType,
      assignedDate: formData.assignedTechId ? formData.scheduledDate : undefined,
      scheduledTime: formData.scheduledTime,
      assignedTechId: formData.assignedTechId || undefined,
      assignedTechName: formData.assignedTechName || undefined,
      officeNotes: formData.officeNotes || undefined,
      photos: formData.photoAttachments.map(p => p.url),
      status: asDraft ? "draft" : (formData.assignedTechId ? "assigned" : "pending"),
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
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      }
    }}>
      <DialogContent className="max-w-2xl h-[85vh] overflow-hidden flex flex-col p-0">
        <VisuallyHidden>
          <DialogTitle>Repair Request Form</DialogTitle>
          <DialogDescription>Create a new repair request for a property</DialogDescription>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold tracking-wide">REPAIR REQUEST</h2>
              <p className="text-sm text-slate-300">New Request</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            data-testid="button-close-rr-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Assign to Repair Technician - First field */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <UserCheck className="w-4 h-4 text-slate-500" />
                Assign to Repair Technician
                <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </Label>
              <Select
                value={formData.assignedTechId}
                onValueChange={(value) => {
                  const tech = repairTechnicians.find((t: any) => t.id.toString() === value);
                  setFormData(prev => ({
                    ...prev,
                    assignedTechId: value,
                    assignedTechName: tech ? `${tech.firstName} ${tech.lastName}` : "",
                  }));
                }}
              >
                <SelectTrigger className="w-full" data-testid="select-assigned-tech">
                  <SelectValue placeholder="Select technician..." />
                </SelectTrigger>
                <SelectContent>
                  {repairTechnicians.map((tech: any) => (
                    <SelectItem key={tech.id} value={tech.id.toString()}>
                      {tech.firstName} {tech.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.assignedTechName && (
                <p className="text-xs text-[#0ea5e9] mt-2 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Will be assigned to {formData.assignedTechName}
                </p>
              )}
            </div>

            {/* Office Notes Section */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                Office Notes
                <span className="text-xs font-normal text-amber-600 ml-1">(Internal use only)</span>
              </Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">Title (Optional)</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter a title for this request..."
                    className="bg-white"
                    data-testid="input-request-title"
                  />
                </div>
                <Textarea
                  value={formData.officeNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, officeNotes: e.target.value }))}
                  placeholder="Add office notes..."
                  rows={3}
                  className="resize-none bg-white"
                  data-testid="textarea-office-notes"
                />
              </div>
            </div>

            {/* Property Name and Address */}
            <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Property Name <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.propertyId}
                  onValueChange={(id) => {
                    const customer = customers.find((c: any) => c.id === id);
                    setFormData(prev => ({
                      ...prev,
                      propertyId: id,
                      propertyName: customer?.name || "",
                      address: customer?.address || prev.address,
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
              <div>
                <Label className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Property Address (Optional)
                </Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter address manually..."
                  data-testid="input-property-address"
                />
              </div>
            </div>

            {/* Job Type / Repair Type */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-slate-500" />
                Job Type / Repair Type <span className="text-red-500">*</span>
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

            {/* Scheduling */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-slate-500" />
                Scheduling <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Scheduled Date</Label>
                  <Input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="w-full"
                    data-testid="input-scheduled-date"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Scheduled Time</Label>
                  <Input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    className="w-full"
                    data-testid="input-scheduled-time"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {formatTime(formData.scheduledTime)}
                  </p>
                </div>
              </div>
            </div>

            {/* Attachments from Office */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
                <Camera className="w-4 h-4 text-slate-500" />
                Attachments from Office
              </Label>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".jpg,.jpeg,.png,.heic"
                multiple
                className="hidden"
                data-testid="input-file-photos"
              />
              
              <div className="flex items-center gap-2 mb-3">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || formData.photoAttachments.length >= 10}
                  className="bg-[#0077b6] text-white hover:bg-[#005f8f]"
                  data-testid="button-add-photos"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 mr-1" />
                      Add Photos
                    </>
                  )}
                </Button>
                <span className="text-xs text-slate-400">
                  Max 10 MB per photo ({formData.photoAttachments.length}/10 photos)
                </span>
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
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-remove-photo-${index}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs text-slate-500">Caption</Label>
                            {attachment.fileName && (
                              <span className="text-xs text-slate-400 truncate max-w-[150px]">
                                {attachment.fileName}
                              </span>
                            )}
                          </div>
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
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Draft"
            )}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
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
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
