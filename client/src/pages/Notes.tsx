import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  RefreshCw, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Wrench,
  Droplets,
  Flame,
  Gauge,
  Timer,
  Beaker,
  User,
  MapPin,
  Building,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Settings,
  Plus,
  History,
  ClipboardCheck,
  Calendar,
  AlertCircle,
  Pause,
  Download,
  Edit,
  Save,
  X
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { 
  PM_SERVICE_REASONS, 
  PM_EQUIPMENT_TYPES,
  PM_EQUIPMENT_APPLICATIONS,
  PM_EQUIPMENT_BRANDS,
  PM_EQUIPMENT_MODELS,
  type EquipmentPmSchedule, 
  type PmServiceType, 
  type PmServiceRecord, 
  type PmIntervalSetting 
} from "@shared/schema";

interface PoolEquipment {
  category: string;
  type: string;
  notes: string | null;
}

interface Pool {
  id: string;
  name: string;
  type: string;
  address: string | null;
  waterType: string | null;
  serviceLevel: string | null;
  equipment: PoolEquipment[];
  notes: string | null;
}

interface Customer {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  email: string | null;
  phone: string | null;
  pools: Pool[];
}

const EQUIPMENT_ICONS: Record<string, React.ReactNode> = {
  filter: <Wrench className="h-4 w-4" />,
  pump: <Droplets className="h-4 w-4" />,
  heater: <Flame className="h-4 w-4" />,
  controller: <Gauge className="h-4 w-4" />,
  chlorinator: <Beaker className="h-4 w-4" />,
  cleaner: <Wrench className="h-4 w-4" />,
  timer: <Timer className="h-4 w-4" />,
};

const EQUIPMENT_COLORS: Record<string, string> = {
  filter: "bg-blue-100 text-blue-700 border-blue-200",
  pump: "bg-cyan-100 text-cyan-700 border-cyan-200",
  heater: "bg-orange-100 text-orange-700 border-orange-200",
  controller: "bg-purple-100 text-purple-700 border-purple-200",
  chlorinator: "bg-green-100 text-green-700 border-green-200",
  cleaner: "bg-slate-100 text-slate-700 border-slate-200",
  timer: "bg-amber-100 text-amber-700 border-amber-200",
};

const PM_STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  critical: { icon: <AlertCircle className="h-3.5 w-3.5" />, color: "bg-red-100 text-red-700 border-red-300", label: "Critical" },
  overdue: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "bg-orange-100 text-orange-700 border-orange-300", label: "Overdue" },
  due_soon: { icon: <Clock className="h-3.5 w-3.5" />, color: "bg-amber-100 text-amber-700 border-amber-300", label: "Due Soon" },
  current: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "bg-green-100 text-green-700 border-green-300", label: "Current" },
  paused: { icon: <Pause className="h-3.5 w-3.5" />, color: "bg-slate-100 text-slate-700 border-slate-300", label: "Paused" },
};

function PmStatusBadge({ status, count }: { status: string; count?: number }) {
  const config = PM_STATUS_CONFIG[status] || PM_STATUS_CONFIG.current;
  return (
    <Badge className={`${config.color} gap-1`}>
      {config.icon}
      <span>{config.label}</span>
      {count !== undefined && <span className="font-bold">({count})</span>}
    </Badge>
  );
}

function PmScheduleCard({ 
  schedule, 
  serviceTypes,
  intervalSetting,
  isEditing,
  onRecordService, 
  onViewHistory,
  onEditInterval,
  onSaveInterval,
  onCancelEdit,
  intervalForm,
  setIntervalForm
}: { 
  schedule: EquipmentPmSchedule; 
  serviceTypes: PmServiceType[];
  intervalSetting?: PmIntervalSetting;
  isEditing: boolean;
  onRecordService: (schedule: EquipmentPmSchedule) => void;
  onViewHistory: (schedule: EquipmentPmSchedule) => void;
  onEditInterval: (scheduleId: string) => void;
  onSaveInterval: () => void;
  onCancelEdit: () => void;
  intervalForm: { recommended: number; minimum: number; maximum: number; warning: number };
  setIntervalForm: (form: { recommended: number; minimum: number; maximum: number; warning: number }) => void;
}) {
  const serviceType = serviceTypes.find(t => t.id === schedule.pmServiceTypeId);
  const dueDate = new Date(schedule.nextDueDate);
  const isOverdue = schedule.status === 'overdue' || schedule.status === 'critical';
  
  return (
    <div className={`bg-white rounded-lg border p-3 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-slate-800">{serviceType?.name || 'Unknown Service'}</span>
            <PmStatusBadge status={schedule.status} />
          </div>
          <p className="text-sm text-slate-600">{schedule.equipmentName} ({schedule.equipmentType})</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due: {dueDate.toLocaleDateString()}</span>
            </div>
            {schedule.lastServiceDate && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Last: {new Date(schedule.lastServiceDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          {/* Interval Settings Section - always show with defaults if no interval */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            {isEditing ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500">Recommended (mo)</Label>
                    <Input
                      type="number"
                      value={intervalForm.recommended}
                      onChange={(e) => setIntervalForm({ ...intervalForm, recommended: parseInt(e.target.value) || 0 })}
                      className="h-8 text-sm"
                      data-testid="input-interval-recommended"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Minimum (mo)</Label>
                    <Input
                      type="number"
                      value={intervalForm.minimum}
                      onChange={(e) => setIntervalForm({ ...intervalForm, minimum: parseInt(e.target.value) || 0 })}
                      className="h-8 text-sm"
                      data-testid="input-interval-minimum"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Maximum (mo)</Label>
                    <Input
                      type="number"
                      value={intervalForm.maximum}
                      onChange={(e) => setIntervalForm({ ...intervalForm, maximum: parseInt(e.target.value) || 0 })}
                      className="h-8 text-sm"
                      data-testid="input-interval-maximum"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Warning (days)</Label>
                    <Input
                      type="number"
                      value={intervalForm.warning}
                      onChange={(e) => setIntervalForm({ ...intervalForm, warning: parseInt(e.target.value) || 0 })}
                      className="h-8 text-sm"
                      data-testid="input-interval-warning"
                    />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={onSaveInterval} className="h-7" data-testid="button-save-interval">
                    <Save className="h-3 w-3 mr-1" />Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onCancelEdit} className="h-7" data-testid="button-cancel-interval">
                    <X className="h-3 w-3 mr-1" />Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>
                    <span className="font-medium">Recommended:</span> {intervalSetting?.recommendedIntervalMonths || 12}mo
                  </span>
                  <span>
                    <span className="font-medium">Min:</span> {intervalSetting?.minimumIntervalMonths || 9}mo
                  </span>
                  <span>
                    <span className="font-medium">Max:</span> {intervalSetting?.maximumIntervalMonths || 24}mo
                  </span>
                  <span>
                    <span className="font-medium">Warning:</span> {intervalSetting?.warningThresholdDays || 30} days
                  </span>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 px-2"
                  onClick={() => onEditInterval(schedule.id)}
                  data-testid={`button-edit-interval-${schedule.id}`}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onViewHistory(schedule)}
            data-testid={`button-pm-history-${schedule.id}`}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button 
            variant={isOverdue ? "destructive" : "default"}
            size="sm" 
            onClick={() => onRecordService(schedule)}
            data-testid={`button-pm-record-${schedule.id}`}
          >
            <ClipboardCheck className="h-4 w-4 mr-1" />
            Record
          </Button>
        </div>
      </div>
    </div>
  );
}

function EquipmentBadge({ equipment }: { equipment: PoolEquipment }) {
  const icon = EQUIPMENT_ICONS[equipment.category] || <Wrench className="h-4 w-4" />;
  const colorClass = EQUIPMENT_COLORS[equipment.category] || "bg-gray-100 text-gray-700 border-gray-200";
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm ${colorClass}`}>
      {icon}
      <span className="font-medium capitalize">{equipment.category}:</span>
      <span>{equipment.type}</span>
    </div>
  );
}

function CustomerCard({ 
  customer, 
  isExpanded, 
  onToggle,
  pmSchedules = [],
  pmStatus,
  serviceTypes = [],
  intervalSettings = [],
  onRecordService,
  onViewHistory,
  onAddEquipment,
  editingInterval,
  intervalForm,
  onEditInterval,
  onSaveInterval,
  onCancelEdit,
  setIntervalForm,
  getIntervalForSchedule
}: { 
  customer: Customer; 
  isExpanded: boolean;
  onToggle: () => void;
  pmSchedules?: EquipmentPmSchedule[];
  pmStatus?: { status: string; count: number } | null;
  serviceTypes?: PmServiceType[];
  intervalSettings?: PmIntervalSetting[];
  onRecordService?: (schedule: EquipmentPmSchedule) => void;
  onViewHistory?: (schedule: EquipmentPmSchedule) => void;
  onAddEquipment?: (poolId: string, poolName: string) => void;
  editingInterval?: string | null;
  intervalForm?: { recommended: number; minimum: number; maximum: number; warning: number };
  onEditInterval?: (scheduleId: string) => void;
  onSaveInterval?: () => void;
  onCancelEdit?: () => void;
  setIntervalForm?: (form: { recommended: number; minimum: number; maximum: number; warning: number }) => void;
  getIntervalForSchedule?: (schedule: EquipmentPmSchedule) => PmIntervalSetting | undefined;
}) {
  const totalEquipment = customer.pools.reduce((sum, pool) => sum + pool.equipment.length, 0);
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="border-l-4 border-l-blue-500">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base font-semibold">{customer.name}</CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {customer.pools.length} pool{customer.pools.length !== 1 ? 's' : ''}
                </Badge>
                {totalEquipment > 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {totalEquipment} equipment
                  </Badge>
                )}
                {pmStatus && <PmStatusBadge status={pmStatus.status} count={pmStatus.count} />}
              </div>
            </div>
            {customer.address && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 ml-8 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {customer.address}
                  {customer.city && `, ${customer.city}`}
                  {customer.state && `, ${customer.state}`}
                  {customer.zip && ` ${customer.zip}`}
                </span>
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="space-y-4">
              {customer.pools.map((pool) => (
                <div key={pool.id} className="bg-slate-50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-slate-800">{pool.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {pool.type}
                      </Badge>
                    </div>
                    {pool.waterType && (
                      <span className="text-xs text-slate-500">{pool.waterType}</span>
                    )}
                  </div>
                  
                  {pool.address && (
                    <p className="text-sm text-slate-500 mb-3">{pool.address}</p>
                  )}
                  
                  {pool.equipment.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Equipment</p>
                      <div className="flex flex-wrap gap-2">
                        {pool.equipment.map((equip, idx) => (
                          <EquipmentBadge key={idx} equipment={equip} />
                        ))}
                      </div>
                      
                      {pool.equipment.some(e => e.notes) && (
                        <div className="mt-3 space-y-1">
                          {pool.equipment.filter(e => e.notes).map((equip, idx) => (
                            <div key={idx} className="text-sm text-slate-600 bg-white p-2 rounded border">
                              <span className="font-medium capitalize">{equip.category} Notes:</span>{' '}
                              {equip.notes}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No equipment recorded</p>
                  )}
                  
                  {pool.notes && (
                    <div className="mt-3 text-sm text-slate-600 bg-white p-2 rounded border">
                      <span className="font-medium">Pool Notes:</span> {pool.notes}
                    </div>
                  )}
                </div>
              ))}
              
              {/* PM Schedules Section */}
              {pmSchedules && pmSchedules.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Preventative Maintenance
                      </span>
                    </div>
                    {customer.pools.length > 0 && onAddEquipment && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onAddEquipment(customer.pools[0].id, customer.pools[0].name)}
                        data-testid={`button-add-equipment-${customer.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Equipment
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {pmSchedules.map((schedule) => (
                      <PmScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        serviceTypes={serviceTypes}
                        intervalSetting={getIntervalForSchedule ? getIntervalForSchedule(schedule) : undefined}
                        isEditing={editingInterval === schedule.id}
                        onRecordService={onRecordService || (() => {})}
                        onViewHistory={onViewHistory || (() => {})}
                        onEditInterval={onEditInterval || (() => {})}
                        onSaveInterval={onSaveInterval || (() => {})}
                        onCancelEdit={onCancelEdit || (() => {})}
                        intervalForm={intervalForm || { recommended: 12, minimum: 9, maximum: 24, warning: 30 }}
                        setIntervalForm={setIntervalForm || (() => {})}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add Equipment Button when no PM schedules exist */}
              {(!pmSchedules || pmSchedules.length === 0) && customer.pools.length > 0 && onAddEquipment && (
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    onClick={() => onAddEquipment(customer.pools[0].id, customer.pools[0].name)}
                    data-testid={`button-add-equipment-empty-${customer.id}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Equipment with PM Schedule
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function Notes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [recordServiceSchedule, setRecordServiceSchedule] = useState<EquipmentPmSchedule | null>(null);
  const [historySchedule, setHistorySchedule] = useState<EquipmentPmSchedule | null>(null);
  const [addPmCustomerId, setAddPmCustomerId] = useState<string | null>(null);
  const [addEquipmentModal, setAddEquipmentModal] = useState<{ customerId: string; poolId: string; poolName: string } | null>(null);
  const [editingInterval, setEditingInterval] = useState<string | null>(null);
  const [intervalForm, setIntervalForm] = useState({ recommended: 12, minimum: 9, maximum: 24, warning: 30 });
  const [newEquipment, setNewEquipment] = useState({ 
    category: "", 
    application: "", 
    brand: "", 
    model: "", 
    customBrand: "",
    customModel: "",
    notes: "" 
  });
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Service record form state
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceReason, setServiceReason] = useState<string>("");
  const [workNotes, setWorkNotes] = useState("");
  const [conditionRating, setConditionRating] = useState<string>("good");

  const { data, isLoading, refetch, isFetching } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/poolbrain/customers-equipment"],
    queryFn: async () => {
      const res = await fetch("/api/poolbrain/customers-equipment");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch data");
      }
      return res.json();
    },
  });

  // PM Stats
  const { data: pmStats } = useQuery<{ overdue: number; dueSoon: number; current: number; paused: number }>({
    queryKey: ["/api/pm/stats"],
    queryFn: async () => {
      const res = await fetch("/api/pm/stats");
      if (!res.ok) return { overdue: 0, dueSoon: 0, current: 0, paused: 0 };
      return res.json();
    },
  });

  // PM Service Types
  const { data: serviceTypes = [] } = useQuery<PmServiceType[]>({
    queryKey: ["/api/pm/service-types"],
    queryFn: async () => {
      const res = await fetch("/api/pm/service-types");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Seed PM defaults on first load
  const seedPm = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/pm/seed", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/service-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/stats"] });
    },
  });

  // All PM Schedules
  const { data: allPmSchedules = [] } = useQuery<EquipmentPmSchedule[]>({
    queryKey: ["/api/pm/schedules"],
    queryFn: async () => {
      const res = await fetch("/api/pm/schedules");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // PM Interval Settings
  const { data: intervalSettings = [] } = useQuery<PmIntervalSetting[]>({
    queryKey: ["/api/pm/interval-settings"],
    queryFn: async () => {
      const res = await fetch("/api/pm/interval-settings");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get interval settings for a schedule with fallback
  const getIntervalForSchedule = (schedule: EquipmentPmSchedule) => {
    // First try exact match
    let interval = intervalSettings.find(
      s => s.pmServiceTypeId === schedule.pmServiceTypeId && 
           s.waterType === schedule.waterType
    );
    
    // Fallback to 'all' water type
    if (!interval) {
      interval = intervalSettings.find(
        s => s.pmServiceTypeId === schedule.pmServiceTypeId && 
             s.waterType === 'all'
      );
    }
    
    // Fallback to any interval for this service type
    if (!interval) {
      interval = intervalSettings.find(
        s => s.pmServiceTypeId === schedule.pmServiceTypeId
      );
    }
    
    return interval;
  };

  // Update interval setting mutation
  const updateIntervalMutation = useMutation({
    mutationFn: async (data: { id: string; recommendedIntervalMonths: number; minimumIntervalMonths: number; maximumIntervalMonths: number; warningThresholdDays: number }) => {
      const res = await fetch(`/api/pm/interval-settings/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/interval-settings"] });
      setEditingInterval(null);
    },
  });

  // Add equipment with PM schedule mutation
  const addEquipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/pm/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/stats"] });
      setAddEquipmentModal(null);
      resetEquipmentForm();
    },
  });

  // PM Service History for selected schedule
  const { data: serviceHistory = [] } = useQuery<PmServiceRecord[]>({
    queryKey: ["/api/pm/records", historySchedule?.id],
    enabled: !!historySchedule,
    queryFn: async () => {
      if (!historySchedule) return [];
      const res = await fetch(`/api/pm/records?scheduleId=${historySchedule.id}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Group PM schedules by customer/property for display
  const getPmSchedulesForCustomer = (customerId: string) => {
    return allPmSchedules.filter(s => s.propertyId === customerId);
  };

  const getCustomerPmStatus = (customerId: string) => {
    const schedules = getPmSchedulesForCustomer(customerId);
    if (schedules.length === 0) return null;
    
    const overdue = schedules.filter(s => s.status === 'overdue' || s.status === 'critical').length;
    const dueSoon = schedules.filter(s => s.status === 'due_soon').length;
    
    if (overdue > 0) return { status: 'overdue', count: overdue };
    if (dueSoon > 0) return { status: 'due_soon', count: dueSoon };
    return { status: 'current', count: schedules.length };
  };

  // Create interval setting mutation
  const createIntervalMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/pm/interval-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/interval-settings"] });
      setEditingInterval(null);
    },
  });

  // Handle editing interval settings
  const handleEditInterval = (scheduleId: string) => {
    const schedule = allPmSchedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    const interval = getIntervalForSchedule(schedule);
    // Use existing values or defaults
    setIntervalForm({
      recommended: interval?.recommendedIntervalMonths || 12,
      minimum: interval?.minimumIntervalMonths || 9,
      maximum: interval?.maximumIntervalMonths || 24,
      warning: interval?.warningThresholdDays || 30,
    });
    setEditingInterval(scheduleId);
  };

  // Handle saving interval settings
  const handleSaveInterval = () => {
    if (!editingInterval) return;
    
    const schedule = allPmSchedules.find(s => s.id === editingInterval);
    if (!schedule) return;
    
    const interval = getIntervalForSchedule(schedule);
    if (interval) {
      // Update existing interval
      updateIntervalMutation.mutate({
        id: interval.id,
        recommendedIntervalMonths: intervalForm.recommended,
        minimumIntervalMonths: intervalForm.minimum,
        maximumIntervalMonths: intervalForm.maximum,
        warningThresholdDays: intervalForm.warning,
      });
    } else {
      // Create new interval setting
      createIntervalMutation.mutate({
        pmServiceTypeId: schedule.pmServiceTypeId,
        waterType: schedule.waterType || "pool",
        recommendedIntervalMonths: intervalForm.recommended,
        minimumIntervalMonths: intervalForm.minimum,
        maximumIntervalMonths: intervalForm.maximum,
        warningThresholdDays: intervalForm.warning,
        industryStandard: null,
        notes: null,
        isActive: true,
      });
    }
  };

  // Handle adding new equipment with PM schedule
  const handleAddEquipment = () => {
    if (!addEquipmentModal || !newEquipment.category || !newEquipment.application) return;
    
    // Get brand and model (use custom values if "Other" selected)
    const brand = newEquipment.brand === "Other" ? newEquipment.customBrand : newEquipment.brand;
    const model = newEquipment.model === "Other" ? newEquipment.customModel : newEquipment.model;
    
    if (!brand || !model) return;
    
    // Get first service type for this equipment category
    const matchingServiceType = serviceTypes.find(st => 
      st.category.toLowerCase() === newEquipment.category.toLowerCase()
    ) || serviceTypes[0];
    
    if (!matchingServiceType) return;

    // Calculate next due date (use recommended interval)
    const interval = intervalSettings.find(
      s => s.pmServiceTypeId === matchingServiceType.id
    );
    const months = interval?.recommendedIntervalMonths || 12;
    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + months);

    // Determine water type from application
    const waterType = newEquipment.application.toLowerCase() === "spa" ? "spa" : "pool";

    addEquipmentMutation.mutate({
      equipmentId: `manual-${Date.now()}`,
      equipmentName: `${brand} ${model}`,
      equipmentType: newEquipment.category,
      propertyId: addEquipmentModal.customerId,
      propertyName: addEquipmentModal.poolName,
      bodyOfWaterId: addEquipmentModal.poolId,
      waterType,
      pmServiceTypeId: matchingServiceType.id,
      nextDueDate: nextDue.toISOString().split('T')[0],
      status: "current",
    });
  };
  
  // Reset new equipment form
  const resetEquipmentForm = () => {
    setNewEquipment({ 
      category: "", 
      application: "", 
      brand: "", 
      model: "", 
      customBrand: "",
      customModel: "",
      notes: "" 
    });
  };
  
  // Get brands for selected category
  const getEquipmentBrands = () => {
    const categoryKey = newEquipment.category.toLowerCase();
    return PM_EQUIPMENT_BRANDS[categoryKey] || PM_EQUIPMENT_BRANDS["other"] || ["Other"];
  };
  
  // Get models for selected category
  const getEquipmentModels = () => {
    const categoryKey = newEquipment.category.toLowerCase();
    return PM_EQUIPMENT_MODELS[categoryKey] || PM_EQUIPMENT_MODELS["other"] || ["Other"];
  };

  // Record service mutation
  const recordServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/pm/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/schedules"] });
      setRecordServiceSchedule(null);
      setServiceReason("");
      setWorkNotes("");
    },
  });

  const handleRecordService = () => {
    if (!recordServiceSchedule || !serviceReason) return;
    
    const schedule = recordServiceSchedule;
    const serviceDateObj = new Date(serviceDate);
    const nextDue = new Date(schedule.nextDueDate);
    const wasEarly = serviceDateObj < nextDue;
    const lastService = schedule.lastServiceDate ? new Date(schedule.lastServiceDate) : null;
    const daysSinceLast = lastService 
      ? Math.floor((serviceDateObj.getTime() - lastService.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    recordServiceMutation.mutate({
      equipmentPmScheduleId: schedule.id,
      equipmentId: schedule.equipmentId,
      equipmentName: schedule.equipmentName,
      propertyId: schedule.propertyId,
      propertyName: schedule.propertyName,
      bodyOfWaterId: schedule.bodyOfWaterId,
      pmServiceTypeId: schedule.pmServiceTypeId,
      serviceDate,
      serviceReason,
      workNotes,
      conditionRating,
      daysSinceLastService: daysSinceLast,
      wasEarlyService: wasEarly,
    });
  };

  const customers = data?.customers || [];
  
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (customer.name.toLowerCase().includes(query)) return true;
    if (customer.address?.toLowerCase().includes(query)) return true;
    
    for (const pool of customer.pools) {
      if (pool.name.toLowerCase().includes(query)) return true;
      if (pool.notes?.toLowerCase().includes(query)) return true;
      for (const equip of pool.equipment) {
        if (equip.type.toLowerCase().includes(query)) return true;
        if (equip.category.toLowerCase().includes(query)) return true;
        if (equip.notes?.toLowerCase().includes(query)) return true;
      }
    }
    
    return false;
  });

  const toggleCustomer = (id: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCustomers(new Set(filteredCustomers.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedCustomers(new Set());
  };

  const totalEquipment = customers.reduce(
    (sum, c) => sum + c.pools.reduce((pSum, p) => pSum + p.equipment.length, 0),
    0
  );

  const exportToExcel = () => {
    const equipmentRows: Array<{
      Customer: string;
      Address: string;
      Pool: string;
      "Pool Type": string;
      "Water Type": string;
      Category: string;
      Type: string;
      Notes: string;
    }> = [];

    const pmRows: Array<{
      Customer: string;
      Pool: string;
      "Service Type": string;
      "Status": string;
      "Last Service": string;
      "Next Due": string;
      "Interval (Months)": number;
    }> = [];

    for (const customer of customers) {
      const customerAddress = [customer.address, customer.city, customer.state, customer.zip]
        .filter(Boolean)
        .join(", ");
      
      for (const pool of customer.pools) {
        for (const equip of pool.equipment) {
          equipmentRows.push({
            Customer: customer.name,
            Address: customerAddress,
            Pool: pool.name,
            "Pool Type": pool.type || "",
            "Water Type": pool.waterType || "",
            Category: equip.category,
            Type: equip.type,
            Notes: equip.notes || "",
          });
        }
      }

      const customerSchedules = getPmSchedulesForCustomer(customer.id);
      for (const schedule of customerSchedules) {
        const serviceType = serviceTypes.find(st => st.id === schedule.pmServiceTypeId);
        const statusLabel = schedule.status === "paused" ? "Paused" : 
          (schedule.duePriority || 0) < -30 ? "Critical" :
          (schedule.duePriority || 0) < 0 ? "Overdue" :
          (schedule.duePriority || 0) <= 30 ? "Due Soon" : "Current";
        
        const intervalMonths = schedule.customIntervalMonths || 0;
        
        pmRows.push({
          Customer: customer.name,
          Pool: customer.pools.find(p => p.id === schedule.bodyOfWaterId)?.name || schedule.propertyName,
          "Service Type": serviceType?.name || "Unknown",
          "Status": statusLabel,
          "Last Service": schedule.lastServiceDate ? new Date(schedule.lastServiceDate).toLocaleDateString() : "Never",
          "Next Due": schedule.nextDueDate ? new Date(schedule.nextDueDate).toLocaleDateString() : "Not set",
          "Interval (Months)": intervalMonths,
        });
      }
    }

    const wb = XLSX.utils.book_new();
    
    const equipmentWs = XLSX.utils.json_to_sheet(equipmentRows);
    equipmentWs["!cols"] = [
      { wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, 
      { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 50 }
    ];
    XLSX.utils.book_append_sheet(wb, equipmentWs, "Equipment");

    if (pmRows.length > 0) {
      const pmWs = XLSX.utils.json_to_sheet(pmRows);
      pmWs["!cols"] = [
        { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, pmWs, "PM Schedules");
    }

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    saveAs(blob, `Equipment_Notes_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <AppLayout>
      <div data-testid="notes-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Equipment Notes</h1>
            <p className="text-slate-500 mt-1">
              All customer equipment from Pool Brain
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={exportToExcel} 
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={() => refetch()} 
              disabled={isFetching}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Syncing...' : 'Sync from Pool Brain'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700">{customers.length}</p>
                  <p className="text-sm text-blue-600">Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500 rounded-lg">
                  <Droplets className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-700">
                    {customers.reduce((sum, c) => sum + c.pools.length, 0)}
                  </p>
                  <p className="text-sm text-cyan-600">Pools</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{totalEquipment}</p>
                  <p className="text-sm text-green-600">Equipment Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PM Stats Row */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-slate-600" />
                <span className="font-semibold text-slate-700">Preventative Maintenance</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 border border-red-200 cursor-pointer hover:bg-red-200 transition-colors"
                    onClick={() => {/* TODO: Filter by overdue */}}
                    data-testid="pm-stat-overdue"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Overdue</span>
                    <span className="text-lg font-bold text-red-700">{pmStats?.overdue || 0}</span>
                  </div>
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 border border-amber-200 cursor-pointer hover:bg-amber-200 transition-colors"
                    onClick={() => {/* TODO: Filter by due soon */}}
                    data-testid="pm-stat-due-soon"
                  >
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">Due Soon</span>
                    <span className="text-lg font-bold text-amber-700">{pmStats?.dueSoon || 0}</span>
                  </div>
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 border border-green-200 cursor-pointer hover:bg-green-200 transition-colors"
                    onClick={() => {/* TODO: Filter by current */}}
                    data-testid="pm-stat-current"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Current</span>
                    <span className="text-lg font-bold text-green-700">{pmStats?.current || 0}</span>
                  </div>
                </div>
                {serviceTypes.length === 0 && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => seedPm.mutate()}
                    disabled={seedPm.isPending}
                    data-testid="button-pm-seed"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Initialize PM
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customers, pools, equipment, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
              Collapse All
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-360px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3 text-slate-500">Loading customers from Pool Brain...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customers match your search</p>
                </>
              ) : (
                <>
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customers with pools found</p>
                  <Button 
                    variant="link" 
                    onClick={() => refetch()}
                    className="mt-2"
                  >
                    Sync from Pool Brain
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  isExpanded={expandedCustomers.has(customer.id)}
                  onToggle={() => toggleCustomer(customer.id)}
                  pmSchedules={getPmSchedulesForCustomer(customer.id)}
                  pmStatus={getCustomerPmStatus(customer.id)}
                  serviceTypes={serviceTypes}
                  intervalSettings={intervalSettings}
                  onRecordService={setRecordServiceSchedule}
                  onViewHistory={setHistorySchedule}
                  onAddEquipment={(poolId, poolName) => setAddEquipmentModal({ customerId: customer.id, poolId, poolName })}
                  editingInterval={editingInterval}
                  intervalForm={intervalForm}
                  onEditInterval={handleEditInterval}
                  onSaveInterval={handleSaveInterval}
                  onCancelEdit={() => setEditingInterval(null)}
                  setIntervalForm={setIntervalForm}
                  getIntervalForSchedule={getIntervalForSchedule}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Record Service Modal */}
        <Dialog open={!!recordServiceSchedule} onOpenChange={() => setRecordServiceSchedule(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
                Record PM Service
              </DialogTitle>
            </DialogHeader>
            {recordServiceSchedule && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="font-medium text-slate-800">{recordServiceSchedule.equipmentName}</p>
                  <p className="text-sm text-slate-600">{recordServiceSchedule.propertyName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <PmStatusBadge status={recordServiceSchedule.status} />
                    <span className="text-xs text-slate-500">
                      Due: {new Date(recordServiceSchedule.nextDueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Early Service Warning */}
                {new Date(serviceDate) < new Date(recordServiceSchedule.nextDueDate) && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-700">Early Service</p>
                      <p className="text-xs text-amber-600">
                        This service is being recorded before the due date. Please provide a reason.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="service-date">Service Date</Label>
                    <Input
                      id="service-date"
                      type="date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      data-testid="input-service-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="service-reason">Reason for Service *</Label>
                    <Select value={serviceReason} onValueChange={setServiceReason}>
                      <SelectTrigger data-testid="select-service-reason">
                        <SelectValue placeholder="Select a reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PM_SERVICE_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="condition-rating">Equipment Condition</Label>
                    <Select value={conditionRating} onValueChange={setConditionRating}>
                      <SelectTrigger data-testid="select-condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="needs_replacement">Needs Replacement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="work-notes">Work Notes</Label>
                    <Textarea
                      id="work-notes"
                      placeholder="Describe the work performed..."
                      value={workNotes}
                      onChange={(e) => setWorkNotes(e.target.value)}
                      data-testid="input-work-notes"
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRecordServiceSchedule(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRecordService} 
                disabled={!serviceReason || recordServiceMutation.isPending}
                data-testid="button-save-service"
              >
                {recordServiceMutation.isPending ? 'Saving...' : 'Save Service Record'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Service History Modal */}
        <Dialog open={!!historySchedule} onOpenChange={() => setHistorySchedule(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Service History
              </DialogTitle>
            </DialogHeader>
            {historySchedule && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="font-medium text-slate-800">{historySchedule.equipmentName}</p>
                  <p className="text-sm text-slate-600">{historySchedule.propertyName}</p>
                </div>

                <ScrollArea className="h-64">
                  {serviceHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No service records yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {serviceHistory.map((record) => (
                        <div key={record.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-800">
                              {new Date(record.serviceDate).toLocaleDateString()}
                            </span>
                            {record.wasEarlyService && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                Early Service
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{record.serviceReason}</p>
                          {record.workNotes && (
                            <p className="text-sm text-slate-500 mt-1 italic">"{record.workNotes}"</p>
                          )}
                          {record.conditionRating && (
                            <Badge variant="secondary" className="mt-2 capitalize">
                              Condition: {record.conditionRating.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setHistorySchedule(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Equipment Modal */}
        <Dialog open={!!addEquipmentModal} onOpenChange={(open) => {
          if (!open) {
            setAddEquipmentModal(null);
            resetEquipmentForm();
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Add New Equipment
              </DialogTitle>
            </DialogHeader>
            {addEquipmentModal && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600">Adding equipment to:</p>
                  <p className="font-semibold text-blue-800">{addEquipmentModal.poolName}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Equipment Type */}
                  <div>
                    <Label className="text-xs text-slate-600">Type *</Label>
                    <Select
                      value={newEquipment.category}
                      onValueChange={(value) => setNewEquipment({ 
                        ...newEquipment, 
                        category: value,
                        brand: "",
                        model: "",
                        customBrand: "",
                        customModel: ""
                      })}
                    >
                      <SelectTrigger data-testid="select-equipment-type">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PM_EQUIPMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Application */}
                  <div>
                    <Label className="text-xs text-slate-600">Application *</Label>
                    <Select
                      value={newEquipment.application}
                      onValueChange={(value) => setNewEquipment({ ...newEquipment, application: value })}
                    >
                      <SelectTrigger data-testid="select-equipment-application">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PM_EQUIPMENT_APPLICATIONS.map((app) => (
                          <SelectItem key={app} value={app}>{app}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Brand */}
                  <div>
                    <Label className="text-xs text-slate-600">Brand *</Label>
                    {newEquipment.brand === "Other" ? (
                      <div className="flex gap-1">
                        <Input
                          placeholder="Type brand..."
                          value={newEquipment.customBrand}
                          onChange={(e) => setNewEquipment({ ...newEquipment, customBrand: e.target.value })}
                          data-testid="input-custom-brand"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setNewEquipment({ ...newEquipment, brand: "", customBrand: "" })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={newEquipment.brand}
                        onValueChange={(value) => setNewEquipment({ ...newEquipment, brand: value })}
                        disabled={!newEquipment.category}
                      >
                        <SelectTrigger data-testid="select-equipment-brand">
                          <SelectValue placeholder="Select brand..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getEquipmentBrands().map((brand) => (
                            <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Model */}
                  <div>
                    <Label className="text-xs text-slate-600">Model *</Label>
                    {newEquipment.model === "Other" ? (
                      <div className="flex gap-1">
                        <Input
                          placeholder="Type model..."
                          value={newEquipment.customModel}
                          onChange={(e) => setNewEquipment({ ...newEquipment, customModel: e.target.value })}
                          data-testid="input-custom-model"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setNewEquipment({ ...newEquipment, model: "", customModel: "" })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={newEquipment.model}
                        onValueChange={(value) => setNewEquipment({ ...newEquipment, model: value })}
                        disabled={!newEquipment.category}
                      >
                        <SelectTrigger data-testid="select-equipment-model">
                          <SelectValue placeholder="Select model..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getEquipmentModels().map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">Notes (Optional)</Label>
                  <Textarea
                    placeholder="Any additional notes about this equipment..."
                    value={newEquipment.notes}
                    onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })}
                    rows={2}
                    data-testid="input-equipment-notes"
                  />
                </div>

                {serviceTypes.length > 0 && newEquipment.category && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-sm">
                    <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      PM Schedule will be created
                    </div>
                    <p className="text-green-600 text-xs">
                      A preventative maintenance schedule will be automatically created for this {newEquipment.category.toLowerCase()} with recommended service intervals based on the application type.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setAddEquipmentModal(null);
                resetEquipmentForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddEquipment} 
                disabled={
                  !newEquipment.category || 
                  !newEquipment.application || 
                  (!newEquipment.brand && !newEquipment.customBrand) ||
                  (!newEquipment.model && !newEquipment.customModel) ||
                  (newEquipment.brand === "Other" && !newEquipment.customBrand) ||
                  (newEquipment.model === "Other" && !newEquipment.customModel) ||
                  addEquipmentMutation.isPending
                }
                data-testid="button-add-equipment-submit"
              >
                {addEquipmentMutation.isPending ? 'Adding...' : 'Add Equipment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
