import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Download, Loader2, Search, Plus, Users, Building2, User,
  MapPin, Phone, Mail, Filter, MoreVertical, X, ChevronLeft, ChevronRight,
  Droplets, DollarSign, FileText, Tag, Calendar, Clock, GripVertical,
  Camera, Thermometer, Waves, Fan, Zap, Check, Circle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Customer {
  id: string;
  externalId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string | null;
  poolCount: number | null;
  tags: string | null;
  notes: string | null;
}

interface Pool {
  id: string;
  externalId: string;
  name: string;
  poolType: string | null;
  serviceLevel: string | null;
  waterType: string | null;
  gallons: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  color?: string;
}

interface CustomerAddress {
  type: string;
  addressLine1: string;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
}

interface Task {
  id: string;
  name: string;
  category: string;
  isCompleted: boolean;
  icons?: string[];
  hiddenConditions?: { type: string; values: string[] }[];
}

interface Equipment {
  type: string;
  value: string;
}

const STATUS_BADGES: Record<string, { label: string; color: string; bgColor: string }> = {
  active_routed: { label: "Active (routed)", color: "text-white", bgColor: "bg-green-500" },
  active: { label: "Active (no route)", color: "text-white", bgColor: "bg-yellow-500" },
  inactive: { label: "Inactive", color: "text-white", bgColor: "bg-red-500" },
  lead: { label: "Lead", color: "text-white", bgColor: "bg-blue-500" },
};

const POOL_COLORS = ["#1e40af", "#059669", "#ea580c", "#7c3aed", "#0891b2", "#dc2626"];

const TASK_CATEGORIES = [
  { id: "whenArriving", label: "WHEN ARRIVING", color: "bg-slate-100" },
  { id: "beforePictures", label: "BEFORE PICTURES", color: "bg-blue-50" },
  { id: "chemicalReadings", label: "CHEMICAL READINGS", color: "bg-green-50" },
  { id: "chemicalDosing", label: "CHEMICAL DOSING", color: "bg-yellow-50" },
  { id: "inProgress", label: "JOB IN PROGRESS", color: "bg-white" },
];

const EQUIPMENT_TYPES = [
  { type: "filter", label: "Filter", icon: Filter, options: ["Sand Filter", "Cartridge", "DE Filter"] },
  { type: "pump", label: "Pump", icon: Fan, options: ["Single Speed", "Variable Speed", "Dual Speed"] },
  { type: "chlorinator", label: "Chlorinator", icon: Droplets, options: ["Salt Cell", "Tablet", "Liquid Feeder", "None"] },
  { type: "heater", label: "Heater", icon: Thermometer, options: ["Gas", "Electric", "Heat Pump", "Solar", "None"] },
];

const PREDEFINED_TASKS: Task[] = [
  { id: "t1", name: "Take equipment photo", category: "beforePictures", isCompleted: false, icons: ["camera"] },
  { id: "t2", name: "Take pool photo", category: "beforePictures", isCompleted: false, icons: ["camera"] },
  { id: "t3", name: "Test chlorine level", category: "chemicalReadings", isCompleted: false },
  { id: "t4", name: "Test pH level", category: "chemicalReadings", isCompleted: false },
  { id: "t5", name: "Test alkalinity", category: "chemicalReadings", isCompleted: false },
  { id: "t6", name: "Add chlorine", category: "chemicalDosing", isCompleted: false },
  { id: "t7", name: "Add acid", category: "chemicalDosing", isCompleted: false },
  { id: "t8", name: "Backwash", category: "inProgress", isCompleted: false, hiddenConditions: [{ type: "filter", values: ["Cartridge"] }] },
  { id: "t9", name: "Clean filter", category: "inProgress", isCompleted: false },
  { id: "t10", name: "Clean salt cell", category: "inProgress", isCompleted: false, hiddenConditions: [{ type: "chlorinator", values: ["Tablet", "Liquid Feeder", "None"] }] },
  { id: "t11", name: "Skim surface", category: "inProgress", isCompleted: false },
  { id: "t12", name: "Brush walls", category: "inProgress", isCompleted: false },
  { id: "t13", name: "Vacuum pool", category: "inProgress", isCompleted: false },
  { id: "t14", name: "Empty baskets", category: "inProgress", isCompleted: false },
  { id: "t15", name: "Check equipment", category: "inProgress", isCompleted: false },
];

function SortableTask({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-slate-50 ${task.isCompleted ? "bg-green-50 border-green-200" : ""}`}
      data-testid={`task-${task.id}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-slate-400" />
      </div>
      <Checkbox 
        checked={task.isCompleted} 
        onCheckedChange={() => onToggle(task.id)}
        className={task.isCompleted ? "bg-green-500 border-green-500" : ""}
        data-testid={`checkbox-task-${task.id}`}
      />
      <span className={`flex-1 ${task.isCompleted ? "text-green-700" : ""}`}>{task.name}</span>
      <div className="flex items-center gap-2">
        {task.icons?.includes("camera") && <Camera className="h-4 w-4 text-slate-400" />}
        {task.icons?.includes("calendar") && <Calendar className="h-4 w-4 text-slate-400" />}
        <ChevronRight className="h-4 w-4 text-green-500" />
      </div>
    </div>
  );
}

function isTaskHidden(task: Task, equipment: Equipment[]): boolean {
  return task.hiddenConditions?.some(condition => {
    const eq = equipment.find(e => e.type === condition.type);
    return eq && condition.values.includes(eq.value);
  }) || false;
}

function WorkflowSection({ 
  category, 
  tasks, 
  equipment, 
  onToggleTask 
}: { 
  category: typeof TASK_CATEGORIES[0]; 
  tasks: Task[]; 
  equipment: Equipment[];
  onToggleTask: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: category.id });
  
  const visibleTasks = tasks
    .filter(t => t.category === category.id)
    .filter(t => !isTaskHidden(t, equipment));
  
  return (
    <div 
      ref={setNodeRef}
      className={`rounded-lg p-3 ${category.color} border ${isOver ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
      data-testid={`workflow-section-${category.id}`}
    >
      <div className="text-center text-sm text-slate-500 font-medium mb-3">{category.label}</div>
      <SortableContext items={visibleTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {visibleTasks.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg py-6 text-center text-slate-400 text-sm">
            DRAG ITEMS HERE
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTasks.map(task => (
              <SortableTask key={task.id} task={task} onToggle={onToggleTask} />
            ))}
          </div>
        )}
      </SortableContext>
    </div>
  );
}

interface RouteScheduleConfig {
  active: boolean;
  frequencyType: "weekly" | "everyOtherWeek" | "customWeeks" | "multiDay";
  intervalWeeks: number;
  daysOfWeek: string[];
  endDate: string | null;
  notes: string;
  dayAssignments: Record<string, { technicianId: string; technicianName: string; routeName: string }>;
}

const DEFAULT_TECHNICIANS = [
  { id: "t1", name: "Kyle Pollock", initials: "KP" },
  { id: "t2", name: "Paul Martinez", initials: "PM" },
  { id: "t3", name: "John Smith", initials: "JS" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CustomerDetail({ 
  customer, 
  onClose 
}: { 
  customer: Customer; 
  onClose: () => void;
}) {
  const [leftTab, setLeftTab] = useState("profile");
  const [activePoolIndex, setActivePoolIndex] = useState(0);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddPool, setShowAddPool] = useState(false);
  const [showRouteSchedule, setShowRouteSchedule] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolType, setNewPoolType] = useState("pool");
  const [tasks, setTasks] = useState<Task[]>(PREDEFINED_TASKS.slice(0, 8).map((t, i) => ({ ...t, id: `task-${i}` })));
  const [equipment, setEquipment] = useState<Equipment[]>([
    { type: "filter", value: "Sand Filter" },
    { type: "pump", value: "Variable Speed" },
    { type: "chlorinator", value: "Salt Cell" },
    { type: "heater", value: "None" },
  ]);
  const [searchContacts, setSearchContacts] = useState("");
  const [searchAddresses, setSearchAddresses] = useState("");
  const [routeSchedule, setRouteSchedule] = useState<RouteScheduleConfig>({
    active: true,
    frequencyType: "weekly",
    intervalWeeks: 1,
    daysOfWeek: ["Mon", "Wed", "Fri"],
    endDate: null,
    notes: "",
    dayAssignments: {
      Mon: { technicianId: "t1", technicianName: "Kyle Pollock", routeName: "(Beaumont/North) Mon" },
      Tue: { technicianId: "t1", technicianName: "Kyle Pollock", routeName: "(Beaumont/North) Tue" },
      Wed: { technicianId: "t1", technicianName: "Kyle Pollock", routeName: "(Beaumont/North) Wed" },
      Thu: { technicianId: "t1", technicianName: "Kyle Pollock", routeName: "(Beaumont/North) Thu" },
      Fri: { technicianId: "t1", technicianName: "Kyle Pollock", routeName: "(Beaumont/North) Fri" },
      Sat: { technicianId: "t1", technicianName: "Kyle Pollock", routeName: "(Beaumont/North) Sat" },
      Sun: { technicianId: "t1", technicianName: "Kyle Pollock", routeName: "(Beaumont/North) Sun" },
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: detailData, isLoading } = useQuery({
    queryKey: ["customer-detail", customer.externalId],
    queryFn: async () => {
      if (!customer.externalId) return { pools: [], addresses: [], notes: "" };
      const response = await fetch(`/api/customers/${customer.externalId}/detail`);
      if (!response.ok) throw new Error("Failed to fetch details");
      return response.json();
    },
    enabled: !!customer.externalId,
  });

  const pools: Pool[] = useMemo(() => {
    const rawPools = detailData?.pools || [];
    return rawPools.map((p: Pool, idx: number) => ({
      ...p,
      color: POOL_COLORS[idx % POOL_COLORS.length],
    }));
  }, [detailData?.pools]);

  const addresses: CustomerAddress[] = detailData?.addresses || [];
  const notes: string = detailData?.notes || customer.notes || "";
  
  const contacts: Contact[] = useMemo(() => [
    { id: "c1", name: customer.name, email: customer.email || "", phone: customer.phone || "", type: "primary" },
  ], [customer]);

  const statusBadge = STATUS_BADGES[customer.status || "active"] || STATUS_BADGES.active;

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeTaskId = active.id as string;
    const overId = over.id as string;
    
    const categoryIds = TASK_CATEGORIES.map(c => c.id);
    const targetCategory = categoryIds.includes(overId) ? overId : null;
    
    if (!targetCategory) {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        const activeTask = tasks.find(t => t.id === activeTaskId);
        if (activeTask && activeTask.category !== overTask.category) {
          setTasks(prev => prev.map(t => 
            t.id === activeTaskId ? { ...t, category: overTask.category } : t
          ));
        }
      }
    } else {
      const activeTask = tasks.find(t => t.id === activeTaskId);
      if (activeTask && activeTask.category !== targetCategory) {
        setTasks(prev => prev.map(t => 
          t.id === activeTaskId ? { ...t, category: targetCategory } : t
        ));
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeTaskId = active.id as string;
    const overId = over.id as string;
    
    const categoryIds = TASK_CATEGORIES.map(c => c.id);
    
    if (categoryIds.includes(overId)) {
      setTasks(prev => prev.map(t => 
        t.id === activeTaskId ? { ...t, category: overId } : t
      ));
      return;
    }
    
    if (activeTaskId !== overId) {
      setTasks((items) => {
        const activeTask = items.find(t => t.id === activeTaskId);
        const overTask = items.find(t => t.id === overId);
        
        if (!activeTask || !overTask) return items;
        
        const updatedItems = items.map(t => 
          t.id === activeTaskId ? { ...t, category: overTask.category } : t
        );
        
        const oldIndex = updatedItems.findIndex((i) => i.id === activeTaskId);
        const newIndex = updatedItems.findIndex((i) => i.id === overId);
        return arrayMove(updatedItems, oldIndex, newIndex);
      });
    }
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const handleAddTask = (task: Task) => {
    setTasks(prev => [...prev, { ...task, id: `task-${Date.now()}`, isCompleted: false }]);
    setShowAddTask(false);
  };

  const handleEquipmentChange = (type: string, value: string) => {
    setEquipment(prev => prev.map(e => e.type === type ? { ...e, value } : e));
  };

  const handleAddPool = () => {
    if (!newPoolName.trim()) return;
    setShowAddPool(false);
    setNewPoolName("");
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchContacts.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchContacts.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" data-testid="customer-detail-view">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-back-to-list">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-blue-700">Customer</h1>
              <Badge className={`${statusBadge.bgColor} ${statusBadge.color}`} data-testid="badge-customer-status">
                {statusBadge.label}
              </Badge>
            </div>
            <h2 className="text-xl font-semibold text-slate-800" data-testid="text-customer-name">{customer.name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
            <Input 
              placeholder="customer, address, job #" 
              className="pl-10 w-64 bg-green-500 text-white placeholder:text-white/70 border-green-600"
              data-testid="input-search-global"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[380px] border-r bg-white flex flex-col">
          <Tabs value={leftTab} onValueChange={setLeftTab} className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4">
              <TabsList className="flex justify-start gap-1 bg-transparent">
                <TabsTrigger value="profile" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700" data-testid="tab-profile">
                  <User className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="addresses" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700" data-testid="tab-addresses">
                  <MapPin className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="contacts" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700" data-testid="tab-contacts">
                  <Users className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="billing" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700" data-testid="tab-billing">
                  <DollarSign className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="notes" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700" data-testid="tab-notes">
                  <FileText className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-green-600 border-green-600"
                onClick={() => setShowRouteSchedule(true)}
                data-testid="button-route-schedule"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Route
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <TabsContent value="profile" className="px-4 py-4 space-y-4" data-testid="panel-profile">
                <div>
                  <h3 className="font-semibold text-slate-800">{customer.name}</h3>
                  <p className="text-sm text-slate-600">
                    {customer.address && `${customer.address}`}
                    {customer.city && `, ${customer.city}`}
                    {customer.state && ` ${customer.state}`}
                    {customer.zip && ` ${customer.zip}`}
                  </p>
                  {addresses.length > 1 && (
                    <button className="text-sm text-green-600 underline cursor-pointer" onClick={() => setLeftTab("addresses")}>
                      {addresses.length - 1} more addresses
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{customer.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 uppercase">Customer</div>
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-blue-600">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{customer.phone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-2">Route Stop Email</p>
                  <Input 
                    defaultValue={customer.email || ""} 
                    placeholder="email@example.com" 
                    className="text-sm"
                    data-testid="input-route-email"
                  />
                </div>

                <div className="flex gap-4 py-4">
                  {EQUIPMENT_TYPES.slice(0, 3).map(eq => {
                    const Icon = eq.icon;
                    return (
                      <div key={eq.type} className="flex flex-col items-center cursor-pointer hover:opacity-75" data-testid={`equipment-icon-${eq.type}`}>
                        <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-slate-600" />
                        </div>
                        <span className="text-xs text-slate-500 mt-1">{eq.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">Tags</span>
                    <Button variant="link" size="sm" className="text-blue-600 p-0 h-auto" data-testid="button-add-tag">
                      Add
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-slate-100">Summer - 6 Days</Badge>
                    <Badge variant="outline" className="bg-slate-100">Winter - 5 Days</Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="addresses" className="px-4 py-4" data-testid="panel-addresses">
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex-1 mr-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search addresses" 
                      value={searchAddresses}
                      onChange={(e) => setSearchAddresses(e.target.value)}
                      className="pl-10" 
                      data-testid="input-search-addresses"
                    />
                  </div>
                  <Button variant="link" className="text-blue-600" data-testid="button-add-address">
                    <MapPin className="h-4 w-4 mr-1" />
                    + Add Address
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {addresses.length > 0 ? addresses.map((addr, idx) => (
                    <div key={idx} className="flex gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer" data-testid={`address-item-${idx}`}>
                      <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-800">{addr.addressLine1}</p>
                        <p className="text-sm text-slate-600">
                          {[addr.city, addr.state, addr.zip].filter(Boolean).join(" ")}
                        </p>
                        <Badge 
                          className={`mt-1 text-xs ${addr.type === "billing" ? "bg-orange-500" : "bg-green-500"} text-white`}
                        >
                          {addr.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <div className="flex gap-3 p-3 border rounded-lg" data-testid="address-item-primary">
                      <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-800">{customer.address || "No address"}</p>
                        <p className="text-sm text-slate-600">
                          {[customer.city, customer.state, customer.zip].filter(Boolean).join(" ")}
                        </p>
                        <Badge className="mt-1 text-xs bg-green-500 text-white">PRIMARY</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="contacts" className="px-4 py-4" data-testid="panel-contacts">
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex-1 mr-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search contacts" 
                      value={searchContacts}
                      onChange={(e) => setSearchContacts(e.target.value)}
                      className="pl-10" 
                      data-testid="input-search-contacts"
                    />
                  </div>
                  <Button variant="link" className="text-blue-600" data-testid="button-add-contact">
                    <User className="h-4 w-4 mr-1" />
                    + Add Contact
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {filteredContacts.map((contact) => (
                    <div key={contact.id} className="flex gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer" data-testid={`contact-item-${contact.id}`}>
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{contact.name}</p>
                        {contact.email && <p className="text-sm text-blue-600">{contact.email}</p>}
                        {contact.phone && <p className="text-sm text-slate-500">{contact.phone}</p>}
                        <Badge className="mt-1 text-xs bg-blue-100 text-blue-700">{contact.type.toUpperCase()}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="billing" className="px-4 py-4" data-testid="panel-billing">
                <div className="text-center py-8 text-slate-500">
                  <DollarSign className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p>Billing information</p>
                  <p className="text-sm text-slate-400">Coming soon...</p>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="px-4 py-4" data-testid="panel-notes">
                <Textarea 
                  defaultValue={notes} 
                  placeholder="Customer notes..."
                  className="min-h-[200px]"
                  data-testid="textarea-notes"
                />
                <p className="text-xs text-slate-400 mt-1">Character limit: 6000</p>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="flex items-center p-2 border-b bg-white overflow-x-auto">
                <Button variant="ghost" size="icon" className="flex-shrink-0" data-testid="button-scroll-pools-left">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1 flex-1 overflow-x-auto">
                  {pools.length > 0 ? pools.map((pool, idx) => (
                    <button
                      key={pool.id}
                      onClick={() => setActivePoolIndex(idx)}
                      style={{ backgroundColor: activePoolIndex === idx ? pool.color : undefined }}
                      className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                        activePoolIndex === idx
                          ? "text-white"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                      data-testid={`pool-tab-${idx}`}
                    >
                      {pool.name}
                    </button>
                  )) : (
                    <button
                      className="px-4 py-2 rounded text-sm font-medium bg-blue-600 text-white"
                      data-testid="pool-tab-default"
                    >
                      Main Pool
                    </button>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="flex-shrink-0"
                  onClick={() => setShowAddPool(true)}
                  data-testid="button-add-pool"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6 max-w-4xl mx-auto">
                  <Card data-testid="panel-service-config">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm text-slate-500">Service Level</Label>
                          <Select defaultValue={pools[activePoolIndex]?.serviceLevel || "pool_tech"}>
                            <SelectTrigger data-testid="select-service-level">
                              <SelectValue placeholder="Select service level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pool_tech">Pool Tech Services</SelectItem>
                              <SelectItem value="full_service">Full Service</SelectItem>
                              <SelectItem value="chemical_only">Chemical Only</SelectItem>
                              <SelectItem value="filter_clean">Filter Clean Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm text-slate-500">Type</Label>
                          <Select defaultValue={pools[activePoolIndex]?.waterType || ""}>
                            <SelectTrigger data-testid="select-water-type">
                              <SelectValue placeholder="--" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="chlorine">Chlorine</SelectItem>
                              <SelectItem value="salt">Salt</SelectItem>
                              <SelectItem value="bromine">Bromine</SelectItem>
                              <SelectItem value="biguanide">Biguanide</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm text-slate-500">Gallons</Label>
                          <Input 
                            type="number" 
                            defaultValue={pools[activePoolIndex]?.gallons || ""} 
                            placeholder="Volume"
                            data-testid="input-gallons"
                          />
                        </div>
                      </div>
                      <div className="mt-3 text-right">
                        <Button variant="link" className="text-blue-600 text-sm" onClick={() => setShowAddTask(true)} data-testid="button-add-item">
                          Add Item
                          <Plus className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="panel-equipment">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-slate-700 mb-3">Equipment</h4>
                      <div className="grid grid-cols-4 gap-4">
                        {EQUIPMENT_TYPES.map((eq) => {
                          const Icon = eq.icon;
                          const currentValue = equipment.find(e => e.type === eq.type)?.value || "";
                          return (
                            <div key={eq.type} className="space-y-2" data-testid={`equipment-select-${eq.type}`}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600">{eq.label}</span>
                              </div>
                              <Select value={currentValue} onValueChange={(v) => handleEquipmentChange(eq.type, v)}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {eq.options.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="panel-workflow">
                    <CardContent className="p-4">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                        <div className="space-y-4">
                          {TASK_CATEGORIES.map(category => (
                            <WorkflowSection 
                              key={category.id} 
                              category={category} 
                              tasks={tasks} 
                              equipment={equipment}
                              onToggleTask={handleToggleTask}
                            />
                          ))}
                        </div>
                      </DndContext>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      <Dialog open={showRouteSchedule} onOpenChange={setShowRouteSchedule}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-blue-600 text-xl">Route Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <span className="font-medium text-lg">Activate Route Schedule</span>
              <Switch 
                checked={routeSchedule.active} 
                onCheckedChange={(checked) => setRouteSchedule(prev => ({ ...prev, active: checked }))}
                data-testid="switch-route-active" 
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="font-medium text-base mb-3 block">How Often?</Label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="frequency" 
                      checked={routeSchedule.frequencyType === "weekly"}
                      onChange={() => setRouteSchedule(prev => ({ ...prev, frequencyType: "weekly", intervalWeeks: 1 }))}
                      className="w-4 h-4 text-blue-600" 
                      data-testid="radio-weekly" 
                    />
                    <span>Once a week</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="frequency" 
                      checked={routeSchedule.frequencyType === "everyOtherWeek"}
                      onChange={() => setRouteSchedule(prev => ({ ...prev, frequencyType: "everyOtherWeek", intervalWeeks: 2 }))}
                      className="w-4 h-4 text-blue-600" 
                      data-testid="radio-biweekly" 
                    />
                    <span>Every other week</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="frequency" 
                      checked={routeSchedule.frequencyType === "customWeeks"}
                      onChange={() => setRouteSchedule(prev => ({ ...prev, frequencyType: "customWeeks" }))}
                      className="w-4 h-4 text-blue-600" 
                      data-testid="radio-custom" 
                    />
                    <span className="flex items-center gap-2">
                      Every 
                      <Input 
                        type="number" 
                        min={1}
                        max={12}
                        value={routeSchedule.intervalWeeks}
                        onChange={(e) => setRouteSchedule(prev => ({ ...prev, intervalWeeks: parseInt(e.target.value) || 1 }))}
                        className="w-16 h-8"
                        disabled={routeSchedule.frequencyType !== "customWeeks"}
                      />
                      weeks
                    </span>
                  </label>
                </div>
              </div>
              
              <div>
                <Label className="font-medium text-base mb-3 block">Ends On:</Label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="ends" 
                      checked={routeSchedule.endDate === null}
                      onChange={() => setRouteSchedule(prev => ({ ...prev, endDate: null }))}
                      className="w-4 h-4 text-blue-600" 
                      data-testid="radio-never" 
                    />
                    <span>Never</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="ends" 
                      checked={routeSchedule.endDate !== null}
                      onChange={() => setRouteSchedule(prev => ({ ...prev, endDate: new Date().toISOString().split('T')[0] }))}
                      className="w-4 h-4 text-blue-600" 
                      data-testid="radio-date" 
                    />
                    <span className="flex items-center gap-2">
                      Date
                      <Input 
                        type="date" 
                        value={routeSchedule.endDate || ""}
                        onChange={(e) => setRouteSchedule(prev => ({ ...prev, endDate: e.target.value }))}
                        className="h-8"
                        disabled={routeSchedule.endDate === null}
                      />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label className="font-medium text-base mb-3 block">Multiple visits per week</Label>
              <div className="flex gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => {
                      setRouteSchedule(prev => ({
                        ...prev,
                        daysOfWeek: prev.daysOfWeek.includes(day) 
                          ? prev.daysOfWeek.filter(d => d !== day)
                          : [...prev.daysOfWeek, day]
                      }));
                    }}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      routeSchedule.daysOfWeek.includes(day) 
                        ? "bg-blue-600 text-white" 
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                    data-testid={`day-chip-${day.toLowerCase()}`}
                  >
                    {day.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-medium text-base mb-3 block">Day Assignments</Label>
              <div className="grid grid-cols-2 gap-3">
                {WEEKDAYS.map((day) => {
                  const assignment = routeSchedule.dayAssignments[day];
                  const tech = DEFAULT_TECHNICIANS.find(t => t.id === assignment?.technicianId) || DEFAULT_TECHNICIANS[0];
                  const isActiveDay = routeSchedule.daysOfWeek.includes(day);
                  const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                  
                  return (
                    <div 
                      key={day} 
                      className={`flex items-center gap-3 p-3 border rounded-lg ${isActiveDay ? "bg-white" : "bg-slate-50 opacity-60"}`}
                      data-testid={`route-day-${day.toLowerCase()}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        isActiveDay ? "bg-cyan-100 text-cyan-700" : "bg-slate-200 text-slate-500"
                      }`}>
                        {tech.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Select 
                          value={assignment?.technicianId || "t1"}
                          onValueChange={(techId) => {
                            const newTech = DEFAULT_TECHNICIANS.find(t => t.id === techId)!;
                            setRouteSchedule(prev => ({
                              ...prev,
                              dayAssignments: {
                                ...prev.dayAssignments,
                                [day]: {
                                  technicianId: techId,
                                  technicianName: newTech.name,
                                  routeName: `(Beaumont/North) ${day}`
                                }
                              }
                            }));
                          }}
                          disabled={!isActiveDay}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEFAULT_TECHNICIANS.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 mt-1 truncate">{assignment?.routeName || `Route ${day}`}</p>
                      </div>
                      <span className="text-xs text-slate-400">{dayLabels[WEEKDAYS.indexOf(day)]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="font-medium text-base mb-2 block">Notes</Label>
              <Textarea 
                placeholder="Add notes for the technician (e.g., 'Check water level when windy', 'Lock gate on last visit')..." 
                className="min-h-[80px]"
                value={routeSchedule.notes}
                onChange={(e) => setRouteSchedule(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="textarea-route-notes" 
              />
              <p className="text-xs text-slate-400 mt-1">Character limit: 6000</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Link href={`/scheduling?customerId=${encodeURIComponent(customer.externalId || customer.id)}&customerName=${encodeURIComponent(customer.name)}`}>
                <Button variant="outline" className="text-blue-600 border-blue-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  View on Scheduling Board
                </Button>
              </Link>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowRouteSchedule(false)}>Cancel</Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setShowRouteSchedule(false);
                  }}
                  data-testid="button-save-route-schedule"
                >
                  Save Schedule
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search tasks..." className="pl-10" data-testid="input-search-tasks" />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {PREDEFINED_TASKS.map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleAddTask(task)}
                    className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 text-left"
                    data-testid={`add-task-${task.id}`}
                  >
                    <Circle className="h-4 w-4 text-slate-400" />
                    <span className="flex-1">{task.name}</span>
                    <Badge variant="outline" className="text-xs">{task.category}</Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddPool} onOpenChange={setShowAddPool}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Body of Water</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input 
                value={newPoolName} 
                onChange={(e) => setNewPoolName(e.target.value)}
                placeholder="e.g., Main Pool, Spa, Fountain"
                data-testid="input-new-pool-name"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newPoolType} onValueChange={setNewPoolType}>
                <SelectTrigger data-testid="select-new-pool-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pool">Pool</SelectItem>
                  <SelectItem value="spa">Spa</SelectItem>
                  <SelectItem value="fountain">Fountain</SelectItem>
                  <SelectItem value="pond">Pond</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPool(false)}>Cancel</Button>
            <Button onClick={handleAddPool} className="bg-blue-600 hover:bg-blue-700" data-testid="button-confirm-add-pool">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ["stored-customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers/stored");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const importCustomersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearExisting: true }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import customers");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stored-customers"] });
      toast({ title: "Customers Imported", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });

  const customers: Customer[] = customersData?.customers || [];

  const filteredCustomers = useMemo(() => {
    let result = customers;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.address?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter) {
      result = result.filter(c => c.status === statusFilter);
    }
    
    return result;
  }, [customers, searchQuery, statusFilter]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, showArchived]);

  // Paginate the filtered customers
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage, ITEMS_PER_PAGE]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      active_routed: 0,
      active: 0,
      inactive: 0,
      lead: 0,
    };
    for (const c of customers) {
      const status = c.status || "active";
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    }
    return counts;
  }, [customers]);

  const formatAddress = (customer: Customer) => {
    const parts = [];
    if (customer.address) parts.push(customer.address);
    if (customer.city) parts.push(customer.city);
    if (customer.state) parts.push(customer.state);
    if (customer.zip) parts.push(customer.zip);
    return parts.join(", ") || null;
  };

  if (selectedCustomer) {
    return <CustomerDetail customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />;
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 h-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900" data-testid="page-title">
            Customers
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => importCustomersMutation.mutate()}
              disabled={importCustomersMutation.isPending}
              data-testid="button-import-customers"
            >
              {importCustomersMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Import Customers
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-customer">
              <Plus className="h-4 w-4 mr-1" />
              Add Customer
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter(statusFilter === "active_routed" ? null : "active_routed")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "active_routed" ? "ring-2 ring-offset-2 ring-green-600" : ""
            } bg-green-600 text-white`}
            data-testid="filter-active-routed"
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {statusCounts.active_routed}
            </span>
            ACTIVE (routed)
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "active" ? null : "active")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "active" ? "ring-2 ring-offset-2 ring-yellow-500" : ""
            } bg-yellow-500 text-white`}
            data-testid="filter-active-no-route"
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {statusCounts.active}
            </span>
            ACTIVE (no route)
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "inactive" ? null : "inactive")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "inactive" ? "ring-2 ring-offset-2 ring-red-500" : ""
            } bg-red-500 text-white`}
            data-testid="filter-inactive"
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {statusCounts.inactive}
            </span>
            INACTIVE
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "lead" ? null : "lead")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "lead" ? "ring-2 ring-offset-2 ring-blue-500" : ""
            } bg-blue-500 text-white`}
            data-testid="filter-leads"
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {statusCounts.lead}
            </span>
            LEADS
          </button>
          
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" data-testid="button-filter">
              <Filter className="h-4 w-4" />
              FILTER
              <Badge variant="secondary" className="ml-1">OFF</Badge>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(checked) => setShowArchived(!!checked)}
              data-testid="checkbox-show-archived"
            />
            Show archived customers
          </label>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, address, email or phone"
            className="pl-10"
            data-testid="input-search-customers"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">CUSTOMER</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">ADDRESS</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">PHONE</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">EMAIL</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                      <p className="text-sm text-slate-500 mt-2">Loading customers...</p>
                    </td>
                  </tr>
                ) : paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500">
                        {customers.length === 0 
                          ? "No customers yet. Click 'Import Customers' to get started."
                          : "No customers match your search."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => {
                    const fullAddress = formatAddress(customer);
                    const addressCount = customer.poolCount || 0;
                    
                    return (
                      <tr 
                        key={customer.id} 
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setSelectedCustomer(customer)}
                        data-testid={`customer-row-${customer.id}`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-blue-600 hover:underline">
                              {customer.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          {addressCount > 1 ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <MapPin className="h-4 w-4" />
                              <span className="underline">{addressCount} Addresses</span>
                            </div>
                          ) : fullAddress ? (
                            <span className="text-slate-600 text-sm">{fullAddress}</span>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {customer.phone ? (
                            <span className="text-slate-600 text-sm">{customer.phone}</span>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {customer.email ? (
                            <span className="text-slate-600 text-sm">{customer.email}</span>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>View Pools</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex items-center justify-between" data-testid="pagination-controls">
          <div className="text-sm text-slate-500" data-testid="text-customer-count">
            {filteredCustomers.length > 0 
              ? `Showing ${((currentPage - 1) * ITEMS_PER_PAGE) + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} of ${filteredCustomers.length} customers`
              : "No customers to show"
            }
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                data-testid="button-first-page"
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={currentPage === pageNum ? "bg-blue-600" : ""}
                      data-testid={`button-page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                data-testid="button-last-page"
              >
                Last
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
